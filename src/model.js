var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = {
    connection: mongoose.connection
};

module.exports.connect = () => {
	return new Promise((resolve, reject)=> {
		var db = mongoose.connection;
	    db.on('error', reject);
	    db.once('open', resolve);
	    mongoose.connect('mongodb://localhost/ccbc');
	})
};

var postSchema = new mongoose.Schema({
	published: {
		type: Boolean,
		required: true,
		default: false
	},
	serialNumber: {
		type: Number,
		required: true
	},
	postId: String,
	message: {
		type: String,
		required: true
	},
	originalMessage: {
		type: String,
		required: true
	},
	submitTime: {
		type: Date,
		required: true
	},
	publishTime: Date
});

postSchema.index({serialNumber: 1}, { unique: true});
postSchema.index({published: 1, serialNumber: 1});
postSchema.index({submitTime: 1 });
postSchema.index({publishTime: 1 });

module.exports.Post = mongoose.model('Post', postSchema);