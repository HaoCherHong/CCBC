var fs = require('fs');
var path = __dirname + '/config.json',
	config;

module.exports = function () {
	if (!config) {
		console.log('loading config...');
		config = JSON.parse(fs.readFileSync(path, 'utf8'));
		
        config.save = function () {
            console.log('saving config...');
            fs.writeFileSync(path, JSON.stringify(config, null, '\t'));
            console.log('config saved.');
            // console.log(JSON.stringify(config, null, '\t'));
        }
        console.log('config loaded.');
        // console.log(JSON.stringify(config, null, '\t'));
	}
	return config;
}