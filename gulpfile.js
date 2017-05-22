'use strict';

const pjson = require('./package.json'),
      dirs = pjson.config.directories,
      ghPagesUrl = pjson.config.ghPages;

var gulp = require('gulp'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    imagemin = require('gulp-imagemin'),
    svgstore = require('gulp-svgstore'),
    svgmin = require('gulp-svgmin'),
    minijs = require('gulp-minify'),
    fileinclude = require('gulp-file-include'),
    plumber = require('gulp-plumber'),
    postcss = require('gulp-postcss'),
    minicss = require('gulp-csso'),
    sass = require('gulp-sass'),
    mqpacker = require('css-mqpacker'),
    autoprefixer = require('autoprefixer'),
    del = require('del'),
    server = require('browser-sync').create(),
    run = require('run-sequence');

gulp.task('clean', function() {
  return del('build');
});

gulp.task('copy', function() {
  return gulp.src([
    'src/*.html',
    'src/js/**/*.js',
    'src/fonts/**/*.{woff,woff2}',
    'src/img/**/*.{jpg,jpeg,png,gif,svg}', '!src/img/icons/*.{png,svg}'
  ], {
    base: 'src'
  })
  .pipe(gulp.dest('build'));
});

gulp.task('style', function() {
  gulp.src('src/scss/main.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer({browsers: [
        'last 1 version',
        'last 2 Chrome versions',
        'last 2 Firefox versions',
        'last 2 Opera versions',
        'last 2 Edge versions'
      ]}),
      mqpacker({
        sort: true
      })
    ]))
    .pipe(gulp.dest('build/css'))
    .pipe(minicss())
    .pipe(rename('main.min.css'))
    .pipe(gulp.dest('build/css'))
    .pipe(server.reload({stream: true}));
});

gulp.task('compress', function() {
  gulp.src('src/js/*.js')
    .pipe(minijs({
        ext:{
            src:'.js',
            min:'.min.js'
        },
        exclude: ['tasks']
    }))
    .pipe(gulp.dest('build/js'));
});

gulp.task('images', function() {
  return gulp.src('build/img/**/*.{jpg,jpeg,png,gif}')
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.jpegtran({progressive: true})
    ]))
    .pipe(gulp.dest('build/img'));
});

gulp.task('symbols', function() {
  return gulp.src('src/img/icons/*.svg')
    .pipe(svgmin({
      plugins: [{
        removeAttrs: {attrs: 'fill'}
      }]
    }))
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('symbols.svg'))
    .pipe(gulp.dest('build/img'));
});

gulp.task('html', function() {
  console.log('---------- сборка HTML');
  return gulp.src(dirs.source + '/*.html')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'HTML compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true,
    }))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(dirs.build));
    // .pipe(reload({stream: true}));
});

gulp.task('build', function(fn) {
  run(
    'clean',
    'copy',
    'style',
    'compress',
    'images',
    'symbols',
    'html',
    fn
  );
});

gulp.task('serve', ['build'], function() {
  server.init({
    server: 'build',
    startPath: 'index.html',
    notify: false,
    open: true,
    ui: false
  });

  gulp.watch('src/scss/**/*.scss', ['style']);

  gulp.watch([
    '*.html',
    '_include/*.html',
    'src/blocks/**/*.html'
  ], {cwd: dirs.source}, ['watch:html']);

  gulp.watch('src/js/**/*.js', function(obj) {
    if (obj.type === 'changed') {
      gulp.src( obj.path, {'base': 'src'})
      .pipe(gulp.dest('build'))
      .pipe(server.reload({stream: true}));
    }
  });
});

gulp.task('watch:html', ['html'], reload);

function reload (done) {
  server.reload();
  done();
}

gulp.task('default', ['build', 'serve', 'watch']);