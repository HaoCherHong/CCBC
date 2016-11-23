var model = require('./model.js'),
	config = require('./config.js')(),
	rp = require('request-promise');

const timeString = (date) => {
	return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + ('0' + date.getMinutes()).substr(-2);
}

var publish = async (post) => {

	var publishMessage = '#哭哭北科' + post.serialNumber + 
		'\n' + post.message +
		'\n\n🎺 匿名哭哭: ' + config.ccUrl + 
		'\n😢 哭哭時間: ' + timeString(new Date());

	try {
		var response = await rp({
			method: 'POST',
			uri: 'https://graph.facebook.com/' + config.pageId + '/feed?access_token=' + config.pageToken + '&message=' + encodeURIComponent(publishMessage),
			json: true
		});
	} catch(err) {
		throw err.message;
	}

	if(!response.id)
		throw response;

	

	var postId = (/_(\d+)$/).exec(response.id)[1];

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

var update = async function () {
	var nextPost = await model.Post.findOne({published: false}).sort({serialNumber: 1});
	if(nextPost != null) {
		if(config.lastPostTime == undefined || ((new Date()).getTime() - config.lastPostTime.getTime() >= config.ccInterval))  {
			try {
				var res = await publish(nextPost);
				console.log(res);
				config.lastPostTime = new Date();
				config.save();

				//Sleep for interval time
				await sleep(config.ccInterval);
			} catch(e) {
				console.error(e);
			}
		}
	} else {
		//sleep for 1 minute
		//await sleep()
	}
}

var main = async () => {
	await model.connect();

	if(config.lastPostTime != undefined)
		config.lastPostTime = new Date(config.lastPostTime);

	console.log('Entering main loop...');
	while(true) {
		try {
			await update();
		} catch(err) {
			console.error(err);
		}
	}

	model.connection.close();
}

main();