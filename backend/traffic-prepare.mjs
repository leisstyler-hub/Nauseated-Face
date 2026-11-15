import pg from 'pg';
import { directPilotUrl } from './postgres-store.mjs';
import { savedStorageEnabled,productionEnabled } from './production.mjs';
import { TRAFFIC_SCHEMA,trafficReport } from './traffic.mjs';
if(!savedStorageEnabled()||process.env.NF_ADMIN_PREPARE_AUTHORIZED!=='yes')throw new Error('Administrator setup authorization required');
const schema=productionEnabled()?'nf_admin_production':'nf_admin_preview';
const pool=new pg.Pool({connectionString:directPilotUrl(process.env),options:`-c search_path=${schema}`,max:1});
try{await pool.query(TRAFFIC_SCHEMA);const report=await trafficReport(pool,'today');console.log('Traffic tables and report read verified:',JSON.stringify({collectionStarted:report.collectionStarted,visitors:report.visitors,visits:report.visits,pageviews:report.pageviews,returningPercent:report.returningPercent}));}finally{await pool.end();}
