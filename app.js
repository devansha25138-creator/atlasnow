const SUMMARY_FIELDS = [
  "name",
  "cca3",
  "capital",
  "region",
  "subregion",
  "population",
  "area",
  "languages",
  "flags"
].join(",");
const SUMMARY_API_URL = `https://restcountries.com/v3.1/all?fields=${SUMMARY_FIELDS}`;
const DETAIL_API_BASE_URL = "https://restcountries.com/v3.1/alpha";
const REGION_API_BASE_URL = "https://restcountries.com/v3.1/region";
const REGION_FALLBACKS = [
  "africa",
  "americas",
  "asia",
  "europe",
  "oceania",
  "antarctic"
];
const THEME_STORAGE_KEY = "atlasnow-theme";

const state = {
  countries: [],
  visibleCountries: [],
  countryDetails: {},
  selectedCountryCode: "",
  searchTerm: "",
  region: "all",
  sortBy: "population-desc",
  theme: "light",
  status: "loading",
  detailsStatus: "idle",
  detailsError: ""
};

const detailRequestsInFlight = new Set();

const elements = {
  themeToggle: document.getElementById("theme-toggle"),
  searchInput: document.getElementById("search-input"),
  regionSelect: document.getElementById("region-select"),
  sortSelect: document.getElementById("sort-select"),
  resetButton: document.getElementById("reset-button"),
  retryButton: document.getElementById("retry-button"),
  resultsCount: document.getElementById("results-count"),
  resultsSubtitle: document.getElementById("results-subtitle"),
  panelMeta: document.getElementById("panel-meta"),
  selectionMeta: document.getElementById("selection-meta"),
  activeFilters: document.getElementById("active-filters"),
  countryGrid: document.getElementById("country-grid"),
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  emptyState: document.getElementById("empty-state"),
  errorMessage: document.getElementById("error-message"),
  detailsPanel: document.getElementById("details-panel"),
  detailsPlaceholder: document.getElementById("details-placeholder"),
  countryProfile: document.getElementById("country-profile"),
  statsGrid: document.getElementById("stats-grid"),
  datasetNote: document.getElementById("dataset-note")
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatList(items) {
  if (!items || items.length === 0) {
    return "Not available";
  }

  return items.join(", ");
}

function formatCurrencies(currencyMap) {
  const entries = Object.values(currencyMap || {});

  if (entries.length === 0) {
    return "Not available";
  }

  return entries
    .map((currency) => {
      if (!currency?.name) {
        return currency?.symbol || "Unknown currency";
      }

      return currency.symbol
        ? `${currency.name} (${currency.symbol})`
        : currency.name;
    })
    .join(", ");
}

function normalizeCountry(country) {
  return {
    code: country.cca3 || "",
    name: country.name?.common || "Unknown country",
    officialName: country.name?.official || "Unknown official name",
    capital: country.capital || [],
    region: country.region || "Other",
    subregion: country.subregion || "Not available",
    population: country.population || 0,
    area: country.area || 0,
    continents: country.continents || [],
    timezones: country.timezones || [],
    languages: Object.values(country.languages || {}),
    currencies: country.currencies || {},
    flags: country.flags || {},
    maps: country.maps || {},
    startOfWeek: country.startOfWeek || "Not available",
    independent: country.independent,
    unMember: country.unMember,
    borders: country.borders || []
  };
}

function getInitialSelection(countries) {
  return (
    countries.find((country) => country.name === "India") ||
    countries.find((country) => country.population > 100000000) ||
    countries[0] ||
    null
  );
}

function getSelectedSummary() {
  return state.countries.find((country) => country.code === state.selectedCountryCode) || null;
}

function getSelectedDetails() {
  return state.countryDetails[state.selectedCountryCode] || null;
}

function applyTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = state.theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  } catch (error) {
    console.warn("Theme preference could not be saved.", error);
  }

  const isDark = state.theme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.querySelector(".theme-toggle__label").textContent = isDark
    ? "Light Mode"
    : "Dark Mode";
}

function restoreTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(storedTheme || "light");
  } catch (error) {
    console.warn("Theme preference could not be restored.", error);
    applyTheme("light");
  }
}

