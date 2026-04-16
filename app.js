const DATA_URL = "./data/countries-fallback.json";
const THEME_STORAGE_KEY = "atlasnow-theme";
const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [12, 24, 48];
const PAGE_WINDOW = 5;

const state = {
  countries: [],
  filteredCountries: [],
  selectedCountryCode: "",
  searchTerm: "",
  region: "all",
  sortBy: "population-desc",
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  theme: "light",
  status: "loading",
  errorMessage: "",
  dataSourceLabel: "REST Countries bundled snapshot"
};

const elements = {
  themeToggle: document.getElementById("theme-toggle"),
  searchInput: document.getElementById("search-input"),
  regionSelect: document.getElementById("region-select"),
  sortSelect: document.getElementById("sort-select"),
  pageSizeSelect: document.getElementById("page-size-select"),
  resetButton: document.getElementById("reset-button"),
  retryButton: document.getElementById("retry-button"),
  resultsCount: document.getElementById("results-count"),
  resultsSubtitle: document.getElementById("results-subtitle"),
  panelMeta: document.getElementById("panel-meta"),
  selectionMeta: document.getElementById("selection-meta"),
  activeFilters: document.getElementById("active-filters"),
  countryGrid: document.getElementById("country-grid"),
  pagination: document.getElementById("pagination"),
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  emptyState: document.getElementById("empty-state"),
  errorMessage: document.getElementById("error-message"),
  detailsPlaceholder: document.getElementById("details-placeholder"),
  countryProfile: document.getElementById("country-profile"),
  statsGrid: document.getElementById("stats-grid"),
  datasetNote: document.getElementById("dataset-note")
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
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

function formatCallingCodes(idd) {
  if (!idd?.root) {
    return "Not available";
  }

  if (!idd.suffixes || idd.suffixes.length === 0) {
    return idd.root;
  }

  return idd.suffixes.map((suffix) => `${idd.root}${suffix}`).join(", ");
}

function formatPostalCode(postalCode) {
  if (!postalCode?.format && !postalCode?.regex) {
    return "Not available";
  }

  const parts = [postalCode.format, postalCode.regex].filter(Boolean);
  return parts.join(" | ");
}

function formatDriving(car) {
  if (!car?.side) {
    return "Not available";
  }

  const side = `${car.side.charAt(0).toUpperCase()}${car.side.slice(1)} side`;
  const signs = car.signs?.length ? ` (${car.signs.join(", ")})` : "";

  return `${side}${signs}`;
}

function formatGini(gini) {
  const entries = Object.entries(gini || {});

  if (entries.length === 0) {
    return "Not available";
  }

  const [year, value] = entries.sort((first, second) => Number(second[0]) - Number(first[0]))[0];
  return `${value} (${year})`;
}

function formatDemonym(demonyms) {
  if (!demonyms?.m && !demonyms?.f) {
    return "Not available";
  }

  if (demonyms.m && demonyms.f && demonyms.m !== demonyms.f) {
    return `${demonyms.m} / ${demonyms.f}`;
  }

  return demonyms.m || demonyms.f || "Not available";
}

function formatBoolean(value, trueLabel, falseLabel) {
  if (typeof value !== "boolean") {
    return "Not available";
  }

  return value ? trueLabel : falseLabel;
}

function toTitleCase(text) {
  if (!text) {
    return "Not available";
  }

  return text
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCountry(country) {
  return {
    code: country.cca3 || "",
    code2: country.cca2 || "",
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
    flagEmoji: country.flag || "",
    maps: country.maps || {},
    startOfWeek: country.startOfWeek || "Not available",
    independent: country.independent,
    unMember: country.unMember,
    borders: country.borders || [],
    tld: country.tld || [],
    landlocked: country.landlocked,
    fifa: country.fifa || "",
    status: country.status || "Not available",
    altSpellings: country.altSpellings || [],
    gini: country.gini || {},
    postalCode: country.postalCode || {},
    demonyms: country.demonyms?.eng || {},
    idd: country.idd || {},
    car: country.car || {}
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

function getSelectedCountry() {
  return state.filteredCountries.find((country) => country.code === state.selectedCountryCode) ||
    state.countries.find((country) => country.code === state.selectedCountryCode) ||
    null;
}

function getPageCount() {
  return Math.max(1, Math.ceil(state.filteredCountries.length / state.pageSize));
}

function getCurrentPageCountries() {
  const startIndex = (state.currentPage - 1) * state.pageSize;
  return state.filteredCountries.slice(startIndex, startIndex + state.pageSize);
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
    ? "Light mode"
    : "Dark mode";
}

function restoreTheme() {
  try {
    applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");
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
  const regionCount = state.countries
    .map((country) => country.region)
    .filter(Boolean)
    .filter((region, index, list) => list.indexOf(region) === index).length;
  const largestPopulationCountry = [...state.countries].sort(
    (first, second) => second.population - first.population
  )[0];
  const landlockedCount = state.countries.filter((country) => country.landlocked === true).length;

  elements.statsGrid.innerHTML = `
    <article class="metric-card">
      <span class="metric-card__value">${formatNumber(state.countries.length)}</span>
      <span class="metric-card__label">Countries</span>
    </article>
    <article class="metric-card">
      <span class="metric-card__value">${formatNumber(regionCount)}</span>
      <span class="metric-card__label">Regions</span>
    </article>
    <article class="metric-card">
      <span class="metric-card__value">${largestPopulationCountry?.name || "N/A"}</span>
      <span class="metric-card__label">Largest population</span>
    </article>
    <article class="metric-card">
      <span class="metric-card__value">${formatNumber(landlockedCount)}</span>
      <span class="metric-card__label">Landlocked countries</span>
    </article>
  `;

  elements.datasetNote.textContent = `${formatNumber(state.countries.length)} countries are loaded from a REST Countries snapshot. Combined population: ${formatNumber(totalPopulation)}.`;
}

function matchesSearch(country) {
  if (!state.searchTerm) {
    return true;
  }

  const query = state.searchTerm.toLowerCase();
  const searchableFields = [
    country.name,
    country.officialName,
    country.capital.join(" "),
    country.region,
    country.subregion,
    country.code,
    country.code2,
    country.tld.join(" ")
  ];

  return searchableFields.some((field) => field && field.toLowerCase().includes(query));
}

function matchesRegion(country) {
  return state.region === "all" || country.region === state.region;
}

function sortCountries(countries) {
  const sorted = [...countries];

  switch (state.sortBy) {
    case "population-asc":
      return sorted.sort((first, second) => first.population - second.population);
    case "name-asc":
      return sorted.sort((first, second) => first.name.localeCompare(second.name));
    case "name-desc":
      return sorted.sort((first, second) => second.name.localeCompare(first.name));
    case "area-desc":
      return sorted.sort((first, second) => second.area - first.area);
    case "population-desc":
    default:
      return sorted.sort((first, second) => second.population - first.population);
  }
}

function updateVisibleCountries({ resetPage = false, snapSelectionToPage = false } = {}) {
  state.filteredCountries = sortCountries(
    state.countries.filter((country) => matchesSearch(country)).filter((country) => matchesRegion(country))
  );

  if (resetPage) {
    state.currentPage = 1;
  }

  state.currentPage = Math.min(state.currentPage, getPageCount());

  const pageCountries = getCurrentPageCountries();

  if (pageCountries.length === 0) {
    state.selectedCountryCode = "";
    return;
  }

  if (
    snapSelectionToPage ||
    !pageCountries.some((country) => country.code === state.selectedCountryCode)
  ) {
    state.selectedCountryCode = pageCountries[0].code;
  }
}

function createCountryCard(country) {
  const flagMark = country.flagEmoji || country.code;
  const languages = country.languages.slice(0, 2);

  return `
    <article class="country-card ${
      country.code === state.selectedCountryCode ? "is-selected" : ""
    }" role="listitem">
      <button
        class="country-card__button"
        type="button"
        data-country-code="${country.code}"
        aria-label="Open profile for ${country.name}"
      >
        <div class="country-card__flag" data-flag-mark="${flagMark}">
          <img
            src="${country.flags.png || country.flags.svg || ""}"
            alt="Flag of ${country.name}"
            loading="lazy"
          />
        </div>

        <div>
          <div class="country-card__title-row">
            <div>
              <h4 class="country-card__name">${country.name}</h4>
              <p class="country-card__official">${country.officialName}</p>
            </div>
            <span class="country-card__region">${country.region}</span>
          </div>
        </div>

        <ul class="country-card__meta">
          <li>
            <span>Capital</span>
            <strong>${formatList(country.capital)}</strong>
          </li>
          <li>
            <span>Population</span>
            <strong>${formatNumber(country.population)}</strong>
          </li>
          <li>
            <span>Subregion</span>
            <strong>${country.subregion}</strong>
          </li>
          <li>
            <span>Area</span>
            <strong>${formatNumber(Math.round(country.area))} km²</strong>
          </li>
        </ul>

        <div class="country-card__chips">
          ${(languages.length ? languages : ["Language data"])
            .map((item) => `<span class="country-chip">${item}</span>`)
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

function createDetailRow(label, value) {
  return `
    <div class="detail-list__row">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function createCountryProfile(country) {
  const borderCountries = resolveBorderCountries(country);
  const flagMark = country.flagEmoji || country.code;
  const borderMarkup =
    borderCountries.length > 0
      ? `
          <div class="border-list">
            ${borderCountries
              .map(
                (borderCountry) => `
                  <button
                    class="border-chip"
                    type="button"
                    data-country-code="${borderCountry.code}"
                  >
                    ${borderCountry.name}
                  </button>
                `
              )
              .join("")}
          </div>
        `
      : '<p class="country-profile__empty-borders">No bordering countries are listed for this country.</p>';

  return `
    <div class="country-profile__flag" data-flag-mark="${flagMark}">
      <img
        src="${country.flags.png || country.flags.svg || ""}"
        alt="Flag of ${country.name}"
      />
    </div>

    <div class="country-profile__header">
      <div class="country-profile__eyebrow">
        <span class="country-chip">${country.region}</span>
        <span class="country-chip">${country.code}</span>
        ${
          country.code2
            ? `<span class="country-chip">${country.code2}</span>`
            : ""
        }
        ${
          country.flagEmoji
            ? `<span class="country-chip">${country.flagEmoji}</span>`
            : ""
        }
      </div>
      <h4 class="country-profile__name">${country.name}</h4>
      <p class="country-profile__summary">${country.officialName}</p>
    </div>

    <div class="facts-grid">
      <div class="fact-card">
        <span>Population</span>
        <strong>${formatNumber(country.population)}</strong>
      </div>
      <div class="fact-card">
        <span>Capital</span>
        <strong>${formatList(country.capital)}</strong>
      </div>
      <div class="fact-card">
        <span>Area</span>
        <strong>${formatNumber(Math.round(country.area))} km²</strong>
      </div>
      <div class="fact-card">
        <span>Continent</span>
        <strong>${formatList(country.continents)}</strong>
      </div>
    </div>

    <section class="profile-section">
      <h5 class="profile-section__title">Core profile</h5>
      <dl class="detail-list">
        ${createDetailRow("Subregion", country.subregion)}
        ${createDetailRow("Languages", formatList(country.languages))}
        ${createDetailRow("Currencies", formatCurrencies(country.currencies))}
        ${createDetailRow("Time zones", formatList(country.timezones))}
        ${createDetailRow("Calling codes", formatCallingCodes(country.idd))}
        ${createDetailRow("Top-level domains", formatList(country.tld))}
        ${createDetailRow("Start of week", toTitleCase(country.startOfWeek))}
      </dl>
    </section>

    <section class="profile-section">
      <h5 class="profile-section__title">Reference details</h5>
      <dl class="detail-list">
        ${createDetailRow("Driving", formatDriving(country.car))}
        ${createDetailRow("Postal code", formatPostalCode(country.postalCode))}
        ${createDetailRow("Demonym", formatDemonym(country.demonyms))}
        ${createDetailRow("Gini index", formatGini(country.gini))}
        ${createDetailRow("Status", toTitleCase(country.status))}
        ${createDetailRow("FIFA code", country.fifa || "Not available")}
        ${createDetailRow("United Nations", formatBoolean(country.unMember, "Member state", "Not listed as a member"))}
        ${createDetailRow("Independence", formatBoolean(country.independent, "Independent", "Not independent"))}
        ${createDetailRow("Landlocked", formatBoolean(country.landlocked, "Yes", "No"))}
        ${createDetailRow("Alternative names", formatList(country.altSpellings.slice(0, 6)))}
      </dl>
    </section>

    <section class="profile-section">
      <h5 class="profile-section__title">Borders</h5>
      ${borderMarkup}
    </section>

    <section class="profile-section">
      <h5 class="profile-section__title">Maps</h5>
      <div class="profile-links">
        ${
          country.maps.googleMaps
            ? `<a class="profile-link" href="${country.maps.googleMaps}" target="_blank" rel="noreferrer">Google Maps</a>`
            : ""
        }
        ${
          country.maps.openStreetMaps
            ? `<a class="profile-link" href="${country.maps.openStreetMaps}" target="_blank" rel="noreferrer">OpenStreetMap</a>`
            : ""
        }
      </div>
    </section>
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
    "name-desc": "Name Z-A",
    "area-desc": "Largest area"
  };

  chips.push(`Sort: ${sortLabels[state.sortBy]}`);
  chips.push(`Page size: ${state.pageSize}`);

  elements.activeFilters.innerHTML = chips
    .map((chip) => `<span class="filter-chip">${chip}</span>`)
    .join("");
}

function renderResultsMeta() {
  const total = state.filteredCountries.length;
  const totalPages = getPageCount();

  if (total === 0) {
    elements.resultsCount.textContent = "No matching countries";
    elements.resultsSubtitle.textContent =
      "Adjust the filters to bring countries back into the current view.";
    elements.panelMeta.textContent = "0 results";
    return;
  }

  const start = (state.currentPage - 1) * state.pageSize + 1;
  const end = Math.min(start + state.pageSize - 1, total);

  elements.resultsCount.textContent = `Showing ${start}-${end} of ${formatNumber(total)} countries`;
  elements.resultsSubtitle.textContent = `Page ${state.currentPage} of ${formatNumber(totalPages)} | Source: ${state.dataSourceLabel}`;
  elements.panelMeta.textContent = `${formatNumber(totalPages)} pages`;
}

function renderCountryGrid() {
  const pageCountries = getCurrentPageCountries();
  const hasCountries = pageCountries.length > 0;

  elements.countryGrid.innerHTML = hasCountries
    ? pageCountries.map((country) => createCountryCard(country)).join("")
    : "";
  elements.emptyState.hidden = hasCountries || state.status !== "ready";
}

function createPageSequence() {
  const totalPages = getPageCount();
  const sequence = [];

  if (totalPages <= PAGE_WINDOW + 2) {
    for (let page = 1; page <= totalPages; page += 1) {
      sequence.push(page);
    }
    return sequence;
  }

  let start = Math.max(1, state.currentPage - 2);
  let end = Math.min(totalPages, start + PAGE_WINDOW - 1);
  start = Math.max(1, end - PAGE_WINDOW + 1);

  if (start > 1) {
    sequence.push(1);
  }

  if (start > 2) {
    sequence.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    sequence.push(page);
  }

  if (end < totalPages - 1) {
    sequence.push("ellipsis-end");
  }

  if (end < totalPages) {
    sequence.push(totalPages);
  }

  return sequence;
}

function renderPagination() {
  const totalPages = getPageCount();

  if (state.filteredCountries.length === 0 || totalPages <= 1) {
    elements.pagination.hidden = true;
    elements.pagination.innerHTML = "";
    return;
  }

  const pageButtons = createPageSequence()
    .map((item) => {
      if (typeof item !== "number") {
        return '<span class="pagination__ellipsis">...</span>';
      }

      return `
        <button
          class="pagination__button ${item === state.currentPage ? "is-current" : ""}"
          type="button"
          data-page="${item}"
          ${item === state.currentPage ? 'aria-current="page"' : ""}
        >
          ${item}
        </button>
      `;
    })
    .join("");

  elements.pagination.hidden = false;
  elements.pagination.innerHTML = `
    <button
      class="pagination__button"
      type="button"
      data-page-action="prev"
      ${state.currentPage === 1 ? "disabled" : ""}
    >
      Prev
    </button>
    ${pageButtons}
    <button
      class="pagination__button"
      type="button"
      data-page-action="next"
      ${state.currentPage === totalPages ? "disabled" : ""}
    >
      Next
    </button>
  `;
}

function renderDetailsPlaceholder(title, message) {
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
  `;
}

function renderDetails() {
  const selectedCountry = getSelectedCountry();

  if (!selectedCountry) {
    renderDetailsPlaceholder(
      "Select a country",
      state.filteredCountries.length === 0
        ? "No profile is shown because the current filters do not match any country."
        : "Pick a country card to review its full profile."
    );
    elements.selectionMeta.textContent = "Awaiting selection";
    return;
  }

  elements.detailsPlaceholder.hidden = true;
  elements.countryProfile.hidden = false;
  elements.countryProfile.innerHTML = createCountryProfile(selectedCountry);
  elements.selectionMeta.textContent = `${selectedCountry.name} (${selectedCountry.code})`;
}

function render() {
  renderActiveFilters();
  renderResultsMeta();
  renderCountryGrid();
  renderPagination();
  renderDetails();
}

function setStatus(status, message = "") {
  state.status = status;
  state.errorMessage = message;

  elements.loadingState.hidden = status !== "loading";
  elements.errorState.hidden = status !== "error";
  elements.countryGrid.hidden = status !== "ready";
  elements.pagination.hidden = status !== "ready";
  elements.emptyState.hidden = true;

  if (status === "error") {
    elements.errorMessage.textContent = message || "Something went wrong while loading the dataset.";
  }
}

async function fetchCountries() {
  const response = await fetch(DATA_URL);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error("The local country dataset is invalid");
  }

  return payload;
}

async function loadCountries() {
  setStatus("loading");

  try {
    const data = await fetchCountries();
    state.countries = data
      .map((country) => normalizeCountry(country))
      .filter((country) => country.code && country.name);

    buildRegionOptions();
    buildStats();

    const initialSelection = getInitialSelection(state.countries);
    state.selectedCountryCode = initialSelection?.code || "";
    state.pageSize = DEFAULT_PAGE_SIZE;
    elements.pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);

    updateVisibleCountries({ resetPage: true, snapSelectionToPage: false });
    setStatus("ready");
    render();
  } catch (error) {
    setStatus(
      "error",
      `${error.message}. Make sure the app is running from a local server and the data file is available.`
    );
    elements.resultsCount.textContent = "Unable to load countries";
    elements.resultsSubtitle.textContent =
      "AtlasNow could not read the local country dataset.";
    elements.panelMeta.textContent = "No data";
    elements.selectionMeta.textContent = "Unavailable";
  }
}

function handleSearchInput(event) {
  state.searchTerm = event.target.value.trim();
  updateVisibleCountries({ resetPage: true, snapSelectionToPage: true });
  render();
}

function handleRegionChange(event) {
  state.region = event.target.value;
  updateVisibleCountries({ resetPage: true, snapSelectionToPage: true });
  render();
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  updateVisibleCountries({ resetPage: true, snapSelectionToPage: true });
  render();
}

function handlePageSizeChange(event) {
  state.pageSize = Number(event.target.value) || DEFAULT_PAGE_SIZE;
  updateVisibleCountries({ resetPage: true, snapSelectionToPage: true });
  render();
}

function handleReset() {
  state.searchTerm = "";
  state.region = "all";
  state.sortBy = "population-desc";
  state.pageSize = DEFAULT_PAGE_SIZE;
  state.currentPage = 1;

  elements.searchInput.value = "";
  elements.regionSelect.value = "all";
  elements.sortSelect.value = "population-desc";
  elements.pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);

  updateVisibleCountries({ resetPage: true, snapSelectionToPage: true });
  render();
}

function handleCountrySelection(event) {
  const trigger = event.target.closest("[data-country-code]");

  if (!trigger) {
    return;
  }

  const { countryCode } = trigger.dataset;

  if (!countryCode) {
    return;
  }

  state.selectedCountryCode = countryCode;
  renderDetails();
}

function handlePaginationClick(event) {
  const pageButton = event.target.closest("[data-page], [data-page-action]");

  if (!pageButton) {
    return;
  }

  const totalPages = getPageCount();

  if (pageButton.dataset.page) {
    state.currentPage = Number(pageButton.dataset.page);
  }

  if (pageButton.dataset.pageAction === "prev") {
    state.currentPage = Math.max(1, state.currentPage - 1);
  }

  if (pageButton.dataset.pageAction === "next") {
    state.currentPage = Math.min(totalPages, state.currentPage + 1);
  }

  updateVisibleCountries({ resetPage: false, snapSelectionToPage: true });
  render();
}

function handleImageError(event) {
  const image = event.target;

  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  const imageFrame = image.closest(".country-card__flag, .country-profile__flag");

  if (imageFrame) {
    imageFrame.classList.add("is-fallback");
  }

  image.remove();
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.regionSelect.addEventListener("change", handleRegionChange);
  elements.sortSelect.addEventListener("change", handleSortChange);
  elements.pageSizeSelect.addEventListener("change", handlePageSizeChange);
  elements.resetButton.addEventListener("click", handleReset);
  elements.retryButton.addEventListener("click", loadCountries);
  elements.countryGrid.addEventListener("click", handleCountrySelection);
  elements.countryProfile.addEventListener("click", handleCountrySelection);
  elements.pagination.addEventListener("click", handlePaginationClick);
  document.addEventListener("error", handleImageError, true);
}

function init() {
  restoreTheme();
  bindEvents();
  loadCountries();
}

document.addEventListener("DOMContentLoaded", init);
