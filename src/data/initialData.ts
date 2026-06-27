/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vendor, Payment, EmailTemplate, DeliveryEngineConfig } from '../types';

export const DEFAULT_VENDORS: Vendor[] = [];

export const DEFAULT_PAYMENTS: Payment[] = [];

export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Remittance Advice: Payment cleared for Invoice {InvoiceNumber}',
  body: `Dear {VendorName},

We are pleased to inform you that a payment of {Amount} has been cleared in your account.

Payment Remittance Breakdown:
--------------------------------------------------
Invoice Number   : {InvoiceNumber}
Cleared Amount   : {Amount}
Reference (UTR)  : {UTRNumber}
Dispatched From  : {SenderEmail}
--------------------------------------------------

A detailed A4 Remittance Advice PDF has been generated and is attached to this notification.

Please review the details and feel free to reach out to our Accounts Payable team at {SenderEmail} for any inquiries.

Best Regards,
Finance Operations Team`,
};

export const DEFAULT_ENGINE_CONFIG: DeliveryEngineConfig = {
  activeEngine: 'Sandbox',
  senderEmail: '',
  autoRetryLimit: 3,
  retryDelaySeconds: 5, // 5 seconds for visual feedback
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderName: 'RemitFlow Advice Dispatcher',
    isEnabled: false,
  },
  apiKeyConfig: {
    provider: 'Resend',
    apiKey: '',
    senderEmail: '',
    senderName: 'RemitFlow Advice Dispatcher',
    isEnabled: false,
  },
};
