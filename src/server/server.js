var express = require('express'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	bodyParser = require('body-parser'),
	model = require('./model.js'),
	ccImage = require('./cc-image.js'),
	config = require('./config.js')(),
	rp = require('request-promise'),
	emojiFavicon = require('emoji-favicon'),
	manage = require('./manage.js');

var app = express();

app.use(emojiFavicon('cry'));

// Sessions Store
app.use(session({
	secret: 'ccbctech',
	resave: false,
	saveUninitialized: true,
	store: new MongoStore({
		mongooseConnection: model.connection
	})
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}));

// parse application/json
app.use(bodyParser.json());

var newPost = async(params) => {

	console.log('creating post from params ' + JSON.stringify(params));

	var latestPost = await model.Post.findOne(null, {
		_id: 0,
		serialNumber: 1
	}).sort({
		serialNumber: -1
	});
	var serialNumber = 1;
	if (latestPost)
		serialNumber = latestPost.serialNumber + 1;

	console.log(serialNumber + ': ' + params.message + '(' + params.mode + ')');

	var doc = await model.Post.create({
		serialNumber: serialNumber,
		submitTime: new Date(),
		message: params.message,
		mode: params.mode,
		ccImageOptions: params.ccImageOptions
	});

	return doc;
}

app.get(/^\/manage(\.html)?/, manage.handleManageRequest);

app.use(express.static('public'));

app.get('/api/ccImage/:text', async(req, res, next) => {
	try {
		var options;
		if (req.query.style == 'facebook')
			options = {
				fontColor: '#3b5998',
				backgroundColor: '#ffffff',
				watermarkId: 'facebook'
			};
		var img = await ccImage(req.params.text, options);

		res.writeHead(200, {
			'Content-Type': 'image/png',
			'Content-Length': img.buffer.length
		});
		res.end(img.buffer);
	} catch (err) {
		next(err);
	}
})

app.get('/api/queueNumber', async(req, res, next) => {
	var count = await model.Post.count({
		published: false,
		failed: false
	});
	res.json(count);
})

app.post('/api/cc', async(req, res, next) => {
	if (req.body.message == undefined)
		return next({
			message: 'message required'
		});
	if (req.body.mode == undefined)
		return next({
			message: 'mode required'
		});

	if (req.body.message.length < 10)
		return next({
			message: 'message is too short'
		});

	try {
		//Check if post with same message exists
		var samePost = await model.Post.findOne({
			message: req.body.message
		}, {
			_id: 0,
			postId: 1,
			submitTime: 1
		});

		if (samePost != null) {
			return res.json({
				success: false,
				errorCode: 500000,
				message: '這個東西已經有人哭過了',
				samePost: samePost
			});
		}

		
		//Prepare CCImage Options
		var ccImageOptions;
		if (req.body.ccImageStyle == 'facebook')
			ccImageOptions = {
				fontColor: '#3b5998',
				backgroundColor: '#ffffff',
				watermarkId: 'facebook'
			};

		//Create a new post
		var doc = await newPost({
			message: req.body.message,
			mode: req.body.mode,
			ccImageOptions: ccImageOptions
		});

		res.json({
			success: true
		});

	} catch (e) {
		next(e);
	}
})

app.use('/api/manage', manage);

app.use((err, req, res, next) => {
	if(err.status)
		res.status(err.status);

	res.json({
		success: false,
		message: err.message
	});

	console.error(err);
})

var main = async() => {
	await model.connect();
	try {
		await updatePageToken();
	} catch (err) {
		console.error(err.message);
	}
	app.listen(config.port, function() {
		console.log('App is listening on port ' + config.port);
	});
}

main();