function buildRegionOptions() {
  const regions = state.countries
    .map((country) => country.region)
    .filter(Boolean)
    .filter((region, index, list) => list.indexOf(region) === index)
    .sort((first, second) => first.localeCompare(second));

  elements.regionSelect.innerHTML = ['<option value="all">All regions</option>']
    .concat(regions.map((region) => `<option value="${region}">${region}</option>`))
    .join("");
  elements.regionSelect.value = state.region;
}

function buildStats() {
  if (state.countries.length === 0) {
    return;
  }

  const totalPopulation = state.countries.reduce(
    (sum, country) => sum + country.population,
    0
  );
  const mostPopulated = [...state.countries].sort(
    (first, second) => second.population - first.population
  )[0];
  const regionCount = state.countries
    .map((country) => country.region)
    .filter(Boolean)
    .filter((region, index, list) => list.indexOf(region) === index).length;

  elements.statsGrid.innerHTML = `
    <article class="stat-card">
      <span class="stat-card__value">${formatNumber(state.countries.length)}</span>
      <span class="stat-card__label">Countries loaded</span>
    </article>
    <article class="stat-card">
      <span class="stat-card__value">${formatNumber(regionCount)}</span>
      <span class="stat-card__label">Regions represented</span>
    </article>
    <article class="stat-card">
      <span class="stat-card__value">${mostPopulated ? mostPopulated.name : "N/A"}</span>
      <span class="stat-card__label">Largest population</span>
    </article>
    <article class="stat-card">
      <span class="stat-card__value">${formatNumber(totalPopulation)}</span>
      <span class="stat-card__label">Combined population</span>
    </article>
  `;

  if (mostPopulated) {
    elements.datasetNote.textContent = `${mostPopulated.name} currently leads the dataset by population.`;
  }
}

function matchesSearch(country) {
  if (!state.searchTerm) {
    return true;
  }

  const query = state.searchTerm.toLowerCase();

  return (
    country.name.toLowerCase().includes(query) ||
    country.officialName.toLowerCase().includes(query) ||
    country.capital.join(" ").toLowerCase().includes(query)
  );
}

function matchesRegion(country) {
  return state.region === "all" || country.region === state.region;
}

function sortCountries(countries) {
  const sortedCountries = [...countries];

  switch (state.sortBy) {
    case "population-asc":
      return sortedCountries.sort((first, second) => first.population - second.population);
    case "name-asc":
      return sortedCountries.sort((first, second) => first.name.localeCompare(second.name));
    case "name-desc":
      return sortedCountries.sort((first, second) => second.name.localeCompare(first.name));
    case "population-desc":
    default:
      return sortedCountries.sort((first, second) => second.population - first.population);
  }
}

function computeVisibleCountries() {
  state.visibleCountries = sortCountries(
    state.countries.filter((country) => matchesSearch(country)).filter((country) => matchesRegion(country))
  );

  if (
    state.selectedCountryCode &&
    !state.visibleCountries.find((country) => country.code === state.selectedCountryCode)
  ) {
    state.selectedCountryCode = state.visibleCountries[0]?.code || "";
  }
}

function createCountryCard(country) {
  const capital = country.capital[0] || "No capital listed";
  const selectedClass = country.code === state.selectedCountryCode ? "is-selected" : "";
  const languages = country.languages.slice(0, 2);

  return `
    <article class="country-card ${selectedClass}" role="listitem">
      <button
        class="country-card__button"
        type="button"
        data-country-code="${country.code}"
        aria-label="Open details for ${country.name}"
      >
        <div class="country-card__flag">
          <img
            src="${country.flags.svg || country.flags.png || ""}"
            alt="Flag of ${country.name}"
            loading="lazy"
          />
        </div>

        <div class="country-card__header">
          <div>
            <h4 class="country-card__name">${country.name}</h4>
            <p class="country-card__subline">${capital}</p>
          </div>
          <span class="country-card__region">${country.region}</span>
        </div>

        <div class="country-card__stats">
          <div class="country-card__stat">
            <span>Population</span>
            <strong>${formatNumber(country.population)}</strong>
          </div>
          <div class="country-card__stat">
            <span>Area</span>
            <strong>${formatNumber(Math.round(country.area))} km²</strong>
          </div>
        </div>

        <div class="country-card__footer">
          ${(languages.length ? languages : ["Language data"])
            .map((item) => `<span class="mini-pill">${item}</span>`)
            .join("")}
        </div>
      </button>
    </article>
  `;
}

