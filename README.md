# AtlasNow - The Global Explorer

AtlasNow is a polished single-page web application built with HTML, CSS, and Vanilla JavaScript. It helps users explore live data for 250+ countries through fast search, region filtering, population-based sorting, and a detailed country profile panel.

## Purpose

This project was built as an Atlas Explorer coursework submission. The goal is to demonstrate:

- API integration with `async/await`
- DOM rendering with Vanilla JavaScript
- responsive UI design
- array higher-order functions in a practical app
- `localStorage` for theme persistence

## Live Data Source

- REST Countries API: [https://restcountries.com/](https://restcountries.com/)
- Summary dataset used by the app:
  [https://restcountries.com/v3.1/all?fields=name,cca3,capital,region,subregion,population,area,languages,flags](https://restcountries.com/v3.1/all?fields=name,cca3,capital,region,subregion,population,area,languages,flags)
- Country detail endpoint used by the app:
  `https://restcountries.com/v3.1/alpha/{code}`

## Features

- Fetches live country data with `async/await`
- Renders a responsive country card grid
- Supports real-time search by country name, official name, or capital
- Filters countries by region
- Sorts countries by highest population, lowest population, or alphabetical order
- Opens a detailed country profile with capital, subregion, population, area, currencies, languages, continents, time zones, border countries, and map links
- Includes loading, empty, and error states
- Includes a light/dark theme toggle
- Saves theme preference to `localStorage`

## Higher-Order Functions Used

- `.map()` to transform API data and render HTML
- `.filter()` for search results and region filtering
- `.sort()` for population and alphabetical ordering
- `.find()` to resolve selected countries and bordering countries

## Project Structure

```text
.
|-- README.md
|-- app.js
|-- index.html
`-- style.css
```

## How to Run

Because this project fetches live API data, run it through a local server instead of opening the HTML file directly.

### Option 1: Python

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

### Option 2: VS Code Live Server

Open the folder in VS Code and launch the project with the Live Server extension.

## Deployment

This project is ready for static hosting.

- GitHub Pages: upload the files to a repository and publish the root folder
- Netlify: drag and drop the project folder or connect the repository

No build step is required.

## Notes

The current REST Countries documentation requires `fields` when calling the `/v3.1/all` endpoint. To keep the app reliable with the live API, AtlasNow uses:

- a lightweight `all?fields=...` request for the country directory
- a separate `alpha/{code}` request for the full country profile
- regional fallbacks if the summary endpoint is temporarily unavailable

This keeps the UI fast and matches the current API behavior.
