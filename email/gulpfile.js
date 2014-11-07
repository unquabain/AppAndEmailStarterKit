var config = {
	serveport : 9000,
	listenport: 35731,
	localhost : 'localhost'
}
var gulp = require('gulp');

var inlinesource = require('gulp-inline-source');
var inlineCss = require('gulp-inline-css');
var gconnect = require('gulp-connect');
var connect = require('connect');
var imagemin = require('gulp-imagemin');
var pngcrush = require('imagemin-pngcrush');
var rename = require('gulp-rename');
var rendersvg = require('gulp-rendersvg');
var fs = require('fs');
var _ = require('underscore');
var $ = require('gulp-load-plugins')();
var extend = require('extend');
var livereload = require('gulp-livereload');
var zip = require('gulp-zip');
var replace = require('gulp-replace');
var htmlmin = require('gulp-htmlmin');


var paths = {
  html: 'src/*.html',
  styles: 'src/styles/*.css',
  images: 'src/images/*',
  dist: 'build/',
};

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
var zurbify_deck = function(obj)
{
	var zurb = {
		html : function() { return function(text, render) {
			console.log(text, render);
			return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">' +
				'<html xmlns="http://www.w3.org/1999/xhtml">' +
				render(text) +
				'</html>';
		}; },
		head : function() { return function(text, render) {
			return '<head>' +
				    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
				    '<meta name="viewport" content="width=device-width"/>' +
				    render(text) +
				    '</head>';
		}; },
		body : function() { return function(text, render) {
			return '<body>' +
			    '<table class="body">' +
			      '<tr>' +
				'<td class="center" align="center" valign="top">' +
				  '<center>' +
				  render(text) +
				  '</center>' +
				'</td>' +
			      '</tr>' +
			    '</table>' +
			  '</body>';
		}; },
		container : function () { return function(text, render) {
			return '<table class="container"><tr><td>' + render(text) + '</td></tr></table>';
		}; },
		row : function() { return function(text, render) {
			return '<table class="row"><tr>' + render(text) + '</tr></table>';
		}; },
		center : function() { return function(text, render) {
			return '<td class="center"><center>' + render(text) + '</center></td>';
		}; },
		panel : function() { return function(text, render) {
			return '<td class="panel">' + render(text) + '</td>';
		}; },
		pad : function() { return function(text, render) {
			return '<td class="text-pad">' + render(text) + '</td>';
		}; },
		padRight : function() { return function(text, render) {
			return '<td class="right-text-pad">' + render(text) + '</td>';
		}; },
		padLeft : function() { return function(text, render) {
			return '<td class="left-text-pad">' + render(text) + '</td>';
		}; },
		hideForSmall : function() { return function(text, render) {
			var pre_out = render(text);
			var parts = pre_out.split('>');
			var first_part = parts.shift();
			var m = first_part.match(/class="[^"]+/);
			if (m) {
				var c = m[0];
				var cm = c + " hide-for-small";
				first_part = first_part.replace(c, cm);
			} else {
				first_part += ' class="hide-for-small"';
			}
			parts.unshift(first_part);
			return parts.join('>');
		}; },
		phoneTag : function() { return function(text, render) {
			var pre_out = render(text);
			var tel = pre_out.replace(/[^0-9+-]/g, '');
			return '<a href="tel:' + tel + '">' + pre_out + '</a>';

		}; }
	};
	var cols = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
	var make_col_func = function(numcols, last)
	{
		var clsname = numcols + ' columns';
		var wrpname = 'wrapper';
		if (last) wrpname += ' last';
		return function() { return function(text, render)
		{
			return '<td class="' + wrpname +'"><table class="' + clsname + '"><tr>' + render(text) + '<td class="expander"></td></tr></table></td>'
		}; };
	};
	for (idx in cols) {
		var col = cols[idx];
		zurb[col + '_cols'] = make_col_func(col, false);
		zurb[col + '_col'] = make_col_func(col, false);
		zurb['last_' + col + '_cols'] = make_col_func(col, true);
		zurb['last_' + col + '_col'] = make_col_func(col, true);
	}

	obj.zurb = zurb;
	return obj;
}
gulp.task('styles', function () {
    return gulp.src('./src/styles/main.scss')
        .pipe($.rubySass({
            style: 'expanded',
            precision: 10
        }))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('preview/styles'))
	;
});

