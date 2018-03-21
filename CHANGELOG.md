### Resize images to different resolutions
- The script `resize-images.js` uses [Sharp](https://github.com/lovell/sharp) for resizing all images in `img`
  to widths 340, 400, 600 and 800 pixels. The resulting images are stored with its original file name into the
  directories: `img-340`, `img-400`, etc.

### Improve accessibility
- Add wai-aria attributes to html elements
- Enforce semantic landmarks
- Check color contrast to be at least AA-compliant (ratio 4.5)

### Visual design improvements
- `box-shadow` in restaurant cards
- Stylized picture and review cards in restaurant page
- Bigger font sizes in title, footer, breadcrumb and reviews
- Center and span `select` controls in `filter-options`

### Make it responsive
- Set viewport
- Set `max-width` of all images and media elements to 100%
- Remove fixed size settings wherever possible
- Use a `grid` layout for restaurants list, with `auto-fill` columns sized via `minmax`

### Initial set-up (17-Mar-2018)
- Fork and clone project from https://github.com/udacity/mws-restaurant-stage-1
- Add `.gitignore`, `CHANGELOG.md` and `project.json`
- Add [live-server](https://www.npmjs.com/package/live-server) to `devDependencies`
- Obtain a Google Maps [API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and update it in `index.html`
- API key restricted by now to `localhost:8080` (in [API console](https://console.developers.google.com/apis/credentials?project=fit-sanctum-198308))

