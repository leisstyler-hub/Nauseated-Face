export interface Operations {
  counts: Record<string, number>;
  storage: { databaseBytes: string; schemaBytes: string; note: string };
  sources: { id: string; name: string; stateCode: string; stateName: string; healthAuthority: string; sourceUrl: string; enabled: boolean; coverageStatus: string; establishmentCount: number; lastSuccess: string | null; lastAttempt: {status: string} | null }[];
  runs: { id: number | string; jurisdiction_id: string; started_at: string; status: string; row_count: number | null; changed_count: number | null }[];
}