gulp.task('merge', function(cb) {
	fs.readdir('./src/decks/', function(err, touches) {
		_.each(touches, function(touch_fname) {
			if (! touch_fname.match(/\.json$/)) return;
			if (touch_fname.match(/^_/)) return;
			var deck = extend_deck('./decks', touch_fname);
			deck = zurbify_deck(deck);
			var incl = '\\.(mustache|html)$';
			if ('_meta' in deck && 'templates' in deck._meta)
				incl = deck._meta.templates;
			fs.readdir('./src/templates/', function(err, templates) {
				if (err) {
					console.log(err);
					return false;
				}
				_.each(templates, function(template_fname) {
					if (template_fname.match(/^\.|~$/)) return;
					if (_.isArray(incl))
						if (! template_fname in incl) return;
					else
						if (! template_fname.match(new RegExp(incl)) ) return;
					var temp = template_fname.replace(/\.[^.]+$/, '');
					var touch = touch_fname.replace(/\.json$/, '');
					var temp_path = './src/templates/' + template_fname;
					deck.template = temp;
					deck.touch = touch;
					var fntemplate = "GULP_DEFAULT_<%= template %>_SEP14.html";
					if ('_meta' in deck && 'filename' in deck._meta) {
						fntemplate = deck._meta.filename;
					}
					var ofname = _.template(fntemplate)({ template : temp, touch: touch });
					console.log(temp_path, " => ", ofname);
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
gulp.task('inline', ['merge'], function() {
  return gulp.src('preview/*.html')
    .pipe(inlinesource('preview'))
    .pipe(inlineCss({
      preserveMediaQueries: true,
    }))
    .pipe(rendersvg())
    .pipe(replace(/><\/img/g, '/'))
    .pipe(htmlmin({
    	collapseWhitespace: true,
	keepClosingSlash: true,
	maxLineLength: 80
    }))
    .pipe(replace(/\n<\/strong>/g, '</strong>\n'))
    .pipe(replace(/\n<sup/g, '<sup\n'))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('imagemin', function() {
  gulp.src(paths.images)
    .pipe(imagemin({
      use: [pngcrush()]
    }))
    .pipe(gulp.dest(paths.dist + 'images'));
});

gulp.task('connect', function() {
  var app = connect()
  .use(require('connect-livereload')({ port: config.listenport }))
  .use(connect.static('src'))
  .use(connect.static('preview'))
  .use(connect.directory('preview'));
    require('http').createServer(app)
        .listen(config.serveport)
        .on('listening', function () {
            console.log('Started connect web server on http://' + config.localhost + ':' + config.serveport);
        });
    require('opn')('http://' + config.localhost + ':' + config.serveport);
});

gulp.task('reload', function() {
  gulp.src(paths.html)
    .pipe(connect.reload());
});

gulp.task('watch', function() {
    var server = livereload(config.listenport);
    gulp.watch([
        'preview/*.html',
        'preview/styles/**/*.css',
        'src/images/**/*'
    ]).on('change', function (file) {
        server.changed(file.path);
    });
  gulp.watch([paths.html, paths.styles], ['reload']);
  gulp.watch(['src/styles/*.scss'], ['styles']);
  gulp.watch(['src/decks/*.json','templates/*'], ['merge']);
});

gulp.task('clean', require('del').bind(null, [paths.dist, 'preview']));

gulp.task('build', ['inline', 'imagemin']);

gulp.task('zip', ['build'], function() {
	var d = new Date();
	return gulp.src('build/**')
	.pipe(zip('email_' + d.toISOString().replace(/:/g,'-') + '.zip'))
	.pipe(gulp.dest('dist'));
});

gulp.task('default', ['connect', 'watch']);

