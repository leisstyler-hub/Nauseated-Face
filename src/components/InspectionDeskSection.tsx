import {getHomeArea} from '@/lib/home-area';
import {CategoryGrid} from './CategoryGrid';
export async function InspectionDeskSection(){const area=await getHomeArea();return area.selected?<CategoryGrid areaLabel={area.label}/>:null;}
