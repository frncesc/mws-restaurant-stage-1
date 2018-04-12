
// Load Gulp extensions
const gulp = require('gulp');
const del = require('del');
const newer = require('gulp-newer');
const responsive = require('gulp-responsive');
const liveServer = require('live-server');
const runSequence = require('run-sequence');

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

// Start a live server based on `src`
gulp.task('serve:src', function () {
  liveServer.start({
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
})

// Remove `dist`
gulp.task('clean:dist', (done) => {
  return del(['dist'], done);
});

// Fill `dist` with the needed components
gulp.task('copy:dist', function () {
  // Todo: minify js
  gulp.src('src/**/*.{html,js,css,json,jpg,png,webp}')
    .pipe(newer('dist'))
    .pipe(gulp.dest('dist'));
});

// Start a live server based on `dist`
gulp.task('serve:dist', function () {
  liveServer.start({
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
})

// Prepare `dist`, launch the HTTP server, launch the main page in a browser and reload it when changes are detected
gulp.task('serve', function (callback) {
  runSequence('clean:dist', ['build:pictures', 'build:logo'], 'copy:dist', ['serve:dist', 'watch:dist'], callback);
});

// Prepare `src` (unoptimized sources), launch the HTTP server, launch the main page in a browser and reload it when changes are detected
gulp.task('debug', function (callback) {
  runSequence(['build:pictures', 'build:logo'], ['serve:src', 'watch:src'], callback);
});
