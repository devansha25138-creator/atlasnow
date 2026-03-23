const milestonePlan = [
  {
    title: "Milestone 1",
    deadline: "March 23",
    description: "Create the project foundation and document the roadmap.",
    tasks: [
      "Set up README.md",
      "Create index.html, style.css, and app.js",
      "Prepare the app shell for future development"
    ],
    active: true
  },
  {
    title: "Milestone 2",
    deadline: "April 1",
    description: "Fetch country data and render responsive cards dynamically.",
    tasks: [
      "Use async/await to fetch API data",
      "Generate cards with flag, name, and population",
      "Add a loading state while data is fetched"
    ],
    active: false
  },
  {
    title: "Milestone 3",
    deadline: "April 8",
    description: "Build the interactive search, filter, sort, and theme logic.",
    tasks: [
      "Filter by country name and region",
      "Sort alphabetically or by population",
      "Persist dark mode with localStorage"
    ],
    active: false
  },
  {
    title: "Milestone 4",
    deadline: "April 10",
    description: "Polish, refactor, document, and deploy the final project.",
    tasks: [
      "Refactor into clean modular functions",
      "Add final README instructions",
      "Deploy on GitHub Pages or Netlify"
    ],
    active: false
  }
];

function createMilestoneCard(milestone) {
  const taskItems = milestone.tasks
    .map((task) => `<li>${task}</li>`)
    .join("");

  return `
    <article class="milestone-card ${milestone.active ? "is-active" : ""}">
      <span class="milestone-tag">Deadline: ${milestone.deadline}</span>
      <h3>${milestone.title}</h3>
      <p>${milestone.description}</p>
      <ul>${taskItems}</ul>
    </article>
  `;
}

function renderMilestones() {
  const milestoneGrid = document.getElementById("milestone-grid");

  if (!milestoneGrid) {
    return;
  }

  milestoneGrid.innerHTML = milestonePlan
    .map((milestone) => createMilestoneCard(milestone))
    .join("");
}

function setCurrentYear() {
  const yearElement = document.getElementById("current-year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

function init() {
  renderMilestones();
  setCurrentYear();
}

document.addEventListener("DOMContentLoaded", init);