function resolveBorderCountries(country) {
  if (!country.borders || country.borders.length === 0) {
    return [];
  }

  return country.borders
    .map((borderCode) => state.countries.find((item) => item.code === borderCode))
    .filter(Boolean)
    .sort((first, second) => first.name.localeCompare(second.name));
}

function createProfile(country) {
  const borderCountries = resolveBorderCountries(country);
  const borderMarkup =
    borderCountries.length > 0
      ? `<div class="border-list">
          ${borderCountries
            .map(
              (borderCountry) => `
                <button
                  class="border-pill"
                  type="button"
                  data-country-code="${borderCountry.code}"
                >
                  ${borderCountry.name}
                </button>
              `
            )
            .join("")}
        </div>`
      : '<p class="country-profile__empty-borders">This country has no bordering countries listed in the dataset.</p>';

  return `
    <div class="country-profile__flag">
      <img
        src="${country.flags.svg || country.flags.png || ""}"
        alt="Flag of ${country.name}"
      />
    </div>

    <div class="country-profile__header">
      <span class="country-profile__eyebrow">${country.region}</span>
      <h4 class="country-profile__name">${country.name}</h4>
      <p class="country-profile__summary">${country.officialName}</p>
    </div>

    <div class="detail-grid">
      <div class="detail-card">
        <span>Population</span>
        <strong>${formatNumber(country.population)}</strong>
      </div>
      <div class="detail-card">
        <span>Capital</span>
        <strong>${formatList(country.capital)}</strong>
      </div>
      <div class="detail-card">
        <span>Subregion</span>
        <strong>${country.subregion}</strong>
      </div>
      <div class="detail-card">
        <span>Area</span>
        <strong>${formatNumber(Math.round(country.area))} km²</strong>
      </div>
    </div>

    <dl class="detail-list">
      <div class="detail-list__row">
        <dt>Languages</dt>
        <dd>${formatList(country.languages)}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Currencies</dt>
        <dd>${formatCurrencies(country.currencies)}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Continents</dt>
        <dd>${formatList(country.continents)}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Time zones</dt>
        <dd>${formatList(country.timezones)}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Start of week</dt>
        <dd>${country.startOfWeek}</dd>
      </div>
      <div class="detail-list__row">
        <dt>United Nations</dt>
        <dd>${country.unMember ? "Member state" : "Not listed as a member"}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Independence</dt>
        <dd>${country.independent === false ? "Not independent" : "Independent or unspecified"}</dd>
      </div>
    </dl>

    <div>
      <p class="control-label">Border countries</p>
      ${borderMarkup}
    </div>

    <div class="profile-links">
      ${
        country.maps.googleMaps
          ? `<a class="profile-link" href="${country.maps.googleMaps}" target="_blank" rel="noreferrer">Open in Google Maps</a>`
          : ""
      }
      ${
        country.maps.openStreetMaps
          ? `<a class="profile-link" href="${country.maps.openStreetMaps}" target="_blank" rel="noreferrer">Open in OpenStreetMap</a>`
          : ""
      }
    </div>
  `;
}

function renderActiveFilters() {
  const chips = [];

  if (state.searchTerm) {
    chips.push(`Search: ${state.searchTerm}`);
  }

  if (state.region !== "all") {
    chips.push(`Region: ${state.region}`);
  }

  const sortLabels = {
    "population-desc": "Highest population",
    "population-asc": "Lowest population",
    "name-asc": "Name A-Z",
    "name-desc": "Name Z-A"
  };

  chips.push(`Sort: ${sortLabels[state.sortBy]}`);

  elements.activeFilters.innerHTML = chips
    .map((chip) => `<span class="filter-chip">${chip}</span>`)
    .join("");
}

function renderResultsMeta() {
  const total = state.countries.length;
  const visible = state.visibleCountries.length;
  const label = visible === 1 ? "country" : "countries";

  elements.resultsCount.textContent = `Showing ${visible} ${label}`;
  elements.resultsSubtitle.textContent =
    total > 0 ? `${formatNumber(total)} countries available in the live dataset.` : "";
  elements.panelMeta.textContent = `${visible} visible`;
}

