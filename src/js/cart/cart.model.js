import { createReducer } from 'restack-core'
import { select } from 'redux-saga/effects'
import { basePath, baseType } from '../app/base.model'
import _ from 'lodash'

const CART_LIST_URL = `${basePath}/shoppingcart/cart/info`;
const CART_LIST_DEL_URL = `${basePath}/shoppingcart/cart/clean`;
const UPDATE_CART_NUM_URL = `${basePath}/shoppingcart/cart/modify`;

const model = {
    name: 'cart',
    initialState: {
        checkedNum: 0,
        totalNum: 0,
        totalPrice: 0,
        isAllChecked: false,
        isEdit: false,
        cartList: []
    },
    reducers: createReducer([], {
        EDIT(state, action) {
            let {isEdit} = state;
            let isAllChecked = false;
            let cartList = _.cloneDeep(state.cartList);

            if (isEdit) {
                isAllChecked = cartList.every(item => {
                    item.isChecked = item.cacheIsChecked;
                    item.cacheIsChecked = false;

                    return item.isChecked;
                })
            } else {
                for (let i = 0, l = cartList.length; i < l; i++) {
                    const cartItem = cartList[i];

                    cartItem.cacheIsChecked = cartItem.isChecked;
                    cartItem.isChecked = false;
                }
            }

            return {
                ...state,
                isEdit: !isEdit,
                isAllChecked,
                cartList
            }
        },
        CHECKED_ITEM(state, action) {
            const {isChecked, index } = action.payLoad;
            const {isEdit} = state;

            const cartList = _.cloneDeep(state.cartList);
            cartList[index].isChecked = isChecked;

            const isAllChecked = _.every(cartList, item => item.isChecked);

            if (isEdit) {
                return {
                    ...state,
                    cartList,
                    isAllChecked
                }
            }

            return {
                ...state,
                checkedNum: state.checkedNum + (isChecked ? 1 : -1),
                totalPrice: state.totalPrice + (isChecked ? 1 : -1) * cartList[index].price * cartList[index].count,
                cartList,
                isAllChecked
            }
        },
        UPDATE_COUNT(state, action) {
            const {handle, index } = action.payLoad;
            let cartList = _.cloneDeep(state.cartList);
            let totalPrice = state.totalPrice;
            const cartItem = cartList[index];

            cartItem.count = cartItem.count + (handle === 'del' ? -1 : 1);
            if (cartItem.isChecked) {
                totalPrice += (handle === 'del' ? -1 : 1) * cartItem.price
            }

            return {
                ...state,
                cartList,
                totalPrice
            }
        },
        COUNT_PRICE(state, action) {

        },
        CART_LIST(state, action) {
            console.log(action);
            const totalNum = action.payLoad.response.total;
            const cartList = action.payLoad.response.data;

            return { ...state, totalNum, cartList }
        },
        UPDATE_CART_LIST(state, action) {
            const {index} = action.payLoad;
            const cartList = _.cloneDeep(state.cartList);
            _.pullAt(cartList, index);

            return { ...state, cartList }
        },
        IS_ALL_CHECKED(state, action) {
            const {isAllChecked } = action.payLoad;
            let checkedNum = 0;
            let totalPrice = 0;

            let cartList = _.cloneDeep(state.cartList);

            cartList = cartList.map((item) => {
                item.isChecked = isAllChecked;
                totalPrice += isAllChecked ? item.price * item.count : 0;
                return item;
            })

            checkedNum = isAllChecked ? cartList.length : 0;

            return { ...state, isAllChecked, cartList, checkedNum, totalPrice }
        }
    }),
    sagas: {
        *list(action, { update, put, call }) {
            yield put({
                type: baseType,
                payLoad: {
                    successType: 'CART_LIST',
                    url: CART_LIST_URL,
                    type: 'GET',
                    params: {
                        pageIndex: 1,
                        pageSize: 20
                    }
                }
            });
        },
        *update(action, { update, put, call }) {
            const state = yield select();

            const {index, handle, cartItemId} = action.payLoad;
            let count = (handle === 'del' ? -1 : 1) + state.cart.cartList[index].count;

            yield put({
                type: baseType,
                payLoad: {
                    successType: 'UPDATE_COUNT',
                    successPayLoad: {
                        handle,
                        index
                    },
                    url: UPDATE_CART_NUM_URL,
                    type: 'POST',
                    params: {
                        cartItemId,
                        count
                    }
                }
            });
        },
        *del(action, { update, put, call }) {
            const state = yield select();
            const cartList = state.cart.cartList;
            const cartItemIds = [];
            const index = [];

            for (let i = 0, l = cartList.length; i < l; i++) {
                if (cartList[i].isChecked) {
                    cartItemIds.push(cartList[i].cartItemId);
                    index.push(i);
                }
            }

            yield put({
                type: baseType,
                payLoad: {
                    successType: 'UPDATE_CART_LIST',
                    successPayLoad: {
                        index
                    },
                    url: CART_LIST_DEL_URL,
                    type: 'POST',
                    params: {
                        cartItemIds: JSON.stringify(cartItemIds)
                    }
                }
            });
        },
        *destroy() {

        }
    }
}

export default model