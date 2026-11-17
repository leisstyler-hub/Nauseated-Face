export function SourceNotice({ jurisdictionId }: { jurisdictionId: string }) {
  if (jurisdictionId !== 'il-chicago') return null;
  return <aside className="mt-5 rounded-xl border border-card-border p-4 text-xs leading-6 text-muted">
    <p>This site provides applications using data that has been modified for use from its original source, www.cityofchicago.org, the official website of the City of Chicago. The City of Chicago makes no claims as to the content, accuracy, timeliness, or completeness of any of the data provided at this site. The data provided at this site is subject to change at any time. It is understood that the data provided at this site is being used at one&apos;s own risk.</p>
    <a href="https://www.chicago.gov/city/en/narr/foia/data_disclaimer.html" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-nausea underline">City of Chicago data terms</a>
  </aside>;
}
