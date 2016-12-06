var React = require('react'),
	ReactDom = require('react-dom'),
	config = require('./config.js');

require('whatwg-fetch');

window.React = React;

const getPreviewImageUrl = (app) => (
	'/api/ccImage/' + encodeURIComponent(app.state.form.message || '哭哭預覽圖') + (app.state.form.ccImageStyle == 'facebook' ? '?style=facebook' : '')
)

const checkStatus = (response) => {
	if (response.status >= 200 && response.status < 300) {
		console.log(response.status);
		return response;
	} else {
		var error = new Error(response.statusText);
		error.response = response;
		throw error;
	}
}

class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			messages: {},
			form: {
				mode: 'text',
				ccImageStyle: 'default',
				message: ''
			},
			status: 'idle'
		}

		this.onFormUpdate = this.onFormUpdate.bind(this);
		this.onFormSubmit = this.onFormSubmit.bind(this);
		this.updateQueueNumber = this.updateQueueNumber.bind(this);
		this.deleteAttacheImage = this.deleteAttacheImage.bind(this);
		this.validateAndPreviewAttachImage = this.validateAndPreviewAttachImage.bind(this);
	}

	deleteAttacheImage(e) {
		this.state.form.attachImage = null;
		this.setState({
			form: this.state.form
		});
	}

	validateAndPreviewAttachImage(files) {
		if(files.length == 0) {
			this.setState({
				previewDataUrl: null
			});
			return;
		}

		var file = files[0];
		var data = new FormData();
		data.append('image', file);

		fetch('/api/previewAttachImage', {
			method: 'POST',
			body: data
		}).then(checkStatus)
		.then((response) => (
			response.text()
		)).then((result) => {
			this.state.form.attachImage = file;
			this.setState({
				previewDataUrl: result
			});
		}).catch(console.error);
	}

	onFormUpdate(e) {
		if(e.target.type == 'file') {
			this.validateAndPreviewAttachImage(e.target.files);
		} else {
			this.state.form[e.target.name] = e.target.value;
		}
		this.setState({
			form: this.state.form
		});
	}

	onFormSubmit(e) {
		e.preventDefault();

		//Update status
		this.setState({
			status: 'action'
		});

		//Prepare body
		var data = new FormData();
		for(var i in this.state.form)
			data.append(i, this.state.form[i]);

		//Send AJAX Request
		fetch('/api/cc', {
			method: 'POST',
			body: data
		}).then((response) => (	//Parse response to json
			response.json()
		)).then((result) => {
			// Parsing succeeded
			console.log(result);
			if(result.success) {
				//Posting succeeded
				this.state.messages.success = '哭哭成功，請等待粉絲專頁發文';
				this.setState({
					status: 'posted',
					messages: this.state.messages
				});
				this.updateQueueNumber();
			} else {
				//Posting failed
				this.state.messages.error = result.message;
				this.setState({
					messages: this.state.messages,
					status: 'idle'
				});

				//Duplicated post
				if(result.errorCode == 500000) {
					if(result.samePost.postId != undefined) {
						this.setState({
							status: 'action'
						});
						//Redirect to the post
						setTimeout(function() {
							window.location = 'https://www.facebook.com/permalink.php?story_fbid=' + result.samePost.postId + '&id=' + config.pageId;
						}, 1500);
					}
				}
			}
		}).catch((err) => {
			//Other error, show error message
			this.state.messages.error = err.message;
			this.setState({
				messages: this.state.messages
			});
			console.error(err)
		})
	}

	componentDidMount() {
		this.updateQueueNumber();
		setInterval(this.updateQueueNumber, 5000);
	}

	updateQueueNumber() {
		fetch('/api/queueNumber')
			.then((response) => (
				response.json()
			)).then((queueNumber) => {
				this.setState({
					queueNumber: queueNumber
				});
			}).catch((err) => {
				console.error(err)
			})
	}

	render() {
		return (
			<div className="container">
				<div className="jumbotron">
					<h1>哭哭北科 <small>beta</small></h1>
					<p>自由地哭哭，完全匿名。</p>
					<p><a id="link-page" className="btn btn-primary btn-lg" href={'https://facebook.com/' + config.pageId} target="_blank" role="button">粉絲專頁</a></p>
				</div>

				<h2>我要哭哭</h2>
				{
					this.state.messages.success && (
						<div className="alert alert-success" role="alert">{this.state.messages.success}</div>
					)
				}
				{
					this.state.messages.error && (
						<div className="alert alert-danger" role="alert">{this.state.messages.error}</div> 
					)
				}
				{
					this.state.queueNumber != undefined ? (
						<div className="alert alert-info" role="alert">
							{ this.state.queueNumber > 0 ? '目前有' + this.state.queueNumber + '個同學排隊要哭哭' : '同學們現在都笑笑的'}
						</div>
					) : null
				}

				{

					this.state.status != 'posted' && (
						<form onSubmit={this.onFormSubmit}>
							<label className="radio-inline">
								<input type="radio" name="mode" value="text" checked={this.state.form.mode == 'text'} onChange={this.onFormUpdate}/> 純文字 / 上傳圖片
							</label>
							<label className="radio-inline">
								<input type="radio" name="mode" value="ccImage" checked={this.state.form.mode == 'ccImage'} onChange={this.onFormUpdate}/> 哭哭文字圖
							</label>

							{
								this.state.form.mode == 'ccImage' && (
									<select className="form-control" name="ccImageStyle" value={this.state.form.ccImageStyle} onChange={this.onFormUpdate}>
										<option value="default">預設樣式</option>
										<option value="facebook">Facebook樣式</option>
									</select>
								)
							}

							<textarea id="message" name="message" className="form-control" rows="3" placeholder="至少10個字" value={this.state.form.message} onChange={this.onFormUpdate}></textarea>
							{
								this.state.form.mode == 'text' ? (
									<div>
										{
											this.state.form.attachImage ? (
												<div className="alert alert-info text-center" role="alert">
													注意，附加圖片需等待人工審核
												</div>
											) : (
												<label className="btn btn-default btn-block">
													附加圖片
													<input type="file" name="attachImage" className="hidden" accept="image/*" onChange={this.onFormUpdate}/>
												</label>
											)
										}
										{
											this.state.form.attachImage && this.state.previewDataUrl && (
												<div className="row">
													<div className="text-center row col-md-6 col-md-off col-md-offset-3 col-sm-12">
														<img style={{maxWidth:'100%'}} alt="上傳預覽圖" src={this.state.previewDataUrl}/>
													</div>
												</div>
											)
										}
									</div>
								) : (
									<center><img alt="哭哭預覽圖" src={getPreviewImageUrl(this)}/></center>
								)
							}
							{
								this.state.form.attachImage && (
									<button type="button" className="btn btn-danger btn-block" onClick={this.deleteAttacheImage}>刪除圖片</button>
								)
							}
							<button type="submit" className="btn btn-primary btn-block" disabled={this.state.form.message.length < 10 || this.state.status != 'idle'}>哭哭 😢</button>
						</form>
					)
				}
			</div>
		)
	}
}


ReactDom.render( <App/> , document.getElementById('app'));