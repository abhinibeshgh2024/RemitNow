/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vendor {
  code: string; // Unique identifier, e.g., VEND001
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  currency: string; // USD, EUR, INR, GBP, etc.
  createdBy?: string;
}

export type PaymentStatus = 'Unprocessed' | 'In Progress' | 'Delivered' | 'Failed';

export interface Payment {
  id: string;
  invoiceNumber: string;
  vendorCode: string; // Foreign key matching Vendor.code
  amount: number;
  utrNumber: string; // Unique Transaction Reference
  paymentDate: string; // YYYY-MM-DD
  status: PaymentStatus;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  lastAttempted?: string;
  senderEmail?: string;
  createdBy?: string;
}

export type DeliveryEngineType = 'Sandbox' | 'Native Share';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  isEnabled: boolean;
}

export interface DeliveryEngineConfig {
  activeEngine: DeliveryEngineType;
  senderEmail: string;
  autoRetryLimit: number;
  retryDelaySeconds: number; // For demo/offline visual countdowns
  smtp?: SmtpConfig;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  paymentId: string;
  invoiceNumber: string;
  vendorCode: string;
  vendorName: string;
  recipientEmail: string;
  senderEmail: string;
  engine: DeliveryEngineType;
  status: 'Success' | 'Failed';
  feedback: string;
  retryAttempt: number;
  createdBy?: string;
}
