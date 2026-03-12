This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Realtime Notifications (Socket.IO + Redis)

This project now uses a custom Node server (`server.mjs`) to run Next.js and Socket.IO together.

### Required environment variables

```bash
REDIS_URL=redis://localhost:6379
```

### Run

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

Notes:
- Socket.IO path: `/socket.io`
- Notification API remains the source of truth (Postgres).
- Realtime emits are sent via Redis adapter for multi-instance scaling.
- If `REDIS_URL` is not set, app still works with database-backed notifications (no cross-instance realtime fanout).

## Production Logging

This project includes a production-grade structured logging system with:

- request correlation (`x-request-id`, `x-trace-id`)
- tenant-aware context (`companyId`, `userId`)
- API request lifecycle logging
- audit event logging
- redaction/sanitization of sensitive fields
- client error ingestion endpoint (`/api/logs/client`)

See: [docs/logging.md](docs/logging.md)

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
