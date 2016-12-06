var model = require('./model.js'),
	config = require('./config.js')(),
	ccImage = require('./cc-image.js'),
	attachImage = require('./attach-image.js'),
	rp = require('request-promise');

const timeString = (date) => {
	if (config.timezoneOffset)
		date = new Date(date.getTime() + config.timezoneOffset);
	return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + ('0' + date.getMinutes()).substr(-2);
}

var publish = async(post) => {

	var publishMessage = '#哭哭北科' + post.serialNumber +
		(post.mode == 'text' ? '\n' + post.message : '') +
		'\n\n🎺 匿名哭哭: ' + config.ccUrl +
		'\n😢 哭哭時間: ' + timeString(post.submitTime);

	var requestOptions = {
		method: 'POST',
		json: true
	};

	if (post.mode == 'ccImage') {
		//Post CC-Image
		requestOptions.uri = 'https://graph.facebook.com/' + config.pageId + '/photos?access_token=' + config.pageToken + '&caption=' + encodeURIComponent(publishMessage);

		//Generate CC-Image
		var options = {
			stream: false
		};
		if (post.ccImageOptions)
			for (var i in post.ccImageOptions)
				options[i] = post.ccImageOptions[i];
		var img = await ccImage(post.message, options);

		//Prepare form-data
		requestOptions.formData = {
			source: {
				value: img.buffer,
				options: {
					filename: 'ccImage.png',
					contentType: 'image/png'
				}
			}
		}
	} else if (post.mode == 'text') {
		//Post text with Attachment
		if (post.attachImage) {
			requestOptions.uri = 'https://graph.facebook.com/' + config.pageId + '/photos?access_token=' + config.pageToken + '&caption=' + encodeURIComponent(publishMessage);
			requestOptions.formData = {
				source: {
					value: await attachImage(post.attachImage.path, {
						toBuffer: true
					}),
					options: {
						filename: 'attachImage.png',
						contentType: 'image/png'
					}
				}
			}
		} else {
			//Post Plain Text
			requestOptions.uri = 'https://graph.facebook.com/' + config.pageId + '/feed?access_token=' + config.pageToken + '&message=' + encodeURIComponent(publishMessage) + (link ? '&link=' + encodeURIComponent(link) : '');

			//Check if there is link
			var linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi,
				match;

			if (match = linkRegex.exec(post.message))
				requestOptions.link = match[0];
		}
	} else {
		throw new Error('unexpected mode');
	}

	try {
		//POST request
		var response = await rp(requestOptions);
	} catch (err) {
		if (err.response)
			throw err.response.body;
		else
			throw err;
	}

	if (!response.id)
		throw response;

	//Get Post Id
	if (post.mode == 'ccImage' || post.attachImage)
		var postId = response.id;
	else
		var postId = (/_(\d+)$/).exec(response.id)[1];

	//Set post as published
	post.published = true;
	post.publishTime = new Date();
	post.publishedMessage = publishMessage;
	post.postId = postId;
	await post.save();

	return response;
}

var sleep = function(time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}

var update = async function() {
	var nextPost = await model.Post.findOne({
		published: false,
		failed: false,
		approved: true
	}).sort({
		serialNumber: 1
	});
	if (nextPost != null) {
		if (config.lastPostTime == undefined || ((new Date()).getTime() - config.lastPostTime.getTime() >= config.ccInterval)) {
			console.log('trying to post ' + nextPost + '...');
			try {
				var res = await publish(nextPost);
				console.log(res);
				config.lastPostTime = new Date();
				config.save();

				//Sleep for interval time
				await sleep(config.ccInterval);
			} catch (err) {
				console.error(err);
				nextPost.failed = true;
				nextPost.error = err;
				await nextPost.save();
			}
		}
	} else {
		//sleep for 1 minute
		//await sleep()
	}
}

var main = async() => {
	await model.connect();

	if (config.lastPostTime != undefined)
		config.lastPostTime = new Date(config.lastPostTime);

	console.log('Entering main loop...');
	while (true) {
		try {
			await update();
		} catch (err) {
			console.error(err);
		}
	}

	model.connection.close();
}

main();