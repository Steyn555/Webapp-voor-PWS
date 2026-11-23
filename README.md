# VirusMonitor

### Understanding and predicting the spread of infectious diseases in the Netherlands.

![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web%20Application-blue?style=for-the-badge)

**VirusMonitor** is an epidemiological analysis platform designed to visualize the spread of infectious diseases in the Netherlands and explore future developments using data analysis, mathematical models and machine learning.

The project is developed as part of a school research project (PWS).

---

## Live Website

**Website:** [Open VirusMonitor](https://steyn555.github.io/Webapp-voor-PWS/)

**Source Code:** [GitHub Repository](https://github.com/Steyn555/Webapp-voor-PWS)

---

## Project Goals

How does a virus spread throughout the Netherlands, and can we use available data to predict where and when new infections might occur?

VirusMonitor aims to investigate this question by combining different datasets and transforming them into useful insights.

The main objectives are:

- Analyse historical infection data.
- Identify patterns in the spread of infectious diseases.
- Compare infection rates between Dutch municipalities.
- Investigate the influence of population density and other factors.
- Develop models to predict future infections.
- Visualize results using an interactive map of the Netherlands.

---

## Features

The current version is a working front-end demo: all figures are fabricated demo data (inspired by the format of real RIVM/CBS statistics), clearly labelled as such in the app. No external APIs are called and everything runs in the browser.

| Feature | Description | Status |
|---|---|---|
| Dashboard | Overview of important epidemiological statistics | Demo available |
| Interactive Map | Visualisation of infection rates per province | Demo available |
| Statistics | Historical infection data and trends | Demo available |
| AI Predictions | Predicting future infection rates (demo, clearly labelled) | Demo available |
| Region Filters | Explore data per province and period | Demo available |
| Virus Simulation | Interactive SIR model with measures and vaccination | Available |
| Mobile Interface | Responsive design for smartphones and tablets | Available |

Feature statuses will be updated as development progresses.

---

## Technologies

VirusMonitor uses several programming languages, frameworks and libraries.

The current implementation is plain HTML, CSS and JavaScript without a build step, so it can be hosted directly on GitHub Pages. The technologies below are planned for later versions of the platform.

### Frontend

| Technology | Purpose |
|---|---|
| HTML | Website structure |
| CSS | Styling and layout |
| JavaScript | Application functionality |
| React | Frontend framework |
| Vite | Development environment and build tool |
| Recharts | Data visualisation |
| Leaflet | Interactive maps |
| Lucide React | Icons |

### Data Analysis and Machine Learning

| Technology | Purpose |
|---|---|
| Python | Data processing and modelling |
| Pandas | Dataset processing |
| NumPy | Numerical calculations |
| Scikit-learn | Machine learning |
| Matplotlib | Data visualisation |

### Hosting and Version Control

| Technology | Purpose |
|---|---|
| GitHub | Source code and version control |
| GitHub Pages | Website hosting |
| GitHub Actions | Automated deployment |

*Technologies will be introduced gradually. Not all listed technologies have been implemented yet.*

---

## Data Sources

The project uses publicly available data from reliable sources.

**Note:** the current demo version does not yet load real data. All numbers shown in the app are fabricated demo values, modelled after the way real RIVM and CBS figures are structured. Real datasets will be integrated in a later version.

### RIVM

The Dutch National Institute for Public Health and the Environment provides historical COVID-19 data and information about infectious diseases.

Website: https://www.rivm.nl/

Open Data: https://data.rivm.nl/covid-19/

### CBS

Statistics Netherlands provides demographic data, including population sizes and age distributions per municipality.

Website: https://www.cbs.nl/

Open Data: https://opendata.cbs.nl/

### OpenStreetMap

OpenStreetMap provides geographical data used for mapping and visualising the Netherlands.

Website: https://www.openstreetmap.org/

---

## How It Works

The planned system consists of several components that work together.

1. **Data Collection:** Public datasets are collected from different sources.
2. **Data Processing:** Data is cleaned, combined and prepared for analysis.
3. **Data Analysis:** Historical data is analysed to identify patterns.
4. **Model Training:** Machine learning models are trained using historical data.
5. **Predictions:** Models are used to estimate future developments.
6. **Visualisation:** Results are presented through charts and an interactive map.

The objective is to make historical data and model predictions accessible and easy to understand.

---

## Project Structure

The project structure may evolve during development. The current repository contains the front-end demo:

```text
Webapp-voor-PWS/
│
├── index.html        # all pages of the app (phone layout)
├── style.css         # styling, including light/dark theme
├── home.js           # navigation between pages (menu and tab bar)
├── script.js         # the SIR virus simulation
├── nl-map.js         # interactive map of the Netherlands
├── nl-map-data.js    # map data for the provinces
├── monitor.js        # dashboard, statistics and prediction pages
├── monitor-data.js   # demo data for the monitor
├── server.js         # local development server (Express)
├── *.test.mjs        # unit tests for the data modules
└── README.md
```

---

## Running the Project Locally

### Requirements

- Git
- Visual Studio Code
- A modern web browser
- Node.js and npm

### Clone the Repository

```bash
git clone https://github.com/Steyn555/Webapp-voor-PWS.git
cd Webapp-voor-PWS
```

### Start the Development Server

```bash
npm install
npm run dev
```

The development server will provide a local address:

```text
http://localhost:3000
```

Open this address in your browser to view the application. You can also open `index.html` directly in your browser or use the VS Code extension Live Preview.

### Tests and Checks

```bash
npm test       # unit tests for the map and monitor data
npm run lint   # syntax check of all JavaScript files
```

---

## Development Roadmap

The following improvements are planned for future development.

- [x] Implement an interactive map of the Netherlands (demo).
- [x] Visualise historical infection data (demo).
- [ ] Complete the frontend.
- [ ] Improve the responsive mobile interface.
- [ ] Collect and process RIVM datasets.
- [ ] Integrate CBS demographic data.
- [ ] Develop initial epidemiological models.
- [ ] Train a machine learning model.
- [ ] Compare predictions with actual data.
- [ ] Integrate predictions into the dashboard.
- [ ] Evaluate model performance.
- [ ] Optimise the application.

---

## Limitations and Disclaimer

VirusMonitor is an educational and experimental research project.

All figures in the current version are fabricated demo data. Predictions depend on the availability and quality of the underlying data, as well as assumptions made by the mathematical and machine learning models.

The results are estimates and should not be interpreted as official health advice or professional epidemiological forecasts.

Historical datasets may also contain limitations due to changes in testing policies, measurement methods and data collection procedures.

---

## About the Project

VirusMonitor is developed as part of a school research project (PWS).

The project combines several fields:

- Computer Science and Programming
- Mathematical Modelling
- Epidemiology
- Data Analysis
- Machine Learning

The ultimate goal is to develop an interactive platform that makes it possible to investigate and visualise the spread of infectious diseases throughout the Netherlands.

---

<p align="center">
  <strong>VirusMonitor</strong>
  <br>
  <em>Turning data into insights.</em>
  <br><br>
  Developed through research, programming and data analysis.
</p>
