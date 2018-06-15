# Mobile Web Specialist Certification Course

#### _Three Stage Course Material Project - Restaurant Reviews_

## Stage 3

The web app allows now favorite/unfavorite restaurants and post, edit and delete reviews, also when off-line. To achieve this goal, different changes have been implemented:

- A _Favorite_ toggleable icon has been placed in each restaurant card, and in the main restaurant page.
- A form has been created in `restaurant.html`, initially hidden.
- _Edit_ and _Delete_ buttons have been placed in each review block.
- A _Post a new review_ button has been placed at the end of the reviews list.
- Events triggered by these UI elements have been linked to a new method on `DBHelper` that accepts calls for four different types of actions (`SET_FAVORITE`, `ADD_REVIEW`, `EDIT_REVIEW` and `DELETE_REVIEW`), and performs three operations:
  - Saves the changes on the IDB for later use, also when the device is off-line.
  - When on-line, calls the API server with the appropiate method and data.
  - When the device is off-line or the call to the API server was unsuccessfull, the requested action data is stored in a special IDB object called `pending_actions`, for later processing.
- A new method `DBHelper.flushPendingActions` has been implemented to check if there are pending actions registered on the IDB and try to process them when the device is on-line. This method is called at the beggining of each page view, and when an [`online`](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events) event is fired. In case of error when contacting the API server, the method is retried after a while (currently 20").
- A "snackbar" is used to inform the users about the state of pending actions.

__IMPORTANT:__ Keep in mind that __user login is not yet implemented__, so all actions are performed by a single, unverified user. This should be avoided in a real service!

More performance and optimizations have been introduced, with special impact on the maps:

- A static map image is displayed at startup. The real Google Maps object is loaded on request, based on user interaction:
  - The script `media/utils/build-static-map.js` generates a map image with all restaurant markers using the [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static/intro).
  - The "script" tag responsible for loading the Google Maps API has been removed from `src/index.html`. Now, the function `self.loadGoogleMaps` in `src/js/main.js` dynamically loads the real Google Maps object when invoked.
  - Static map images are compressed and optimized by the Gulp build script, stored in `/map` and defined as `background-image` properties of the `#map` div in `css/main.css`.
  - When the user interacts for first time with the static map, two things can happen:
    - If the user clicked on a restaurant bookmark, the navigation is redirected to `restaurant.html?id=xxx`
    - In any other case, and also when the restaurant selection changes, the real Google Maps object is dynamically loaded and displayed, thus allowing the user to zoom or slide it.

- A __title__ attribute has been set to the `iframe` containing the Google Maps object. This is a [critical WCAG rule](https://dequeuniversity.com/rules/axe/2.2/frame-title?application=lighthouse) not currently respected by Google Maps.

- The Npm [Snackbar](https://www.polonel.com/snackbar/) component is used to alert users about failed/recovered transactions. Many thanks to [Chris Brame](https://www.polonel.com/)!

- A third drop-down list has been added to the filtering section of `index.html`, allowing to select all restaurants or just "_My favorites_".

### Updated version of the API server

As a complementary work, I have updated the original API server (created with Sails 0.12) to __Sails v1.0__. The updated server is available in my forked repository: https://github.com/frncesc/mws-restaurant-stage-3. The main changes introduced are:
- Generated from scratch with [sails-generate](https://github.com/balderdashy/sails-generate)
- Created custom models for "restaurants" and "reviews" in `api/models`
- Created a simple API test suite in `assets/test`
- Created two scripts (`utils/generate-restaurants.js` and `utils/generate-reviews.js`), useful for generating or restoring the restaurants API test data.

For more information, see the [README.md](https://github.com/frncesc/mws-restaurant-stage-3/blob/devel/README.md) file.

### Test site
A working installation of my project is currently running at:
https://clic.saltamarges.org/restaurants

Please keep in mind that this is a very limited server running on a Raspberry Pi and used only for testing purposes, so don't expect a big performance!

The new API server test suite is also available at:
https://clic.saltamarges.org/api/test/index.html

---

## Building the site components

This project uses [Node.js](https://nodejs.org) and [NPM packages](https://www.npmjs.com/) to prepare and serve different components on the development environment. Please refer to the [Node.js downloads page](https://nodejs.org/en/download/) for more information about how to install Node.js and NPM on different platforms.

To download and install the project's required components, just go to its root folder and launch:

```
$ npm install
```

The site uses restaurant pictures scaled to different resolutions to match the requirements of each device and minimize download sizes and waiting times. All these variants of the images are built automatically. To build the production site in `dist` just launch:

```
$ npm run build
```

To start the application, make sure that the [API server](https://github.com/udacity/mws-restaurant-stage-2) is working on port 1337, and then launch:

```
$ npm run serve
```

This will open your default browser with the project's main page. The site will be automatically reloaded when changes are detected in any media or source file.

To start a debug server based on the source code without CSS or JS optimizations, just launch:

```
$ npm run debug
```

The servers are launched by default on ports `8010` (dist) and `8080` (debug), but you can change this settings in `gulpfile.js`

---

## Previous stages

### Stage 1

The site was dynamically built with the information of `data/restaurants.json` and the photos stored in `/img`.

The navigation pivots between the main page `index.html` and specific information and reviews about each restaurant, presented in `restaurant.html`.

A _Google Maps_ widget is embedded in each page, showing markers with the location of each restaurant.

This project was originally forked from https://github.com/udacity/mws-restaurant-stage-1
The list of the changes introduced on the original project is detailed in [CHANGELOG.md](https://github.com/frncesc/mws-restaurant-stage-1/blob/master/CHANGELOG.md).

### Stage 2

At this stage, data was pulled from a [Sails.js](https://sailsjs.com/) server instead of the previous _restaurants.json_ file. The [original](https://github.com/udacity/mws-restaurant-stage-2) server had some problems with character encoding, which have been solved in [this fork](https://github.com/frncesc/mws-restaurant-stage-2).

The data retrieved from the server is stored in [Indexed DB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), so it can be used again also when off-line. Jake Archibald's [IDB](https://github.com/jakearchibald/idb) is used to deal with the database.

A lot of optimizations where performed to achieve the desired performance in [Lighthouse](https://developers.google.com/web/tools/lighthouse/):

- Use a generic image for restaurants that don't have it.
- Use of [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) objects instead of passing _"error & success callbacks"_ to functions.
- Added a `manifest.json` file with basic information about the web app.
- Project workflow was re-designed: original media images where placed in `/media`, source files in `/src` and the production site was finally delivered in `/dist`. A [Gulp](https://gulpjs.com/) script takes care of all the building and debugging operations.
- Restaurant pictures are delivered in [WebP](https://developers.google.com/speed/webp/) format as well as the original JPEG, so browsers capable of using it can take advantage of its performance improvement. To make this possible, the original `img` was replaced by `picture` elements with two `source` components.
- An [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) was used to avoid off-screen pictures, specially in small screens. The real image pictures are set and downloaded only when the restaurant `li` element approaches or intersects the display area.
- Local scripts have been bundled, babelized and minimized.
- CSS stylesheets have also been optimized, minified and placed as inline `style` elements on the production site.
