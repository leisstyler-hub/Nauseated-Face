export function inspectionPath(event) {
  return `/inspections/${encodeURIComponent(event.businessId)}/${encodeURIComponent(event.serialNum)}?date=${encodeURIComponent(event.inspectionDate)}`;
}

export async function readOfficialInspection(business, serial, date, read = fetch) {
  const literal = value => `'${value.replaceAll("'", "''")}'`;
  const params = new URLSearchParams({
    $where: `business_id=${literal(business)} AND inspection_serial_num=${literal(serial)} AND inspection_date=${literal(date)}`,
    $order: ':id', $limit: '5000',
  });
  const response = await read(`https://data.kingcounty.gov/resource/r878-4sxa.json?${params}`, {
    next: { revalidate: 900 }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Official inspection unavailable');
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length >= 5000 || rows.some(row => !row || row.business_id !== business || row.inspection_serial_num !== serial || row.inspection_date !== date)) {
    throw new Error('Incomplete or mismatched inspection response');
  }
  return rows;
}
