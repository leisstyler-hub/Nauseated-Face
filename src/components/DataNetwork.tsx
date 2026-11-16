"use client";

import {useEffect,useRef,useState,useSyncExternalStore} from 'react';

type Point=[number,number,number];
const motionQuery='(prefers-reduced-motion: reduce)';
const subscribeMotion=(notify:()=>void)=>{const query=window.matchMedia(motionQuery);query.addEventListener('change',notify);return()=>query.removeEventListener('change',notify);};
const reducedSnapshot=()=>window.matchMedia(motionQuery).matches;
const serverReducedSnapshot=()=>true;

// Adapted from Tyler's supplied Discovery Core demo: seeded shell nodes,
// curved fibers and perspective projection. The illustration has no telemetry.
function makeNetwork(){
 let seed=20261006;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const nodes=Array.from({length:330},()=>{const angle=random()*Math.PI*2,u=random()*2-1,k=Math.sqrt(1-u*u),r=.7+random()*.3;return [Math.cos(angle)*k*r,Math.sin(angle)*k*r*.83,u*r] as Point;});
 const fibers=Array.from({length:440},()=>{const a=nodes[Math.floor(random()*nodes.length)],b=nodes[Math.floor(random()*nodes.length)],mid=a.map((n,i)=>(n+b[i])*.4+(random()-.5)*.5) as Point;return {points:Array.from({length:9},(_,i)=>{const t=i/8,s=1-t;return a.map((n,j)=>s*s*n+2*s*t*mid[j]+t*t*b[j]) as Point;}),phase:random()};});
 return {nodes,fibers};
}
const network=makeNetwork();
export function DataNetwork(){
 const canvasRef=useRef<HTMLCanvasElement>(null),stageRef=useRef<HTMLDivElement>(null),phaseRef=useRef(0);
 const [paused,setPaused]=useState(false);
 const reduced=useSyncExternalStore(subscribeMotion,reducedSnapshot,serverReducedSnapshot);
 useEffect(()=>{
  const canvas=canvasRef.current,stage=stageRef.current;if(!canvas||!stage)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let width=1,height=1,frame=0,last=0,phase=phaseRef.current,visible=true,disposed=false;
  const face=new Image();face.src='/nauseated-face.png';
  function paint(){
   if(!ctx||!canvas)return;
   const angle=.45+phase*.12,cy=Math.cos(angle),sy=Math.sin(angle),cx=Math.cos(-.18),sx=Math.sin(-.18),radius=Math.min(width*.41,height*.45);
   const project=(p:Point)=>{const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cx-z*sx,depth=p[1]*sx+z*cx,perspective=2.75/(2.75-.38*depth);return [width*.5+x*perspective*radius,height*.5+y*perspective*radius,depth,perspective];};
   ctx.clearRect(0,0,width,height);const glow=ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,radius*1.3);glow.addColorStop(0,'rgba(125,210,75,.09)');glow.addColorStop(1,'rgba(125,210,75,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
   for(let i=0;i<network.fibers.length;i++){const f=network.fibers[i];ctx.beginPath();f.points.forEach((point,j)=>{const p=project(point);if(j)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.strokeStyle=i%7===0?'rgba(205,231,182,.24)':'rgba(125,210,75,.13)';ctx.lineWidth=.65;ctx.stroke();}
   for(let i=0;i<network.nodes.length;i++){const p=project(network.nodes[i]);ctx.globalAlpha=.35+(p[2]+1)*.28;if(i%37===0&&face.complete&&face.naturalWidth){const size=(width<400?9:12)*p[3];ctx.drawImage(face,p[0]-size/2,p[1]-size/2,size,size);}else{ctx.fillStyle=i%9===0?'#d8e8c7':'#7dd24b';ctx.beginPath();ctx.arc(p[0],p[1],(i%9===0?1.65:.9)*p[3],0,Math.PI*2);ctx.fill();}}
   ctx.globalAlpha=1;
   for(let i=0;i<30;i++){const f=network.fibers[(i*13+7)%network.fibers.length],t=((phase*.16+f.phase)%1)*8,k=Math.min(7,Math.floor(t)),a=f.points[k],b=f.points[k+1],p=project(a.map((n,j)=>n+(b[j]-n)*(t-k)) as Point);ctx.fillStyle='#d1f8ad';ctx.beginPath();ctx.arc(p[0],p[1],1.5,0,Math.PI*2);ctx.fill();}
   canvas.dataset.ready='true';
  }
  const running=()=>!disposed&&!paused&&!reduced&&visible&&!document.hidden;
  function tick(time:number){frame=0;if(!running())return;if(time-last>=32){phase+=Math.min((time-last)/1000,.05);phaseRef.current=phase;last=time;paint();}frame=requestAnimationFrame(tick);}
  function synchronize(){cancelAnimationFrame(frame);frame=0;last=performance.now();if(running())frame=requestAnimationFrame(tick);}
  const resize=()=>{const rect=stage.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);paint();};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;synchronize();});intersection.observe(stage);
  face.onload=()=>{if(!disposed)paint();};resize();synchronize();document.addEventListener('visibilitychange',synchronize);
  return()=>{disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',synchronize);face.onload=null;};
 },[paused,reduced]);
 return <figure className="data-network" aria-label="Illustration of inspection records connecting into readable history">
  <div className="data-network-heading"><span>PUBLIC RECORDS. CLEAR CONNECTIONS.</span><button type="button" disabled={reduced} aria-pressed={paused||reduced} onClick={()=>setPaused(value=>!value)}>{reduced?'Animation paused':paused?'Play animation':'Pause animation'}</button></div>
  <div className="data-network-stage" ref={stageRef}>
   <canvas ref={canvasRef} aria-hidden="true"/>
   <svg className="data-network-fallback" viewBox="0 0 600 320" aria-hidden="true"><g fill="none" stroke="#7dd24b" opacity=".3">{[0,30,60,90,120,150].map(angle=><ellipse key={angle} cx="300" cy="160" rx="130" ry="75" transform={`rotate(${angle} 300 160)`}/>)}</g><g fill="#7dd24b">{network.nodes.filter((_,i)=>i%6===0).map((p,i)=><circle key={i} cx={300+p[0]*130} cy={160+p[1]*130} r="2"/>)}</g></svg>
  </div>
  <figcaption>Official records <span aria-hidden>→</span> Inspection history <span aria-hidden>→</span> Clear context<span className="data-network-note">An illustration of how records connect.</span></figcaption>
 </figure>;
}
