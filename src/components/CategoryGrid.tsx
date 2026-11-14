"use client";
import { Face } from "@/components/Face";

import { useState } from "react";
const categories = [
  [
    "Hall of Shame",
    "The highest violation-point totals. A single inspection is not an ongoing trend.",
  ],
  [
    "Red Violation Report",
    "Critical violations recorded by King County inspectors.",
  ],
  [
    "Repeat Offender",
    "Repeat violations require verified inspection history. Historical matching is still in development.",
  ],
  [
    "Closed Kitchen Watch",
    "Closure at the time of inspection does not establish that a business remains closed.",
  ],
  [
    "Most Violations",
    "A count of recorded violations in one inspection event.",
  ],
  [
    "Highest Inspection Score",
    "Official inspection scores, separate from our editorial index.",
  ],
  [
    "Gross-Out Gallery",
    "Official violation descriptions. No invented photos or allegations.",
  ],
  [
    "Comeback of the Week",
    "A comeback requires a matched reinspection outcome. Historical matching is still in development.",
  ],
  [
    "Clean Plate Award",
    "Excellent inspection results deserve their moment too.",
  ],
];
export function CategoryGrid() {
  const [selected, setSelected] = useState(0);
  return (
    <section id="rankings" className="categories">
      <div className="section-heading">
        <p className="eyebrow text-nausea">PICK YOUR POISON. FIGURATIVELY.</p>
        <h2>The inspection desk</h2>
      </div>
      <div className="category-layout">
        <nav aria-label="Inspection categories" className="category-nav">
          {categories.map(([name], i) => (
            <button
              key={name}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className={selected === i ? "active" : ""}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {name}
              <span aria-hidden>↗</span>
            </button>
          ))}
        </nav>
        <article className="category-panel" aria-live="polite">
          <span className="category-face" aria-hidden>
            <Face />
          </span>
          <p className="eyebrow text-nausea">THE NAUSEATED FACE FILES</p>
          <h3>{categories[selected][0]}</h3>
          <p>{categories[selected][1]}</p>
          <p className="scope">
            Dedicated category rankings are in development. Browse complete
            recent inspection records above while we build the history-backed
            rankings.
          </p>
          <a className="secondary-button" href="#latest">
            Browse recent inspections ↗
          </a>
        </article>
      </div>
    </section>
  );
}
