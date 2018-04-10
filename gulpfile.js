const gulp = require('gulp');
const del = require('del');
const responsive = require('gulp-responsive');
const mergeStream = require('merge-stream');

const LOGO_SIZES = [512, 192, 144, 96, 72, 64, 48, 16];
const PICTURE_SIZES = [340, 400, 600, 800];

gulp.task('clean', (done) => {
  del(['dist'], done);
});

gulp.task('build-pictures', () => {
  return gulp.src('src/pictures/*.{jpg,png}')
    .pipe(responsive({
      '*':  PICTURE_SIZES.map(s => {return {width: s, rename: {suffix: `-${s}px`}};})
            .concat(PICTURE_SIZES.map(s => {return {width: s, rename: {suffix: `-${s}px`, extname: '.webp'}};}))
      }, {
      quality: 70,
      progressive: true,
      withMetadata: false,
    }))
    .pipe(gulp.dest('dist/pictures'));
});

gulp.task('build-logo', () => {
  return gulp.src('src/logo/icon.png')
    .pipe(responsive(
      {'*': LOGO_SIZES.map(s => {return {width: s, rename: {suffix: `-${s}x${s}`}};})},
      {withMetadata: false}))
    .pipe(gulp.dest('dist/logo'));
});

gulp.task('copy', function () {
  return mergeStream(
    gulp.src('src/**/*.{html,js,css}').pipe(gulp.dest('dist/')),
    gulp.src('src/manifest.json').pipe(gulp.dest('dist/'))
  );
});

gulp.task('watch', function () {
  gulp.watch(['src/**/*.{html,js,css}, src/manifest.json'], ['copy']);
  gulp.watch(['src/logo/*.png'], ['build-logo']);
  gulp.watch(['src/pictures/*.{jpg,png}'], ['build-pictures']);
});
