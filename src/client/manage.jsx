var React = require('react')
	ReactDom = require('react-dom');

global.jQuery = global.$ = require("jquery");

window.React = React;

class Manage extends React.Component {
	constructor(props) {
		super(props);

		this.state = {

		}

		this.block = this.block.bind(this);
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

	render() {
		return (
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
									(!post.published && !post.failed) ?
									(
										<button onClick={this.block.bind(null, post)}>Block</button>
									) : null
								}
								</td>
							</tr>
						))
					}
					</tbody>
				</table>
			</div>
		)
	}
}

ReactDom.render( <Manage/> , document.getElementById('app'));