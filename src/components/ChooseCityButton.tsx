"use client";
export function ChooseCityButton(){return <button type="button" className="primary-button" onClick={()=>window.dispatchEvent(new Event('nf-open-location'))}>Choose a city <span aria-hidden>↗</span></button>;}
