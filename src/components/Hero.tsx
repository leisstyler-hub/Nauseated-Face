export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>
          Seattle&apos;s Irreverent Food-Safety Watchdog.
        </h1>
        <p className="hero-tagline">
          Someone&apos;s Gotta
          {" "}Clean This{" "}
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
        </p>
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
    </section>
  );
}
