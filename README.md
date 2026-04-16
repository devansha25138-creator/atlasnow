# AtlasNow - The Global Explorer

AtlasNow is a professional single-page country explorer built with HTML, CSS, and Vanilla JavaScript. It helps users browse 250 countries through search, region filters, sorting, pagination, and a detailed country profile panel.

## Purpose

This project was built as an Atlas Explorer coursework submission. It demonstrates:

- API-based country data from REST Countries
- Vanilla JavaScript DOM rendering
- responsive interface design
- array higher-order functions in real UI logic
- theme persistence with `localStorage`
- paginated result handling for large datasets

## Data Source

- REST Countries API: [https://restcountries.com/](https://restcountries.com/)

For submission reliability, the project uses a bundled REST Countries snapshot in:

```text
data/countries-fallback.json
```

This keeps the explorer stable during demos while still using official REST Countries data.

## Features

- Search countries by name, capital, code, or region
- Filter countries by region
- Sort by population, alphabetical order, or area
- Paginate the country directory
- Open a detailed country profile with:
  - capital
  - population
  - area
  - continents
  - languages
  - currencies
  - time zones
  - calling codes
  - top-level domains
  - postal code details
  - Gini index
  - border countries
  - map links
- Light and dark mode toggle
- Graceful flag fallback if external images fail
- Loading, empty, and error states

## Higher-Order Functions Used

- `.map()` to normalize country data and build rendered HTML
- `.filter()` for search and region filtering
- `.sort()` for population, name, and area ordering
- `.find()` to resolve selected and bordering countries

## Project Structure

```text
.
|-- README.md
|-- app.js
|-- data/
|   `-- countries-fallback.json
|-- index.html
`-- style.css
```

## How to Run

Run the project through a local server from the project folder:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

You can also use VS Code Live Server if preferred.

## Notes

- AtlasNow is optimized for a clean, professional browsing experience rather than an overloaded dashboard.
- The local dataset is included so the interface remains reliable even if the live API is slow or unavailable during submission.
- No build step is required.
