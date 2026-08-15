import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { NODE_ENV, IS_VERCEL, GEMINI_API_KEY, isPlaceholder } from './config';
import aiRouter from './routes/ai';
import binanceRouter from './routes/binance';
import paymentsRouter from './routes/payments';

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

// --- VITE / STATIC SERVING ---
async function setupVite() {
  if (NODE_ENV !== 'production' && !IS_VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5 compatible SPA fallback (bare '*' routes are no longer valid)
    app.get('/*splat', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite();

if (NODE_ENV !== 'production' || !IS_VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