function renderCountryGrid() {
  const hasCountries = state.visibleCountries.length > 0;

  elements.countryGrid.innerHTML = hasCountries
    ? state.visibleCountries.map((country) => createCountryCard(country)).join("")
    : "";
  elements.emptyState.hidden = hasCountries || state.status !== "ready";
}

function renderDetailsPlaceholder(title, message, actionMarkup = "") {
  elements.detailsPlaceholder.hidden = false;
  elements.countryProfile.hidden = true;
  elements.countryProfile.innerHTML = "";
  elements.detailsPlaceholder.innerHTML = `
    <div class="details-placeholder__art" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h4>${title}</h4>
    <p>${message}</p>
    ${actionMarkup}
  `;
}

function renderDetails() {
  const selectedSummary = getSelectedSummary();
  const selectedDetails = getSelectedDetails();

  if (!selectedSummary) {
    renderDetailsPlaceholder(
      "Select a country",
      "Choose a card from the directory to inspect its capital, languages, currencies, borders, time zones, and maps."
    );
    elements.selectionMeta.textContent = "Awaiting selection";
    return;
  }

  if (state.detailsStatus === "error" && !selectedDetails) {
    renderDetailsPlaceholder(
      `Could not load ${selectedSummary.name}`,
      state.detailsError || "The detailed profile could not be loaded right now.",
      '<button class="button button-primary" type="button" data-action="retry-details">Retry Profile</button>'
    );
    elements.selectionMeta.textContent = "Profile unavailable";
    return;
  }

  if (!selectedDetails) {
    renderDetailsPlaceholder(
      `Loading ${selectedSummary.name}`,
      "Pulling the complete country profile, borders, and map links from the live API."
    );
    elements.selectionMeta.textContent = "Loading profile";
    return;
  }

  elements.detailsPlaceholder.hidden = true;
  elements.countryProfile.hidden = false;
  elements.countryProfile.innerHTML = createProfile(selectedDetails);
  elements.selectionMeta.textContent = selectedDetails.name;
}

function render() {
  renderActiveFilters();
  renderResultsMeta();
  renderCountryGrid();
  renderDetails();
}

function setStatus(status, message = "") {
  state.status = status;

  elements.loadingState.hidden = status !== "loading";
  elements.errorState.hidden = status !== "error";
  elements.countryGrid.hidden = status !== "ready";
  elements.emptyState.hidden = true;

  if (status === "error") {
    elements.errorMessage.textContent = message || "Something went wrong while loading country data.";
  }
}

function prepareSelectedDetails(previousSelectedCode = "") {
  const selectedCode = state.selectedCountryCode;

  if (!selectedCode) {
    state.detailsStatus = "idle";
    state.detailsError = "";
    return "";
  }

  if (selectedCode !== previousSelectedCode) {
    state.detailsStatus = state.countryDetails[selectedCode] ? "ready" : "loading";
    state.detailsError = "";
  }

  return state.countryDetails[selectedCode] ? "" : selectedCode;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error("The API returned an invalid JSON response");
  }
}

async function fetchCountrySummaries() {
  try {
    return await fetchJson(SUMMARY_API_URL);
  } catch (primaryError) {
    const fallbackResults = await Promise.allSettled(
      REGION_FALLBACKS.map((region) =>
        fetchJson(`${REGION_API_BASE_URL}/${region}?fields=${SUMMARY_FIELDS}`)
      )
    );

    const mergedCountries = fallbackResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    if (mergedCountries.length === 0) {
      throw primaryError;
    }

    return mergedCountries.filter(
      (country, index, list) =>
        list.findIndex((item) => item.cca3 === country.cca3) === index
    );
  }
}

async function loadCountryDetails(countryCode) {
  if (!countryCode) {
    return;
  }

  if (state.countryDetails[countryCode]) {
    state.detailsStatus = "ready";
    state.detailsError = "";
    renderDetails();
    return;
  }

  if (detailRequestsInFlight.has(countryCode)) {
    return;
  }

  state.detailsStatus = "loading";
  state.detailsError = "";
  detailRequestsInFlight.add(countryCode);
  renderDetails();

  try {
    const data = await fetchJson(`${DETAIL_API_BASE_URL}/${countryCode}`);
    const record = Array.isArray(data) ? data[0] : data;

    state.countryDetails[countryCode] = normalizeCountry(record);
    detailRequestsInFlight.delete(countryCode);

    if (state.selectedCountryCode === countryCode) {
      state.detailsStatus = "ready";
      state.detailsError = "";
      renderDetails();
    }
  } catch (error) {
    detailRequestsInFlight.delete(countryCode);

    if (state.selectedCountryCode === countryCode) {
      state.detailsStatus = "error";
      state.detailsError = `${error.message}. Please try again.`;
      renderDetails();
    }
  }
}

