import express from 'express';
import { NODE_ENV, IS_VERCEL, GEMINI_API_KEY, isPlaceholder } from './config';
import aiRouter from './routes/ai';
import binanceRouter from './routes/binance';
import paymentsRouter from './routes/payments';

// Pure Express app — no Vite dependency. Vite is only ever imported by the
// dev entry (server/dev.ts) so it never ends up in the production serverless
// bundle on Vercel (its native esbuild binary crashes the lambda).
export const app = express();

app.use(express.json({ limit: '10mb' }));

// --- HEALTH CHECK (public, no sensitive details) ---
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai: { online: !!GEMINI_API_KEY && !isPlaceholder(GEMINI_API_KEY) },
    env: NODE_ENV,
    vercel: IS_VERCEL,
  });
});

// --- API ROUTES (all authenticated + rate limited inside each router) ---
app.use('/api/ai', aiRouter);
app.use('/api/binance', binanceRouter);
app.use('/api/payments', paymentsRouter);
