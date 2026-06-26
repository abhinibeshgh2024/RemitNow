/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to handle base64 PDF attachments
  app.use(express.json({ limit: '15mb' }));

  // API 1: Fetch Server-side secrets configuration status (all set to false since API keys are removed)
  app.get('/api/config-status', (req, res) => {
    res.json({
      brevo: false,
      resend: false,
      sendgrid: false,
    });
  });

  // API 2: Proxy transactional email dispatches with PDF attachments
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, body, engine, simulateFail } = req.body;

    // Safety checks
    if (!to || !subject || !body || !engine) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters. Recipient, Subject, and Body are required.',
      });
    }

    // Direct Send Sandbox mode (No API keys required)
    if (simulateFail) {
      return res.status(503).json({
        success: false,
        error: 'Simulated Direct Send Failure: SMTP Connection timeout.',
      });
    }

    // Simulate standard network delay (800ms) for realistic visual feedback
    await new Promise((resolve) => setTimeout(resolve, 800));

    return res.json({
      success: true,
      message: `[Simulated Direct Send Success] Remittance advice successfully delivered to ${to} via sandbox container.`,
    });
  });

  // Mount Vite dev server in development, serve static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP Server] Running and ready on http://localhost:${PORT}`);
  });
}

startServer();
