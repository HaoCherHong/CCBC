var React = require('react'),
	ReactDom = require('react-dom'),
	Router = require('react-router').Router,
	Route = require('react-router').Route,
	IndexRoute = require('react-router').IndexRoute,
	hashHistory = require('react-router').hashHistory,
	config = require('./config.js');
	CC = require('./cc.jsx'),
	Reply = require('./reply.jsx'),

window.React = React;

class App extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="container">
				<div className="jumbotron">
					<h1>哭哭北科 <small>beta</small></h1>
					<p>自由地哭哭，完全匿名。</p>
					<p><a id="link-page" className="btn btn-primary btn-lg" href={'https://facebook.com/' + config.pageId} target="_blank" role="button">粉絲專頁</a></p>
				</div>
				{
					this.props.children
				}
			</div>
		)
	}
}

ReactDom.render((
	<Router history={hashHistory}>
		<Route path="/" component={App}>
			<IndexRoute component={CC}/>
			<Route path="reply/:serialNumber" component={Reply}/>
		</Route>
	</Router>
), document.getElementById('app'));