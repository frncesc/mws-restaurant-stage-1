#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const restaurants = [
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

const locations = restaurants.map(r => `${r.lat},${r.lng}`)
const center = `${restaurants.reduce((v, r) => v + r.lat, 0) / restaurants.length},${restaurants.reduce((v, r) => v + r.lng, 0) / restaurants.length}`
const key = 'AIzaSyD9RCuWU0sT08E4iXZeMNHdMrr1fXX0KiY'
const style = 'color:red'

function getUrlForMap(width, height = 480, scale = 2, zoom=12, language = 'en') {
  const url = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=${scale}&zoom=${zoom}&language=${language}&center=${center}&markers=${style}|${locations.join('|')}&key=${key}`;
  return url;
}

//const url = `./restaurant.html?id=${id}`;

console.log(getUrlForMap(800));
