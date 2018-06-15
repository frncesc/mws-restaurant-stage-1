
// Load Gulp extensions
const gulp = require('gulp');
const del = require('del');
const newer = require('gulp-newer');
const responsive = require('gulp-responsive');
const liveServer = require('live-server');
const runSequence = require('run-sequence');
const mergeStream = require('merge-stream');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const replace = require('gulp-replace');
const htmlreplace = require('gulp-html-replace');
const inline = require('gulp-inline');
const cleanCSS = require('gulp-clean-css');

// Take the original files located in `media/pictures` and generate
// optimized images in JPEG, PNG and WEBP formats, resized to the widths specified in PICTURE_SIZES
const PICTURE_SIZES = [340, 400, 600, 800];
gulp.task('build:pictures', () => {
  return gulp.src('media/pictures/*.{jpg,png}')
    // Act only when the original media is newer than the auto-generated one
    .pipe(newer({
      dest: 'src/pictures',
      map: (fn) => fn.split('.')[0] + '-800px.' + fn.split('.')[1],
    }))
    .pipe(responsive(
      {
        '*': PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px` } }; })
          .concat(PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px`, extname: '.webp' } }; }))
      },
      {
        quality: 70,
        progressive: true,
        withMetadata: false,
        errorOnUnusedConfig: false,
        silent: true,
      }))
    .pipe(gulp.dest('src/pictures'));
});

// Take the original file `media/logo/icon.png` and generate
// variants resized to the widths specified in LOGO_SIZES
const LOGO_SIZES = [512, 192, 144, 96, 72, 64, 48, 16];
gulp.task('build:logo', () => {
  return gulp.src('media/logo/icon.png')
    // Act only when the original media is newer than the auto-generated one
    .pipe(newer({
      dest: 'src/logo',
      ext: '-512x512.png'
    }))
    .pipe(responsive(
      {
        '*': LOGO_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}x${s}` } }; })
      },
      {
        withMetadata: false,
        errorOnUnusedConfig: false,
        silent: true,
      }))
    .pipe(gulp.dest('src/logo'));
});

// Copy the original SVG icons from `media/icons` to `src/icons`
gulp.task('build:icons', () => {
  return gulp.src('media/icons/*.svg')
    // Act only when the original media is newer than the auto-generated one
    .pipe(newer({
      dest: 'src/icons',
    }))
    .pipe(gulp.dest('src/icons'));
});

// Take the original files located in `media/map` and generate
// optimized images in JPEG, PNG and WEBP formats
const MAP_FORMATS = ['jpg'];
gulp.task('build:map', () => {
  return gulp.src('media/map/*.png')
    // Act only when the original media is newer than the auto-generated one
    .pipe(newer({
      dest: 'src/map',
      map: (fn) => fn.split('.')[0] + '.jpg',
    }))
    .pipe(responsive(
      {
        '*': MAP_FORMATS.map(s => { return { rename: { extname: `.${s}` } }; })
      },
      {
        quality: 70,
        progressive: true,
        withMetadata: false,
        errorOnUnusedConfig: false,
        silent: true,
      }))
    .pipe(gulp.dest('src/map'));
});

// Start a live server based on `src`
gulp.task('serve:src', function () {
  return liveServer.start({
    port: 8000,
    host: 'localhost',
    root: 'src',
    open: true,
    file: 'index.html',
    wait: 1000,
  });
})

// Watch for changes in `src`
gulp.task('watch:src', function () {
  gulp.watch('media/pictures/*', ['build-pictures']);
  gulp.watch('media/logo/icon.png', ['build-logo']);
  gulp.watch('media/icons/*.svg', ['build-icons']);
  gulp.watch('media/map/*.png', ['build-map']);
})

// Remove `dist`
gulp.task('clean:dist', (done) => {
  return del(['dist'], done);
});

// Compact, babelize, minimize, optimize and copy components to `dist`
gulp.task('copy:dist', function () {
  return mergeStream(
    // Concat and minimize 'main.js':    
    gulp.src(['src/js/snackbar.js', 'src/js/idb.js', 'src/js/intersection-observer.js', 'src/js/dbhelper.js', 'src/js/utils.js', 'src/js/main.js'])
      .pipe(babel({ presets: ['env'] }))
      .pipe(concat('bundle-main.js'))
      .pipe(uglify())
      .pipe(gulp.dest('dist/js')),
    // Concat and minimize 'restaurant_info.js':
    gulp.src(['src/js/snackbar.js', 'src/js/idb.js', 'src/js/dbhelper.js', 'src/js/utils.js', 'src/js/restaurant_info.js'])
      .pipe(babel({ presets: ['env'] }))
      .pipe(concat('bundle-restaurant.js'))
      .pipe(uglify())
      .pipe(gulp.dest('dist/js')),
    // Update the list of pre-cache scripts in service worker (see `src/service-worker.js`):
    gulp.src(['src/service-worker.js'])
      .pipe(replace('.concat(PRECACHE_ASSETS_SRC)', '.concat(PRECACHE_ASSETS_DIST)'))
      .pipe(gulp.dest('dist')),
    // Update HTML files to use the minimized scripts and inline css:
    gulp.src('src/*.html')
      .pipe(htmlreplace({
        'dist-main': 'js/bundle-main.js',
        'dist-restaurant': 'js/bundle-restaurant.js'
      }))
      .pipe(inline({
        base: 'src/',
        css: function () { return cleanCSS({ rebaseTo: 'src' }) },
        disabledTypes: ['svg', 'img', 'js'], // Only inline css files
      }))
      .pipe(gulp.dest('dist')),
    // Copy the remaining assets:
    gulp.src('src/**/*.{json,jpg,png,webp,svg}')
      .pipe(newer('dist'))
      .pipe(gulp.dest('dist'))
  );
});

// Start a live server based on `dist`
gulp.task('serve:dist', function () {
  return liveServer.start({
    port: 8010,
    host: 'localhost',
    root: 'dist',
    open: true,
    file: 'index.html',
    wait: 1000,
  });
})

// Watch for changes in `dist`
gulp.task('watch:dist', function () {
  gulp.watch(['src/**/*.{html,js,css,json}'], ['copy:dist']);
  gulp.watch('media/pictures/*', ['build:pictures', 'copy:dist']);
  gulp.watch('media/logo/icon.png', ['build:logo', 'copy:dist']);
  gulp.watch('media/icons/*.svg', ['build:icons', 'copy:dist']);
  gulp.watch('media/map/*', ['build:map', 'copy:dist']);
})

// Build the `dist` release
gulp.task('build:dist', function (callback) {
  runSequence('clean:dist', ['build:pictures', 'build:logo', 'build:icons', 'build:map'], 'copy:dist', callback);
});

// Build `dist`, launch the HTTP server, launch the main page in a browser and reload it when changes are detected
gulp.task('serve', ['build:dist'], function (callback) {
  runSequence(['serve:dist', 'watch:dist'], callback);
});

// Prepare the `src` directory for a debug session
gulp.task('build:debug', function (callback) {
  runSequence(['build:pictures', 'build:logo', 'build:icons', 'build:map'], callback);
});


// Prepare the `src` directory, launch the HTTP server, launch the main page in a browser and reload it when changes are detected
gulp.task('debug', function (callback) {
  runSequence('build:debug', ['serve:src', 'watch:src'], callback);
});
