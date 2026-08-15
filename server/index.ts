import express from 'express';
import path from 'path';
import { app } from './app';
import { NODE_ENV, IS_VERCEL } from './config';

// --- STATIC SERVING (production only; local dev uses the Vite middleware in server/dev.ts) ---
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
// Express 5 compatible SPA fallback (bare '*' routes are no longer valid)
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- GLOBAL ERROR HANDLER ---
// Never let an unexpected error crash the function on Vercel: respond with a
// clean JSON 500 so the client (and Vercel logs) show the real message instead
// of a generic FUNCTION_INVOCATION_FAILED.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err?.message || 'Internal server error.' });
});

if (NODE_ENV !== 'production' || !IS_VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
