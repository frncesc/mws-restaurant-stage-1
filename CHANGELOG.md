### Use a service worker, thus allowing the site to work off-line
- Added a basic service worker adapted from:
  https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker
- Use `ignoreSearch: true` option in `caches.match` to have `restaurant.html` always cached
- Modify the start-up sequence in `main.js`, calling `updateRestaurants` in
  response to `DOMContentLoaded` window event to prevent possible off-line failures when
  Google Maps is not available. Now `initMap` just updates the restaurant markers.
- Check always the `map` parameter in `DBHelper.mapMarkerForRestaurant`. It can be _null_
  if Google Maps API is not loaded (because we are off-line, or by other reasons)

### Resize images to different resolutions
- The script `resize-images.js` uses [Sharp](https://github.com/lovell/sharp) for resizing all images in `img`
  to 340, 400, 600 and 800 pixel width. The resulting images are stored with its original file name into the
  directories: `img-340`, `img-400`, etc.
  (Note: launch `npm i` to install the required components before calling `npm run resize-images`)
- Use `sizes` and `srcset` attributes in `img` tags to inform the browser about the most convenient image file
  for the current screen size and resolution.

### Improve accessibility
- Add wai-aria attributes to html elements
- Enforce semantic landmarks
- Check color contrast to be at least AA-compliant (ratio 4.5)

### Visual design improvements
- `box-shadow` in restaurant cards
- Stylized picture and review cards in restaurant page
- Bigger font sizes in title, footer, breadcrumb and reviews
- Center and span `select` controls in `filter-options`

### Make it responsive
- Set viewport
- Set `max-width` of all images and media elements to 100%
- Remove fixed size settings wherever possible
- Use a `grid` layout for restaurants list, with `auto-fill` columns sized via `minmax`

### Initial set-up (17-Mar-2018)
- Fork and clone project from https://github.com/udacity/mws-restaurant-stage-1
- Add `.gitignore`, `CHANGELOG.md` and `project.json`
- Add [live-server](https://www.npmjs.com/package/live-server) to `devDependencies`
- Obtain a Google Maps [API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and update it in `index.html`
- API key restricted by now to `localhost:8080` (in [API console](https://console.developers.google.com/apis/credentials?project=fit-sanctum-198308))

