import {getAdminAuth} from './admin-auth.mjs';
import {GUEST_SCHEMA} from './guests.mjs';
import {productionEnabled} from './production.mjs';

// Additive setup only; never runs during public rendering or imports.
if(process.env.NF_PREPARE_GUESTS!=='yes')throw Error('Explicit NF_PREPARE_GUESTS=yes required');
const auth=getAdminAuth();if(!auth)throw Error('Database/auth configuration required');
const schema=productionEnabled()?'nf_guests_production':'nf_guests_preview';
try{await auth.options.database.query(GUEST_SCHEMA.replaceAll('nf_guests_production',schema));console.log(JSON.stringify({prepared:true,schema,sourceRecordsChanged:false}));}
finally{await auth.options.database.end();}
