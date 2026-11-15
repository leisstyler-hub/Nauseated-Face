import Link from 'next/link';
import {DESK_CATEGORIES} from '../../backend/desk-categories.mjs';
export function CategoryGrid({areaLabel}:{areaLabel:string}){
 return <section id="rankings" className="categories inspection-desk desk-directory">
  <div className="section-heading"><p className="eyebrow text-nausea">EXPLORE THE RECORD</p><h2>The inspection desk</h2><p className="scope">{areaLabel} · Choose a category to open its full report.</p></div>
  <nav aria-label="Inspection categories" className="desk-category-grid">{DESK_CATEGORIES.map((category,index)=><Link key={category.id} href={`/rankings/${category.slug}`} className="desk-category-card"><span className="eyebrow text-nausea">{String(index+1).padStart(2,'0')}</span><h3>{category.name}</h3><p>{category.summary}</p><span className="desk-category-open">Explore category <span aria-hidden>↗</span></span></Link>)}</nav>
 </section>;
}
