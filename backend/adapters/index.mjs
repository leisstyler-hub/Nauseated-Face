import { adapter as waKing } from './wa-king.mjs';
import { adapter as chicago } from './il-chicago.mjs';

// One adapter per jurisdiction with automated collection. A jurisdiction may
// exist in the catalog (jurisdictions.mjs) without an adapter — it then shows
// as coming_soon/unavailable and is never imported or displayed as covered.
export const ADAPTERS = { [waKing.jurisdictionId]: waKing, [chicago.jurisdictionId]: chicago };

export const adapterFor = jurisdictionId => {
  const adapter = ADAPTERS[jurisdictionId];
  if (!adapter) throw new Error(`No adapter for jurisdiction ${jurisdictionId}`);
  return adapter;
};
