const gulp = require('gulp');
const del = require('del');
const newer = require('gulp-newer');
const responsive = require('gulp-responsive');
const liveServer = require('live-server');

const LOGO_SIZES = [512, 192, 144, 96, 72, 64, 48, 16];
const PICTURE_SIZES = [340, 400, 600, 800];

gulp.task('build-pictures', () => {
  return gulp.src('media/pictures/*.{jpg,png}')
    .pipe(responsive({
      '*': PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px` } }; })
        .concat(PICTURE_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}px`, extname: '.webp' } }; }))
    }, {
        quality: 70,
        progressive: true,
        withMetadata: false,
      }))
    .pipe(gulp.dest('src/pictures'));
});

gulp.task('build-logo', () => {
  return gulp.src('media/logo/icon.png')
    .pipe(responsive(
      { '*': LOGO_SIZES.map(s => { return { width: s, rename: { suffix: `-${s}x${s}` } }; }) },
      { withMetadata: false }))
    .pipe(gulp.dest('src/logo'));
});

gulp.task('serve-src', function () {
  liveServer.start({
    port: 8000,
    host: 'localhost',
    root: 'src',
    open: true,
    file: 'index.html',
    wait: 1000,
  });
  gulp.watch('media/pictures/*', ['build-pictures']);
  gulp.watch('media/logo/icon.png', ['build-logo']);
})

gulp.task('clean-dist', (done) => {
  del(['dist'], done);
});

gulp.task('copy-to-dist', function () {
  // Todo: minify js
  gulp.src('src/**/*.{html,js,css,json,jpg,png,webp}')
    .pipe(newer('dist'))
    .pipe(gulp.dest('dist'));
});

gulp.task('serve-dist', function () {
  liveServer.start({
    port: 8010,
    host: 'localhost',
    root: 'dist',
    open: true,
    file: 'index.html',
    wait: 1000,
  });
  gulp.watch(['src/**/*.{html,js,css,json}'], ['copy-to-dist']);
  gulp.watch('media/pictures/*', ['build-pictures', 'copy-to-dist']);
  gulp.watch('media/logo/icon.png', ['build-logo', 'copy-to-dist']);
})
