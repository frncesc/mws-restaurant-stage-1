'use strict';

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
   * Database API endpoint for restaurants.
   * Points to the API root service, currently returning the full list of restaurants
   * @type {string}
   */
  static get API_ENDPOINT() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
 * Database API endpoint for reviews.
 * Points to the API root service, currently returning the full list of reviews
 * @type {string}
 */
  static get API_REVIEWS_ENDPOINT() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews`;
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
  static get IDB_RESTAURANTS_STORE() {
    return 'restaurants';
  }

  /**
   * Name of the IDB table used for reviews
   * @type {string}
   */
  static get IDB_REVIEWS_STORE() {
    return 'reviews';
  }

  /**
   * Current version of the schema used in IDB
   * @type {number}
   */
  static get IDB_VERSION() {
    return 2;
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
        switch (upgradeDB.oldVersion) {
          case 0:
            upgradeDB.createObjectStore(DBHelper.IDB_RESTAURANTS_STORE, { keyPath: 'id' });
          case 1:
            // TODO: Clear reviews from old IDB_RESTAURANTS_STORE
            upgradeDB.createObjectStore(DBHelper.IDB_REVIEWS_STORE, { keyPath: 'id' });
          // space reserved for future updates...
        }
      }).then(db => {
        // Store `db` for later use
        DBHelper._IDB = db;
        return db;
      });
  }

  /**
   * Gets a restaurant record from the IndexdedDB
   * @param {number} id - The main identifier of the requested restaurant (currently a number)
   * @returns {Promise} - Resolves with an object of type `restaurant` or _null_ if not found.
   */
  static getRestaurantPromiseFromIDB(id) {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_RESTAURANTS_STORE)
        .objectStore(DBHelper.IDB_RESTAURANTS_STORE)
        .get(id)
        .then(record => record ? record.data : null);
    });
  }

  /**
   * Gets a review record from the IndexdedDB
   * @param {number} id - The main identifier of the requested review (currently a number)
   * @returns {Promise} - Resolves with an object of type `review` or _null_ if not found.
   */
  static getReviewPromiseFromIDB(id) {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_REVIEWS_STORE)
        .objectStore(DBHelper.IDB_REVIEWS_STORE)
        .get(id)
        .then(record => record ? record.data : null);
    });
  }

  /**
   * Gets all restaurants from the IndexdedDB
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`, or _null_ if none found.
   */
  static getAllRestaurantsPromiseFromIDB() {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_RESTAURANTS_STORE)
        .objectStore(DBHelper.IDB_RESTAURANTS_STORE)
        .getAll()
        .then(allObjs => allObjs ? allObjs.map(obj => obj.data) : null);
    });
  }

  /**
   * Gets all reviews from the IndexdedDB
   * @returns {Promise} - Resolves with an array of objects of type `review`, or _null_ if none found.
   */
  static getAllReviewsPromiseFromIDB() {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_REVIEWS_STORE)
        .objectStore(DBHelper.IDB_REVIEWS_STORE)
        .getAll()
        .then(allObjs => allObjs ? allObjs.map(obj => obj.data) : null);
    });
  }

  /**
   * This method adds or updates an object of type `restaurant` on the indexedDB
   * @param {Object} restaurant - The `restaurant` object to add or update
   * @returns {Promise} - Resolves with `true` when successfull
   */
  static saveRestaurantToIdb(restaurant) {
    return DBHelper.getIdb().then(db => {
      const tx = db.transaction(DBHelper.IDB_RESTAURANTS_STORE, 'readwrite');
      tx.objectStore(DBHelper.IDB_RESTAURANTS_STORE).put({
        id: restaurant.id,
        data: restaurant
      });
      return tx.complete;
    });
  }

  /**
   * This method adds or updates an object of type `review` on the indexedDB
   * @param {Object} review - The `review` object to add or update
   * @returns {Promise} - Resolves with `true` when successfull
   */
  static saveReviewToIdb(review) {
    return DBHelper.getIdb().then(db => {
      const tx = db.transaction(DBHelper.IDB_REVIEWS_STORE, 'readwrite');
      tx.objectStore(DBHelper.IDB_REVIEWS_STORE).put({
        id: review.id,
        data: review
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
        if (restaurant.updatedAt && currentData && currentData.updatedAt >= restaurant.updatedAt) {
          console.log(`"${restaurant.name}" is already updated in the database`);
          return true;
        } else {
          console.log(`"${restaurant.name}" ${currentData ? 'updated in' : 'added to'} the database`)
          return DBHelper.saveRestaurantToIdb(restaurant);
        }
      });
  }

  /**
   * This method adds or updates an object of type `review` on the indexedDB
   * only if not already present or if the provided data newer than the stored one.
   * @param {Object} review - The `review` object to add or update
   * @returns {Promise} - Resolves with `true` when successfull
   */
  static saveReviewIfNewer(review) {
    return DBHelper.getReviewPromiseFromIDB(review.id)
      .then(currentData => {
        // `restaurant.updatedAt` should be in ISO format, so we can perform a direct string comparision
        if (review.updatedAt && currentData && currentData.updatedAt >= review.updatedAt) {
          console.log(`Review "${review.id}" is already updated in the database`);
          return true;
        } else {
          console.log(`Review "${review.id}" ${currentData ? 'updated in' : 'added to'} the database`)
          return DBHelper.saveReviewToIdb(restaurant);
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
   * Processes an array of `review` objects, storing or updating them on the IndexedDB
   * only when they are new or have newer data.
   * @param {Object[]} reviews - The array of reviews to be processed
   * @returns {Promise} - Resolves with an array of `true` when successfull
   */
  static saveAllReviewsIfNewer(reviews) {
    return Promise.all(
      reviews.map(review => DBHelper.saveReviewIfNewer(review))
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
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      })
      .then(restaurants => {
        // Save `restaurants` for later use
        DBHelper._RESTAURANTS = restaurants;
        // Store the restaurants list into IDB
        DBHelper.saveAllRestaurantsIfNewer(restaurants)
          .then(() => {
            console.log(`Restaurants list saved in IDB!`);
          });
        // return the requested array of restaurant objects
        return restaurants;
      })
      .catch(err => {
        // Maybe we are off-line? Try to get data from IDB
        return DBHelper.getAllRestaurantsPromiseFromIDB()
          .then(restaurants => {
            // Save `restaurants` for later use
            DBHelper._RESTAURANTS = restaurants;
            return restaurants;
          })
          .catch(idbErr => {
            console.log(`Error requesting the restaurants list: ${err}`);
            throw new Error(idbErr);
          });
      });
  }

  /**
   * Fetch all reviews.
   * The resulting array will be stored or updated on the IndexedDB, and
   * recorded as a static member of `DBHelper` for later use.
   * @returns {Promise} - Resolves with an array of `review` objects.
   */
  static fetchReviews() {
    if (DBHelper._REVIEWS)
      return Promise.resolve(DBHelper._REVIEWS);

    return fetch(DBHelper.API_REVIEWS_ENDPOINT)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      })
      .then(reviews => {
        // Save `restaurants` for later use
        DBHelper._REVIEWS = reviews;
        // Store the restaurants list into IDB
        DBHelper.saveAllReviewsIfNewer(reviews)
          .then(() => {
            console.log(`Reviews saved in IDB!`);
          });
        // return the requested array of restaurant objects
        return reviews;
      })
      .catch(err => {
        // Maybe we are off-line? Try to get data from IDB
        return DBHelper.getAllReviewsPromiseFromIDB()
          .then(reviews => {
            // Save `restaurants` for later use
            DBHelper._REVIEWS = reviews;
            return reviews;
          })
          .catch(idbErr => {
            console.log(`Error requesting the reviews list: ${err}`);
            throw new Error(idbErr);
          });
      });
  }

  /**
   * Fetch a restaurant by its ID
   * @param {number} id - The main identifier of the requested restaurant (currently a number)
   * @returns {Promise} - Resolves with a `restaurant` object, or _null_ if not exists
   */
  static fetchRestaurantById(id) {
    if (DBHelper._RESTAURANTS) {
      // Check if the requested restaurant is alredy stored in `_RESTAURANTS`
      const restaurant = DBHelper._RESTAURANTS.find(restaurant => restaurant.id === id);
      if (restaurant)
        return Promise.resolve(restaurant);
    }

    return fetch(`${DBHelper.API_ENDPOINT}/${id}`)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      })
      .then(restaurant => {
        // Initialize `_RESTAURANTS` if needed
        DBHelper._RESTAURANTS = DBHelper._RESTAURANTS || [];
        DBHelper._RESTAURANTS.push(restaurant);
        // Save also `restaurant` in IDB
        DBHelper.saveRestaurantIfNewer(restaurant);
        return restaurant;
      })
      .catch(err => {
        // Maybe we are off-line? Try to get data from IDB
        return DBHelper.getRestaurantPromiseFromIDB(id)
          .catch(idbErr => {
            console.log(`Error requesting restaurant data with ID "${id}": ${err}`);
            throw new Error(idbErr);
          })
      });
  }

  /**
   * Fetch a review by its ID
   * @param {number} id - The main identifier of the requested review (currently a number)
   * @returns {Promise} - Resolves with a `review` object, or _null_ if not exists
   */
  static fetchReviewById(id) {
    if (DBHelper._REVIEWS) {
      // Check if the requested restaurant is alredy stored in `_RESTAURANTS`
      const review = DBHelper._REVIEWS.find(review => review.id === id);
      if (review)
        return Promise.resolve(review);
    }

    return fetch(`${DBHelper.API_REVIEWS_ENDPOINT}/${id}`)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      })
      .then(review => {
        // Initialize `_REVIEWS` if needed
        DBHelper._REVIEWS = DBHelper._REVIEWS || [];
        DBHelper._REVIEWS.push(review);
        // Save also `restaurant` in IDB
        DBHelper.saveReviewIfNewer(review);
        return review;
      })
      .catch(err => {
        // Maybe we are off-line? Try to get data from IDB
        return DBHelper.getReviewPromiseFromIDB(id)
          .catch(idbErr => {
            console.log(`Error requesting review data with ID "${id}": ${err}`);
            throw new Error(idbErr);
          })
      });
  }

  /**
   * Fetch restaurants by a cuisine
   * @param {string} cuisine - The requested cuisine type
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`
   */
  static fetchRestaurantByCuisine(cuisine) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants.filter(r => r.cuisine_type === cuisine);
      })
      .catch(err => {
        console.log(`Error fetching the list of cuisine types: ${err}`);
      });
  }

  /**
   * Fetch restaurants by a neighborhood
   * @param {string} neighborhood - The requested neighborhood
   * @returns {Promise} - Resolves with an array of objects of type `restaurant`
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants.filter(r => r.neighborhood === neighborhood);
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
        return restaurants ? restaurants.filter(r => {
          return (cuisine === 'all' || r.cuisine_type === cuisine)
            && (neighborhood === 'all' || r.neighborhood === neighborhood);
        }) : [];
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
        // Use of `Set` to collect unique values
        return restaurants ? Array.from(restaurants.reduce((set, restaurant) => set.add(restaurant.neighborhood), new Set())) : [];
      })
      .catch(err => {
        console.log(`Error getting the list of neighborhoods: ${err}`);
      });
  }

  /**
   * Fetch all cuisines
   * @returns {Promise} - Resolves with an array of strings
   */
  static fetchCuisines() {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Use `Set` to collect unique values
        return restaurants ? Array.from(restaurants.reduce((set, restaurant) => set.add(restaurant.cuisine_type), new Set())) : [];
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
