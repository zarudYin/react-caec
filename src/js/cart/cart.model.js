import { createReducer } from 'restack-core'
import { select } from 'redux-saga/effects'
import { basePath, baseType } from '../app/base.model'
import _ from 'lodash'

const CART_LIST_URL = `${basePath}/shoppingcart/cart/info`;
const CART_LIST_DEL_URL = `${basePath}/shoppingcart/cart/clean`;
const UPDATE_CART_NUM_URL = `${basePath}/shoppingcart/cart/modify`;
const ADD_CART_URL = `${basePath}/shoppingcart/cart/shopping`;
const CONFIRM_URL = `${basePath}/main/order/unconfirm`;
const CONFIRM_ORDER_URL = `${basePath}/main/order/confirm`;
const DEALER_URL = `${basePath}/main/dealer/list`;

const model = {
    name: 'cart',
    initialState: {
        checkedNum: 0,
        totalNum: 0,
        totalPrice: 0,
        isAllChecked: false,
        isEdit: false,
        cartList: [],
        confirmList: {},
        dealerList: [],
        dealerCheckIndex: -1,
        address: {},
        invoice: {},
        confirmSuccess: false
    },
    reducers: createReducer([], {
        EDIT(state, action) {
            let { isEdit } = state;
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
            const { isChecked, index } = action.payLoad;
            const { isEdit } = state;

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
            const { handle, index } = action.payLoad;
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

            return {...state, totalNum, cartList }
        },
        UPDATE_CART_LIST(state, action) {
            const { index } = action.payLoad;
            const cartList = _.cloneDeep(state.cartList);
            _.pullAt(cartList, index);

            return {...state, cartList }
        },
        IS_ALL_CHECKED(state, action) {
            const { isAllChecked } = action.payLoad;
            let checkedNum = 0;
            let totalPrice = 0;

            let cartList = _.cloneDeep(state.cartList);

            cartList = cartList.map((item) => {
                item.isChecked = isAllChecked;
                totalPrice += isAllChecked ? item.price * item.count : 0;
                return item;
            })

            checkedNum = isAllChecked ? cartList.length : 0;

            return {...state, isAllChecked, cartList, checkedNum, totalPrice }
        },
        CONFIRM_LIST(state, action) {
            const confirmList = action.payLoad.response.data;

            let address = _.filter(confirmList.receiving, (item) => {
                return item.isDeafault === 'Y';
            })

            address = address.length ? address[0] : {}

            return {...state, confirmList, address }
        },
        CLEAN_CONFIRM(state, action) {
            return {...state, confirmList: {} }
        },
        DEALER_LIST(state, action) {
            const dealerList = action.payLoad.response.data;

            return {...state, dealerList }
        },
        SET_DEALER(state, action) {
            const { dealerCheckIndex, carIndex } = action.payLoad;
            const tState = _.cloneDeep(state);

            tState.confirmList.cars[carIndex].dealer = tState.dealerList[dealerCheckIndex];

            return {...tState }
        },
        SET_BUYTYPE(state, action) {
            const { info, carIndex } = action.payLoad;
            const tState = _.cloneDeep(state);

            tState.confirmList.cars[carIndex].buyType = info;

            return {...tState }
        },
        SET_CHECKED_ADDRESS(state, action) {
            const { index } = action.payLoad;
            const tState = _.cloneDeep(state);

            tState.address = tState.confirmList.receiving[index];

            return {...tState }
        },
        SET_INVOICE(state, action) {
            const { type, company } = action.payLoad;
            const tState = _.cloneDeep(state);

            tState.invoice = action.payLoad;

            return {...tState }
        },
        CONFIRM_ORDER(state, action) {
            return {...state, confirmSuccess: true };
        },
        CLEAN_SUCCESS(state, action) {
            return {...state, confirmSuccess: false };
        }
    }),
    sagas: {
        * list(action, { update, put, call }) {
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
        * update(action, { update, put, call }) {
            const state = yield select();

            const { index, handle, cartItemId } = action.payLoad;
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
        * add(action, { update, put, call }) {
            const { goods } = action.payLoad;

            yield put({
                type: baseType,
                payLoad: {
                    successType: 'cart/updateCart',
                    successPayLoad: action.payLoad,
                    url: ADD_CART_URL,
                    type: 'POST',
                    params: {
                        goods: JSON.stringify(goods)
                    }
                }
            })
        },
        * updateCart(action, { update, put, call }) {
            const { goods, cb } = action.payLoad;

            // const cartList = _.cloneDeep(yield select(state => state.cart.cartList));
            // const tCartList = [];

            // for (let good of goods) {
            //     const tGood = cartList.filter(item => item.id == good.id);

            //     if (tGood.length > 0) {
            //         tGood[0].count += good.count;
            //     } else {
            //         tCartList.unshift(good);
            //     }
            // }

            // yield update({ cartList: tCartList.concat(cartList) });

            cb();

            yield put({
                type: 'cart/list'
            })
        },
        * del(action, { update, put, call }) {
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
        * confirm(action, { update, put, call }) {
            const cartList = yield select(data => data.cart.cartList);

            let data = cartList.filter(item => item.isChecked).map(item => {
                return {
                    "id": item.id,
                    "count": item.count,
                    "optionalInfo": []
                }
            })

            // console.log(data);
            yield put({
                type: baseType,
                payLoad: {
                    successType: 'CONFIRM_LIST',
                    successPayLoad: {

                    },
                    url: CONFIRM_URL,
                    type: 'POST',
                    params: {
                        goods: JSON.stringify(data)
                    }
                }
            });
        },
        * dealer(action, { update, put, call }) {
            const params = action.payLoad;

            yield put({
                type: baseType,
                payLoad: {
                    successType: 'DEALER_LIST',
                    url: DEALER_URL,
                    type: 'POST',
                    params
                }
            });
        },
        * confirmOrder(action, { update, put, call }) {
            const params = action.payLoad;

            yield put({
                type: baseType,
                payLoad: {
                    successType: 'CONFIRM_ORDER',
                    url: CONFIRM_ORDER_URL,
                    type: 'POST',
                    params
                }
            });
        }
    }
}

export default model