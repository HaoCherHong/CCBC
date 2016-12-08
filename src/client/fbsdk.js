var config = require('./config.js');

module.exports = () => {
	return new Promise((resolve, reject) => {
		if(window.FB != undefined)
			return resolve(window.FB);

		window.fbAsyncInit = function() {
			FB.init({
		    	appId      : config.appId,
		    	xfbml      : true,
		    	version    : 'v2.8'
		    });
		    FB.AppEvents.logPageView();
		    resolve(FB);
		};
		(function(d, s, id) {
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) 
				return;
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
	})
}