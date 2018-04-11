const gulp = require('gulp');
const del = require('del');
const newer = require('gulp-newer');
const responsive = require('gulp-responsive');
const liveServer = require('live-server');
const runSequence = require('run-sequence');

const LOGO_SIZES = [512, 192, 144, 96, 72, 64, 48, 16];
const PICTURE_SIZES = [340, 400, 600, 800];

gulp.task('build:pictures', () => {
  return gulp.src('media/pictures/*.{jpg,png}')
    .pipe(newer({
      dest: 'src/pictures',
      map: (fn) => fn.split('.')[0] + '-800px.' + fn.split('.')[1],
    }))
    .pipe(responsive({'*': PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px` } }; })
    .concat(PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px`, extname: '.webp' } }; }))},
    { quality: 70,
      progressive: true,
      withMetadata: false,
      errorOnUnusedConfig: false,
      silent: true,
    }))
    .pipe(gulp.dest('src/pictures'));
});

gulp.task('build:logo', () => {
  return gulp.src('media/logo/icon.png')
    .pipe(newer({
      dest: 'src/logo',
      ext: '-512x512.png'
    }))
    .pipe(responsive(
      { '*': LOGO_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}x${s}` } }; }) },
      { withMetadata: false,
        errorOnUnusedConfig: false,
        silent: true,
      }))
    .pipe(gulp.dest('src/logo'));
});

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

gulp.task('watch:src', function () {
  gulp.watch('media/pictures/*', ['build-pictures']);
  gulp.watch('media/logo/icon.png', ['build-logo']);
})

gulp.task('clean:dist', (done) => {
  return del(['dist'], done);
});

gulp.task('copy:dist', function () {
  // Todo: minify js
  gulp.src('src/**/*.{html,js,css,json,jpg,png,webp}')
    .pipe(newer('dist'))
    .pipe(gulp.dest('dist'));
});

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

gulp.task('watch:dist', function () {
  gulp.watch(['src/**/*.{html,js,css,json}'], ['copy:dist']);
  gulp.watch('media/pictures/*', ['build:pictures', 'copy:dist']);
  gulp.watch('media/logo/icon.png', ['build:logo', 'copy:dist']);
})

gulp.task('serve', function (callback) {
  runSequence('clean:dist', ['build:pictures', 'build:logo'], 'copy:dist', ['serve:dist', 'watch:dist'], callback);
});

gulp.task('debug', function (callback) {
  runSequence(['build:pictures', 'build:logo'], ['serve:src', 'watch:src'], callback);
});
