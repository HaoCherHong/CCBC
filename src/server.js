var express = require('express'),
	bodyParser = require('body-parser'),
	model = require('./model.js'),
	config = require('./config.json');

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}));

// parse application/json
app.use(bodyParser.json());

const timeString = (date) => {
	return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + ('0' + date.getMinutes()).substr(-2);
}

var newPost = async(message) => {

	var latestPost = await model.Post.findOne(null, {
		_id: 0,
		serialNumber: 1
	}).sort({
		serialNumber: -1
	});
	var serialNumber = 1;
	if (latestPost)
		serialNumber = latestPost.serialNumber + 1;

	console.log(serialNumber + ': ' + message);

	message = '#哭哭北科' + serialNumber + '\n' + message;
	message += '\n\n' + timeString(new Date());


	var doc = await model.Post.create({
		serialNumber: serialNumber,
		submitTime: new Date(),
		message: message
	});

	return doc;
}

app.use(express.static('public'));

app.get('/api/queueNumber', async(req, res, next) => {
	var count = await model.Post.count({
		published: false
	});
	res.json(count);
})

app.post('/api/kobe', async(req, res, next) => {
	if (req.body.message == undefined)
		return next('message required');

	try {
		var doc = await newPost(req.body.message);

		res.json({
			success: true
		});

	} catch (e) {
		next(e);
	}
})

app.use((err, req, res, next) => {
	console.error(err);
	res.send(err);
})

var main = async() => {
	await model.connect();
	app.listen(config.port, function() {
		console.log('Example app listening on port ' + config.port);
	});
}

main();