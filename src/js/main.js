'use strict';

/**
 * Register service worker
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

/**
 * Create an intersection observer to set the restaurant images on `li`
 * elements only when they are close to the viewport boundaries.
 * See: https://developers.google.com/web/updates/2016/04/intersectionobserver
 */
self.io = new IntersectionObserver(
  entries => {
    const toBeRemoved = entries.filter(entry => {
      if (entry.isIntersecting && !entry.target.querySelector('img')) {
        self.setPictureForRestaurant(entry.target);
        return true;
      }
      return false;
    });
    // Remove already realized entries from the observer
    toBeRemoved.forEach(entry => self.io.unobserve(entry.target));
  },
  {
    rootMargin: '50px'
  }
);

/**
 * Common variables
 */
self.restaurants = [];
self.neighborhoods = [];
self.cuisines = [];
self.map = null;
self.markers = [];

/**
 * Fetch all neighborhoods and set their HTML.
 * @returns {Promise} - Resolves with an array of strings
 */
self.fetchNeighborhoods = () => {
  return DBHelper.fetchNeighborhoods()
    .then(neighborhoods => {
      self.neighborhoods = neighborhoods;
      self.fillNeighborhoodsHTML(neighborhoods);
      return neighborhoods;
    })
}

/**
 * Set neighborhoods HTML.
 */
self.fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  if (neighborhoods)
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
}

/**
 * Fetch all cuisines and set their HTML.
 * @returns {Promise} - Resolves with an array of strings
 */
self.fetchCuisines = () => {
  return DBHelper.fetchCuisines()
    .then(cuisines => {
      self.cuisines = cuisines;
      self.fillCuisinesHTML(cuisines);
      return cuisines;
    })
}

/**
 * Set cuisines HTML.
 */
self.fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  if (cuisines)
    cuisines.forEach(cuisine => {
      const option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
}

/**
 * Update page and map for current restaurants.
 * @returns {Promise} - Resolves with an array of `restaurant` objects
 */
self.updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  return DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then(restaurants => {
      self.resetRestaurants(restaurants);
      self.fillRestaurantsHTML();
      return restaurants;
    });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
self.resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
self.fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  if (restaurants) {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    self.addMarkersToMap();
  }
}

/**
 * Create restaurant HTML.
 */
self.createRestaurantHTML = (restaurant) => {

  const li = document.createElement('li');
  const imgFile = DBHelper.imageFileForRestaurant(restaurant);
  if (imgFile)
    // The real picture will be set later in `setPictureForRestaurant`
    li.setAttribute('data-imgfile', imgFile);

  // Use a `picture` element with both webp and jpeg sources instead of `img` with single srcset
  const picture = document.createElement('picture');
  picture.className = 'restaurant-img';
  picture.classList.add('empty-picture');
  li.append(picture);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  // Register the element on the IntersectionObserver
  self.io.observe(li);

  return li;
}

/**
 * Set the real sources and image of a restaurant `picture` element
 * Should be called by IntersectionObserver when the element approaches or intersects the viewport
 */
self.setPictureForRestaurant = (li) => {

  // Get the ile name set by `createRestaurantHTML`
  const imgFile = li.getAttribute('data-imgfile');
  if (!imgFile)
    return;

  const fullFileNameParts = imgFile.split('.');
  const fileName = fullFileNameParts[0];
  const extension = fullFileNameParts[1];
  const picture = li.querySelector('picture');
  const restaurantName = li.querySelector('h3').innerHTML;

  // Define a set of sources in WEBP format
  const sourceWebp = document.createElement('source');
  sourceWebp.type = 'image/webp';
  sourceWebp.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.webp ${size}w`).join(', ') + `, pictures/${fileName}-800px.webp`;

  // Define a second set of sources in JPEG or PNG
  const sourceJpeg = document.createElement('source');
  sourceJpeg.type = 'image/jpeg';
  sourceJpeg.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.${extension} ${size}w`).join(', ') + `, pictures/${fileName}-800px.${extension}`;

  // Create the main `img` element of this `picture`
  const picImage = document.createElement('img');
  picImage.alt = `${restaurantName} restaurant photo`;
  picImage.sizes = 'calc(100vw - 2rem)';
  picImage.src = `pictures/${fileName}-400px.${extension}`;

  // De-register this restaurant element from `IntersectionObserver`
  picture.classList.remove('empty-picture');
  picture.append(sourceWebp, sourceJpeg, picImage);

  console.log(`Picture set for "${restaurantName}"`);
}

/**
 * Add markers for current restaurants to the map.
 */
self.addMarkersToMap = (restaurants = self.restaurants) => {
  if (restaurants && self.map) {
    restaurants.forEach(restaurant => {
      // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url
      });
      self.markers.push(marker);
    });
  }
}

/**
 * Resets the restaurant markers
 */
self.resetMarkers = () => {
  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.addMarkersToMap();
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  if (self.restaurants)
    self.resetMarkers();
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded, and update restaurants
 */
document.addEventListener('DOMContentLoaded', (event) => {
  self.fetchNeighborhoods()
    .then(fetchCuisines)
    .then(updateRestaurants);
});
