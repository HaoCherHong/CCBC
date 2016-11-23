var model = require('./model.js'),
	config = require('./config.json'),
	rp = require('request-promise');

var lastPostTime;

var publish = async (post) => {
	var response = await rp({
		method: 'POST',
		uri: 'https://graph.facebook.com/' + config.pageId + '/feed?access_token=' + config.pageAccessToken + '&message=' + encodeURIComponent(post.message)
	});
	response = JSON.parse(response);

	if(!response.id)
		throw response;

	var postId = (/_(\d+)$/).exec(response.id)[1];

	post.published = true;
	post.publishTime = new Date();
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
		if(lastPostTime == undefined || ((new Date()).getTime() - lastPostTime.getTime() >= config.kobeInterval))  {
			try {
				var res = await publish(nextPost);
				console.log(res);
				lastPostTime = new Date();

				//Sleep for interval time
				await sleep(config.kobeInterval);
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

	while(true) {
		await update();
	}

	model.connection.close();
}

main();