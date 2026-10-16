# SchoolSafar

Find your child's next school when you move cities in India.

**Live site:** https://schoolsafar.raghav131111.workers.dev/

SchoolSafar lists every school in the government's UDISE+ register (13,72,195 schools across 723 districts) and ranks them for your child by class, board, distance from your new home, fees, your job, and girls / boys / co-ed. Parents can save child profiles, shortlist and compare schools, and follow a moving checklist.

## What's in this folder

| Path | What it is |
| --- | --- |
| `index.html` | The page and its styles |
| `js/` | The app (Preact + htm, no build step) |
| `data/index.json` | States, districts, cities and boards |
| `data/c/*.json` | The schools, split by district |
| `robots.txt`, `sitemap.xml` | For search engines |
| `_headers` | Cloudflare caching rules |

It is a plain static site: open `index.html` through any web server, or upload the folder to Cloudflare, Netlify or GitHub Pages.

## Data

School data: UDISE+ "Basic Details of Schools", Ministry of Education, Government of India, via the India Data Portal. Used under the [Government Open Data License – India](https://data.gov.in/government-open-data-license-india).

Maps and address search: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

Location corrections: where the register's map point for a school is clearly wrong, `data/c/*.json` uses the school's location from OpenStreetMap instead (these schools carry flag 16). The corrections come from the Humanitarian OpenStreetMap Team's [Education Facilities of India](https://data.humdata.org/dataset/hotosm_ind_education_facilities) export, © OpenStreetMap contributors, available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). The list of corrected points is in `data/osm_fixes.tsv`, and hand-checked fixes are in `data/fixes.json`.
