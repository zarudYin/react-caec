import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './App';
import Index from '../demo/Index';
import Swipe from '../demo/ReactSwipe';
import Iscroll from '../demo/Iscroll';

import Home from '../home/Home';
import Login from '../my/Login';
import Cart from '../cart/Cart';
import Activity from '../activity/Activity';
import My from '../my/My';

const rootRoute = (
	<Route path="/" component={App}>
		<IndexRoute component={Home} />
		<Route path="/demo" component={Index} />
		<Route path="/reactswipe" component={Swipe} />
		<Route path="/iscroll" component={Iscroll} />
		<Route path="/cart" component={Cart} />
		<Route path="/activity" component={Activity} />
		<Route path="/my" component={My} />
		<Route path="/login" component={Login} />
	</Route>
)

export default rootRoute