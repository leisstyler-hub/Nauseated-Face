// U.S. Census Bureau 2025 Gazetteer representative place coordinates.
// https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_gaz_place_53.txt
// Geographic reference only; never establishes inspection coverage.
import { citySlug } from './jurisdictions.mjs';
const CENTERS = {
  "WA:auburn": {
    "latitude": 47.304657,
    "longitude": -122.210696,
    "geoid": "5303180"
  },
  "WA:bellevue": {
    "latitude": 47.597837,
    "longitude": -122.15648,
    "geoid": "5305210"
  },
  "WA:black-diamond": {
    "latitude": 47.314748,
    "longitude": -122.017685,
    "geoid": "5306330"
  },
  "WA:bothell": {
    "latitude": 47.773531,
    "longitude": -122.204376,
    "geoid": "5307380"
  },
  "WA:buckley": {
    "latitude": 47.162239,
    "longitude": -122.020272,
    "geoid": "5308570"
  },
  "WA:burien": {
    "latitude": 47.475605,
    "longitude": -122.344661,
    "geoid": "5308850"
  },
  "WA:enumclaw": {
    "latitude": 47.202179,
    "longitude": -121.988976,
    "geoid": "5322045"
  },
  "WA:federal-way": {
    "latitude": 47.311596,
    "longitude": -122.337757,
    "geoid": "5323515"
  },
  "WA:issaquah": {
    "latitude": 47.544488,
    "longitude": -122.049085,
    "geoid": "5333805"
  },
  "WA:kenmore": {
    "latitude": 47.749857,
    "longitude": -122.247246,
    "geoid": "5335170"
  },
  "WA:kent": {
    "latitude": 47.390008,
    "longitude": -122.213528,
    "geoid": "5335415"
  },
  "WA:kirkland": {
    "latitude": 47.696658,
    "longitude": -122.20417,
    "geoid": "5335940"
  },
  "WA:lake-forest-park": {
    "latitude": 47.758911,
    "longitude": -122.291729,
    "geoid": "5337270"
  },
  "WA:redmond": {
    "latitude": 47.677924,
    "longitude": -122.115336,
    "geoid": "5357535"
  },
  "WA:renton": {
    "latitude": 47.47919,
    "longitude": -122.194613,
    "geoid": "5357745"
  },
  "WA:sammamish": {
    "latitude": 47.594268,
    "longitude": -122.038081,
    "geoid": "5361115"
  },
  "WA:seattle": {
    "latitude": 47.619335,
    "longitude": -122.351538,
    "geoid": "5363000"
  },
  "WA:shoreline": {
    "latitude": 47.756917,
    "longitude": -122.345505,
    "geoid": "5363960"
  },
  "WA:tukwila": {
    "latitude": 47.476289,
    "longitude": -122.27574,
    "geoid": "5372625"
  },
  "WA:vashon": {
    "latitude": 47.411191,
    "longitude": -122.455105,
    "geoid": "5374305"
  },
  "WA:woodinville": {
    "latitude": 47.757695,
    "longitude": -122.146791,
    "geoid": "5379590"
  }
};
export const cityCenter = (stateCode, city) => CENTERS[stateCode.toUpperCase() + ':' + citySlug(city)] ?? null;
