### Miscellaneous improvements
- Use of `fetch` calls instead of XHR requests. More flexible and Promise-based.
- Use ES6 global objects of type [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) to obtain the lists of cuisines and neighborhoods without duplicates.
- Store the full restaurants list into `DBHelper` to avoid unnecessary requests to the server.
- Update and complete code comments

### Use promises instead of callbacks
- Refactor methods in `DBHelper` currently using callback functions in order to return objects of type `Promise`, more flexible and compatible with IDB.
- Convert callback functions in `main.js` and `restaurant_info.js`, making them consumers and/or producers of `Promise` objects.

### Store restaurant data into IndexedDB
- Add Jake Archibald's [IDB](https://github.com/jakearchibald/idb) package to `package.json`. Then, copy `/node_modules/idb/lib/idb.js` into `/js` (don't `require` modules by now) and import it in `index.html` and `restaurants.html`.
- Create new methods in `DBHelper` to deal with IndexedDb:
  - `getIdbPromise`: To gain access to the database
  - `getRestaurantPromiseFromIDB`: To retrieve data related to a specific restaurant from IDB
  - `saveRestaurantToIdb`: To add a restaurant record into IDB
  - `saveRestaurantIfNewer`: Checks if a restaurant with the given ID already exists and has updated data proor to add or update the restaurant record into the IDB.
  - `saveAllRestaurantsIfNewer`: Performs the previous operation with a collection of restaurants.
- Update `DBHelper.fetchRestaurants` to save the obtained restaurant data into IDB.
- Add `js/idb.js` to `PRECACHE_URLS` in `service-worker.js`

### Add generic photograph
- Created a generic image for restaurants with the `photograph` field empty or undefined.

### Pull data from the development server
- Define the `DBHelper.API_ENDPOINT` constant, pointing to the server root service (in substitution of `DATABASE_URL`, not yet used).
- Adapt `DBHelper.fetchRestaurants` to read the array of records returned by the server.
- Adapt `DBHelper.fetchRestaurantById` to retrieve data related to just one restaurant.
- Remove `data/restaurants.json` from `PRECACHE_URLS` in service worker (we will not need it anymore)
- Add the `.jpg` file extension to `DBHelper.imageFileForRestaurant` (the server returns just the base file name)

### Accessibility improvements
- Set `alt` attributes to all images
- Use `h3` instead of `h1` for the restaurant name in restaurants list
- Add `main` role to `main` elements in .html files
- Use of `h2` for restaurant name in restaurant.html (use `h1` just for the page title)
- Use of `h3` for reviews title (because it has lower importance than the restaurant name)
- Request service worker registration also from `restaurant_info.js`
- Put a more descriptive `alt` text in pictures, mentioning the restaurant name
- Create a descriptive `README.md` (work in progress)

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

