var React = require('react'),
	fbsdk = require('./fbsdk.js'),
	config = require('./config.js');

require('whatwg-fetch');

const checkStatus = (response) => {
	if (response.status >= 200 && response.status < 300) {
		return response;
	} else {
		var error = new Error(response.statusText);
		error.response = response;
		throw error;
	}
}

class Reply extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			status: 'idle',
			characters: [],
			form: {
				message: ''
			},
			messages: {}
		}

		this.onFormUpdate = this.onFormUpdate.bind(this);
		this.onFormSubmit = this.onFormSubmit.bind(this);
		this.validateForm = this.validateForm.bind(this);
	}

	onFormUpdate(e) {
		var name = e.target.name;
		this.state.form[name] = e.target.value;
		this.setState({
			form: this.state.form
		}, ()=> {
			if(name == 'character')
				FB.XFBML.parse();
		});
	}

	onFormSubmit(e) {
		e.preventDefault();

		//Update status
		this.setState({
			status: 'action'
		});

		//Send AJAX Request
		fetch('/api/reply/' + this.state.postId, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(this.state.form)
		})
		.then(checkStatus)
		.then((response) => (
			response.json()
		)).then((result) => {
			window.location = 'https://facebook.com/' + result.id;
		}).catch((err) => {
			//Other error, show error message
			this.state.messages.error = err.message;
			this.setState({
				messages: this.state.messages
			});
			console.error(err)
		})
	}

	validateForm() {
		var form = this.state.form;
		if(form.message.trim().length == 0)
			return false;
		if(!form.character)
			return false;
		return true;
	}

	async componentDidMount() {
		var errorHandler = (err) => {
			this.state.messages.error = err.message;
			this.setState({
				messages: this.state.messages
			});
			console.error(err)
		};

		fetch('/api/posts/' + this.props.params.serialNumber)
			.then(checkStatus)
			.then((response)=>(response.json()))
			.then((post)=>{
				this.setState({
					postId: post.postId
				});
			})
			.then(()=>{
				//load reply characters
				return fetch('/api/replyCharacters')
					.then(checkStatus)
					.then((response)=>(response.json()))
					.then((characters)=>{
						if(characters.length > 0)
							this.state.form.character = characters[0].pageId;
						this.setState({
							characters: characters,
							form: this.state.form
						}, async ()=>{
							//On postId set
							if(window.FB != undefined)
								FB.XFBML.parse();
							else
								fbsdk();
						});
					});
			})
			.catch(errorHandler)
	}

	render() {
		return (
			<div>
				<h2>匿名回覆</h2>
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
					this.state.postId && (
						<div>
							<div className="fb-post" data-width="auto" data-href={'https://www.facebook.com/' + config.pageId + '/posts/' + this.state.postId + '/'}></div>
							<form className="row" onSubmit={this.onFormSubmit}>
								<div className="col-md-7">
									<div className="form-group">
										<label htmlFor="character">哭哭角色</label>
										<select className="form-control" id="character" name="character" value={this.state.form.ccImageStyle} onChange={this.onFormUpdate}>
										{
											this.state.characters.map((character)=>(
												<option key={character.pageId} value={character.pageId}>{character.name}</option>
											))			
										}
										</select>
									</div>
									<textarea id="message" name="message" className="form-control" rows="3" placeholder="回覆內容" value={this.state.form.message} onChange={this.onFormUpdate}></textarea>
									<button type="submit" className="btn btn-primary btn-block" disabled={!this.validateForm() || this.state.status != 'idle'}>哭哭 😢</button>

								</div>
								{
									this.state.form.character && (
										<div className="fb-page col-md-5 text-right" style={{paddingTop: '25px'}}
											data-href={'https://www.facebook.com/' + this.state.form.character} data-width="450" data-hide-cta="true" data-adapt-container-width="true"></div>
									)
								}
							</form>
						</div>
					)
				}
				
			</div>
		)
	}
}

module.exports = Reply;