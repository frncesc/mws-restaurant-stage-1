'use strict';

/**
 * Register the service worker
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

/**
 * Common variables
 */
let restaurant = null;
let mapObject = null;
let reviewForm = null;
let addReviewBtn = null;
let formOkBtn = null;
let formCancelBtn = null;
let editingReview = null;

/**
 * Initializes Google map, called from HTML.
 */
window.initMap = () => {

  // Check if restaurant data is already loaded and map not initialized
  if (self.restaurant && !self.mapObject) {
    const mapContainer = document.getElementById('map');
    self.mapObject = new google.maps.Map(mapContainer, {
      zoom: 16,
      center: self.restaurant.latlng,
      //scrollwheel: false,
      gestureHandling: 'cooperative',
    });

    // Add 'title' attribute to the iframe map container
    const titleListener = self.mapObject.addListener('tilesloaded', ev => {
      const mapFrame = mapContainer.querySelector('iframe');
      if (mapFrame)
        mapFrame.setAttribute('title', 'Map');
      titleListener.remove();
    });

    // Set map marker
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.mapObject);
  }
}

/**
 * Gets the current restaurant from page URL.
 * @returns {Promise} - Resolves with an object of type `restaurant`
 */
self.fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }

  const id = self.getParameterByName('id');
  if (!id) // no id found in URL
    return Promise.reject('No restaurant id in URL');
  else {
    // `id` must be a number
    return DBHelper.fetchRestaurantById(parseInt(id))
      .then(rest => {
        if (!rest)
          return Promise.reject(`Unknown restaurant "${id}"`);

        self.restaurant = rest;
        self.fillRestaurantHTML();
        self.fillBreadcrumb();
        return rest;
      });
  }
}

/**
 * Creates the restaurant HTML and adds it to the webpage
 * @param {Object} restaurant - The restaurant data
 */
self.fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const fullFileNameParts = DBHelper.imageFileForRestaurant(restaurant).split('.');
  const fileName = fullFileNameParts[0];
  const extension = fullFileNameParts[1];

  // Use a `picture` element with both webp and jpeg sources instead of `img` with single srcset
  const sourceWebp = document.getElementById('source-webp');
  sourceWebp.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.webp ${size}w`).join(', ') + `, pictures/${fileName}-800px.webp`;

  const sourceJpeg = document.getElementById('source-jpeg');
  sourceJpeg.srcset = DBHelper.IMG_SIZES.map(size => `pictures/${fileName}-${size}px.${extension} ${size}w`).join(', ') + `, pictures/${fileName}-800px.${extension}`;

  const picImage = document.getElementById('restaurant-img');
  picImage.alt = `${restaurant.name} restaurant photo`;
  picImage.sizes = 'calc(100vw - 2rem)';
  picImage.src = `pictures/${fileName}-800px.${extension}`;

  const favCheck = Utils.buildFavElement(restaurant);
  document.getElementById('restaurant-name-container').append(favCheck);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill-in operating hours
  if (restaurant.operating_hours) {
    self.fillRestaurantHoursHTML();
  }
  // fill-in reviews
  self.fillReviewsHTML();
}

/**
 * Creates the restaurant operating hours HTML table and adds it to the webpage.
 * @param {Object} operatingHours  - Object with days as keys and operating hours as values
 */
self.fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Creates all reviews HTML and adds them to the webpage.
 * @param {Object[]} reviews - An array of objects of type "review"
 */
self.fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews');

  // Remove existing elements (useful when editing reviews)
  while (container.firstChild)
    container.removeChild(container.firstChild);

  const title = document.getElementById('reviews-title');
  title.innerHTML = 'Reviews';

  if (!reviews || reviews.length === 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }

  reviews.forEach((review, pos) => {
    container.appendChild(createReviewHTML(review, pos));
  });
}

/**
 * Creates a single review HTML and adds it to the webpage.
 * @param {Object} review - An object of type review
 * @param {number} pos - The relative position of this review on the restaurant reviews array
 */
self.createReviewHTML = (review, pos) => {
  const article = document.createElement('article');
  article.dataset.review = pos;
  const header = document.createElement('header');

  const name = document.createElement('div');
  name.className = 'review-author';
  name.setAttribute('aria-label', 'Review author');
  name.innerHTML = review.name;
  header.appendChild(name);

  const date = document.createElement('div');
  date.className = 'review-date';
  date.setAttribute('aria-label', 'Review date');
  const reviewDate = new Date(review.updatedAt);
  date.innerHTML = reviewDate.toLocaleDateString();
  header.appendChild(date);

  article.appendChild(header);

  const rating = document.createElement('div');
  rating.className = 'review-rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  article.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments.replace(/\n/g, '<br>');
  article.appendChild(comments);

  const editBtn = document.createElement('button');
  editBtn.innerHTML = 'Edit';
  editBtn.addEventListener('click', self.editReview);
  article.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = 'Delete';
  deleteBtn.addEventListener('click', self.deleteReview);
  article.appendChild(deleteBtn);

  return article;
}

/**
 * Adds the restaurant name to the breadcrumb navigation menu
 * @param {Object} restaurant - The current restaurant data
 */
self.fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');

  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Gets a parameter by name from page URL.
 * @param {string} name - The parameter to search for
 * @param {string} url - The URL to parse
 * @returns {string} - The value passed on the query string with the given name, if any.
 */
self.getParameterByName = (name, url = window.location.href) => {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Cleans the form used to create and edit reviews
 */
self.clearReviewForm = () => {
  self.reviewFormTitle.innerHTML = `Post a review about ${self.restaurant.name}`;
  self.editName.value = '';
  self.editRating.value = 0;
  self.editComments.value = '';
};

/**
 * Cleans and makes visible the form used to add and edit reviews
 */
self.showReviewForm = () => {
  self.hideReviewForm();
  self.clearReviewForm();
  self.reviewFormArticle.classList.remove('hidden');
  self.addReviewBtn.classList.add('hidden');
};

/**
 * Hides and resets to its original place the form used to add and edit reviews
 */
self.hideReviewForm = () => {
  self.reviewFormArticle.classList.add('hidden');
  self.addReviewBtn.classList.remove('hidden');
  if (self.editingReview) {
    self.addReviewBtn.insertAdjacentElement('beforebegin', self.reviewFormArticle);
    self.editingReview.classList.remove('hidden');
    self.editingReview = null;
  }
};

/**
 * Handles clicks on the "Post review" button
 * @param {Event} ev - The event that triggered this action
 */
self.reviewFormOk = (ev) => {
  const data = {
    restaurant_id: self.restaurant.id,
    name: self.editName.value,
    rating: self.editRating.value,
    comments: self.editComments.value,
    updatedAt: Date.now(),
  }

  if (self.editingReview) {
    const reviewNum = self.editingReview.dataset.review;
    const review = self.restaurant.reviews[reviewNum];
    data.id = review.id;
  } else {
    data.createdAt = data.updatedAt;
  }

  DBHelper.performAction(self.editingReview ? 'EDIT_REVIEW' : 'ADD_REVIEW', data)
    .then(result => {
      console.log(`Action performed!`);
      console.log(result);
      // Save returned id
      if (typeof result.id !== 'undefined')
        data.id = result.id;
      // Rebuild reviews list
      self.fillReviewsHTML();
    })
    .catch(err => {
      console.log(`Error: ${err}`);
      self.fillReviewsHTML();
    });

  self.hideReviewForm();
};

/**
 * Handles clicks on "Edit review" buttons
 * @param {Event} ev - The event that triggered this action
 */
self.editReview = (ev) => {
  const reviewArticle = ev.target.parentElement;
  const reviewNum = reviewArticle.dataset.review;
  const review = self.restaurant.reviews[reviewNum];
  if (review) {
    self.editingReview = reviewArticle;
    const reviewDateTxt = new Date(review.updatedAt).toLocaleDateString();

    self.reviewFormTitle.innerHTML = `Edit review posted on ${reviewDateTxt} by ${review.name}`;
    self.editName.value = review.name;
    self.editRating.value = review.rating;
    self.editComments.value = review.comments;

    // Hide the review article and replace it by the form
    reviewArticle.classList.add('hidden');
    reviewArticle.insertAdjacentElement('afterend', self.reviewFormArticle);
    self.reviewFormArticle.classList.remove('hidden');
  }
  else
    console.log(`Error: Review #${reviewId} not found!`);
}

