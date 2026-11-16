import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {findDeskCategory} from '../../../../backend/desk-categories.mjs';
import {loadInspectionDesk} from '@/lib/inspection-desk';
import {CategoryReport} from '@/components/CategoryReport';
import {ChooseCityButton} from '@/components/ChooseCityButton';
import {SearchBox} from '@/components/SearchBox';
interface Props{params:Promise<{category:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{const category=findDeskCategory((await params).category);return category?{title:category.name,description:category.summary,alternates:{canonical:`/rankings/${category.slug}`}}:{title:'Category not found'};}
export default async function InspectionCategoryPage({params}:Props){
 const category=findDeskCategory((await params).category);if(!category)notFound();
 const {area,report,unavailable}=await loadInspectionDesk();
 const searchHref=`/search?${new URLSearchParams({state:area.stateCode,city:area.city,jurisdiction:area.jurisdictionId})}`;
 return <>
  <section className="category-hero mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
   <nav aria-label="Breadcrumb" className="flex flex-wrap gap-3 text-sm text-nausea"><Link href="/">Home</Link><span aria-hidden>/</span><Link href="/#rankings">Inspection Desk</Link><span aria-hidden>/</span><span className="text-muted">{category.name}</span></nav>
   <p className="mt-8 text-xs font-bold uppercase tracking-widest text-nausea">Public records · {area.selected?area.label:'Choose your area'}</p>
   <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{category.name}</h1>
   <p className="category-byline mt-4 text-lg font-semibold sm:text-xl">{category.byline}</p>
   <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{category.summary} Findings describe dated inspections, not a business’s current condition.</p>
   <div className="category-actions my-6 flex flex-wrap gap-3"><Link href="/#rankings" className="secondary-button">All categories</Link><Link href={searchHref} className="secondary-button">Search restaurants</Link><ChooseCityButton/></div>
   <SearchBox state={area.stateCode} city={area.city} jurisdiction={area.jurisdictionId}/>
  </section>
  {area.selected?<CategoryReport key={`${area.key}-${category.id}`} report={report} categoryId={category.id} areaKey={area.key} areaLabel={area.label} region={area.jurisdictionId==='wa-king'&&area.city?{key:'washington/greater-seattle',label:'Greater Seattle'}:null} unavailable={unavailable}/>:<section className="categories"><div className="empty-state"><h2 className="text-xl font-bold">Choose a city to explore this category</h2><p className="my-4 text-muted">The report follows your selected area. No city or restaurant is chosen for you.</p><ChooseCityButton/></div></section>}
 </>;
}
