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
   * Current array of restaurants data, retrieved from the API server or from IDB
   * @type {Array}
   */
  static get RESTAURANTS() {
    if (!DBHelper._RESTAURANTS)
      DBHelper._RESTAURANTS = [];
    return DBHelper._RESTAURANTS;
  }

  static set RESTAURANTS(restaurants) {
    DBHelper._RESTAURANTS = restaurants;
  }

  /**
   * Finds a restaurant with a specific ID on the current array of restaurants data
   * @param {Number} id - The requested restaurant id
   */
  static GET_RESTAURANT(id) {
    return DBHelper.RESTAURANTS.find(r => r.id === id);
  }

  /**
   * Message displayed by the snack bar when offline and with user actions
   * pending to be synchronized
   * @type {string}
   */
  static get WAIT_MESSAGE() {
    return 'Can\'t contact the server now. Will retry later';
  }

  /**
 * Message displayed by the snack bar all pending actions have been synchronized
 * @type {string}
 */
  static get OK_SYNC_MESSAGE() {
    return 'Success! You are now synchronized with the server.';
  }

  /**
   * This static member stores a dictionary that links provisional review IDs, assigned at run-time
   * when we working off-line, with the real review ID assigned by the server API. This is needed to
   * synchronize pending operations related to reviews (create, edit, delete...) that don't have a
   * real "id" assigned.
   * @type {Object}
   */
  static get REV_ID_DICT() {
    if (!DBHelper._REV_ID_DICT)
      DBHelper._REV_ID_DICT = {};
    return DBHelper._REV_ID_DICT;
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
   * Register user actions on the IDB and on the current DBHelper.RESTAURANTS variable.
   * @param {string} type - Type of action. Valid values are: 'SET_FAVORITE', 'ADD_REVIEW', 'EDIT_REVIEW' and 'DELETE_REVIEW'
   * @param {any} data - The specific data associated with the requested action
   * @returns {Promise} - Resolves with the object received as a response when the transaction is satisfactory. Rejects otherwise.
   */
  static registerUserAction(type, data) {

    if (!data || !data.restaurant_id)
      return Promise.reject('Bad data!');

    let idbPromise = null;
    let restaurant = null;
    if (data.restaurant_id)
      restaurant = DBHelper.RESTAURANTS.find(r => r.id === data.restaurant_id);

    switch (type) {
      case 'SET_FAVORITE':
        // Update current restaurant data in memory
        if (restaurant)
          restaurant.is_favorite = data.favorite;

        // Update data on IDB
        idbPromise = DBHelper.getRestaurantPromiseFromIDB(data.restaurant_id)
          .then(rest => {
            rest.is_favorite = data.favorite;
            rest.updatedAt = Date.now();
            return DBHelper.saveRestaurantToIdb(rest);
          });
        break;

      case 'ADD_REVIEW':
        // Set timestamp as a provisional review ID (the real one will be assigned by the API server)
        if (!data.id)
          data.id = Date.now();

        // Update current restaurant data in memory
        if (restaurant)
          restaurant.reviews.push(data);

        // Update data on IDB
        idbPromise = DBHelper.getRestaurantPromiseFromIDB(data.restaurant_id)
          .then(rest => {
            rest.reviews = rest.reviews || [];
            rest.reviews.push(data);
            //rest.updatedAt = Date.now();
            return DBHelper.saveRestaurantToIdb(rest);
          });
        break;

      case 'EDIT_REVIEW':
        if (data.id) {
          // Update current restaurant data in memory
          if (restaurant) {
            const n = restaurant.reviews.findIndex(rv => rv.id === data.id);
            if (n >= 0)
              restaurant.reviews[n] = data;
          }

          // Update data on IDB
          idbPromise = DBHelper.getRestaurantPromiseFromIDB(data.restaurant_id)
            .then(rest => {
              rest.reviews = rest.reviews || [];
              const n = rest.reviews.findIndex(rv => rv.id === data.id);
              if (n >= 0) {
                rest.reviews[n] = data;
                //rest.updatedAt = Date.now();
                return DBHelper.saveRestaurantToIdb(rest);
              } else
                throw new Error(`Review #${data.id} not found in restaurant #${data.restaurant_id} on IDB`);
            });
        }
        break;

      case 'DELETE_REVIEW':
        if (data.id) {
          // Update current restaurant data in memory
          if (restaurant) {
            const n = restaurant.reviews.findIndex(rv => rv.id === data.id);
            if (n >= 0)
              restaurant.reviews.splice(n, 1);
          }

          // Update data on IDB
          idbPromise = DBHelper.getRestaurantPromiseFromIDB(data.restaurant_id)
            .then(rest => {
              rest.reviews = rest.reviews || [];
              const n = rest.reviews.findIndex(rv => rv.id === data.id);
              if (n >= 0) {
                rest.reviews.splice(n, 1);
                //rest.updatedAt = Date.now();
                return DBHelper.saveRestaurantToIdb(rest);
              } else
                throw new Error(`Review #${data.id} not found in restaurant #${data.restaurant_id} on IDB`);
            });
        }
        break;

      default:
        // Unknown action!
        break;
    }

    return idbPromise || Promise.reject(`Bad data or unknown action: ${type} (${JSON.stringify(data || {})})`);
  }

  /**
   * Try to fetch a transaction on the API server.
   * @param {string} type - Type of action. Valid values are: 'SET_FAVORITE', 'ADD_REVIEW', 'EDIT_REVIEW' and 'DELETE_REVIEW'
   * @param {any} data - The specific data associated with the requested action
   * @param {boolean} allowClientErrors - When `true` response status on the range 4xx will be treated as valid.
   * This is useful for skipping tasks staled in `pendig_actions` because related items had been deleted.
   * @returns {Promise} - Resolves with the object received as a response when the transaction is satisfactory. Rejects otherwise.
   */
  static fetchUserAction(type, data, allowClientErrors = false) {

    if (!data || !data.restaurant_id)
      return Promise.reject('Bad data!');

    let result = null;

    switch (type) {
      case 'SET_FAVORITE':
        result = fetch(
          `${API_HOST}/restaurants/${data.restaurant_id}/?is_favorite=${data.favorite ? 'true' : 'false'}`,
          { method: 'PATCH' });
        break;

      case 'ADD_REVIEW':
        result = fetch(
          `${API_HOST}/reviews/`, {
            method: 'POST',
            body: JSON.stringify({
              restaurant_id: data.restaurant_id,
              name: data.name || 'Unknown user',
              rating: data.rating || 0,
              comments: data.comments || '',
            })
          });
        break;

      case 'EDIT_REVIEW':
        if (data.id)
          result = fetch(
            `${API_HOST}/reviews/${data.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: data.name || 'Unknown user',
                rating: data.rating || 0,
                comments: data.comments || '',
              })
            });
        break;

      case 'DELETE_REVIEW':
        if (data.id)
          result = fetch(
            `${API_HOST}/reviews/${data.id}`,
            { method: 'DELETE' });
        break;

      default:
        // Unknown action!
        break;
    }

    if (result)
      return result
        .then(response => {
          // TODO: Check `ok` and `status` compatibility with Safari and Android browsers!
          // See compatibility table in: https://developer.mozilla.org/en-US/docs/Web/API/Response
          if (response.ok) {
            return response.json()
              .then(result => {
                if (type === 'ADD_REVIEW') {
                  // Save the returned review ID on the dictionary
                  DBHelper.REV_ID_DICT[data.id] = result.id;
                  // Update current data
                  data.id = result.id;
                }
                return result;
              });
          }
          else if (allowClientErrors && response.status >= 400 && response.status < 500)
            return true;
          else
            throw new Error(`Server responded with the error code: ${response.status} (${response.statusText})`);
        })
    else
      return Promise.reject(`Bad data or unknown action: ${type} (${JSON.stringify(data || {})})`);
  }

  /**
   * Try to perform an user-requested action. If a network error occurs, the transaction is saved
   * on the IDB to be resumed later.
   * @param {string} type - Type of action. Valid values are: 'SET_FAVORITE', 'ADD_REVIEW', 'EDIT_REVIEW' and 'DELETE_REVIEW'
   * @param {any} data - The specific data associated with the requested action
   * @returns {Promise} - Resolves with the object received as a response when the transaction is satisfactory. Rejects otherwise.
   */
  static performAction(type, data) {

    // Register action on the IDB
    DBHelper.registerUserAction(type, data)
      .then(() => {
        console.log(`Data successfully updated on the IDB!`);
      })
      .catch(err => {
        console.log(`Unable to update data on the IDB!\n${type} ${JSON.stringify(data)} throws: ${err}`);
      });

    // Try to fetch the API server and put it on _pending_actions_ when failed
    return DBHelper.fetchUserAction(type, data)
      .then(json => {
        console.log(`Action ${type} performed with: ${JSON.stringify(data)}`);
        return json;
      })
      .catch(err => {
        console.log(`Unable to perform action "${type}" at this time. Let's store it on IDB for later processing.`);
        DBHelper.getIdb()
          .then(db => {
            const tx = db.transaction(DBHelper.IDB_PENDING_ACTIONS, 'readwrite');
            tx.objectStore(DBHelper.IDB_PENDING_ACTIONS).put({
              since: Date.now(),
              data: { type, data }
            });
            DBHelper._NO_PENDING_ACTIONS = false;
            return tx.complete;
          }).then(() => {
            Utils.showSnackBar(DBHelper.WAIT_MESSAGE);
          }).catch(err => {
            console.log(`Error storing pending transaction on the IDB: ${err}`);
            Utils.showSnackBar('Unknown error! Please try again later.');
          });
      });
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
        .then(record => record && record.data ? record.data : null);
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
    // Restaurants are already fetched, so return the saved list
    if (DBHelper.RESTAURANTS.length > 0)
      return Promise.resolve(DBHelper.RESTAURANTS);

    return fetch(DBHelper.API_RESTAURANTS_ENDPOINT)
      .then(response => {
        if (response.ok)
          return response.json();
        throw new Error('Bad network response');
      })
      .then(restaurants => {
        // Save `restaurants` for later use
        DBHelper.RESTAURANTS = restaurants;
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
            DBHelper.RESTAURANTS = restaurants;
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

    if (DBHelper.GET_RESTAURANT(id))
      return Promise.resolve(DBHelper.GET_RESTAURANT(id));

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
        const restaurant = results[0];
        restaurant.reviews = results[1] || []; // Reviews is the second value in 'results'
        DBHelper.RESTAURANTS.push(restaurant);
        // Save also `restaurant` in IDB
        DBHelper.saveRestaurantIfNewer(restaurant);
        return restaurant;
      })
      .catch(err => {
        // Maybe we are off-line? Try to get data from IDB
        return DBHelper.getRestaurantPromiseFromIDB(id)
          .then(restaurant => {
            DBHelper.RESTAURANTS.push(restaurant);
            return restaurant;
          })
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
  static fetchRestaurantByCuisineNeighborhoodAndFav(cuisine, neighborhood, fav) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        return restaurants ? restaurants.filter(r => {
          return (cuisine === 'all' || r.cuisine_type === cuisine)
            && (neighborhood === 'all' || r.neighborhood === neighborhood)
            && (!fav || r.is_favorite);
        }) : [];
      })
      .catch(err => {
        console.log(`Error fetching restaurant list by cuisine, neighborhood and favorite: ${err}`);
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

  /**
   * Try to process a single pending action
   * @param {Object} act - Complex object (usually retrieved from IDB) with the properties
   *                       `since` (used as a index on IDB `pending_actions` table) and
   *                       `data` (the action data, with the properties `type` and `data`)
   * @returns {Promise} - A promise resolving to `true` when the pending action is successfully processed, `false` otherwise.
   */
  static processPendingAction(act) {
    console.log(`Processing pending action ${act.since} (${act.data.type})`);
    // Check if review ID is on the dictionary of already fetched new reviews
    if (act.data.data.id && DBHelper.REV_ID_DICT[act.data.data.id])
      act.data.data.id = DBHelper.REV_ID_DICT[act.data.data.id];
    // Fetch action
    return DBHelper.fetchUserAction(act.data.type, act.data.data, true)
      .then(result => {
        // Action was successfull (or responded with a 4xxx status code), so remove it from IDB
        return DBHelper.removePendingActionFromIDB(act.since)
          .then(() => {
            console.log(`Pending action ${act.since} (${act.data.type}) removed from IDB`);
            return true;
          });
      })
      .catch(err => {
        console.log(`Error perfoming pending action ${act.since} (${act.data.type}): ${err}`);
        return false;
      })
  }

  /**
   * Removes a record from the pending actions table on the IDB
   * @param {Number} id - The pending action ID (currently a timestamp)
   * @returns {Promise} - Returns the transaction `complete` promise
   */
  static removePendingActionFromIDB(id) {
    return DBHelper.getIdb()
      .then(db => {
        const tx = db.transaction(DBHelper.IDB_PENDING_ACTIONS, 'readwrite');
        tx.objectStore(DBHelper.IDB_PENDING_ACTIONS).delete(id);
        return tx.complete;
      })
  }

  /**
   * Retrieves all pending actions from the IDB and tries to perform it, cleaning the IDB registry when done.
   * The static property `DBHelper._NO_PENDING_ACTIONS` (initially undefined)
   * acts as a flag, avoiding unnecessary checks.
   * @param {*} interval - Interval at which this function is called. Default is 20"
   */
  static flushPendingActions(interval = 20000) {

    let pending = false;

    if (DBHelper._NO_PENDING_ACTIONS) {
      // Just prepare for next round
      window.setTimeout(() => DBHelper.flushPendingActions(interval), interval);
      return;
    }

    // Read all pending actions from the IDB
    DBHelper.getIdb()
      .then(db => {
        return db.transaction(DBHelper.IDB_PENDING_ACTIONS)
          .objectStore(DBHelper.IDB_PENDING_ACTIONS)
          .getAll();
      })
      .then(actions => {
        // No pending actions? Then just set the flag and return an empty array.
        if (!actions || actions.length === 0)
          return Promise.resolve(true);

        pending = true;

        // Start processing pending actions of type "ADD_REVIEW", so REV_ID_DICT is filled with correct equivalences
        // between 'fake' review ids and real ids provided by the API server.
        return Promise.all(actions.filter(act => act.data.type === 'ADD_REVIEW').map(act => DBHelper.processPendingAction(act)))
          .then(results => {
            if (results.includes(false))
              throw (new Error('Unable to flush all pending actions at this moment.'));
            // Process the remaining (edit, delete and set/unset favorite) pending actions 
            return Promise.all(actions.filter(act => act.data.type !== 'ADD_REVIEW').map(act => DBHelper.processPendingAction(act)))
              .then(results => {
                if (results.includes(false))
                  throw (new Error('Unable to flush all pending actions at this moment.'));
                return true;
              })
          })
      })
      .then(() => {
        console.log('No pending actions.');
        DBHelper._NO_PENDING_ACTIONS = true;
        if (pending)
          Utils.showSnackBar(DBHelper.OK_SYNC_MESSAGE);
        window.setTimeout(() => DBHelper.flushPendingActions(interval), interval);
      })
      .catch(err => {
        console.log(`Error: ${err}`);
        Utils.showSnackBar(DBHelper.WAIT_MESSAGE);
        window.setTimeout(() => DBHelper.flushPendingActions(interval), interval);
      });
  }
}
