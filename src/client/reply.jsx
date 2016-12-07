var React = require('react'),
	config = require('./config.js');

require('whatwg-fetch');

const loadFBSDK = () => {
	return new Promise((resolve, reject) => {
		window.fbAsyncInit = function() {
			FB.init({
		    	appId      : config.appId,
		    	xfbml      : true,
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
		this.state.form[e.target.name] = e.target.value;
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

		//Send AJAX Request
		fetch('/api/reply/' + this.props.params.postId, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(this.state.form)
		}).then((response) => (
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
		if(form.message.length < 10)
			return false;
		if(!form.character)
			return false;
		return true;
	}

	async componentDidMount() {
		await loadFBSDK();

		//load reply characters
		fetch('/api/replyCharacters')
			.then((response)=>(response.json()))
			.then((characters)=>{
				if(characters.length > 0)
					this.state.form.character = characters[0].pageId;
				this.setState({
					characters: characters,
					form: this.state.form
				});
			})
			.catch((err) => {
				//Other error, show error message
				this.state.messages.error = err.message;
				this.setState({
					messages: this.state.messages
				});
				console.error(err)
			})
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
				<div className="fb-post" data-width="auto" data-href={'https://www.facebook.com/' + config.pageId + '/posts/' + this.props.params.postId + '/'}></div>
				<form onSubmit={this.onFormSubmit}>
					<div className="form-group">
						<label htmlFor="character">哭哭角色</label>
						<select className="form-control" id="character" name="character" value={this.state.form.ccImageStyle} onChange={this.onFormUpdate}>
						{
							this.state.characters.map((character)=>(
								<option key={character.pageId} value={character.pageId}>{character.name}</option>
							))			
						}
						</select>
						<textarea id="message" name="message" className="form-control" rows="3" placeholder="至少10個字" value={this.state.form.message} onChange={this.onFormUpdate}></textarea>
						<button type="submit" className="btn btn-primary btn-block" disabled={!this.validateForm() || this.state.status != 'idle'}>哭哭 😢</button>
					</div>
				</form>
			</div>
		)
	}
}

module.exports = Reply;