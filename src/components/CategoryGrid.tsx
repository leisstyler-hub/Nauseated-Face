"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export interface DeskItem {id:string;name:string;city:string;href:string;date:string;score?:number;latestDate?:string;latestScore?:number|null;count?:number;previousCount?:number;previousDate?:string;previousScore?:number;change?:number;mean?:number;codes?:string[];status?:string;history?:{date:string;score?:number;red?:number}[]}
export interface DeskCategory {id:string;name:string;period:string;description:string;limit:number;total:number;items:DeskItem[]}
export interface DeskReport {supported:boolean;today:string;categories:DeskCategory[]}
function Evidence({item,category}:{item:DeskItem;category:string}){
 if(category==='comebacks')return <><strong>{item.change} fewer points</strong><p>{item.previousDate}: {item.previousScore} points → {item.date}: {item.score} points</p></>;
 if(category==='clean')return <><strong>{item.mean?.toFixed(1)} average points · {item.history?.length} routine inspections</strong><p>{item.history?.map(e=>`${e.date}: ${e.score} points`).reverse().join(' → ')}</p></>;
 if(category==='red')return <><strong>{item.count} critical findings on latest routine inspection</strong><p>{item.history?.map(e=>`${e.date}: ${e.red}`).reverse().join(' → ')} (critical-finding counts)</p></>;
 if(category==='repeats')return <><strong>{item.count} recurring violation {item.count===1?'code':'codes'}: {item.codes?.join(', ')}</strong><p>Recorded on {item.previousDate} and {item.date}</p></>;
 if(category==='closures')return <><strong>Closure recorded {item.date}</strong><p>{item.status}. A historical flag does not establish a current closure.</p></>;
 if(category==='violations')return <strong>{item.count} distinct violation items · {item.date}</strong>;
 return <><strong>{item.score} official points · {item.date}</strong>{item.latestDate&&item.latestDate>item.date&&<p>Later routine inspection: {item.latestDate}{item.latestScore!==null&&item.latestScore!==undefined?` · ${item.latestScore} points`:''}. Open the profile for full follow-up history.</p>}</>;
}
export function CategoryGrid({report,areaLabel,region,unavailable=false}:{report:DeskReport;areaLabel:string;region:{key:string;label:string}|null;unavailable?:boolean}){
 const [selected,setSelected]=useState(0);const router=useRouter();const category=report.categories[selected];
 function expand(){if(!region)return;document.cookie=`nf-area=${region.key}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;try{localStorage.setItem('nf-location',region.key);}catch{}window.dispatchEvent(new Event('nf-location-change'));router.refresh();}
 return <section id="rankings" className="categories inspection-desk">
  <div className="section-heading"><p className="eyebrow text-nausea">DATED RECORDS. LOCAL CONTEXT.</p><h2>The inspection desk</h2><p className="scope">{areaLabel} · Report date {report.today} (Pacific)</p></div>
  {!report.supported?<div className="empty-state"><h3>{unavailable?'Inspection Desk temporarily unavailable':'Category rules are being defined for this health department'}</h3><p>{unavailable?'We could not load the saved history. Try again shortly; unavailable data is not a zero result.':'This source does not use the King County point strategy. We will not invent points or apply incompatible rankings.'}</p><Link href="/coverage">View sources and coverage →</Link></div>:<div className="category-layout">
   <nav aria-label="Inspection categories" className="category-nav">{report.categories.map((c,i)=><button key={c.id} aria-pressed={selected===i} aria-controls="desk-results" onClick={()=>setSelected(i)} className={selected===i?'active':''}><span>{String(i+1).padStart(2,'0')}</span>{c.name}<span aria-hidden>↗</span></button>)}</nav>
   <article id="desk-results" className="category-panel" aria-live="polite" aria-atomic="false">
    <p className="eyebrow text-nausea">{areaLabel}</p><h3>{category.name}</h3><p className="desk-period">{category.period}</p><p>{category.description}</p>
    <p className="scope desk-count">{category.total} qualifying {category.total===1?'business':'businesses'} · Showing {category.items.length} of up to {category.limit}</p>
    {category.id==='closures'&&<p className="desk-notice">Current status requires an explicit authority update. <a href="https://kingcounty.gov/en/dept/dph/health-safety/food-safety/food-establishment-closures" target="_blank" rel="noopener noreferrer">Check official closure and reopening notices ↗</a></p>}
    {category.total<category.limit&&region&&<div className="desk-notice"><p>Small local sample for this category. Keep these local results or explore the wider area.</p><button className="secondary-button" onClick={expand}>View {region.label} →</button></div>}
    {category.items.length===0?<p className="desk-notice">No qualifying saved records in this area and date range. This does not establish that no violations occurred.</p>:<ol className="desk-list">{category.items.map((item,index)=><li key={item.id}><div className="desk-business"><span className="desk-rank">{index+1}</span><div><h4><Link href={item.href}>{item.name}</Link></h4><p className="scope">{item.city}</p></div></div><div className="desk-evidence"><Evidence item={item} category={category.id}/></div><Link className="desk-history" href={item.href}>View dated inspection history →</Link></li>)}</ol>}
    <p className="scope desk-footnote">Lower official violation points are better. These are past inspection findings, not a statement of current conditions. Educational visits and targeted return inspections do not earn point-based awards. <Link href="/coverage">Sources & coverage →</Link></p>
   </article>
  </div>}
 </section>;
}
