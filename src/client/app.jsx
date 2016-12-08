var React = require('react'),
	ReactDom = require('react-dom'),
	Router = require('react-router').Router,
	Route = require('react-router').Route,
	Link = require('react-router').Link,
	IndexRoute = require('react-router').IndexRoute,
	hashHistory = require('react-router').hashHistory,
	config = require('./config.js'),
	fbsdk = require('./fbsdk'),
	CC = require('./cc.jsx'),
	Reply = require('./reply.jsx');

window.React = React;

class App extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		fbsdk();
	}

	render() {
		return (
			<div className="container">
				<div className="jumbotron">
						<h2>
							<img style={{verticalAlign: 'bottom', marginRight: '5px'}} alt="Page Logo" src={'https://graph.facebook.com/' + config.pageId + '/picture'}/>
							哭哭北科 <small>beta</small>
						</h2>
					<p>自由地哭哭，完全匿名。</p>
					<ul className="list-inline">
						{
							this.props.location.pathname != '/' && (
								<li><Link className="btn btn-primary" to={'/'}>匿名哭哭</Link></li>
							)
						}
						<li><a id="link-page" className="btn btn-primary" href={'https://facebook.com/' + config.pageId} target="_blank" role="button">粉絲專頁</a></li>
						<li style={{verticalAlign: 'bottom'}}><div className="fb-like" data-href={'https://facebook.com/' + config.pageId} data-layout="button_count" data-action="like" data-size="large" data-show-faces="true" data-share="false"></div></li>
					</ul>
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