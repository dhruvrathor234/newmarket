import express from 'express';
import { app } from './app';

// Local dev entry (`npm run dev`). Vite is imported here — and ONLY here — so
// the production serverless bundle on Vercel never contains it.
async function main() {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  // Global error handler (dev)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: err?.message || 'Internal server error.' });
  });

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('[Dev server failed to start]', err);
  process.exit(1);
});
