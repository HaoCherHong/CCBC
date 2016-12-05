var gulp = require('gulp');
var gutil = require('gulp-util');
var notify = require('gulp-notify');
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
	'whatwg-fetch',
	'react'
];

var browserifyTask = function(options) {

	// Our app bundler
	var appBundler = browserify({
		entries: [options.entry], // Only need initial file, browserify finds the rest
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
			.pipe(source(options.out))
			.pipe(gulpif(!options.development, streamify(uglify())))
			.pipe(gulp.dest(options.dest))
			.pipe(gulpif(options.watch, livereload({
				port: options.livereload
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
}

module.exports = function buildReact(options) {
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

	for(var a in options.apps) {
		var app = options.apps[a];

		//Clone options
		var _options = {};
		for(var p in options)
			_options[p] = options[p];

		_options.entry = app.entry;
		_options.out = app.out;

		delete _options.app;

		//Build
		browserifyTask(_options);
	}
}