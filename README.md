# Mobile Web Specialist Certification Course

#### _Three Stage Course Material Project - Restaurant Reviews_

## Stage 1

### Site overview

At this stage, the site is dynamically built with the information of `data/restaurants.json` and the photos stored in `/img`.

The site pivots between the main page `index.html` and specific information and reviews about each restaurant, presented in `restaurant.html`.

A _Google Maps_ widget is embedded in each page, showing markers with the location of each restaurant.

This project was originally forked from https://github.com/udacity/mws-restaurant-stage-1
The list of the changes introduced on the original project is detailed in [CHANGELOG.md](https://github.com/frncesc/mws-restaurant-stage-1/blob/master/CHANGELOG.md).

### Building the site components

This project uses [Node.js](https://nodejs.org) and [NPM packages](https://www.npmjs.com/) to prepare and serve different components on the development environment. Please refer to the [Node.js downloads page](https://nodejs.org/en/download/) for more information about how to install Node.js and NPM on different platforms.

To download and install the project's required components, just go to its root folder and launch:

```
$ npm install
```

The site uses restaurant pictures scaled to different resolutions to match the requirements of each device and minimize download sizes and waiting times. In order to build the scaled images, just launch:

```
$ npm run resize-images
```

The image resizing is done in `resize-images.js` using the [sharp](http://sharp.pixelplumbing.com/en/stable/) NPM package.

### Testing the site

You can use this command to launch a live development server:

```
$ npm run debug
```

This will open your default browser with the project's main page. The site is automatically reloaded when it detects changes in any file.

The site is served by default on port `8000`, but you can change it in `package.json` if needed (see `debug` params in the `scripts` section)
