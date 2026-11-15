import pg from 'pg';
import { CONTROL_SCHEMA } from './admin-controls.mjs';
import { directPilotUrl } from './postgres-store.mjs';
import { productionEnabled, savedStorageEnabled } from './production.mjs';

// Explicit additive deployment setup; does not touch auth accounts or inspection rows.
if (!savedStorageEnabled() || process.env.NF_ADMIN_PREPARE_AUTHORIZED !== 'yes') throw new Error('Administrator setup authorization required');
const schema = productionEnabled() ? 'nf_admin_production' : 'nf_admin_preview';
const pool = new pg.Pool({ connectionString: directPilotUrl(process.env), options: `-c search_path=${schema}`, max: 1 });
try {
  await pool.query(CONTROL_SCHEMA);
  console.log('Admin control audit table ready; existing records preserved.');
} finally { await pool.end(); }
