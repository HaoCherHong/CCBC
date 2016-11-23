var express = require('express'),
	bodyParser = require('body-parser'),
	model = require('./model.js'),
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

	var doc = await model.Post.create({
		serialNumber: serialNumber,
		submitTime: new Date(),
		message: message
	});

	return doc;
}

var exchangeToken = async (shortLivedToken) => {

	var longLivedToken = await rp('https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=' + config.appId + '&client_secret=' + config.appSecret + '&fb_exchange_token=' + encodeURIComponent(shortLivedToken));
	longLivedToken = /access_token=(.+)/.exec(longLivedToken)[1];
	
	return longLivedToken;
}

var updatePageToken = async () => {
	var pageAccessToken = await rp('https://graph.facebook.com/' + config.pageId + '?fields=access_token&access_token=' + config.longLivedToken);
	pageAccessToken = JSON.parse(pageAccessToken)['access_token'];
	config.pageToken = pageAccessToken;
	config.save();
};

app.use(express.static('public'));

app.get('/api/queueNumber', async(req, res, next) => {
	var count = await model.Post.count({
		published: false
	});
	res.json(count);
})

app.post('/api/cc', async(req, res, next) => {
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

app.get('/api/setAccessToken', async(req, res, next)=> {
	if(req.ip != '::ffff:127.0.0.1' && req.ip != '::1')
		return next('forbidden');
	if(req.query.accessToken == undefined)
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
	} catch(err) {
		next(err);
	}

})

app.use((err, req, res, next) => {
	console.error(err);
	res.send(err);
})

var main = async() => {
	await model.connect();
	await updatePageToken();
	app.listen(config.port, function() {
		console.log('Example app listening on port ' + config.port);
	});
}

main();