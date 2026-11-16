"use client";
import {useState} from 'react';
export function CityPromptTicker(){
 const [paused,setPaused]=useState(false);
 return <section className="ticker" aria-label="Select a city"><span className="ticker-label">YOUR AREA</span><div className="ticker-window"><div className="ticker-track" style={{animationPlayState:paused?'paused':undefined}}>{[0,1].map(copy=><div key={copy} className="ticker-copy" aria-hidden={copy===1}>{Array.from({length:12},(_,i)=><span key={i} className="ticker-item" aria-hidden={copy!==0||i!==0}>Select a city</span>)}</div>)}</div></div><button type="button" className="ticker-toggle" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'Play':'Pause'}</button></section>;
}
