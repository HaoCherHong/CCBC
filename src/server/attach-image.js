var fs = require('fs'),
	Canvas = require('canvas'),
	Image = Canvas.Image;

const getWatermark = async() => {
	return new Promise((resolve, reject) => {
		fs.readFile(__dirname + '/watermarks/watermark_image.png', function(err, watermark) {
			if (err)
				return reject(err);

			var img = new Image;
			img.onload = resolve.bind(null, img);
			img.onerror = reject;
			img.src = watermark;
		});
	})
}

var getProcessedImage = function(input, options) {
	return new Promise(async(resolve, reject) => {
		var imageBuffer;

		if(typeof(input) == 'string')
			imageBuffer = fs.readFileSync(input);
		else
			imageBuffer = input;

		if(!options)
			options = {};

		try {
			//Load the image
			var image = new Image;
			await new Promise((resolve, reject) => {
				image.onerror = reject;
				image.onload = resolve;
				image.src = imageBuffer;
			});
		} catch(err) {
			return reject(err);
		}

		//Prepare arguments
		var watermarkHeight = options.watermarkHeight || 30,
			ratio = image.width / image.height,
			width = image.width,
			height = image.height;

		//Mesure texts and split lines
		var canvas = new Canvas(image.width, image.height),
			ctx = canvas.getContext('2d');

		//Draw the image
		ctx.drawImage(image, 0, 0, width, height);

		//Draw watermark
		var watermark = await getWatermark();

		var watermarkHeight = watermarkHeight,
			watermarkWidth = watermark.width / watermark.height * watermarkHeight;

		ctx.drawImage(watermark, width - watermarkWidth, height - watermarkHeight, watermarkWidth, watermarkHeight);

		if(options.toBuffer) {
			canvas.toBuffer((err, buffer) => {
				if(err)
					return reject(err);
				resolve(buffer);
			});
		} else
			resolve(canvas.toDataURL('image/png'));
	})
}

module.exports = getProcessedImage;