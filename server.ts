/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to handle base64 PDF attachments
  app.use(express.json({ limit: '20mb' }));

  // API 1: Fetch Server-side secrets configuration status
  app.get('/api/config-status', (req, res) => {
    res.json({
      brevo: false,
      resend: false,
      sendgrid: false,
    });
  });

  // API 2: Proxy transactional email dispatches with PDF attachments
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, body, engine, pdfBase64, invoiceNumber, smtpConfig, simulateFail } = req.body;

    // Safety checks
    if (!to || !subject || !body || !engine) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters. Recipient, Subject, and Body are required.',
      });
    }

    // Direct Send Sandbox mode
    if (simulateFail) {
      return res.status(503).json({
        success: false,
        error: 'Simulated Direct Send Failure: SMTP Connection timeout.',
      });
    }

    // Check if the user supplied an active real SMTP configuration
    if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
      try {
        const port = parseInt(smtpConfig.port) || 587;
        const secure = smtpConfig.secure === true || port === 465;

        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: port,
          secure: secure,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          },
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          }
        });

        // Verify connection configuration
        await transporter.verify();

        const mailOptions: any = {
          from: `"${smtpConfig.senderName || 'RemitFlow Dispatcher'}" <${smtpConfig.user}>`,
          to: to,
          subject: subject,
          text: body,
          html: body.replace(/\n/g, '<br>'),
        };

        if (pdfBase64) {
          mailOptions.attachments = [
            {
              filename: `${invoiceNumber || 'Remittance_Advice'}.pdf`,
              content: pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf',
            }
          ];
        }

        const info = await transporter.sendMail(mailOptions);
        
        return res.json({
          success: true,
          message: `[Real Mail Sent] Remittance advice successfully delivered to ${to} (MessageID: ${info.messageId}).`,
        });

      } catch (err: any) {
        console.error('[SMTP Transport Error]', err);
        return res.status(502).json({
          success: false,
          error: `SMTP connection failed: ${err.message || err}. Check your host/port or application password settings.`,
        });
      }
    }

    // Standard simulation mode (with helpful fallback explanation)
    await new Promise((resolve) => setTimeout(resolve, 800));

    return res.json({
      success: true,
      message: `[Sandbox Simulated Success] Remittance advice prepared and simulated. To deliver real automated emails, activate the SMTP Outbox in Settings!`,
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
