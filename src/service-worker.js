
// Adapted from: https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker
/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
     http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const PRECACHE = 'restaurant-precache-v23';
const RUNTIME = 'restaurant-runtime';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  'index.html',
  './', // Alias for index.html
  'restaurant.html',
  'logo/icon-16x16.png' // Favicon
];

const PRECACHE_ASSETS_SRC = [
  'js/dbhelper.js',
  'js/main.js',
  'js/restaurant_info.js',
  'js/idb.js',
  'js/intersection-observer.js',
  'js/snackbar.js',
  'js/utils.js',
  'css/common-styles.css',
  'css/main.css',
  'css/restaurant-info.css',
  'css/snackbar.css',
  'icons/favorite-on.svg',
  'icons/favorite-off.svg',
];

const PRECACHE_ASSETS_DIST = [
  'js/bundle-main.js',
  'js/bundle-restaurant.js'
];

// Set the app cache base path (useful when not deploying at root level)
const APP_BASE = `${self.location.origin}/`

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      // To be replaced by `PRECACHE_ASSETS_DIST` by Gulp:
      .then(cache => cache.addAll(PRECACHE_URLS.concat(PRECACHE_ASSETS_SRC)))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => caches.delete(cacheToDelete)));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
  // Catch all, ignoring search query only in own requests
  if (event.request.url.startsWith(APP_BASE)) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});
