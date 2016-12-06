var React = require('react'),
	ReactDom = require('react-dom'),
	config = require('./config.js');

require('whatwg-fetch');

window.React = React;

class Manage extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			tab: 'posted'
		}

		this.load = this.load.bind(this);
		this.onSwitchTab = this.onSwitchTab.bind(this);
		this.block = this.block.bind(this);
		this.retry = this.retry.bind(this);
		this.approve = this.approve.bind(this);
		this.updatePageToken = this.updatePageToken.bind(this);
	}

	componentDidMount() {
		this.load(this.state.tab);
	}

	load(tab) {
		var url = '/api/manage/posts';
		switch(tab) {
			case 'posted':
				url += '?published=true';
				break;
			case 'failed':
				url += '?failed=true';
			case 'approve':
				url += '?approved=false';
				break;
		}
		fetch(url, {
			credentials: 'same-origin'
		}).then((response)=>(
			response.json()
		)).then((posts) => {
			this.setState({
				posts: posts.reverse()
			});
		}).catch(console.error);
	}

	onSwitchTab(e) {
		window.e = e.target;
		var tab = e.target.getAttribute('data-tab');
		console.log(tab);
		this.setState({
			tab: tab
		});
		this.load(tab);
	}

	getAccessTokenCode() {
		var match = /code=([^&]+)/.exec(location.search);
		if(match)
			return match[1];
		else
			return null;
	}

	retry(post) {
		fetch('/api/manage/posts/' + post._id + '/retry', {
			method: 'POST',
			credentials: 'same-origin'
		}).then((response) => (
			response.json()
		)).then((result) => {
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
		fetch('/api/manage/posts/' + post._id + '/block', {
			method: 'POST',
			credentials: 'same-origin'
		}).then((response) => (
			response.json()
		)).then((result) => {
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

	approve(post) {
		fetch('/api/manage/posts/' + post._id + '/approve', {
			method: 'POST',
			credentials: 'same-origin'
		}).then((response) => (
			response.json()
		)).then((result) => {
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
		var code = this.getAccessTokenCode(),
			redirectUri = location.origin + location.pathname;

		if(code) {
			fetch('/api/manage/updatePageToken', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'same-origin',
				body: JSON.stringify({
					code: code,
					redirectUri: redirectUri
				})
			}).then((response)=>(
				response.json()
			)).then((result) => {
				if(result.success) {
					this.setState({
						tokenUpdated: true
					});
				}
			}).catch(console.error);
	  	} else {
	  		window.location = 'https://www.facebook.com/v2.8/dialog/oauth?client_id=' + config.appId + ' &scope=manage_pages,publish_pages,read_page_mailboxes,pages_show_list,pages_manage_cta,pages_manage_instant_articles&response_type=code&redirect_uri=' + encodeURIComponent(redirectUri);
	  	}
	}

	render() {
		return (
			<div>
				{
					this.state.tokenUpdated ? (
						<div className="alert alert-success" role="alert">Page Token Updated. Please restart posting server.</div>
					) : (
						<button className="btn btn-primary" onClick={this.updatePageToken}>{ this.getAccessTokenCode() ? 'Update Page Token' : 'Get Access Token'}</button>
					)
				}
				<div>
					<h1>Posts</h1>

					<ul className="nav nav-pills">
						<li role="presentation" className={ this.state.tab == 'all' ? 'active' : ''}><a href="#" data-tab="all" onClick={this.onSwitchTab}>All</a></li>
						<li role="presentation" className={ this.state.tab == 'posted' ? 'active' : ''}><a href="#" data-tab="posted" onClick={this.onSwitchTab}>Posted</a></li>
						<li role="presentation" className={ this.state.tab == 'failed' ? 'active' : ''}><a href="#" data-tab="failed" onClick={this.onSwitchTab}>Failed</a></li>
						<li role="presentation" className={ this.state.tab == 'approve' ? 'active' : ''}><a href="#" data-tab="approve" onClick={this.onSwitchTab}>Approve</a></li>
					</ul>

					<table className="table table-hover">
						<thead>
							<tr>
								<td>#</td>
								<td>Mode</td>
								<td>Message</td>
								<td>Action</td>
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

											if(!post.approved)
												return  (<button className="btn btn-primary" onClick={this.approve.bind(null, post)}>Approve</button>)
											else if(post.failed)
												return  (<button className="btn btn-default" onClick={this.retry.bind(null, post)}>Retry</button>)
											else
												return  (<button className="btn btn-danger" onClick={this.block.bind(null, post)}>Block</button>)
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