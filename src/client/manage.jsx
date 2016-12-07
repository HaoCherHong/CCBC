var React = require('react'),
	ReactDom = require('react-dom'),
	config = require('./config.js');

require('whatwg-fetch');

window.React = React;

const loadFBSDK = () => {
	return new Promise((resolve, reject) => {
		window.fbAsyncInit = function() {
			FB.init({
		    	appId      : config.appId,
		    	version    : 'v2.8'
		    });
		    FB.AppEvents.logPageView();
		    resolve();
		};
		(function(d, s, id) {
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) 
				return;
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
	})
}

const checkStatus = (response) => {
	if (response.status >= 200 && response.status < 300) {
		return response;
	} else {
		var error = new Error(response.statusText);
		error.response = response;
		throw error;
	}
}

const getTimeString = (date) => (
	date.getMonth() + '/' + ('0' + date.getDate()).substr(-2) + ' ' + ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2)
)

const getPreviewCCImageUrl = (post) => (
	'/api/ccImage/' + encodeURIComponent(post.message || '哭哭預覽圖') + (post.ccImageOptions && post.ccImageOptions.style == 'facebook' ? '?style=facebook' : '')
)

class Manage extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			tab: 'posted',
		}

		this.load = this.load.bind(this);
		this.onSwitchTab = this.onSwitchTab.bind(this);
		this.managePost = this.managePost.bind(this);
		this.updatePageToken = this.updatePageToken.bind(this);
		this.viewDetail = this.viewDetail.bind(this);
	}

	async componentDidMount() {
		await loadFBSDK();
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
			case 'queueing':
				url += '?published=false&failed=false';
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
			tab: tab,
			currentPost: null
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

	viewDetail(post) {
		this.setState({
			currentPost: post,
			previewDataUrl: null
		}, ()=>{
			//Update Embed Post after state updated
			FB.XFBML.parse();
		});

		if(post.attachImage) {
			fetch('/api/previewAttachImage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					file: post.attachImage
				})
			}).then(checkStatus)
			.then((response) => (
				response.text()
			)).then((result) => {
				this.setState({
					previewDataUrl: result,
				});
			}).catch(console.error);
		}
	}

	managePost(post, action) {
		fetch('/api/manage/posts/' + post._id + '/' + action, {
			method: 'POST',
			credentials: 'same-origin'
		}).then(checkStatus)
		.then((response) => (
			response.json()
		)).then((result) => {
			console.log(result);
			var index = this.state.posts.indexOf(post);
			this.state.posts.splice(index, 1, result.post);

			if(post == this.state.currentPost)
				this.state.currentPost = result.post;

			this.setState({
				posts: this.state.posts,
				currentPost: this.state.currentPost
			});
		}).catch(console.error);
	}

	updatePageToken() {
		var code = this.getAccessTokenCode(),
			redirectUri = location.origin + location.pathname;

		if(code) {
			this.setState({
				updatingPageToken: true
			});
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
			}).then(checkStatus)
			.then((response)=>(
				response.json()
			)).then((result) => {
				this.setState({
					tokenUpdated: true,
					updatingPageToken: false
				});
			}).catch((err) => {
				this.setState({
					updatingPageToken: false
				});
				console.error(err);
			});
	  	} else {
	  		window.location = 'https://www.facebook.com/v2.8/dialog/oauth?client_id=' + config.appId + ' &scope=publish_actions,manage_pages,publish_pages,read_page_mailboxes,pages_show_list,pages_manage_cta,pages_manage_instant_articles&response_type=code&redirect_uri=' + encodeURIComponent(redirectUri);
	  	}
	}

	render() {
		return (
			<div>
				{
					this.state.tokenUpdated ? (
						<div className="alert alert-success" role="alert">Page Token Updated. Please restart posting server.</div>
					) : (
						!this.state.updatingPageToken && (
							<button className="btn btn-primary" onClick={this.updatePageToken}>{ this.getAccessTokenCode() ? 'Update Page Token' : 'Get Access Token'}</button>
						)
					)
				}
				<div>
					<h1>Posts</h1>
					<div className="row">
						<div className="col-md-6" style={{overflow: 'auto', maxHeight: '800px'}}>
							<ul className="nav nav-pills">
								<li role="presentation" className={ this.state.tab == 'all' ? 'active' : ''}><a href="#" data-tab="all" onClick={this.onSwitchTab}>All</a></li>
								<li role="presentation" className={ this.state.tab == 'posted' ? 'active' : ''}><a href="#" data-tab="posted" onClick={this.onSwitchTab}>Posted</a></li>
								<li role="presentation" className={ this.state.tab == 'failed' ? 'active' : ''}><a href="#" data-tab="failed" onClick={this.onSwitchTab}>Failed</a></li>
								<li role="presentation" className={ this.state.tab == 'queueing' ? 'active' : ''}><a href="#" data-tab="queueing" onClick={this.onSwitchTab}>Queueing</a></li>
								<li role="presentation" className={ this.state.tab == 'approve' ? 'active' : ''}><a href="#" data-tab="approve" onClick={this.onSwitchTab}>Approve</a></li>
							</ul>
							<table className="table table-hover">
								<thead>
									<tr>
										<td>#</td>
										<td>Mode</td>
										<td>Img</td>
										<td>Message</td>
										<td>Submit Time</td>
									</tr>
								</thead>
								<tbody>
								{
									this.state.posts && this.state.posts.map((post)=>(
										<tr className={this.state.currentPost == post && 'info'} style={{cursor: 'pointer'}} key={post.serialNumber} onClick={this.viewDetail.bind(null, post)}>
											<td>{post.serialNumber}</td>
											<td>{post.mode}</td>
											<td>{post.attachImage != undefined ? 'Yes' : ''}</td>
											<td>{post.message.substr(0, 20) + (post.message.length > 20 ? '...' : '')}</td>
											<td>{getTimeString(new Date(post.submitTime))}</td>
										</tr>
									))
								}
								</tbody>
							</table>
						</div>

						{
							(this.state.currentPost) && (
								<div className="col-md-6">
									<h4>{'#哭哭北科' + this.state.currentPost.serialNumber}</h4>
									{
										this.state.currentPost.postId && (
											<div className="fb-post" data-width="500" data-href={'https://www.facebook.com/' + config.pageId + '/posts/' + this.state.currentPost.postId + '/'}></div>
										)
									}
									{
										//Waiting for approve
										!this.state.currentPost.approved && (
											<button className="btn btn-primary" onClick={this.managePost.bind(null, this.state.currentPost, 'approve')}>Approve</button>
										)
									}
									{
										//Failed
										this.state.currentPost.failed && (
											<button className="btn btn-default" onClick={this.managePost.bind(null, this.state.currentPost, 'retry')}>Retry</button>	
										)
									}
									{
										//Queueing
										!this.state.currentPost.published && !this.state.currentPost.failed && (
											<button className="btn btn-danger" onClick={this.managePost.bind(null, this.state.currentPost, 'block')}>Block</button>
										)
									}
									<pre>
										{ JSON.stringify(this.state.currentPost, null, '\t') }
									</pre>
									<div className="text-center">
										{
											this.state.previewDataUrl && (
												<img style={{maxWidth: '100%'}} alt="Preview Image" src={this.state.previewDataUrl}/>
											)
										}
										{
											this.state.currentPost.mode == 'ccImage' && (
												<img style={{maxWidth: '100%'}} alt="CC-Image Preview" src={getPreviewCCImageUrl(this.state.currentPost)}/>
											)
										}
									</div>
								</div>				
							)
						}
					</div>
				</div>
			</div>
		)
	}
}

ReactDom.render( <Manage/> , document.getElementById('app'));