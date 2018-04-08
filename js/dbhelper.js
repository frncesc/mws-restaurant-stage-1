/**
 * Common database helper functions.
 */
class DBHelper {

  // global idb

  /**
   * Database API endpoint.
   * Points to the API root service, currently returning the full list of restaurants
   */
  static get API_ENDPOINT() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get IDB_NAME() {
    return 'restaurants';
  }

  static get IDB_STORE() {
    return 'restaurants';
  }

  static get IDB_VERSION() {
    return 1;
  }

  static getIdbPromise() {
    return idb.open(DBHelper.IDB_NAME, DBHelper.IDB_VERSION, upgradeDB => {
      // Note: we don't use 'break' in this switch statement,
      // the fall-through behaviour is what we want.
      switch (upgradeDB.oldVersion) {
        case 0:
          upgradeDB.createObjectStore(DBHelper.IDB_STORE, { keyPath: 'id' });
      }
    });
  }

  static getRestaurantPromiseFromIDB(db, id) {
    return db.transaction(DBHelper.IDB_STORE).objectStore(DBHelper.IDB_STORE).get(id);
  }

  static saveRestaurantToIdb(db, restaurant) {
    const tx = db.transaction(DBHelper.IDB_STORE, 'readwrite');
    tx.objectStore(DBHelper.IDB_STORE).put({
      id: restaurant.id,
      data: restaurant
    });
    return tx.complete;
  }

  static saveRestaurantIfNewer(db, restaurant) {
    return DBHelper.getRestaurantPromiseFromIDB(db, restaurant.id)
      .then(currentData => {
        if (currentData) {
          console.log(`"${restaurant.name}" already exists!`);
          return true;
        } else {
          console.log(`Adding "${restaurant.name}" to database`)
          return DBHelper.saveRestaurantToIdb(db, restaurant);
        }
      })
  }

  static saveAllRestaurantsIfNewer(db, restaurants){
    return Promise.all(
      restaurants.map(restaurant => DBHelper.saveRestaurantIfNewer(db, restaurant))
    )
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.API_ENDPOINT);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const restaurants = JSON.parse(xhr.responseText);
        callback(null, restaurants);
        // Save results to database
        DBHelper.getIdbPromise()
          .then(db => DBHelper.saveAllRestaurantsIfNewer(db, restaurants))
          .catch(err => {
            console.log(`Error when saving restaurant data to database: ${err}`);
          })
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', `${DBHelper.API_ENDPOINT}/${id}`);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const restaurant = JSON.parse(xhr.responseText);
        callback(null, restaurant);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image sizes
   */
  static imgSizes() {
    return [340, 400, 600, 800]
  };

  /**
   * Restaurant image file.
   */
  static imageFileForRestaurant(restaurant) {
    // Check for the existence and real content of `restaurant.photograph` (can be zero!)
    return (restaurant.photograph || restaurant.photograph === 0) ? `${restaurant.photograph}.jpg` : 'generic.png';
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${imageFileForRestaurant(restaurant)}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    if (map && google && google.maps && google.maps.Marker) {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP
      }
      );
      return marker;
    }
    return null;
  }

}
