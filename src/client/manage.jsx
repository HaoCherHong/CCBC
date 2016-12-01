var React = require('react')
	ReactDom = require('react-dom');

global.jQuery = global.$ = require("jquery");

var config = {
	appId: 1436161303080539
};

window.React = React;

class Manage extends React.Component {
	constructor(props) {
		super(props);

		this.state = {

		}

		this.block = this.block.bind(this);
		this.retry = this.retry.bind(this);
		this.reload = this.reload.bind(this);
	}

	reload() {
		$.get('/api/manage/posts', (data)=> {
			this.setState({
				posts: data
			});
		});
	}

	componentDidMount() {
		this.reload();
	}

	retry(post) {
		$.post('/api/manage/posts/' + post._id + '/retry', (result) => {
			console.log(result);
			if(result.success) {
				var index = this.state.posts.indexOf(post);
				this.state.posts.splice(index, 1, result.post);
				this.setState({
					posts: this.state.posts
				});
			} else {

			}
		});
	}

	block(post) {
		$.post('/api/manage/posts/' + post._id + '/block', (result) => {
			console.log(result);
			if(result.success) {
				var index = this.state.posts.indexOf(post);
				this.state.posts.splice(index, 1, result.post);
				this.setState({
					posts: this.state.posts
				});
			} else {

			}
		});
	}

	updatePageToken() {
		var match,
			redirectUri = location.origin + location.pathname;

		if(match = /code=([^&]+)/.exec(location.search)) {
			var code = match[1];
			$.get('/api/manage/updatePageToken?code=' + encodeURIComponent(code) + '&redirectUri=' + encodeURIComponent(redirectUri), function(data) {
				console.log(data);
			})
	  	} else {
	  		window.location = 'https://www.facebook.com/v2.8/dialog/oauth?client_id=' + config.appId + ' &scope=manage_pages,publish_pages,read_page_mailboxes,pages_show_list,pages_manage_cta,pages_manage_instant_articles&response_type=code&redirect_uri=' + encodeURIComponent(redirectUri);
	  	}
	}

	render() {
		return (
			<div>
				<button onClick={this.updatePageToken}>Update Page Token</button>
				<div>
					文章列表
					<table>
						<thead>
							<tr>
								<td>編號</td>
								<td>模式</td>
								<td>訊息</td>
								<td>Block</td>
							</tr>
						</thead>
						<tbody>
						{
							this.state.posts && this.state.posts.map((post)=>(
								<tr key={post.serialNumber}>
									<td>{post.serialNumber}</td>
									<td>{post.mode}</td>
									<td>{post.message}</td>
									<td>
									{
										((post)=> {
											if(post.published)
												return null;

											if(post.failed)
												return  (<button onClick={this.retry.bind(null, post)}>Retry</button>)
											else
												return  (<button onClick={this.block.bind(null, post)}>Block</button>)
										})(post)
									}
									</td>
								</tr>
							))
						}
						</tbody>
					</table>
				</div>
			</div>
		)
	}
}

ReactDom.render( <Manage/> , document.getElementById('app'));