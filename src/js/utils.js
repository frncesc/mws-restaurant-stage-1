'use strict';

/* global idb, DBHelper */

/**
 * Miscellaneous utility functions related to custom controls and snackbar notifications
 * @exports Utils
 * @class
 */
class Utils {

  /**
   * Default options for the snackbar
   * @type {Object}
   */
  static get DEFAULT_SNACK_OPTIONS() {
    return {
      text: '',
      pos: 'bottom-center',
      actionText: 'DISMISS',
      actionTextColor: '#4caf50',
      backgroundColor: '#323232',
      duration: 4000,
    };
  }

  /**
   * Show the snackbar with the provided options
   * @see: https://github.com/polonel/SnackBar
   * @param {string|Object} options - Can be just the message to show or a complex options object
   */
  static showSnackBar(options) {
    self.Snackbar.show(Object.assign({}, Utils.DEFAULT_SNACK_OPTIONS, typeof options === 'string' ? { text: options } : options));
  }

  /**
   * Builds a custom 'favorite' toggle button
   * @param {Object} restaurant - The restaurant data associated to this button
   */
  static buildFavElement(restaurant) {
    const favCheck = document.createElement('span');
    favCheck.id = `fav${restaurant.id}`;
    favCheck.className = 'favorite'
    favCheck.setAttribute('role', 'checkbox');
    favCheck.setAttribute('tabindex', 0);
    favCheck.setAttribute('aria-checked', restaurant.is_favorite);
    favCheck.title = restaurant.is_favorite ? 'Unset as favorite' : 'Set as favorite';;
    favCheck.onclick = Utils.toggleFavorite;
    favCheck.onkeypress = Utils.handleFavKeyPress;
    return favCheck;
  }

  /**
   * Toggle the 'favorite' state of a restaurant in response to an action event
   * @param {Event} ev- The event that triggered this action 
   */
  static toggleFavorite(ev) {
    const chk = ev.target;
    // 'favorite' controls have as ID the text "fav" followed by the restaurant ID number
    if (chk && chk.id.length > 3) {
      ev.preventDefault();
      const restaurant_id = Number(chk.id.substr(3));
      let favorite = chk.getAttribute('aria-checked') !== 'true';
      chk.setAttribute('aria-checked', favorite);
      chk.title = favorite ? 'Unset as favorite' : 'Set as favorite';
      DBHelper.performAction('SET_FAVORITE', { restaurant_id, favorite });
    }
  }

  /**
   * Handles keyboard events triggered by the 'favorite' checkboxes
   * @param {Event} ev- The event that triggered this action 
   */
  static handleFavKeyPress(ev) {
    if (ev.keyCode === 32 || ev.keyCode === 13) {
      ev.preventDefault();
      Utils.toggleFavorite(ev);
    }
  }
}
