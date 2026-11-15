This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The independent King County backend, local import commands, read API contract, official-record evidence, and hosting limitations are documented in [Backend integration](docs/BACKEND_INTEGRATION.md). Requires Node 24.18+ for local SQLite. No hosted storage or scheduler is included.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Landing page redesign

- The initial 1.5-second face intro plays on a new document or reload, not client navigation or back/forward; reduced motion bypasses it. No storage or tracking is needed.
- Ticker: latest 12 fetched inspection events, not a live stream. Hover/focus pauses it. With reduced motion, scroll the static strip. Records of 50+ violation points receive a drop animation.
- Data: selects the latest 100 complete inspection keys and retrieves their full rows in bounded batches. Cached up to 15 minutes. API errors fail visibly.
- November 15: the capped editorial index is retired from public views. Official inspection points remain uncapped and are not percentages. A separate rating system is not currently published.
- Weekly feature: highest points among eligible past-seven-day inspections in the 100-event sample; 20+ points, an unsatisfactory result, or recorded closure required. Not countywide.
- Category buttons select an accessible descriptive panel. Dedicated rankings remain in development.
- Verify: `npm run lint`, `npm run build`, `node --experimental-strip-types --test tests/*.test.mjs`.
