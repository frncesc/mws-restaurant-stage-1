'use strict';

/**
 * Register the service worker
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
 * Declare common variables
 */
self.restaurants = [];
self.neighborhoods = [];
self.cuisines = [];
self.mapScript = null;
self.map = null;
self.markers = [];

/**
 * Fetches all neighborhoods and builds the neighborhoods list.
 * @returns {Promise} - Resolves with an array of strings
 */
self.fetchAndFillNeighborhoods = () => {
  const select = document.getElementById('neighborhoods-select');
  return DBHelper.fetchNeighborhoods()
    .then(neighborhoods => {
      self.neighborhoods = neighborhoods;
      if (neighborhoods)
      neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
      });
      return neighborhoods;
    })
}

/**
 * Fetches all cuisines and builds the cuisines list.
 * @returns {Promise} - Resolves with an array of strings
 */
self.fetchAndFillCuisines = () => {
  const select = document.getElementById('cuisines-select');
  return DBHelper.fetchCuisines()
    .then(cuisines => {
      self.cuisines = cuisines;
      if (cuisines)
        cuisines.forEach(cuisine => {
          const option = document.createElement('option');
          option.innerHTML = cuisine;
          option.value = cuisine;
          select.append(option);
        });
      return cuisines;
    })
}

/**
 * Updates the list and the map with the current restaurants
 * @param {boolean} updateMap - Uses a real Google Maps object when `true`, or a static image otherwise
 * @returns {Promise} - Resolves with an array of `restaurant` objects
 */
self.updateRestaurants = (updateMap = true) => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');
  const fSelect = document.getElementById('fav-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;
  const fIndex = fSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
  const fav = fSelect[fIndex].value === 'fav';

  return DBHelper.fetchRestaurantByCuisineNeighborhoodAndFav(cuisine, neighborhood, fav)
    .then(restaurants => {
      self.resetRestaurants(restaurants);
      self.fillRestaurantsHTML();
      if (updateMap) {
        if (!self.mapScript)
          self.loadGoogleMaps();
        else
          self.resetMarkers();
      }
      return restaurants;
    });
}

/**
 * Clears the current restaurant list and removes the map markers
 * @param {Object[]} restaurants - The current collection of restaurants
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
 * Creates all restaurants HTML and add them to the webpage
 * @param {Object[]} restaurants - The current collection of restaurants
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
 * Create a single restaurant HTML element
 * @param {Object} restaurant - The restaurant data
 * @returns {HTMLElement} - The "li" element created
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

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);

  const favCheck = Utils.buildFavElement(restaurant);

  // Place objects on main element
  li.append(picture);
  const headContainer = document.createElement('div');
  headContainer.className = 'restaurant-name-container';
  headContainer.append(name);
  headContainer.append(favCheck);
  li.append(headContainer);
  li.append(neighborhood);
  li.append(address);
  li.append(more);

  // Register the element on the IntersectionObserver
  self.io.observe(li);

  return li;
}

/**
 * Sets the real sources and images of a restaurant `picture` element
 * Should be called by IntersectionObserver when the element approaches or intersects the viewport
 * @param {HTMLElement} li - The "li" element where the picture should be placed
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
}

/**
 * Adds markers on the map for the current restaurants.
 * @param {Object[]} restaurants - The current collection of restaurants
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
 * Resets all the restaurant markers
 */
self.resetMarkers = () => {
  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.addMarkersToMap();
}

/**
 * Loads the "real" Google Maps script
 */
self.loadGoogleMaps = () => {
  if (!self.mapScript) {
    self.mapScript = document.createElement('script');
    self.mapScript.setAttribute('async', '');
    self.mapScript.setAttribute('defer', '');
    self.mapScript.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyD9RCuWU0sT08E4iXZeMNHdMrr1fXX0KiY&libraries=places&callback=initMap';
    document.querySelector('head').appendChild(self.mapScript);
  }
}

/**
 * Arms the event listeners that will load the real Google Maps object when a click is done on the static map image
 * or the restaurant filtering criteria changed.
 * Click and tap events on the static map image are also checked to determine if they are placed on a specific restaurant marker
 */
self.setStaticMapListeners = () => {
  const mapContainer = document.getElementById('map');
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  // Callback used by the listeners
  const loadMapCallback = (ev) => {
    // Check if a `click` has been done just over a marker
    if (self.restaurants && (ev.offsetX || (ev.targetTouches && ev.targetTouches.length > 0))) {
      const targetRect = ev.target.getBoundingClientRect();
      const x = ev.offsetX || ev.targetTouches[0].pageX - targetRect.left;
      const y = ev.offsetY || ev.targetTouches[0].pageY - targetRect.top;

      // Base static map has 640 x 480 pixels, so the real 'px' must be adjusted
      const px = x + Math.round((640 - mapContainer.offsetWidth) / 2);
      // The map has 480px height
      const py = y + Math.round((480 - mapContainer.offsetHeight) / 2);
      // Check if the click has been done over any marker
      const selected = self.restaurants.find(r => {
        // Convert co-ordinates to pixel positions on map:
        const rx = Math.round(204 + (r.latlng.lng + 74.016162) * 2893 - 13);
        const ry = Math.round(419 - (r.latlng.lat - 40.674925) * 3836 - 40);
        // Check if px and py are inside the marker box (26x40)
        return px >= rx && px <= (rx + 26) && py >= ry && py <= (ry + 40);
      });
      if (selected) {
        if (ev.type === 'click')
          // Jump to the selected restaurant page:
          window.location.href = `./restaurant.html?id=${selected.id}`;
        return;
      }
    }
    // No restaurant found, so remove listeners and load the real Google Map:
    ev.preventDefault();
    mapContainer.removeEventListener('mousedown', loadMapCallback);
    mapContainer.removeEventListener('touchstart', loadMapCallback);
    mapContainer.removeEventListener('click', loadMapCallback);
    cSelect.removeEventListener('change', loadMapCallback);
    nSelect.removeEventListener('change', loadMapCallback);
    self.loadGoogleMaps();
  };

  // Set listeners for 'click' and 'tap' events:
  mapContainer.addEventListener('mousedown', loadMapCallback);
  mapContainer.addEventListener('touchstart', loadMapCallback);
  mapContainer.addEventListener('click', loadMapCallback);
  // Set listeners for drop-down list 'change' events:
  cSelect.addEventListener('change', loadMapCallback);
  nSelect.addEventListener('change', loadMapCallback);
}

/**
 * Initializes the Google Maps object
 * (function called from mapScript)
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  const mapContainer = document.getElementById('map');
  self.map = new google.maps.Map(mapContainer, {
    zoom: 12,
    center: loc,
    //scrollwheel: false,
    gestureHandling: 'cooperative',
  });

  // Adds the 'title' attribute to the iframe map container
  const titleListener = self.map.addListener('tilesloaded', ev => {
    const mapFrame = mapContainer.querySelector('iframe');
    if (mapFrame)
      mapFrame.setAttribute('title', 'Map');
    titleListener.remove();
  });

  if (self.restaurants)
    self.resetMarkers();
}

/**
 * Set listeners, fetch neighborhoods and cuisines and update restaurants
 * as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  self.setStaticMapListeners();
  self.fetchAndFillNeighborhoods()
    .then(self.fetchAndFillCuisines)
    .then(() => {
      updateRestaurants(false);
      DBHelper.setOfflineEventHandler();
    });
});
