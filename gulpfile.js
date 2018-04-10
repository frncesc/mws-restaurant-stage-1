var gulp = require('gulp');
var del = require('del');
var responsive = require('gulp-responsive');

gulp.task('clean', function (done) {
  del(['dist'], done);
});

gulp.task('build-images', function () {
  return gulp.src('src/pictures/*.{jpg,png}')
    .pipe(responsive({
      '*': [{
        width: 340,
        rename: { suffix: '-340px' },
      }, {
        width: 400,
        rename: { suffix: '-400px' },
      }, {
        width: 600,
        rename: { suffix: '-600px' },
      }, {
        width: 800,
        rename: { suffix: '-800px' },
      }, {
        width: 340,
        rename: { suffix: '-340px', extname: '.webp' },
      }, {
        width: 400,
        rename: { suffix: '-400px', extname: '.webp' },
      }, {
        width: 600,
        rename: { suffix: '-600px', extname: '.webp' },
      }, {
        width: 800,
        rename: { suffix: '-800px', extname: '.webp' },
      }],
    }, {
      quality: 70,
      progressive: true,
      withMetadata: false,
    }))
    .pipe(gulp.dest('dist/pictures'));
});