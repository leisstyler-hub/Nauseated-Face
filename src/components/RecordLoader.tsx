export function RecordLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`record-loader ${compact ? 'record-loader-compact' : ''}`} role="status" aria-live="polite">
      <span className="rotten-egg-scene" aria-hidden="true">
        <span className="egg-stink egg-stink-one" />
        <span className="egg-stink egg-stink-two" />
        <span className="rotten-egg"><span className="egg-crack" /><span className="egg-eyes">× ×</span><span className="egg-mouth" /></span>
      </span>
      <span>Loading inspection records<span aria-hidden="true">...</span></span>
    </div>
  );
}
