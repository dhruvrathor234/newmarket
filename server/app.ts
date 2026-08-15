import express from 'express';
import { NODE_ENV, IS_VERCEL, GEMINI_API_KEY, isPlaceholder, CASHFREE_API_KEY, CASHFREE_SECRET_KEY } from './config';
import aiRouter from './routes/ai';
import binanceRouter from './routes/binance';
import paymentsRouter from './routes/payments';

// Pure Express app — no Vite dependency. Vite is only ever imported by the
// dev entry (server/dev.ts) so it never ends up in the production serverless
// bundle on Vercel (its native esbuild binary crashes the lambda).
export const app = express();

app.use(express.json({ limit: '10mb' }));

// --- HEALTH CHECK (public, no sensitive details) ---
// sha + cashfreeConfigured let you verify WHICH code is live after a deploy:
// VERCEL_GIT_COMMIT_SHA is injected by Vercel at build time.
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    ai: { online: !!GEMINI_API_KEY && !isPlaceholder(GEMINI_API_KEY) },
    env: NODE_ENV,
    vercel: IS_VERCEL,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    cashfreeConfigured: !!CASHFREE_API_KEY && !!CASHFREE_SECRET_KEY,
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// --- API ROUTES (all authenticated + rate limited inside each router) ---
// Mount on both /api/* and /* so requests resolve properly in local dev, Vercel functions, and rewrites
app.use('/api/ai', aiRouter);
app.use('/ai', aiRouter);

app.use('/api/binance', binanceRouter);
app.use('/binance', binanceRouter);

app.use('/api/payments', paymentsRouter);
app.use('/payments', paymentsRouter);

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err?.status || 500).json({ error: err?.message || 'Internal server error.' });
});

