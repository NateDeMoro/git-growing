---
issue: n/a
kind: feature
opener: user (verbal)
related_issues: []
related_prs: []
status: introduced
last_updated: 2026-11-15
last_explored: 2026-11-15
---

# Existing structure

## 1. Surface stack
Nothing exists. Repo /Users/natedemoro/Code/Git_Growing, branch main, one commit (ca07c26) with README.md and .gitignore (.env, .env.*, .DS_Store). Remote: github.com/NateDeMoro/git-growing (public). Single worktree.

## 2. Data model
No database. External data, verified live on 2026-11-15 at Willcox AZ (32.25, -109.83):
- Open-Meteo forecast (api.open-meteo.com/v1/forecast, no key): 8 days hourly; temperature at 2/80/120/180 m, wind speed and direction at 10/80/120/180 m, gusts, RH, dew point, VPD, boundary_layer_height, cloud_cover, shortwave_radiation, soil_temperature_0cm, precipitation and probability, lifted_index, CAPE, surface pressure, 1000/925 hPa temps, ET0, is_day. 180 m fields null for the last 6 hours. Units selectable (mph, F). Nightly inversions visible (6 AM: 42.5F at 2 m vs 52.7F at 80 m; 31 of 48 hours inverted).
- Open-Meteo historical forecast (historical-forecast-api.open-meteo.com/v1/forecast): 2024-01-01 to 2026-11-01, 24,864 hourly rows, all multi-height fields non-null.
- NWS (api.weather.gov, User-Agent required, use a generic one): points lookup returns gridpoints/TWC/133,45; gridpoint data has mixingHeight (m), transportWindSpeed (km/h), transportWindDirection, twentyFootWindSpeed (km/h); dispersionIndex empty.
- PubChem PUG View (pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/<CID>/JSON?heading=Vapor+Pressure): returns vapor-pressure strings (chlorpyrifos CID 2730: 2.02e-5 mmHg at 25 C). Henry's law heading also exists.
- AZMet (api.azmet.arizona.edu/v1/observations/hourly/<station>/<start>/<duration>): works (az01 Tucson); string-typed fields temp_airF, relative_humidity, dwptF, wind fields; nearest station to Willcox not yet identified.
- Terrain: AWS terrarium tiles and Open-Meteo elevation API work (teammate's 3D concern).
- OpenStreetMap Overpass: one query failed (timeout/parse); untested.

Reference physics (Battany 2017 GiESCO paper, user-supplied PDF): towers with loggers at 1.5 m and 10.7 m, 5-minute interval, temperature only; inversion strength of 1.0 C or more between those heights is meaningful; typical nightly inversions about 2-3 C. UC ANR blog (Faber 2015): radiation inversions begin 3-4 h before sunset, peak just before sunrise, dissipate within about 1 h after sunrise; exceptions: overcast, low heavy cloud, continuous rain, wind staying up overnight; cloud cover 25% or less favors inversions. Track text: wind below 3 mph or above 10 mph flagged; large speed or direction differences between heights flagged.

## 3. Async neighbours
None. Teammate is planning the 3D component separately and will consume the frame contract.

## 4. Cross-cutting concerns
No auth. Vercel hosting; CLI 55.0.0 installed and logged in as nathanieldemoro-7315, no project linked yet. Node v26.5.0, npm available. gh logged in as NateDeMoro. Hack Arizona rule: all code written during the event.

## 5. Existing tests
None.

## 6. Conventions
None yet. Set by the scaffold: TypeScript strict, src/lib for pure logic, src/app for routes and pages.

******
2026-11-15 probes: the Esri World Imagery tile endpoint returns 200 image/jpeg with no key. Nominatim returned nothing for "2176 W County 15th St, Somerton, AZ", so the block is picked by eye near 32.61, -114.64. AZMet Yuma stations: az02 Yuma Valley, az14 Yuma N.Gila, az36 Yuma South. Wind fields include wind_spd_mph, wind_vector_dir and wind_spd_max_mph. Overpass main server returned "502, at capacity", so the neighbors need a hand-placed fallback.