/**
 * Handles clicks on "Delete review" buttons
 * @param {Event} ev - The event that triggered this action
 */
self.deleteReview = (ev) => {
  const reviewArticle = ev.target.parentElement;
  const reviewNum = reviewArticle.dataset.review;
  const review = self.restaurant.reviews[reviewNum];
  if (review && review.id) {
    const reviewDateTxt = new Date(review.updatedAt).toLocaleDateString();
    if (window.confirm(`Do you really want to delete the review about ${self.restaurant.name} posted on ${reviewDateTxt} by ${review.name}?`)) {
      DBHelper.performAction('DELETE_REVIEW', review)
        .then(result => {
          console.log(`Review #${review.id} deleted!`);
          self.fillReviewsHTML();
        })
        .catch(err => {
          console.log(`Error deleting review: ${err}`);
          self.fillReviewsHTML();
        });
    }
  }
  else
    console.log(`Error: review #${reviewNum} not found!`);
};

/**
 * Update the restaurant data as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {

  // Assign variables to the main HTML elements
  self.reviewFormArticle = document.querySelector('#review-form-article');
  self.reviewFormTitle = self.reviewFormArticle.querySelector('#review-form-title');
  self.editName = self.reviewFormArticle.querySelector('#edit-name');
  self.editRating = self.reviewFormArticle.querySelector('#edit-rating');
  self.editComments = self.reviewFormArticle.querySelector('#edit-comments');
  self.addReviewBtn = document.querySelector('#add-review');
  self.formOkBtn = document.querySelector('#form-ok');
  self.formCancelBtn = document.querySelector('#form-cancel');

  // Set event listeners to action buttons
  self.addReviewBtn.addEventListener('click', self.showReviewForm);
  self.formOkBtn.addEventListener('click', self.reviewFormOk);
  self.formCancelBtn.addEventListener('click', self.hideReviewForm);

  // Load the requested restaurant data and fill-in the page
  self.fetchRestaurantFromURL()
    .then(restaurant => {
      // Check if Maps API is already loaded
      if (window.google && window.google.maps)
        self.initMap();
      // Set off-line event handler
      DBHelper.setOfflineEventHandler();
    });
});
