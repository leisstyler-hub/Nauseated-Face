# City-neutral first visit

Tyler requests that the homepage not default to Seattle or expose a local restaurant nationwide. Absent or invalid nf-area resolves to an unselected area with blank geography and selected=false. Only an explicit valid city/region cookie may load its homepage feed. Preserve remembered explicit choices; do not auto-pick from local storage, IP or geolocation.

Header says Choose a city. Hero and neutral feed prompt open that location selector accessibly. No ticker, weekly highlight or feed records render for an unselected visitor, including streamed HTML. Guard the shared feed loader as defense in depth. Search remains possible by explicit user query. Retain updated Full Picture byline and revised landing paragraph.

Validate resolver regressions, complete suites, lint/build; fresh-browser payload/UI checks at five widths, explicit Seattle selection, reload persistence, malformed cookie, and return-to-neutral behavior when cookie cleared. Stage through existing PR and promote only after hosted verification. No source data changes.
