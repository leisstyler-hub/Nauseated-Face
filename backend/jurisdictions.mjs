// Data-driven geographic catalog. Adding a market means adding an entry here
// (plus an adapter when its official source supports automated collection) —
// never hardcoding states or cities in the frontend.
// coverage_status: 'available' (imported, serving), 'limited' (partial sample),
// 'coming_soon' (verified official source exists, adapter not shipped),
// 'unavailable' (no permitted machine-readable source verified yet).
export const JURISDICTIONS = [
  {id:'de-state',stateCode:'DE',stateName:'Delaware',name:'Delaware (statewide)',healthAuthority:'Delaware Division of Public Health, Office of Food Protection',sourceUrl:'https://data.delaware.gov/Health/Food-Establishment-Inspection-Violations/384s-wygj',scoring:{type:'result_only',direction:'none'},coverageStatus:'coming_soon',enabled:false,refreshFrequency:'weekly',cities:['Dover','Wilmington','Newark','Seaford']},
  {id:'ca-marin',stateCode:'CA',stateName:'California',name:'Marin County',healthAuthority:'Marin County Environmental Health Services',sourceUrl:'https://data.marincounty.gov/Public-Health/Food-Facility-Inspections/73zb-z5me',scoring:{type:'result_only',direction:'none'},coverageStatus:'coming_soon',enabled:false,refreshFrequency:'daily',cities:['San Rafael','Novato','Mill Valley','Corte Madera']},
  {
    id:'tx-austin',stateCode:'TX',stateName:'Texas',name:'Austin Public Health',
    healthAuthority:'Austin Public Health',sourceUrl:'https://data.austintexas.gov/Health-and-Community-Services/Restaurant-Inspection-Scores/ecmv-9xxi',
    scoring:{type:'score_100',direction:'higher_is_better'},coverageStatus:'coming_soon',enabled:false,refreshFrequency:'daily',cities:['Austin','West Lake Hills','Sunset Valley','Rollingwood','Pflugerville','Bee Cave','Lakeway','Manor'],
  },
  {
    id:'oh-cincinnati',stateCode:'OH',stateName:'Ohio',name:'Cincinnati',
    healthAuthority:'Cincinnati Health Department',sourceUrl:'https://data.cincinnati-oh.gov/Healthy-and-Safe/Food-Inspections/rg6p-b3h3',
    scoring:{type:'result_only',direction:'none'},coverageStatus:'coming_soon',enabled:false,refreshFrequency:'daily',cities:['Cincinnati'],
  },
  {
    id:'ny-nyc',stateCode:'NY',stateName:'New York',name:'New York City',
    healthAuthority:'New York City Department of Health and Mental Hygiene',sourceUrl:'https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j',
    scoring:{type:'letter_grade_score',direction:'lower_is_better'},coverageStatus:'coming_soon',enabled:false,refreshFrequency:'daily',cities:['New York City'],
  },
  {
    id: 'md-montgomery', stateCode: 'MD', stateName: 'Maryland', name: 'Montgomery County',
    healthAuthority: 'Montgomery County Department of Health and Human Services',
    sourceUrl: 'https://data.montgomerycountymd.gov/Health-and-Human-Services/HHS-Food-Inspection-Data-from-July-2024-and-onward/dkrp-gr48',
    scoring: { type: 'result_only', direction: 'none' },
    coverageStatus: 'limited', enabled: true, refreshFrequency: 'daily', cities: ['Rockville', 'Gaithersburg', 'Germantown', 'Silver Spring', 'Bethesda'],
  },
  {
    id: 'il-chicago', stateCode: 'IL', stateName: 'Illinois', name: 'Chicago',
    healthAuthority: 'Chicago Department of Public Health',
    sourceUrl: 'https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4ijn-s7e5',
    scoring: { type: 'result_only', direction: 'none' },
    coverageStatus: 'coming_soon', enabled: false, refreshFrequency: 'daily', cities: ['Chicago'],
  },
  {
    id: 'wa-king', stateCode: 'WA', stateName: 'Washington', name: 'King County',
    healthAuthority: 'Public Health — Seattle & King County',
    sourceUrl: 'https://data.kingcounty.gov/Health/Food-Establishment-Inspection-Data/f29f-zza5',
    scoring: { type: 'violation_points', direction: 'lower_is_better', redLabel: 'red (high-risk)', blueLabel: 'blue (maintenance)' },
    coverageStatus: 'limited', enabled: true, refreshFrequency: 'daily',
    cities: ['Seattle', 'Bellevue', 'Kirkland', 'Redmond', 'Renton', 'Kent', 'Federal Way', 'Auburn', 'Burien', 'Bothell', 'Issaquah', 'Kenmore', 'Sammamish', 'Shoreline', 'Tukwila', 'Vashon', 'Woodinville'],
  },
  {
    id: 'ca-los-angeles', stateCode: 'CA', stateName: 'California', name: 'Los Angeles County',
    healthAuthority: 'LA County Department of Public Health, Environmental Health',
    sourceUrl: 'https://data.lacounty.gov/datasets/environmental-health-restaurant-and-market-inspections-33',
    scoring: { type: 'letter_grade_score', direction: 'higher_is_better' },
    coverageStatus: 'coming_soon', enabled: false, refreshFrequency: null,
    cities: ['Los Angeles', 'Santa Monica', 'Glendale', 'Torrance', 'Pomona'],
  },
  {
    id: 'ca-san-francisco', stateCode: 'CA', stateName: 'California', name: 'San Francisco',
    healthAuthority: 'San Francisco Department of Public Health',
    sourceUrl: 'https://data.sfgov.org/Health-and-Social-Services/Health-Inspection-Scores-2024-Present-/tvy3-wexg',
    scoring: { type: 'result_only', direction: 'none' },
    coverageStatus: 'coming_soon', enabled: false, refreshFrequency: 'monthly',
    cities: ['San Francisco'],
  },
  {
    id: 'tn-state', stateCode: 'TN', stateName: 'Tennessee', name: 'Tennessee (statewide)',
    healthAuthority: 'Tennessee Department of Health',
    sourceUrl: 'https://apps.health.tn.gov/EHInspections',
    scoring: { type: 'score_100', direction: 'higher_is_better' },
    coverageStatus: 'unavailable', enabled: false, refreshFrequency: null,
    cities: ['Nashville', 'Knoxville', 'Chattanooga'],
  },
  {
    id: 'tn-shelby', stateCode: 'TN', stateName: 'Tennessee', name: 'Shelby County',
    healthAuthority: 'Shelby County Health Department',
    sourceUrl: 'https://www.shelbycountytn.gov/',
    scoring: { type: 'score_100', direction: 'higher_is_better' },
    coverageStatus: 'unavailable', enabled: false, refreshFrequency: null,
    cities: ['Memphis'],
  },
];

export const jurisdictionById = id => JURISDICTIONS.find(j => j.id === id);

export const citySlug = name => name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');

export const stateSlug = stateName => citySlug(stateName);

export async function seedJurisdictions(query) {
  for (const j of JURISDICTIONS) {
    await query(
      `INSERT INTO nf_preview.jurisdictions(id,state_code,state_name,name,health_authority,source_url,scoring_json,coverage_status,enabled,refresh_frequency)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(id) DO UPDATE SET state_code=excluded.state_code,state_name=excluded.state_name,name=excluded.name,
        health_authority=excluded.health_authority,source_url=excluded.source_url,scoring_json=excluded.scoring_json,
        refresh_frequency=excluded.refresh_frequency`,
      [j.id, j.stateCode, j.stateName, j.name, j.healthAuthority, j.sourceUrl, JSON.stringify(j.scoring), j.coverageStatus, j.enabled, j.refreshFrequency],
    );
  }
}
