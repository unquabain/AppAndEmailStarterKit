'use strict';
// generated on 2014-07-23 using generator-gulp-webapp 0.1.0
var config = {
	serveport : 9001,
	listenport: 35730
}
var gulp = require('gulp');

// load plugins
var $ = require('gulp-load-plugins')();
var gutil = require('gulp-util');
var replace = require('gulp-batch-replace');
var fs = require('fs');
var _ = require('underscore');
var extend = require('extend');


var extend_deck = function(dname, fname)
{
	var data = fs.readFileSync(dname + '/' + fname, 'utf8');
	var obj = JSON.parse(data);
	if (('_meta' in obj) && ('extends' in obj._meta)) {
		var par = extend_deck(dname, obj._meta['extends']);
		obj = extend(true, {}, par, obj);
	}
	return obj;
}
gulp.task('merge', function(cb) {
	fs.readdir('./src/decks/', function(err, touches) {
		_.each(touches, function(touch_fname) {
			if (! touch_fname.match(/\.json$/)) return;
			if (touch_fname.match(/^_/)) return;
			var deck = extend_deck('./src/decks', touch_fname);
			var incl = '\\.(mustache|html)$';
			if ('_meta' in deck && 'templates' in deck._meta) {
				console.log(touch_fname + ": Overriding templates with ", deck._meta.templates);
				incl = deck._meta.templates;
			}
			fs.readdir('./src/templates/', function(err, templates) {
				if (err) {
					console.log(err);
					return false;
				}
				_.each(templates, function(template_fname) {
					if (template_fname.match(/^\.|~$/)) return;
					console.log(touch_fname + ": ", incl, " is array: ", _.isArray(incl));
					console.log(touch_fname + ": typeof incl", (typeof incl));
					if (_.isArray(incl)) {
						if (! template_fname in incl) {
							console.log(touch_fname + ": " + template_fname + " not in " , incl)
							return;
						}
					} else {
						if (! template_fname.match(new RegExp(incl)) ) {
							console.log(touch_fname + ": " + template_fname + " not ~ " + incl)
							return;
						}
					}
					var temp = template_fname.replace(/\.[^.]+$/, '');
					var touch = touch_fname.replace(/\.json$/, '');
					var temp_path = './src/templates/' + template_fname;
					deck.template = temp;
					deck.touch = touch;
					console.log("Touch: " + touch + "; Template: " + template_fname);
					var fntemplate = "GULP_DEFAULT_<%= template %>_SEP14.html";
					if ('_meta' in deck && 'filename' in deck._meta) {
						fntemplate = deck._meta.filename;
					}
					var ofname = _.template(fntemplate)({ template : temp, touch: touch });
					gulp.src(temp_path)
						.pipe($.mustache(deck))
						.pipe($.rename(ofname))
						.pipe(gulp.dest('./preview/'));
				});
			});
		});
	});
	cb();
});

gulp.task('styles', function () {
    return gulp.src('src/styles/main.scss')
        .pipe($.rubySass({
            style: 'expanded',
            precision: 10
        }))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('preview/styles'))
        .pipe($.size());
});

gulp.task('scripts', function () {
    return gulp.src('src/scripts/**/*.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter(require('jshint-stylish')))
        .pipe($.size());
});

gulp.task('html', ['merge', 'styles', 'scripts'], function () {
    var jsFilter = $.filter('**/*.js');
    var cssFilter = $.filter('**/*.css');

    return gulp.src('preview/*.html')
        .pipe($.useref.assets({searchPath: '{preview,src}'}))
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore())
        .pipe($.useref.restore())
        .pipe($.useref())
        .pipe(gulp.dest('dist'))
        .pipe($.size());
});

gulp.task('images', function () {
    return gulp.src('src/images/**/*')
        .pipe($.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        }),{
		fileCache : './.cache'
	})
        .pipe(gulp.dest('dist/images'))
        .pipe($.size());
});

gulp.task('fonts', function (cb) {
    /*
    $.bowerFiles()
        .pipe($.filter('**' + '/*.{eot,svg,ttf,woff}'))
        .pipe($.flatten())
        .pipe(gulp.dest('dist/fonts'))
        .pipe($.size());
    */
    gulp.src('src/fonts/*{eot,svg,ttf,woff}')
        .pipe(gulp.dest('dist/fonts'))
	.pipe($.size());
    cb();
});

gulp.task('extras', function () {
    return gulp.src(['src/*.*', '!src/*.html'], { dot: true })
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
    $.cache.clear();
    return gulp.src(['preview', 'dist'], { read: false }).pipe($.rimraf({force:true}));
});

gulp.task('build', ['html', 'images', 'fonts', 'extras']);

gulp.task('default', function () {
    gulp.start('build');
});

gulp.task('connect', function () {
    var connect = require('connect');
    var app = connect()
        .use(require('connect-livereload')({ port: config.listenport }))
        .use(connect.static('src'))
        .use(connect.static('preview'))
        .use(connect.directory('preview'));

    require('http').createServer(app)
        .listen(config.serveport)
        .on('listening', function () {
            console.log('Started connect web server on http://localhost:' + config.serveport);
        });
});

gulp.task('serve', ['connect', 'styles'], function () {
    require('opn')('http://localhost:' + config.serveport);
});

// inject bower components
gulp.task('wiredep', function () {
    var wiredep = require('wiredep').stream;

    gulp.src('src/styles/*.scss')
        .pipe(wiredep({
            directory: 'src/bower_components'
        }))
        .pipe(gulp.dest('src/styles'));

    gulp.src('src/*.html')
        .pipe(wiredep({
            directory: 'src/bower_components',
            exclude: ['bootstrap-sass-official']
        }))
        .pipe(gulp.dest('src'));
});

gulp.task('deploy', ['build'], function() {
	rsync({
		ssh : true,
		src : './dist/',
		dest: 'benf@benf.internal.bnj.net:/home/benf/public_html/amex/prepost',
		recursive: true,
		syncDest: true,
		args: ['--verbose']
	}, function(error, stdout, stderr, cmd) {
		gutil.log(stdout);
	});
});

gulp.task('screens', function() {
	return gulp.src('dist/*.html')
	 .pipe($.localScreenshots({
		path: 'dist',
	 	width: ['1000', '880', '650']
	 }))
	 .pipe(gulp.dest('./screenshots/'));
});

gulp.task('watch', ['connect', 'serve'], function () {
    var server = $.livereload(config.listenport);

    // watch for changes

    gulp.watch([
        'preview/*.html',
        'preview/styles/**/*.css',
        'src/scripts/**/*.js',
        'src/images/**/*'
    ]).on('change', function (file) {
        server.changed(file.path);
    });

    gulp.watch('src/styles/**/*.scss', ['styles']);
    gulp.watch('src/scripts/**/*.js', ['scripts']);
    gulp.watch('src/images/**/*', ['images']);
//     gulp.watch('bower.json', ['wiredep']);
    gulp.watch(['src/templates/*', 'src/decks/*.json'], ['merge']).on('change', function(file) {
    });
});
