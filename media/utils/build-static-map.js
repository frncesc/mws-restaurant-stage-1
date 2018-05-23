#!/usr/bin/env node

/**
 * This is just an utility script that queries the GoogleMaps static API and
 * saves the returned map as a PNG file.
 * See: https://developers.google.com/maps/documentation/maps-static/intro
 * 
 * WARNING: The Maps Static API serves images at a maximum size of 640 x 640 with free accounts.
 * Queries for bigger maps require a "Premium Plan". See:
 * https://developers.google.com/maps/documentation/maps-static/intro#Imagesizes
 * 
 */

const https = require('https');
const fs = require('fs');

// Google Maps API key
const API_KEY = 'AIzaSyD9RCuWU0sT08E4iXZeMNHdMrr1fXX0KiY';

// Static list of restaurants with associated data
// TODO: Read restaurants data from the Sails API service
const RESTAURANTS = [
  { name: "Mission Chinese Food", lat: 40.713829, lng: -73.989667, id: "1" },
  { name: "Emily", lat: 40.683555, lng: -73.966393, id: "2" },
  { name: "Kang Ho Dong Baekjeong", lat: 40.747143, lng: -73.985414, id: "3" },
  { name: "Katz's Delicatessen", lat: 40.722216, lng: -73.987501, id: "4" },
  { name: "Roberta's Pizza", lat: 40.705089, lng: -73.933585, id: "5" },
  { name: "Hometown BBQ", lat: 40.674925, lng: -74.016162, id: "6" },
  { name: "Superiority Burger", lat: 40.727397, lng: -73.983645, id: "7" },
  { name: "The Dutch", lat: 40.726584, lng: -74.002082, id: "8" },
  { name: "Mu Ramen", lat: 40.743797, lng: -73.950652, id: "9" },
  { name: "Casa Enrique", lat: 40.743394, lng: -73.954235, id: "10" },
]

// Calculate the map center based on the positions of all markers
const calcCenter = (restaurants) => {
  const lats = restaurants.map(r => r.lat);
  const lngs = restaurants.map(r => r.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return `${midLat},${midLng}`
}

// Miscellaneous options
const DEFAULT_OPTIONS = {
  width: 640,
  height: 480,
  locations: RESTAURANTS.map(r => `${r.lat},${r.lng}`),
  center: calcCenter(RESTAURANTS),
  scale: 1,
  zoom: 12,
  language: 'en',
  style: 'color:red',
}

// Compose the URL to be used with the Google maps static API
const getUrlForMap = ({ width, height, locations, center, scale, zoom, language, style } = DEFAULT_OPTIONS) => {
  const markers = locations ? `&markers=${style}|${locations.join('|')}` : '';
  return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=${scale}&zoom=${zoom}&language=${language}&center=${center}${markers}&key=${API_KEY}`;
}

// Loads the requested map and saves it in PNG format
const loadMapAs = (filename = 'main-map.png', options) => {
  const request = https.get(getUrlForMap(options), function (result) {
    let data = '';
    result.setEncoding('binary');
    result.on('data', chunk => data += chunk);
    result.on('end', () => {
      fs.writeFile(filename, data, 'binary', err => {
        if (err)
          throw err;
        console.log(`File ${filename} successfully saved.`)
      });
    });
  });
  request.on('errr', err => console.log(`ERROR: ${err}`))
}

//console.log(getUrlForMap(Object.assign({}, DEFAULT_OPTIONS, {width: 800, height:600})))

// Load and save the basic map:
// (higher resolutions will need )
loadMapAs('map640.png');