async function loadCountries() {
  setStatus("loading");

  try {
    const data = await fetchCountrySummaries();
    state.countries = data
      .map((country) => normalizeCountry(country))
      .filter((country) => country.code && country.name);

    buildRegionOptions();
    buildStats();

    const initialSelection = getInitialSelection(state.countries);
    state.selectedCountryCode = initialSelection?.code || "";
    state.detailsStatus = state.selectedCountryCode ? "loading" : "idle";
    state.detailsError = "";

    computeVisibleCountries();
    setStatus("ready");
    render();

    if (state.selectedCountryCode) {
      loadCountryDetails(state.selectedCountryCode);
    }
  } catch (error) {
    setStatus("error", `${error.message}. Check your connection and try again.`);
    elements.resultsCount.textContent = "Unable to load countries";
    elements.resultsSubtitle.textContent = "The explorer will work as soon as the API request succeeds.";
    elements.panelMeta.textContent = "No data";
    elements.selectionMeta.textContent = "Unavailable";
  }
}

function handleSearchInput(event) {
  const previousSelectedCode = state.selectedCountryCode;
  state.searchTerm = event.target.value.trim();
  computeVisibleCountries();
  const codeToLoad = prepareSelectedDetails(previousSelectedCode);
  render();

  if (codeToLoad) {
    loadCountryDetails(codeToLoad);
  }
}

function handleRegionChange(event) {
  const previousSelectedCode = state.selectedCountryCode;
  state.region = event.target.value;
  computeVisibleCountries();
  const codeToLoad = prepareSelectedDetails(previousSelectedCode);
  render();

  if (codeToLoad) {
    loadCountryDetails(codeToLoad);
  }
}

function handleSortChange(event) {
  const previousSelectedCode = state.selectedCountryCode;
  state.sortBy = event.target.value;
  computeVisibleCountries();
  const codeToLoad = prepareSelectedDetails(previousSelectedCode);
  render();

  if (codeToLoad) {
    loadCountryDetails(codeToLoad);
  }
}

function handleReset() {
  const previousSelectedCode = state.selectedCountryCode;
  state.searchTerm = "";
  state.region = "all";
  state.sortBy = "population-desc";

  elements.searchInput.value = "";
  elements.regionSelect.value = state.region;
  elements.sortSelect.value = state.sortBy;

  computeVisibleCountries();

  if (!state.selectedCountryCode && state.visibleCountries.length > 0) {
    state.selectedCountryCode = state.visibleCountries[0].code;
  }

  const codeToLoad = prepareSelectedDetails(previousSelectedCode);
  render();

  if (codeToLoad) {
    loadCountryDetails(codeToLoad);
  }
}

function handleCountrySelection(event) {
  const countryButton = event.target.closest("[data-country-code]");

  if (!countryButton) {
    return;
  }

  const { countryCode } = countryButton.dataset;

  if (!countryCode) {
    return;
  }

  state.selectedCountryCode = countryCode;
  state.detailsStatus = state.countryDetails[countryCode] ? "ready" : "loading";
  state.detailsError = "";
  render();
  loadCountryDetails(countryCode);
}

function handleDetailsPanelClick(event) {
  const retryButton = event.target.closest('[data-action="retry-details"]');

  if (!retryButton) {
    return;
  }

  loadCountryDetails(state.selectedCountryCode);
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.regionSelect.addEventListener("change", handleRegionChange);
  elements.sortSelect.addEventListener("change", handleSortChange);
  elements.resetButton.addEventListener("click", handleReset);
  elements.retryButton.addEventListener("click", loadCountries);
  elements.countryGrid.addEventListener("click", handleCountrySelection);
  elements.countryProfile.addEventListener("click", handleCountrySelection);
  elements.detailsPanel.addEventListener("click", handleDetailsPanelClick);
}

function init() {
  restoreTheme();
  bindEvents();
  loadCountries();
}

document.addEventListener("DOMContentLoaded", init);
