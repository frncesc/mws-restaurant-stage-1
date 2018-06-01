'use strict';

/**
 * Register service worker
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

/**
 * Common variables
 */
let restaurant = null;
let mapObject = null;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {

  // Check if restaurant data is already loaded and map not initialized
  if (self.restaurant && !self.mapObject) {
    const mapContainer = document.getElementById('map');
    self.mapObject = new google.maps.Map(mapContainer, {
      zoom: 16,
      center: self.restaurant.latlng,
      //scrollwheel: false,
      gestureHandling: 'cooperative',
    });

    // Add 'title' attribute to the iframe map container
    const titleListener = self.mapObject.addListener('tilesloaded', ev => {
      const mapFrame = mapContainer.querySelector('iframe');
      if (mapFrame)
        mapFrame.setAttribute('title', 'Map');
      titleListener.remove();
    });

    // Set map marker
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.mapObject);
  }
}

/**
 * Get the current restaurant from page URL.
 * @returns {Promise} - Resolves with an object of type `restaurant`
 */
self.fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }

  const id = self.getParameterByName('id');
  if (!id) // no id found in URL
    return Promise.reject('No restaurant id in URL');
  else {
    // `id` must be a number
    return DBHelper.fetchRestaurantById(parseInt(id))
      .then(restaurant => {
        if (!restaurant)
          return Promise.reject(`Unknown restaurant "${id}"`);

        self.restaurant = restaurant;
        self.fillRestaurantHTML();
        self.fillBreadcrumb();
        return restaurant;
      });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
self.fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const fullFileNameParts = DBHelper.imageFileForRestaurant(restaurant).split('.');
  const fileName = fullFileNameParts[0];
  const extension = fullFileNameParts[1];


  // Use a `picture` element with both webp and jpeg sources instead of `img` with single srcset
  const sourceWebp = document.getElementById('source-webp');
  sourceWebp.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.webp ${size}w`).join(', ') + `, pictures/${fileName}-800px.webp`;

  const sourceJpeg = document.getElementById('source-jpeg');
  sourceJpeg.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.${extension} ${size}w`).join(', ') + `, pictures/${fileName}-800px.${extension}`;

  const picImage = document.getElementById('restaurant-img');
  picImage.alt = `${restaurant.name} restaurant photo`;
  picImage.sizes = 'calc(100vw - 2rem)';
  picImage.src = `pictures/${fileName}-800px.${extension}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // Just checking with MDL
  cuisine.addEventListener('click', () => {
    console.log('Ep')
    self.showSnackBar({ message: 'Just testing!' });
  });

  // fill operating hours
  if (restaurant.operating_hours) {
    self.fillRestaurantHoursHTML();
  }
  // fill reviews
  self.fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
self.fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
self.fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');

  const title = document.getElementById('reviews-title');
  title.innerHTML = 'Reviews';

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }

  reviews.forEach(review => {
    container.appendChild(createReviewHTML(review));
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
self.createReviewHTML = (review) => {
  const article = document.createElement('article');
  const header = document.createElement('header');

  const name = document.createElement('div');
  name.className = 'review-author';
  name.setAttribute('aria-label', 'Review author');
  name.innerHTML = review.name;
  header.appendChild(name);

  const date = document.createElement('div');
  date.className = 'review-date';
  date.setAttribute('aria-label', 'Review date');
  const reviewDate = new Date(review.updatedAt);
  date.innerHTML = reviewDate.toLocaleDateString();
  header.appendChild(date);

  article.appendChild(header);

  const rating = document.createElement('div');
  rating.className = 'review-rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  article.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  article.appendChild(comments);

  return article;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
self.fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');

  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
self.getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Show the snackbar with the provided options
 * @see: https://material.io/develop/web/components/snackbars/
 */
self.snackbar = null;
self.showSnackBar = (options) => {
  if (!self.snackbar)
    self.snackbar = new mdc.snackbar.MDCSnackbar(document.querySelector('.mdc-snackbar'));
  const DEFAULT_OPTIONS = {
    message: '---',
    actionText: 'DISMISS',
    actionHandler: () => { },
    timeout: 3000
  };
  snackbar.show(Object.assign(DEFAULT_OPTIONS, options));
};

/**
 * Update restaurant data as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  self.fetchRestaurantFromURL()
    .then(restaurant => {
      // Check if Maps API is already loaded
      if (window.google && window.google.maps)
        self.initMap()
    });
});
