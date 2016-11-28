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

var exchangeAccessTokenFromCode = async(code, redirectUri) => {
	var accessToken = await rp({
		uri: 'https://graph.facebook.com/v2.8/oauth/access_token?client_id=' + config.appId + '&client_secret=' + config.appSecret + '&code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(redirectUri),
		json: true
	});

	return accessToken.access_token;
}

var checkIsAdmin = async(accessToken, next) => {
	var uri = next || 'https://graph.facebook.com/me/accounts?access_token=' + encodeURIComponent(accessToken) + '&fields=accounts{app_id}&limit=1';
	console.log(uri);
	var accounts = await rp({
		uri: uri,
		json: true
	});

	//No data in this page, return false
	if (accounts.data.length == 0)
		return false;

	var pageIds = accounts.data.map((object) => object.id);

	//Check if page id exists in returned array
	if (pageIds.indexOf(config.pageId.toString()) != -1)
		return true;

	//Search for next page if accounts.paging.next returned, otherwise returns false
	if (accounts.paging.next)
		return await checkIsAdmin(accessToken, accounts.paging.next);
	else
		return false;
}

var exchangeToken = async(shortLivedToken) => {
	try {
		var longLivedToken = await rp('https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=' + config.appId + '&client_secret=' + config.appSecret + '&fb_exchange_token=' + encodeURIComponent(shortLivedToken));
		longLivedToken = /access_token=(.+)/.exec(longLivedToken)[1];
	} catch (err) {
		if (err.response)
			throw err.response;
		else
			throw err;
	}

	return longLivedToken;
}

var updatePageToken = async() => {
	console.log('Updating page token...');
	try {
		var pageAccessToken = await rp('https://graph.facebook.com/' + config.pageId + '?fields=access_token&access_token=' + config.longLivedToken);
	} catch (err) {
		if (err.response)
			throw err.response;
		else
			throw err;
	}
	console.log('pageAccessToken: ' + pageAccessToken);
	pageAccessToken = JSON.parse(pageAccessToken)['access_token'];
	config.pageToken = pageAccessToken;
	config.save();
	console.log('Page token updated.');
};

app.get(/^\/manage(\.html)?/, async(req, res, next) => {
	var redirectUri = req.protocol + '://' + req.get('host') + req.originalUrl;
	if (req.query.code == undefined) {
		//Redirect to facebook login page
		var url = 'https://www.facebook.com/v2.8/dialog/oauth?scope=manage_pages,publish_pages,read_page_mailboxes,pages_show_list,pages_manage_cta,pages_manage_instant_articles&response_type=code&client_id=' + config.appId +
			'&redirect_uri=' + encodeURIComponent(redirectUri);
		return res.redirect(url);
	}
	try {
		var accessToken = await exchangeAccessTokenFromCode(req.query.code, redirectUri);
		var isAdmin = await checkIsAdmin(accessToken);
		if (!isAdmin)
			throw 'user is not admin of this page';
		next();
	} catch (err) {
		res.redirect('/');
	}
});

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
	if (req.body.mode == undefined)
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
	if (req.query.accessToken == undefined)
		return next('accessToken required');

	try {
		var isAdmin = await checkIsAdmin(req.query.accessToken);
		if (!isAdmin)
			return res.status(403).send('forbidden');

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
	if (err.response)
		err = err.response.body;
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
		console.log('App is listening on port ' + config.port);
	});
}

main();