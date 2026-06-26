/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vendor, Payment, EmailTemplate, DeliveryEngineConfig } from '../types';

export const DEFAULT_VENDORS: Vendor[] = [
  {
    code: 'VEND-ACME',
    name: 'Acme Corporation',
    email: 'accounts@acme.corp',
    phone: '+1 (555) 019-2834',
    contactPerson: 'Wile E. Coyote',
    currency: 'USD',
  },
  {
    code: 'VEND-GLOBE',
    name: 'Globex Industries',
    email: 'vendor-relations@globex.co',
    phone: '+1 (555) 030-4592',
    contactPerson: 'Hank Scorpio',
    currency: 'EUR',
  },
  {
    code: 'VEND-INITECH',
    name: 'Initech LLC',
    email: 'ap-billing@initech.net',
    phone: '+1 (555) 014-8833',
    contactPerson: 'Peter Gibbons',
    currency: 'USD',
  },
  {
    code: 'VEND-HULI',
    name: 'Huli Systems Ltd',
    email: 'finance@huli.io',
    phone: '+44 20 7946 0958',
    contactPerson: 'Gavin Belson',
    currency: 'GBP',
  },
  {
    code: 'VEND-STARK',
    name: 'Stark Industries',
    email: 'remittance@stark.com',
    phone: '+1 (555) 010-0042',
    contactPerson: 'Pepper Potts',
    currency: 'INR',
  },
];

export const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 'pay-101',
    invoiceNumber: 'INV-2026-77A',
    vendorCode: 'VEND-ACME',
    amount: 12450.00,
    utrNumber: 'UTR-ACME-90812749',
    paymentDate: '2026-06-15',
    status: 'Unprocessed',
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'pay-102',
    invoiceNumber: 'INV-2026-088',
    vendorCode: 'VEND-GLOBE',
    amount: 98500.00,
    utrNumber: 'UTR-GLOB-33491102',
    paymentDate: '2026-06-18',
    status: 'Delivered',
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'pay-103',
    invoiceNumber: 'INV-2026-121',
    vendorCode: 'VEND-INITECH',
    amount: 1500.00,
    utrNumber: 'UTR-INIT-77621184',
    paymentDate: '2026-06-20',
    status: 'Failed',
    retryCount: 3,
    maxRetries: 3,
    failureReason: 'Connection timed out (SMTP Port 587)',
  },
  {
    id: 'pay-104',
    invoiceNumber: 'INV-2026-34B',
    vendorCode: 'VEND-HULI',
    amount: 45000.00,
    utrNumber: 'UTR-HULI-11223344',
    paymentDate: '2026-06-22',
    status: 'Unprocessed',
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'pay-105',
    invoiceNumber: 'INV-2026-901',
    vendorCode: 'VEND-STARK',
    amount: 1850000.00,
    utrNumber: 'UTR-STRK-00770011',
    paymentDate: '2026-06-25',
    status: 'Unprocessed',
    retryCount: 0,
    maxRetries: 3,
  },
];

export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Remittance Advice: Payment cleared for Invoice {InvoiceNumber}',
  body: `Dear {VendorName},

We are pleased to inform you that a payment of {Amount} has been cleared in your account.

Payment Remittance Breakdown:
--------------------------------------------------
Invoice Number   : {InvoiceNumber}
Cleared Amount   : {Amount}
Reference (UTR)  : {UTRNumber}
Dispatched From  : joseon359@gmail.com
--------------------------------------------------

A detailed A4 Remittance Advice PDF has been generated and is attached to this notification.

Please review the details and feel free to reach out to our Accounts Payable team at joseon359@gmail.com for any inquiries.

Best Regards,
Finance Operations Team
joseon359@gmail.com`,
};

export const DEFAULT_ENGINE_CONFIG: DeliveryEngineConfig = {
  activeEngine: 'Sandbox',
  senderEmail: 'joseon359@gmail.com',
  autoRetryLimit: 3,
  retryDelaySeconds: 5, // 5 seconds for visual feedback, ideal for demo
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderName: 'RemitFlow Advice Dispatcher',
    isEnabled: false,
  },
};
