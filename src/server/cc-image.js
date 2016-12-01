var fs = require('fs'),
	Canvas = require('canvas'),
	Image = Canvas.Image;

var maxLineNumber = 15;

const getLines = (ctx, text, maxWidth) => {
	var lines = [];
	var currentLine = text[0];

	for (var i = 1; i < text.length; i++) {
		var char = text[i];
		var width = ctx.measureText(currentLine + char).width;
		if (width < maxWidth && char != '\n') {
			currentLine += char;
		} else {
			lines.push(currentLine);
			currentLine = char;
		}
	}
	lines.push(currentLine);
	lines = lines.splice(0, maxLineNumber);
	return lines;
}

const getWatermark = async() => {
	return new Promise((resolve, reject) => {
		fs.readFile(__dirname + '/watermark.png', function(err, watermark) {
			if (err)
				return reject(err);

			var img = new Image;
			img.src = watermark;

			resolve(img);
		});
	})
}

var getCCImage = function(text, options) {
	return new Promise(async (resolve, reject) => {
		if (!options)
			options = {};

		//Prepare arguments
		var width = options.width || 640,
			padding = options.padding || 20,
			fontSize = options.width || 30,
			watermarkHeight = options.watermarkHeight || 30,
			watermarkPadding = options.watermarkPadding || 5,
			font = options.font || 'Microsoft JhengHei',
			fontColor = options.fontColor || '#ffffff',
			backgroundColor = options.backgroundColor || '#000000';

		//Mesure texts and split lines
		var canvas = new Canvas(0, 0),
			ctx = canvas.getContext('2d');
		ctx.font = fontSize + 'px ' + '"' + font + '"';

		var lines = getLines(ctx, text, width - padding * 2),
			height = lines.length * fontSize + padding * 2 + watermarkPadding + watermarkHeight;

		//Start drawing
		canvas = new Canvas(width, height);
		ctx = canvas.getContext('2d');
		ctx.patternQuality = 'best';
		ctx.textBaseline = 'top';
		ctx.font = fontSize + 'px ' + '"' + font + '"';

		//Draw background
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, width, height);

		//Draw lines	
		ctx.fillStyle = fontColor;
		for (var l = 0; l < lines.length; l++) {
			ctx.fillText(lines[l], padding, padding + l * fontSize, width - padding * 2)
		}

		//Draw watermark
		var watermark = await getWatermark();

		var watermarkHeight = watermarkHeight,
			watermarkWidth = watermark.width / watermark.height * watermarkHeight;

		ctx.drawImage(watermark, width - padding - watermarkWidth, height - padding - watermarkHeight + watermarkPadding, watermarkWidth, watermarkHeight);

		if(options.stream) {
			resolve(canvas.pngStream());
		} else {
			canvas.toBuffer(function(err, buffer){
				if(err)
					return reject(err);
				resolve({
					buffer: buffer,
					text: lines.join('\n')
				});
			});
		}
	})
}

module.exports = getCCImage;