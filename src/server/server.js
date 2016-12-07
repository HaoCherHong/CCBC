var express = require('express'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	bodyParser = require('body-parser'),
	model = require('./model.js'),
	ccImage = require('./cc-image.js'),
	attachImage = require('./attach-image.js'),
	config = require('./config.js')(),
	rp = require('request-promise'),
	emojiFavicon = require('emoji-favicon'),
	manage = require('./manage.js'),
	multer = require('multer');

var app = express();

var fileFilter = (req, file, cb) => {
		cb(null, /image\/(jpeg|png)/.test(file.mimetype));
	},
	previewUpload = multer({
		storage: multer.memoryStorage(),
		fileFilter: fileFilter
	}),
	upload = multer({
		dest: 'uploads/',
		fileFilter: fileFilter
	});


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

	var options = {
		serialNumber: serialNumber,
		submitTime: new Date(),
		message: params.message,
		mode: params.mode,
		attachImage: params.attachImage,
		ccImageOptions: params.ccImageOptions,
		approved: true
	};

	if(options.attachImage)
		options.approved = false;

	var doc = await model.Post.create(options);

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

app.get('/api/posts/:serialNumber', async(req, res, next) => {
	var post = await model.Post.findOne({
		serialNumber: parseInt(req.params.serialNumber)
	}, {
		_id: 0,
		postId: 1
	});

	if(!post)
		return next({
			status: 404,
			message: 'post not found'
		});

	res.json(post);
})

app.get('/api/replyCharacters', (req, res, next) => {
	//copy from config
	var characters = []
	for(var i in config.replyCharacters) {
		characters.push({
			pageId: config.replyCharacters[i].pageId,
			name: config.replyCharacters[i].name
		});
	}
	res.json(characters);
})

app.post('/api/cc', upload.single('attachImage'), async(req, res, next) => {
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


		var options = {
			message: req.body.message,
			mode: req.body.mode
		};

		if (options.mode == 'text') {
			options.attachImage = req.file;
		} else if (options.mode == 'ccImage') {
			//Prepare CCImage Options
			if (req.body.ccImageStyle == 'facebook')
				options.ccImageOptions = {
					style: 'facebook',
					fontColor: '#3b5998',
					backgroundColor: '#ffffff',
					watermarkId: 'facebook'
				};
		}



		//Create a new post
		var doc = await newPost(options);

		res.json({
			success: true
		});

	} catch (e) {
		next(e);
	}
})

app.post('/api/reply/:postId', async(req, res, next) => {
	if(!req.body.message)
		return next({
			message: 'message required'
		});
	if(!req.body.character)
		return next({
			message: 'character required'
		});

	var characterIndex = config.replyCharacters.map((character)=>(character.pageId)).indexOf(parseInt(req.body.character));
	if(characterIndex == -1)
		return next({
			status: 404,
			message: 'character not found'
		});

	try {
		var response = await rp({
			method: 'POST',
			json: true,
			uri: 'https://graph.facebook.com/' + req.params.postId + '/comments',
			form: {
				message: req.body.message,
				access_token: config.replyCharacters[characterIndex].accessToken
			}
		});

		res.send(response);
	} catch (err) {
		next(err);
	}

})

app.post('/api/previewAttachImage', previewUpload.single('image'), async(req, res, next) => {
	if (!req.file && !req.body.file)
		return next({
			message: 'image required'
		});
	try {
		if(req.file)
			var previewDataUrl = await attachImage(req.file.buffer);
		else
			var previewDataUrl = await attachImage(req.body.file.path);

		res.send(previewDataUrl);
	} catch(err) {
		next(err);
	}
})

app.use('/api/manage', manage);

app.use((err, req, res, next) => {

	res.status(err.status || 400);

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