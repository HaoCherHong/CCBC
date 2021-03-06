var express = require('express'),
	bodyParser = require('body-parser'),
	model = require('./model.js'),
	ccImage = require('./cc-image.js'),
	config = require('./config.js')(),
	rp = require('request-promise'),
	emojiFavicon = require('emoji-favicon');

var app = express();

app.use(emojiFavicon('cry'));

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
		mode: params.mode
	});

	return doc;
}

var exchangeToken = async(shortLivedToken) => {
	var longLivedToken = await rp('https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=' + config.appId + '&client_secret=' + config.appSecret + '&fb_exchange_token=' + encodeURIComponent(shortLivedToken));
	longLivedToken = /access_token=(.+)/.exec(longLivedToken)[1];

	return longLivedToken;
}

var updatePageToken = async() => {
	var pageAccessToken = await rp('https://graph.facebook.com/' + config.pageId + '?fields=access_token&access_token=' + config.longLivedToken);
	pageAccessToken = JSON.parse(pageAccessToken)['access_token'];
	config.pageToken = pageAccessToken;
	config.save();
};

app.use(express.static('public'));

app.get('/api/ccImage/:text', async(req, res, next) => {
	try {
		var img = await ccImage(req.params.text);

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
		return next('message required');
	if(req.body.mode == undefined)
		return next('mode required');

	if (req.body.message.length < 10)
		return next('message is too short');

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

		//Create a new post
		var doc = await newPost({
			message: req.body.message,
			mode: req.body.mode
		});

		res.json({
			success: true
		});

	} catch (e) {
		next(e);
	}
})

app.get('/api/setAccessToken', async(req, res, next) => {
	if (req.ip != '::ffff:127.0.0.1' && req.ip != '::1')
		return next('forbidden');
	if (req.query.accessToken == undefined)
		return next('accessToken required');

	try {
		var longLivedToken = await exchangeToken(req.query.accessToken);
		console.log(longLivedToken);
		config.longLivedToken = longLivedToken;
		config.save();
		res.send({
			success: true
		});
		updatePageToken();
	} catch (err) {
		next(err);
	}

})

app.use((err, req, res, next) => {
	console.error(err);
	res.send(err);
})

var main = async() => {
	await model.connect();
	try {
		await updatePageToken();
	} catch (err) {
		console.error(err.message);
	}
	app.listen(config.port, function() {
		console.log('Example app listening on port ' + config.port);
	});
}

main();