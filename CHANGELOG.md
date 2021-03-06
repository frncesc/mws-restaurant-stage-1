## STAGE 3

### Optimize performance and accessibility
- Display a static map image at startup, loading Google Maps on request, based on user interaction:
  - The script `media/utils/build-static-map.js` generates a map image with all restaurant markers using the [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static/intro).
  - The "script" tag responsible for loading the Google Maps API has been removed from `src/index.html`. Now, the function `self.loadGoogleMaps` in `src/js/main.js` dynamically loads the real Google Maps object when invoked.
  - Static map images are compressed and optimized by the Gulp build script, stored in `/map` and defined as `background-image` properties of the `#map` div in `css/main.css`.
  - When the user interacts for first time with the static map, two things can happen:
    - If the user clicked on a restaurant bookmark, the navigation is redirected to `restaurant.html?id=xxx`
    - In any other case, and also when the restaurant selection has changed, the real Google Maps object is dynamically loaded and displayed, thus allowing the user to zoom or slide it.

- Set a __title__ attribute to the `iframe` containing the Google Maps object. This is a [critical WCAG rule](https://dequeuniversity.com/rules/axe/2.2/frame-title?application=lighthouse) not currently respected by Google Maps.

- Use of the Npm [Snackbar](https://www.polonel.com/snackbar/) component to alert users about failed/recovered transactions. Many thanks to [Chris Brame](https://www.polonel.com/)!

### Allow to favorite/unfavorite restaurants and post, edit and delete reviews, also when off-line
- Place a _Favorite_ toggleable icon in each restaurant card, and in the restaurant page.
- Create a a form in `restaurant.html`, initially hidden.
- Place _Edit_ and _Delete_ buttons in each review.
- Place a _Post a new review_ button at the end of the reviews list.
- Link events triggered by these UI elements to a new method called `DBHelper.performAction`. This function accepts calls for four different types of actions (`SET_FAVORITE`, `ADD_REVIEW`, `EDIT_REVIEW` and `DELETE_REVIEW`), and performs three operations:
  - Saves the changes on the IDB for later use, also when the device is off-line.
  - When on-line, calls the API server with the appropiate method and data.
  - When the device is off-line or the call to the API server was unsuccessfull, the requested action data is stored in a special IDB object called `pending_actions`, for later processing.
- Implement `DBHelper.flushPendingActions` to check if there are pending actions registered on the IDB and try to process them when the device is on-line. This method is called at the beggining of each page view, and when an [`online`](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events) event is fired. In case of error when contacting the API server, the method is retried after a while (currently 20").
- Use of the snackbar to inform the users about the state of pending actions.
- Add an third drop-down list to the filtering section of `index.html`, allowing to select all restaurants or just "_My favorites_".

## STAGE 2

### Perform miscellaneous optimizations on CSS
- Split the main `styles.css` into three files:
  - `common-styles.css` (including the main statements of [normalize.css](https://necolas.github.io/normalize.css/))
  - `main.css`
  - `restaurant-info.css`
- Use of [gulp-clean-css](https://github.com/scniro/gulp-clean-css) and [gulp-inline](https://www.npmjs.com/package/gulp-inline) to minimize the CSS files and put its content directly inside the HTML files for the production environment (`dist`).

### Use of [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) to avoid off-screen pictures
- Create the `li` elements of the restaurant list without images.
- Use an `IntersectionObserver` to detect when a restaurant `li` element is approaching or intersects the viewport, and then assign its sources (in WEBP and JPEG) and create the `img` element.
- Import the [IntersectionObserver polyfill](https://www.npmjs.com/package/intersection-observer) for browsers that don't fully support the specification.

### Miscellaneous optimizations
- Replace the incorrect reference to _normalize-css.googlecode.com_ with a local copy of [normalize.css](https://necolas.github.io/normalize.css/)

### Bundle and minimize scripts
- Reduce the number and size of imported scripts, and make it also compatible with old browsers using [Babel](https://babeljs.io/) and [UglifyJS](https://github.com/mishoo/UglifyJS).
- Automatize the minification process in Gulp.
- Adapt `index.html` and `restaurant.html` in `dist`, in order to import the compressed scripts instead of the original javascript files.
- Adapt `service-worker.js` in `dist`, to pre-cache the compressed scripts.

### Optimize workflow
- Gulp functions should always return or chain with a callback (with the exception of `gulp.watch`)
- Use 'strict' mode in all .js files. This is necessary to concatenate scripts with [idb](https://www.npmjs.com/package/idb), which already uses 'strict' mode.
- Declare all global variables and functions as members of `self`

### Use of [WebP](https://developers.google.com/speed/webp/) image format when possible
- Change `img` elements with `picture` elements with two `source` components: one with a `srcset` based on WebP, and a second one with JPEG (for browsers that can not yet use WebP)

### Re-organize directories and use [Gulp](https://gulpjs.com/) to automate workflow
- Project files are now organized in five directories:
  - `media`: Contains the original pictures of the restaurants, and a big logo.
  - `src`: Contains the source files (.html, .css, .js, .json...) and also auto-generated images in different sizes and formats.
  - `dist`: This folder will be generated by Gulp, and will contain the final optimized files to be deployed in production.
  - `node_modules`: Auto-generated by `npm`, contains plugins and needed components.
  
  The root folder contains files related to package and workflow control: readme, changelog, gulpfile...

- A Gulp script has been created, providing the following features:
  - Auto generation of pictures and logos in different sizes and formats (JPEG, PNG and WEBP). The script `resize-images.js` is no longer needed and has been removed.
  - Copy and optimize files in `src` and `dist`
  - Launch a live server, both in devel (src) and dist modes, watching for changes.

- The following npm commands can be used to compile and launch the development and distribution environments:
  - `npm run debug`
  - `npm run serve`

### Miscellaneous improvements
- Build a set of logo images in different sizes, stored in `/logo`.
- Create a `manifest.json` file with basic information.
- Add `meta` and `link rel` elements to `head` with information about the manifest, logo sizes and color theme.

### Use data stored in IndexedDB when off-line
- Create the method `DBHelper.getAllRestaurantsPromiseFromIDB` to read all restaurant data from IDB.
- Modify the `catch` methods of `fetchRestaurants` and `fetchRestaurantById` to read data from IDB when a network error occurs.
- Make sure `fetch` answers are always valid by checking `response.ok`, throwing error otherwhise (thus allowing to read data from IDB)
- Check that `restaurant.id` is always a number, as expected by IDB.

### Miscellaneous improvements
- Use of `fetch` calls instead of XHR requests. More flexible and Promise-based.
- Use ES6 global objects of type [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) to obtain the lists of cuisines and neighborhoods without duplicates.
- Store the full restaurants list into `DBHelper` to avoid unnecessary requests to the server.
- Update and complete code comments

### Use promises instead of callbacks
- Refactor methods in `DBHelper` currently using callback functions in order to return objects of type `Promise`, more flexible and compatible with IDB.
- Convert callback functions in `main.js` and `restaurant_info.js`, making them consumers and/or producers of `Promise` objects.

### Store restaurant data in IndexedDB
- Add Jake Archibald's [IDB](https://github.com/jakearchibald/idb) package to `package.json`. Then, copy `/node_modules/idb/lib/idb.js` into `/js` (don't `require` modules by now) and import it in `index.html` and `restaurants.html`.
- Create new methods in `DBHelper` to deal with IndexedDb:
  - `getIdbPromise`: To gain access to the database
  - `getRestaurantPromiseFromIDB`: To retrieve data related to a specific restaurant from IDB
  - `saveRestaurantToIdb`: To add a restaurant record to IDB
  - `saveRestaurantIfNewer`: Checks if a restaurant with the given ID already exists and has updated data proor to add or update the restaurant record in IDB.
  - `saveAllRestaurantsIfNewer`: Performs the previous operation with a collection of restaurants.
- Update `DBHelper.fetchRestaurants` to save the obtained restaurant data into IDB.
- Add `js/idb.js` to `PRECACHE_URLS` in `service-worker.js`

### Add a generic restaurant image
- Created a generic image for restaurants with the `photograph` field empty or undefined.

### Pull data from the development server
- Define the `DBHelper.API_ENDPOINT` constant, pointing to the server root service (in substitution of `DATABASE_URL`, not yet used).
- Adapt `DBHelper.fetchRestaurants` to read the array of records returned by the server.
- Adapt `DBHelper.fetchRestaurantById` to retrieve data related to just one restaurant.
- Remove `data/restaurants.json` from `PRECACHE_URLS` in service worker (we will not need it anymore)
- Add the `.jpg` file extension to `DBHelper.imageFileForRestaurant` (the server returns just the base file name)


## STAGE 1

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

