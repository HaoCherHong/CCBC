var gulp = require('gulp');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
// var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var gutil = require('gulp-util');

var serverTask = function(options) {
	var rebuild = function() {
		var start = new Date();
		gulp.src(options.src)
			// .pipe(sourcemaps.init())
			.pipe(babel({
				plugins: ['transform-runtime'],
				presets: ['es2015', 'stage-3']
			}))
			.on('error', gutil.log)
			// .pipe(sourcemaps.write('.'))
			.pipe(gulp.dest(options.dest))
			.pipe(notify(function(file) {
				console.log('(Server) ' + file.relative + ' built in ' + (Date.now() - start) + 'ms');
			}));
	}

	if (options.watch) {
		watch(options.src, function(file) {
			var _options = options;
			_options.src = file.path;
			rebuild(_options);
		});
	}

	rebuild();
}

var copyTask = function (options) {
	var start = new Date();

	gulp.src(options.src, options)
		.pipe(gulp.dest(options.dest))
		.pipe(notify(function(file) {
				console.log(file.relative + ' copied');
		}));
}

// Starts our development workflow
gulp.task('default', function() {
	serverTask({
		development: true,
		src: ['./src/*.js'],
		dest: './build'
	})

	copyTask({
		src: ['./src/watermark.png', './src/public/*.*'],
		base: './src/',
		dest: './build'
	});
});

// Starts our development workflow
gulp.task('watch', function() {
	serverTask({
		watch: true,
		development: true,
		src: ['./src/*.js'],
		dest: './build'
	})

	copyTask({
		src: ['./src/watermark.png', './src/public/*.*'],
		base: './src/',
		dest: './build'
	});
});

// gulp.task('deploy', function () {

//	 browserifyTask({
//		 development: false,
//		 src: './app/main.jsx',
//		 dest: './dist'
//	 });

//	 cssTask({
//		 development: false,
//		 src: './styles/**/*.css',
//		 dest: './dist'
//	 });

// });

// gulp.task('test', function () {
//		 return gulp.src('./build/testrunner-phantomjs.html').pipe(jasminePhantomJs());
// });