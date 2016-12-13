var resize = async function(file, options) {
	if(!options)
		options = {};
	if(!options.maxWidth)
		options.maxWidth = 2048;
	if(!options.maxWHeight)
		options.maxWHeight = 2048;

	//Read the file
	var img = document.createElement('img');
	var reader = new FileReader();

	var src = await new Promise((resolve, reject)=>{
		reader.onload = (e)=>{
			resolve(e.target.result);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

	await new Promise((resolve, reject) => {
		img.onload = resolve;
		img.onerror = reject;
		img.src = src;
	});

	//Determine the canvas size
	var width = img.width,
		height = img.height;

	if(width > height) {
		if(width > options.maxWidth) {
			height = height * options.maxWidth / width;
			width = options.maxWidth;
		}
	} else {
		if(height > options.height) {
			width = width * options.maxWHeight / height;
			height = options.maxWHeight;
		}
	}

	//Create context
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	var ctx = canvas.getContext('2d');

	//Draw the image
	ctx.drawImage(img, 0, 0, width, height);

	return canvas.toDataURL('image/png');
}

module.exports = resize;