#!/usr/bin/node

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const imgSrc = path.resolve(__dirname, 'img')
const sizes = [340, 400, 600, 800]
const imgPaths = sizes.map(size => path.resolve(__dirname, `img-${size}`))

console.log('Checking directories...')
imgPaths.push(imgSrc)
imgPaths.forEach(path => {
  if (!fs.existsSync(path))
    fs.mkdirSync(path)
  else if (!fs.lstatSync(path).isDirectory()) {
    console.log(`ERROR: ${path} already exists and is not a directory!`)
    return
  }
})

console.log('Resizing images...')
fs.readdirSync(imgSrc).forEach(f => {
  const src = path.resolve(imgSrc, f)
  sizes.forEach((size, i) => {
    const resized = path.resolve(imgPaths[i], f)
    console.log(`Resizing ${src} to ${resized}`)
    shImg = sharp(src)
      .resize(size)
      .toFile(resized)
  })
})



