
/* global idb */

/**
 * Common database helper functions.
 * @exports DBHelper
 * @class
 */
class DBHelper {

  /**
   * Current sizes in which the restaurant images are available (width in `px`)
   * @type {number[]}
   */
  static get IMG_SIZES() {
    return [340, 400, 600, 800]
  }

  /**
   * Database API endpoint.
   * Points to the API root service, currently returning the full list of restaurants
   * @type {string}
   */
  static get API_ENDPOINT() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Name of the database used in IndexedDB
   * @type {string}
   */
  static get IDB_NAME() {
    return 'restaurants';
  }

  /**
   * Name of the main IDB table
   * @type {string}
   */
  static get IDB_STORE() {
    return 'restaurants';
  }

  /**
   * Current version of the schema used in IDB
   * @type {number}
   */
  static get IDB_VERSION() {
    return 1;
  }

  /**
   * Opens the main IndexedDB controller
   * @returns {Promise} - Resolves with a [DB](https://www.npmjs.com/package/idb#db) object
   */
  static getIdb() {
    // Check if _IDB is already initialized
    if (DBHelper._IDB)
      return Promise.resolve(DBHelper._IDB);
    else
      return idb.open(DBHelper.IDB_NAME, DBHelper.IDB_VERSION, upgradeDB => {
        // Note: we don't use 'break' in this switch statement,
        // the fall-through behaviour is what we want.
        switch (upgradeDB.oldVersion) {
          case 0:
            upgradeDB.createObjectStore(DBHelper.IDB_STORE, { keyPath: 'id' });
        }
      }).then(db => {
        // Store `db` for later use
        DBHelper._IDB = db;
        return db;
      });
  }

