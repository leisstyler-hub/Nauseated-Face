export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">
          Seattle&apos;s Irreverent Food-Safety Watchdog.
        </p>
        <h1>
          Someone&apos;s Gotta
          <br />
          Clean This{" "}
          <span className="text-nausea">
            Cr
            <span
              className="inline-face"
              role="img"
              aria-label="nauseated face"
            >
              🤢
            </span>
            p Up.
          </span>
        </h1>
        <p className="hero-description">
          Nauseated Face turns official King County food inspection records
          into readable rankings and stories — with a healthy dose of sarcasm, a
          little drama, and facts that always come first.
        </p>
        <div className="hero-actions">
          <a href="#worst" className="primary-button">
            Meet this week&apos;s worst <span aria-hidden>↗</span>
          </a>
          <a href="/methodology" className="secondary-button">
            The facts behind the face
          </a>
        </div>
        <p className="text-xs text-muted">
          Independent. Not affiliated with King County Public Health.
        </p>
      </div>
      <div className="hero-mascot" aria-hidden="true">
        <span>🤢</span>
        <p>
          PUBLIC RECORDS.
          <br />
          PRIVATE GAG REFLEX.
        </p>
      </div>
    </section>
  );
}
