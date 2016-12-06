var gulp = require('gulp');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
// var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var gutil = require('gulp-util');

var livereload = require('gulp-livereload');

var buildReact = require('./build-react.js');

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
			var _options = {};
			for(var i in options)
				_options[i] = options[i];
			_options.src = file.path;
			rebuild(_options);
		});
	}

	rebuild();
}

var copyTask = function(options) {
	var copy = function(options) {
		gulp.src(options.src, options)
			.pipe(gulp.dest(options.dest))
			.pipe(notify(function(file) {
				console.log(file.relative + ' copied');
			}));
	}

	if(options.watch) {
		watch(options.src, function(file) {
			var _options = {};
			for(var i in options)
				_options[i] = options[i];
			_options.src = file.path;
			copy(_options);
		})
	}

	copy(options);
}

// Starts our development workflow
gulp.task('default', function() {
	serverTask({
		development: true,
		src: ['./src/server/*.js'],
		dest: './build'
	})

	copyTask({
		src: ['./src/server/watermarks/*.*', './src/server/config.json', './src/server/public/*.*'],
		base: './src/server',
		dest: './build'
	});

	buildReact({
		development: true,
		apps: [{
			entry: './src/client/manage.jsx',
			out: 'manage.js'
		}, {
			entry: './src/client/app.jsx',
			out: 'app.js'
		}],
		dest: './build/public'
	});
});

// Starts our development workflow
gulp.task('watch', function() {

	livereload.listen({
		port: 35730
	});

	serverTask({
		watch: true,
		development: true,
		src: ['./src/server/*.js'],
		dest: './build'
	})

	copyTask({
		watch: true,
		src: ['./src/server/watermarks/*.*', './src/server/config.json', './src/server/public/*.*'],
		base: './src/server',
		dest: './build'
	});

	buildReact({
		watch: true,
		livereload: 35730,
		development: true,
		apps: [{
			entry: './src/client/manage.jsx',
			out: 'manage.js'
		}, {
			entry: './src/client/app.jsx',
			out: 'app.js'
		}],
		dest: './build/public'
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