import { adapter as waKing } from './wa-king.mjs';
import { adapter as chicago } from './il-chicago.mjs';
import { adapter as montgomery } from './md-montgomery.mjs';
import { adapter as cincinnati } from './oh-cincinnati.mjs';
import { adapter as nyc } from './ny-nyc.mjs';
import { adapter as austin } from './tx-austin.mjs';

// One adapter per jurisdiction with automated collection. A jurisdiction may
// exist in the catalog (jurisdictions.mjs) without an adapter — it then shows
// as coming_soon/unavailable and is never imported or displayed as covered.
export const ADAPTERS = Object.fromEntries([waKing,chicago,montgomery,cincinnati,nyc,austin].map(adapter=>[adapter.jurisdictionId,adapter]));

export const adapterFor = jurisdictionId => {
  const adapter = ADAPTERS[jurisdictionId];
  if (!adapter) throw new Error(`No adapter for jurisdiction ${jurisdictionId}`);
  return adapter;
};
