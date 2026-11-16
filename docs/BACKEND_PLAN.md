# NF-BACKEND-001

Implement the detailed assignment in the existing Next.js application, preserving the frontend. Local Node 24 SQLite is the development persistence adapter; hosted durable storage and scheduling require an owner decision. No deployment or paid resource creation.

Alternatives considered: a source-only proxy cannot satisfy durable provenance; provisioning a hosted database is unauthorized. Use dependency-free SQLite locally with Next route handlers and CLI import.

1. Write failing tests for complete paginated event reads, stable identities, transactional imports, duplicate prevention, revisions, removed rows, errors and freshness.
2. Implement source client, versioned SQL migration, repository and importer. Guard a paginated read with dataset revision metadata. Full imports reconcile the entire snapshot; scoped latest/business imports explicitly record their coverage.
3. Add read-only `/api/inspections`, `/api/inspections/:id`, `/api/businesses/:id/inspections`, `/api/refresh-status`. No network import triggered by public GET.
4. Run full tests, lint/build, two official imports and exact source comparisons through HTTP. Document contract, limitations and resource decisions. Commit with runtime identity, push task branch and open review PR.

Review focus: no fixture fallback; source changes during pagination; key collisions and row moves; failed import rollback; partial history presented as complete. Tests cover these failure modes. Local SQLite is unsuitable for ephemeral Vercel instances. A changed metadata token aborts imports; it is not a source snapshot guarantee stronger than the provider supplies.
