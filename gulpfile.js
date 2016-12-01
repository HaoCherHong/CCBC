var gulp = require('gulp');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
// var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var gutil = require('gulp-util');

//Client Side
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var streamify = require('gulp-streamify');
var source = require('vinyl-source-stream'); // Used to stream bundle for further handling
var livereload = require('gulp-livereload');

// External dependencies you do not want to rebundle while developing,
// but include in your application deployment
var dependencies = [
	'react'
];

var browserifyTask = function(options) {

	// Our app bundler
	var appBundler = browserify({
		entries: [options.src], // Only need initial file, browserify finds the rest
		transform: [
			[babelify, {
				presets: ['react', 'stage-3']
			}]
		], // We want to convert JSX to normal javascript
		debug: options.development, // Gives us sourcemapping
		cache: {},
		packageCache: {},
		fullPaths: options.development // Requirement of watchify
	});

	// We set our dependencies as externals on our app bundler when developing
	(options.development ? dependencies : []).forEach(function(dep) {
		appBundler.external(dep);
	});

	// The rebundle process
	var rebundle = function() {
		var start = Date.now();
		console.log('Building APP bundle');
		appBundler.bundle()
			.on('error', gutil.log)
			.pipe(source('main.js'))
			.pipe(gulpif(!options.development, streamify(uglify())))
			.pipe(gulp.dest(options.dest))
			.pipe(gulpif(options.watch, livereload({
				port: 35730
			})))
			.pipe(notify(function() {
				console.log('APP bundle built in ' + (Date.now() - start) + 'ms');
			}));
	};

	// Fire up Watchify when developing
	if (options.watch) {
		appBundler = watchify(appBundler);
		appBundler.on('update', rebundle);
	}

	rebundle();

	// We create a separate bundle for our dependencies as they
	// should not rebundle on file changes. This only happens when
	// we develop. When deploying the dependencies will be included
	// in the application bundle
	if (options.development) {

		var vendorsBundler = browserify({
			debug: true,
			require: dependencies
		});

		// Run the vendor bundle
		var start = new Date();
		console.log('Building VENDORS bundle');
		vendorsBundler.bundle()
			.on('error', gutil.log)
			.pipe(source('vendors.js'))
			.pipe(gulpif(!options.development, streamify(uglify())))
			.pipe(gulp.dest(options.dest))
			.pipe(notify(function() {
				console.log('VENDORS bundle built in ' + (Date.now() - start) + 'ms');
			}));

	}

}

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
		src: ['./src/server/*.js'],
		dest: './build'
	})

	copyTask({
		src: ['./src/server/watermark.png', './src/server/config.json', './src/server/public/*.*'],
		base: './src/server',
		dest: './build'
	});

	browserifyTask({
		development: true,
		src: './src/client/manage.jsx',
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
		src: ['./src/server/watermark.png', './src/server/config.json', './src/server/public/*.*'],
		base: './src/server',
		dest: './build'
	});

	browserifyTask({
		watch: true,
		development: true,
		src: './src/client/manage.jsx',
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