# AtlasNow - The Global Explorer

AtlasNow is a single-page web application built with HTML, CSS, and Vanilla JavaScript to help users explore data from 250+ countries in one place. The goal is to create a fast, visual country directory where users can search, filter, and sort nations using live data.

## Purpose

This project is being developed as an Atlas Explorer coursework submission. It focuses on building a polished frontend experience while demonstrating practical JavaScript skills such as API handling, DOM updates, array higher-order functions, and local storage.

## API Link

- REST Countries API v3.1: [https://restcountries.com/v3.1/all](https://restcountries.com/v3.1/all)

## Planned Features

- Fetch country data with `async/await`
- Render responsive country cards with flags, names, and population
- Add a loading state while data is being fetched
- Search countries by name using `.filter()`
- Filter countries by geographic region using `.filter()`
- Sort countries by population or alphabetically using `.sort()`
- Use `.map()` to transform data for display
- Use `.find()` for targeted country lookups, such as border-country details
- Add a dark mode toggle with theme persistence using `localStorage`
- Deploy the final app on GitHub Pages or Netlify

## Milestone Roadmap

### Milestone 1 - Project Setup

- Deadline: March 23
- Create the initial project structure
- Add the project README
- Prepare `index.html`, `style.css`, and `app.js`

### Milestone 2 - API Integration

- Deadline: April 1
- Fetch live country data from the REST Countries API
- Build country cards dynamically with JavaScript
- Add a loading state
- Make the layout responsive for mobile and laptop screens

### Milestone 3 - Core Features

- Deadline: April 8
- Implement search functionality
- Add region-based filtering
- Add sorting options
- Build and persist dark mode

### Milestone 4 - Final Submission

- Deadline: April 10
- Refactor the code into clean modular functions
- Finalize documentation
- Deploy the site for sharing and submission

## Current File Structure

```text
.
|-- README.md
|-- app.js
|-- index.html
`-- style.css
```

## Milestone 1 Status

Milestone 1 is complete. The project scaffold is ready, the documentation is in place, and the app files are connected for the next phase of development.
