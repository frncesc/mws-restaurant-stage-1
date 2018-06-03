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
self.mapScript = null;
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

self.toggleFavorite = (ev) => {
  const chk = ev.target;
  if (chk && chk.id.length > 3) {
    const restaurant_id = Number(chk.id.substr(3));
    let favorite = chk.getAttribute('aria-checked') !== 'true';
    chk.setAttribute('aria-checked', favorite);
    chk.title = favorite ? 'Unset as favorite' : 'Set as favorite';
    DBHelper.performAction('SET_FAVORITE', { restaurant_id, favorite }, self.showSnackBar);
  }
}

self.handleFavKeyPress = (ev) => {
  if (ev.keyCode === 32 || ev.keyCode === 13) {
    ev.preventDefault();
    self.toggleFavorite(ev);
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

  const favCheck = document.createElement('span');
  favCheck.id = `fav${restaurant.id}`;
  favCheck.className = 'favorite'
  favCheck.setAttribute('role', 'checkbox');
  favCheck.setAttribute('tabindex', 0);
  favCheck.setAttribute('aria-checked', restaurant.is_favorite);
  favCheck.title = restaurant.is_favorite ? 'Unset as favorite' : 'Set as favorite';;
  favCheck.onclick = self.toggleFavorite;
  favCheck.onkeypress = self.handleFavKeyPress;
  li.append(favCheck);

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
 * Load GoogleMaps script
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
 * Arm listeners on the static map to load the real Google Map
 * when the user clicks on it or restaurant selection changes.
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
      // The map container usually has 480px height, so no adjustement is needed
      const py = y;
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

  // Set listeners for 'click' (includes 'tap') and drop-down lists 'change' events:
  mapContainer.addEventListener('mousedown', loadMapCallback);
  mapContainer.addEventListener('touchstart', loadMapCallback);
  mapContainer.addEventListener('click', loadMapCallback);
  cSelect.addEventListener('change', loadMapCallback);
  nSelect.addEventListener('change', loadMapCallback);
}

/**
 * Initialize the Google Maps object, called from mapScript.
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

  // Add 'title' attribute to the iframe map container
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
 * Set listeners, fetch neighborhoods and cuisines and update restaurants as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {

  self.setStaticMapListeners();

  self.fetchNeighborhoods()
    .then(fetchCuisines)
    .then(updateRestaurants);

});
