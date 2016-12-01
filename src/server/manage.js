var express = require('express'),
	model = require('./model.js'),
	config = require('./config.js')(),
	rp = require('request-promise');

var app = express();

app.handleManageRequest = async(req, res, next) => {
	//Logout using query string
	if (req.query.logout || req.query.logout != undefined) {
		req.session.isAdmin = false;
		res.redirect('/');
	}

	//Skip validation when isAdmin = true stored in session
	if (req.session.isAdmin)
		return next();

	console.log(req.originalUrl);
	var currentUri = req.protocol + '://' + req.get('host') + req.originalUrl;

	//Redirect to facebook login page if code not provided
	if (req.query.code == undefined) {
		var url = 'https://www.facebook.com/v2.8/dialog/oauth?scope=manage_pages,publish_pages,read_page_mailboxes,pages_show_list,pages_manage_cta,pages_manage_instant_articles&response_type=code&client_id=' + config.appId +
			'&redirect_uri=' + encodeURIComponent(currentUri);
		return res.redirect(url);
	}

	//Authenticate user
	try {
		console.log('Authenticating user...');
		var accessToken = await exchangeAccessTokenFromCode(req.query.code, currentUri);
		var isAdmin = await checkIsAdmin(accessToken);
		if (!isAdmin)
			throw 'user is not admin of this page';

		req.session.isAdmin = true;
		console.log('redirecting to ' + req.path);
		res.redirect(req.path);
	} catch (err) {
		res.redirect('/');
	}
};

var checkIsAdmin = async(accessToken, next) => {
	var uri = next || 'https://graph.facebook.com/me/accounts?access_token=' + encodeURIComponent(accessToken) + '&fields=accounts{app_id}&limit=1';
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

var exchangeAccessTokenFromCode = async(code, redirectUri) => {
	var accessToken = await rp({
		uri: 'https://graph.facebook.com/v2.8/oauth/access_token?client_id=' + config.appId + '&client_secret=' + config.appSecret + '&code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(redirectUri),
		json: true
	});

	return accessToken.access_token;
}

var exchangeToken = async(shortLivedToken) => {
	var longLivedToken = await rp('https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=' + config.appId + '&client_secret=' + config.appSecret + '&fb_exchange_token=' + encodeURIComponent(shortLivedToken));
	longLivedToken = /access_token=(.+)/.exec(longLivedToken)[1];
	return longLivedToken;
}

var updatePageToken = async() => {
	console.log('Updating page token...');
	var pageAccessToken = await rp('https://graph.facebook.com/' + config.pageId + '?fields=access_token&access_token=' + config.longLivedToken);
	console.log('pageAccessToken: ' + pageAccessToken);
	pageAccessToken = JSON.parse(pageAccessToken)['access_token'];
	config.pageToken = pageAccessToken;
	config.save();
	console.log('Page token updated.');
};


app.use((req, res, next) => {
	if(!req.session.isAdmin)
		return res.status(403).send('forbidden');
	next();
});

app.get('/setAccessToken', async(req, res, next) => {
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

app.get('/posts', async(req, res, next)=> {
	var fields = ['published', 'failed'];

	var criteria = {}

	for(let f in fields)
		if(req.query[fields[f]] != undefined)
			criteria[fields[f]] = req.query[fields[f]];

	var posts = await model.Post.find(criteria);

	res.send(posts);
});

app.post('/posts/:postId/block', async(req, res, next) => {

	var post = await model.Post.findById(req.params.postId);

	if(post.published) {
		return res.send({
			success: false,
			postId: postId,
			message: 'post is already published'
		});
	}

	post.failed = true;
	post.error = "Blocked by admin at " + (new Date()).toString();

	await post.save();

	res.send({
		success: true
	});
})

module.exports = app;