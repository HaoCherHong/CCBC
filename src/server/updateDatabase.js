var model = require('./model.js');

var main = async() => {

	//Connect database
	await model.connect();

	//Update posts who doesn't have 'failed' field
	console.log('Updating posts which doesn\'t have "failed" field');
	var result = await model.Post.update({
		failed: {
			$exists: false
		}
	}, {
		failed: false
	}, {
		multi: true
	});

	console.log(await model.Post.count({
		mode: {
			$exists: false
		}
	}))

	console.log('Updating posts which doesn\'t have "mode" field');
	var result = await model.Post.update({
		mode: {
			$exists: false
		}
	}, {
		mode: 'text'
	}, {
		multi: true
	});

	console.log(result);

	model.connection.close();
};

main();