  /**
   * Gets a restaurant record from the IndexdedDB
   * @param {number|string} id - The main identifier of the requested restaurant (currently a number)
   * @returns {Promise} - Resolves with an object of type `restaurant`
   */
  static getRestaurantPromiseFromIDB(id) {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_STORE)
        .objectStore(DBHelper.IDB_STORE)
        .get(id)
        .then(record => record.data);
    });
  }

  /**
   * This method adds or updates an object of type `restaurant` on the indexedDB
   * @param {Object} restaurant - The `restaurant` object to add or update
   * @returns {Promise} - Resolves with `true` when successfull
   */
  static saveRestaurantToIdb(restaurant) {
    return DBHelper.getIdb().then(db => {
      const tx = db.transaction(DBHelper.IDB_STORE, 'readwrite');
      tx.objectStore(DBHelper.IDB_STORE).put({
        id: restaurant.id,
        data: restaurant
      });
      return tx.complete;
    });
  }

  /**
   * This method adds or updates an object of type `restaurant` on the indexedDB
   * only if not already present or if the provided data newer than the stored one.
   * @param {Object} restaurant - The `restaurant` object to add or update
   * @returns {Promise} - Resolves with `true` when successfull
   */
  static saveRestaurantIfNewer(restaurant) {
    return DBHelper.getRestaurantPromiseFromIDB(restaurant.id)
      .then(currentData => {
        // `restaurant.updatedAt` should be in ISO format, so we can perform a direct string comparision
        if (currentData && currentData.updatedAt >= restaurant.updatedAt) {
          console.log(`"${restaurant.name}" already exists on the database`);
          return true;
        } else {
          console.log(`"${restaurant.name}" ${currentData ? 'updated on' : 'added to'} the database`)
          return DBHelper.saveRestaurantToIdb(restaurant);
        }
      });
  }

  /**
   * Processes an array of `restaurant` objects, storing or updating them on the IndexedDB
   * only when they are new or have newer data.
   * @param {Object[]} restaurants - The array of restaurants to be processed
   * @returns {Promise} - Resolves with an array of `true` when successfull
   */
  static saveAllRestaurantsIfNewer(restaurants) {
    return Promise.all(
      restaurants.map(restaurant => DBHelper.saveRestaurantIfNewer(restaurant))
    )
  }

  /**
   * Fetch all restaurants.
   * The resulting array will be stored or updated on the IndexedDB, and
   * recorded as a static member of `DBHelper` for later use.
   * @returns {Promise} - Resolves with an array of `restaurant` objects.
   */
  static fetchRestaurants() {
    if (DBHelper._RESTAURANTS)
      return Promise.resolve(DBHelper._RESTAURANTS);

    return fetch(DBHelper.API_ENDPOINT)
      .then(response => response.json())
      .then(restaurants => {
        // Save `restaurants` for later use
        DBHelper._RESTAURANTS = restaurants;
        // Store the restaurants list into IDB
        DBHelper.saveAllRestaurantsIfNewer(restaurants)
          .then(() => {
            console.log(`Restaurants list saved to IDB!`);
          });
        // return the requested array of restaurant objects
        return restaurants;
      })
      .catch(err => {
        console.log(`Error requesting the restaurants list: ${err}`);
      });
  }

  /**
   * Fetch a restaurant by its ID
   * @param {number|string} id - The main identifier of the requested restaurant (currently a number)
   * @returns {Promise} - Resolves with a `restaurant` object, or _null_ if not exists
   */
  static fetchRestaurantById(id) {
    if (DBHelper.RESTAURANTS)
      return Promise.resolve(DBHelper.RESTAURANTS.find(restaurant => restaurant.id === id));

    return fetch(`${DBHelper.API_ENDPOINT}/${id}`)
      .then(response => response.json())
      .then(restaurant => {
        DBHelper.saveRestaurantIfNewer(restaurant);
        return restaurant;
      })
      .catch(err => {
        console.log(`Error requesting restaurant data with ID "${id}": ${err}`);
      });
  }

  /**
   * Fetch restaurants by a cuisine
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`
   */
  static fetchRestaurantByCuisine(cuisine) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants.filter(r => r.cuisine_type == cuisine);
      })
      .catch(err => {
        console.log(`Error fetching the list of cuisine types: ${err}`);
      });
  }

  /**
   * Fetch restaurants by a neighborhood
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants.filter(r => r.neighborhood == neighborhood);
      })
      .catch(err => {
        console.log(`Error fetching the list of neighborhoods: ${err}`);
      });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood
   * @param {string} cuisine - The requested cuisine type, or `all` for matching all cuisines
   * @param {string} neighborhood - The requested neighborhood, or `all` for matching all neighborhoods
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants.filter(r => (cuisine === 'all' || r.cuisine_type === cuisine) && (neighborhood === 'all' || r.neighborhood === neighborhood));
      })
      .catch(err => {
        console.log(`Error fetching restaurant list by cuisine and neighborhood: ${err}`);
      });
  }

  /**
   * Fetch all neighborhoods
   * @returns {Promise} - Resolves with an array of strings
   */
  static fetchNeighborhoods() {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Use `Set` to collect unique values
        return Array.from(restaurants.reduce((set, restaurant) => set.add(restaurant.neighborhood), new Set()));
      })
      .catch(err => {
        console.log(`Error getting the list of neighborhoods: ${err}`);
      });
    ;
  }

  /**
   * Fetch all cuisines
   * @returns {Promise} - Resolves with an array of strings
   */
  static fetchCuisines() {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Use `Set` to collect unique values
        return Array.from(restaurants.reduce((set, restaurant) => set.add(restaurant.cuisine_type), new Set()));
      })
      .catch(err => {
        console.log(`Error getting the list of cuisine types: ${err}`);
      });
  }

  /**
   * Gets the restaurant page URL.
   * @param {Object} restaurant - The requested restaurant
   * @returns {string} - The requested URL
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image file
   * Gets the file name for the image associated to the given restaurant,
   * returning a generic image when not defined
   * @param {Object} restaurant - The `restaurant` object for which the image is requested
   * @returns {string}
   */
  static imageFileForRestaurant(restaurant) {
    // Check for the existence and real content of `restaurant.photograph` (can be zero!)
    return (restaurant.photograph || restaurant.photograph === 0) ? `${restaurant.photograph}.jpg` : 'generic.png';
  }

  /**
   * Builds a map marker for a restaurant
   * @param {object} restaurant - The `restaurant` object for wich the marker is requested
   * @param {object} map - An object of type `google.maps.Map`
   * @returns {object} - An object of type `google.maps.Marker`
   */
  static mapMarkerForRestaurant(restaurant, map) {
    if (map && google && google.maps && google.maps.Marker) {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP
      });
      return marker;
    }
    return null;
  }
}
