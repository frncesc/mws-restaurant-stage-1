# Mobile Web Specialist Certification Course

#### _Three Stage Course Material Project - Restaurant Reviews_

## Stage 1

### Site overview

The site is dynamically built with the information of `data/restaurants.json` and the photos stored in `/img`.

The site pivots between the main page `index.html` and specific information and reviews about each restaurant, presented in `restaurant.html`.

A _Google Maps_ widget is embedded in each page, showing markers with the location of each restaurant.

This project was originally forked from https://github.com/udacity/mws-restaurant-stage-1
The list of the changes introduced on the original project is detailed in [CHANGELOG.md](https://github.com/frncesc/mws-restaurant-stage-1/blob/master/CHANGELOG.md).

## Stage 2

At this stage, data is pulled from a [Sails.js](https://sailsjs.com/) server instead of the previous _restaurants.json_ file. The [original](https://github.com/udacity/mws-restaurant-stage-2) server had some problems with character encoding, which have been solved in [this fork](https://github.com/frncesc/mws-restaurant-stage-2).

The data retrieved from the server is now stored in [Indexed DB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), so it can be used again also when off-line. Jake Archibald's [IDB](https://github.com/jakearchibald/idb) is used to deal with the database.

A lot of optimizations have been performed to achieve the desired performance thresholds in [Lighthouse](https://developers.google.com/web/tools/lighthouse/):

- Use a generic image for restaurants that don't have it.
- Use of [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) objects instead of passing "error & success callbacks" to functions.
- Added a `manifest.json` file with basic information about the web app.
- Project workflow has been re-designed: now original media images are in `/media`, source files are in `/src` and the production site is finally delivered in `/dist`. A [Gulp](https://gulpjs.com/) script takes care of all the build and debug operations.
- Restaurant pictures are now delivered in [WebP](https://developers.google.com/speed/webp/) format as well as the original JPEG, so that browsers capable of using it can take advantage of its performance improvement. To make this possible, the original `img` had been replaced by `picture` elements with two `source` components.
- An [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) is used to avoid off-screen pictures, specially in small screens. The real image pictures are set and downloaded only when the restaurant `li` element approaches or intersects with the display area.
- Local scripts have been bundled, babelized and minimized.
- CSS stylesheets have also been optimized, minified and placed as inline `style` elements in the production site.

### Building the site components

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
