'use strict';

/* global idb */

// Change this to your server protocol, host and port:
const API_HOST = 'http://localhost:1337'

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
   * @type {string}
   */
  static get API_RESTAURANTS_ENDPOINT() {
    return `${API_HOST}/restaurants`;
  }

  /**
   * Database API endpoint for restaurant reviews.
   * @type {string}
   */
  static get API_REVIEWS_ENDPOINT() {
    return `${API_HOST}/reviews`;
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
   * Name of the IDB table used to store pending operations
   * @type {string}
   */
  static get IDB_PENDING_ACTIONS() {
    return 'pending_actions';
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
            upgradeDB.createObjectStore(DBHelper.IDB_STORE, { keyPath: 'id' });
          case 1:
            upgradeDB.createObjectStore(DBHelper.IDB_PENDING_ACTIONS, { keyPath: 'since' });
          // space reserved for future updates...
        }
      }).then(db => {
        // Store `db` for later use
        DBHelper._IDB = db;
        return db;
      });
  }

  /**
   * Try to make an API transaction that modifies stored data.
   * @param {string} type - Type of action. Valid values are: 'SET_FAVORITE', 'ADD_REVIEW', 'EDIT_REVIEW' and 'DELETE_REVIEW'
   * @param {any} data - The specific data associated with the requested action
   * @returns {Promise} - Resolves with the object received as a response when the transaction is satisfactory. Rejects otherwise.
   */
  static tryAction(type, data) {

    let result = null;

    switch (type) {
      case 'SET_FAVORITE':
        if (data && data.restaurant_id) {
          // Update restaurant data on IDB
          DBHelper.getRestaurantPromiseFromIDB(data.restaurant_id)
            .then(restaurant => {
              restaurant.is_favorite = data.favorite;
              restaurant.updatedAt = Date.now();
              return DBHelper.saveRestaurantToIdb(restaurant);
            })
            .catch(err => {
              console.err(`Unable to update the 'favorite' state on the IDB for restaurant #${data.restaurant_id}`);
            });

          // Call the API
          const url = `${API_HOST}/restaurants/${data.restaurant_id}/?is_favorite=${data.favorite ? 'true' : 'false'}`;
          result = fetch(url, { method: 'PATCH' });
        }
        break;

      case 'ADD_REVIEW':
        if (data && data.restaurant_id) {
          const url = `${API_HOST}/reviews/`;
          result = fetch(url, {
            method: 'POST',
            body: JSON.stringify({
              restaurant_id: data.restaurant_id,
              name: data.name || 'Unknown user',
              rating: data.rating || 0,
              comments: data.comments || '',
            })
          });
        }
        break;

      case 'EDIT_REVIEW':
        if (data && data.review_id) {
          const url = `${API_HOST}/reviews/${data.review_id}`;
          result = fetch(url, {
            method: 'PATCH',
            body: JSON.stringify({
              name: data.name || 'Unknown user',
              rating: data.rating || 0,
              comments: data.comments || '',
            })
          });
        }
        break;

      case 'DELETE_REVIEW':
        if (data && data.review_id) {
          const url = `${API_HOST}/reviews/${data.review_id}`;
          result = fetch(url, { method: 'DELETE' });
        }
        break;

      default:
        break;
    }

    if (result)
      return result.then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      });

    return Promise.reject(`Unknown action: ${type} (${JSON.stringify(data || {})})`);
  }

  /**
   * Try to make a transaction that modifies stored data. If a network error occurs, the transaction is saved
   * on IDB to resume work later.
   * @param {string} type - Type of action. Valid values are: 'SET_FAVORITE', 'ADD_REVIEW', 'EDIT_REVIEW' and 'DELETE_REVIEW'
   * @param {any} data - The specific data associated with the requested action
   * @param {function} showSnackbar - The function used to display a snackbar with a short message
   * @returns {Promise} - Resolves with the object received as a response when the transaction is satisfactory. Rejects otherwise.
   */
  static performAction(type, data, showSnackbar) {
    return DBHelper.tryAction(type, data)
      .then(json => {
        console.log(`Action ${type} (${data}) performed!`);
      })
      .catch(err => {
        console.log(`Unable to perform action ${type}! Storing for resuming it later.`);
        DBHelper.getIdb().then(db => {
          const tx = db.transaction(DBHelper.IDB_PENDING_ACTIONS, 'readwrite');
          tx.objectStore(DBHelper.IDB_PENDING_ACTIONS).put({
            since: Date.now(),
            data: { type, data }
          });
          return tx.complete;
        }).then(() => {
          showSnackbar({ message: 'Unable to update data at this moment. Will try again later.' });
        }).catch(err => {
          console.err(`Error storing pending transaction on IDB: ${err}`);
          showSnackbar({ message: 'Your request cannot be processed now. Please try again later.' })
        })
      })
  }

  /**
   * Gets a restaurant record from the IndexdedDB
   * @param {number} id - The main identifier of the requested restaurant (currently a number)
   * @returns {Promise} - Resolves with an object of type `restaurant` or _null_ if not found.
   */
  static getRestaurantPromiseFromIDB(id) {
    return DBHelper.getIdb().then(db => {
      return db.transaction(DBHelper.IDB_STORE)
        .objectStore(DBHelper.IDB_STORE)
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
      return db.transaction(DBHelper.IDB_STORE)
        .objectStore(DBHelper.IDB_STORE)
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
    // TODO: Check possible changes in reviews!
    return DBHelper.getRestaurantPromiseFromIDB(restaurant.id)
      .then(currentData => {
        let update = !currentData;
        if (!update && restaurant) {
          // First check: is 'restaurant' newer than 'currentData'?
          update = restaurant.updatedAt > currentData.updatedAt;
          // Second check: does 'restaurant' have reviews?
          if (!update && restaurant.reviews) {
            if (!currentData.reviews)
              // 'currentData' don't have reviews, so update!
              update = true;
            else {
              // Both 'restaurant' and 'currentData' have reviews. Let's check in detail:
              if (currentData.reviews.length !== restaurant.reviews.length)
                update = true;
              else
                // Find if there is any updated review in 'restaurant'
                update = currentData.reviews.find((r, i) => restaurant.reviews[i].updatedAt > r.updatedAt)
            }
          }
        }

        if (update) {
          console.log(`"${restaurant.name}" ${currentData ? 'updated in' : 'added to'} the database`)
          return DBHelper.saveRestaurantToIdb(restaurant);
        }
        else {
          console.log(`"${restaurant.name}" is already updated in the database`);
          return true;
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

    return fetch(DBHelper.API_RESTAURANTS_ENDPOINT)
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

    const fetchRestaurant = fetch(`${DBHelper.API_RESTAURANTS_ENDPOINT}/${id}`)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      });

    const fetchReviews = fetch(`${DBHelper.API_REVIEWS_ENDPOINT}/?restaurant_id=${id}`)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      });

    return Promise.all([fetchRestaurant, fetchReviews])
      .then(results => {
        DBHelper._RESTAURANTS = DBHelper._RESTAURANTS || [];
        const restaurant = results[0];
        restaurant.reviews = results[1] || []; // Reviews is the second value in 'results'
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
