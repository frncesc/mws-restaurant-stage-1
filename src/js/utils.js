'use strict';

/* global idb, DBHelper */

/**
 * Miscellaneous utility functions related to custom controls and snackbar notifications
 * @exports Utils
 * @class
 */
class Utils {

  static get snackBar() {
    if (typeof Utils._SNACKBAR === 'undefined') {
      Utils._SNACKELEMENT = document.querySelector('.mdc-snackbar');
      Utils._SNACKBAR = Utils._SNACKELEMENT ? new mdc.snackbar.MDCSnackbar(Utils._SNACKELEMENT) : null;
    }
    return Utils._SNACKBAR;
  }

  static get snackBarElement() {
    return Utils._SNACKELEMENT || null;
  }

  static get DEFAULT_SNACK_OPTIONS() {
    return {
      message: '',
      multiline: true,
      actionText: 'DISMISS',
      actionHandler: () => { },
      timeout: 3000
    };
  }

  /**
   * Show the snackbar with the provided options
   * @see: https://material.io/develop/web/components/snackbars/
   * @param {string|Object} options - Can be just the message to show or a complex MDCSnackbar options object
   */
  static showSnackBar(options) {
    // Avoid re-entrant calls to 'show'
    if (Utils.snackBar && Utils.snackBarElement && Utils.snackBarElement.getAttribute('aria-hidden') === 'true') {
      Utils.snackBar.show(Object.assign({}, Utils.DEFAULT_SNACK_OPTIONS, typeof options === 'string' ? { message: options } : options));
    }
  }

  /**
   * Toggle the 'favorite' state of a restaurant in response to an action event
   * @param {Event} ev 
   */
  static toggleFavorite(ev) {
    const chk = ev.target;
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
   * @param {Event} ev 
   */
  static handleFavKeyPress(ev) {
    if (ev.keyCode === 32 || ev.keyCode === 13) {
      ev.preventDefault();
      Utils.toggleFavorite(ev);
    }
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

}
