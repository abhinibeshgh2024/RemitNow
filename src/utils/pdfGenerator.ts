/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Payment, Vendor } from '../types';

export function generateRemittancePDF(
  payment: Payment,
  vendor: Vendor,
  outputMode: 'download' | 'bloburl' | 'base64' = 'bloburl'
): string | null {
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Fonts and styling configurations
  const marginX = 15;
  let currentY = 15;

  // 1. Header Banner Panel (Slate-800 background)
  doc.setFillColor(30, 41, 59); // Deep Slate
  doc.rect(marginX, currentY, 180, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PAYMENT REMITTANCE ADVICE', marginX + 8, currentY + 15);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Accounts Payable', marginX + 135, currentY + 11);
  doc.text('joseon359@gmail.com', marginX + 135, currentY + 16);

  currentY += 34; // Advance cursor past header

  // 2. Metadata Columns (Remittance date & UTR on left, Issuer info on right)
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DISPATCHED FROM:', marginX, currentY);
  doc.text('PAYMENT TO:', marginX + 90, currentY);

  currentY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // slate-600

  // Left side - Issuer
  doc.text('Accounts Operations', marginX, currentY);
  doc.text('Email: joseon359@gmail.com', marginX, currentY + 4.5);
  doc.text('Status: Cleared via Bank', marginX, currentY + 9);

  // Right side - Vendor Payee Details
  doc.text(vendor.name, marginX + 90, currentY);
  doc.text(`Vendor Code: ${vendor.code}`, marginX + 90, currentY + 4.5);
  doc.text(`Email: ${vendor.email}`, marginX + 90, currentY + 9);
  doc.text(`Phone: ${vendor.phone}`, marginX + 90, currentY + 13.5);
  doc.text(`Attn: ${vendor.contactPerson}`, marginX + 90, currentY + 18);

  currentY += 28;

  // 3. Gray Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, marginX + 180, currentY);

  currentY += 8;

  // 4. Summary Highlight Card (Light slate background)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(marginX, currentY, 180, 20, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(marginX, currentY, 180, 20, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAYMENT SUMMARY', marginX + 5, currentY + 7);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Transaction Reference (UTR): ${payment.utrNumber}`, marginX + 5, currentY + 13);

  // Big Cleared Amount Callout in the highlight card
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: vendor.currency,
  }).format(payment.amount);

  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(formattedAmount, marginX + 125, currentY + 12);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('Helvetica', 'normal');
  doc.text('TOTAL CLEARED AMOUNT', marginX + 125, currentY + 6);

  currentY += 30;

  // 5. Granular Invoice Breakdown Grid (Table)
  doc.setFillColor(30, 41, 59); // Header dark slate background
  doc.rect(marginX, currentY, 180, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Invoice Number', marginX + 4, currentY + 5.5);
  doc.text('Billing Date', marginX + 45, currentY + 5.5);
  doc.text('Unique Transaction ID (UTR)', marginX + 80, currentY + 5.5);
  doc.text('Currency', marginX + 135, currentY + 5.5);
  doc.text('Cleared Amount', marginX + 155, currentY + 5.5);

  currentY += 8;

  // Single dynamic payment row
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, 180, 10, 'F');
  // Border below row
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY + 10, marginX + 180, currentY + 10);

  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(payment.invoiceNumber, marginX + 4, currentY + 6.5);
  doc.text(payment.paymentDate, marginX + 45, currentY + 6.5);
  doc.text(payment.utrNumber, marginX + 80, currentY + 6.5);
  doc.text(vendor.currency, marginX + 135, currentY + 6.5);
  doc.text(formattedAmount, marginX + 155, currentY + 6.5);

  currentY += 24;

  // 6. Professional Declarations & Terms
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('IMPORTANT NOTIFICATION & SUPPORT INFO', marginX, currentY);

  currentY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const declarationText = [
    `1. This document serves as formal advice that the specified amount has been dispatched to your registered financial institution.`,
    `2. Processing and clearing intervals may vary based on intermediary banking clearing systems and localized regional clearing rules.`,
    `3. If payment discrepancies exist, please escalate within 5 business days with details referencing UTR Number ${payment.utrNumber}.`,
    `4. Registered notification channels: This advice is electronically compiled and delivered to ${vendor.email}.`,
  ];

  declarationText.forEach((line) => {
    doc.text(line, marginX, currentY);
    currentY += 4.5;
  });

  // 7. Footer Seal (Stays bottom of A4 page)
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, footerY, marginX + 180, footerY);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Vendor Remittance & Payment Advice Dispatcher Platform - Confirmed Banking Settlement Document', marginX, footerY + 5);
  doc.text('This is an automated securely compiled financial advice statement. For queries, contact joseon359@gmail.com.', marginX, footerY + 9);

  if (outputMode === 'download') {
    doc.save(`Remittance_Advice_${payment.invoiceNumber}.pdf`);
    return null;
  }

  if (outputMode === 'base64') {
    try {
      const dataUri = doc.output('datauristring');
      return dataUri.split(',')[1] || '';
    } catch (e) {
      console.error('Error generating PDF Base64:', e);
      return null;
    }
  }

  // Return Blob URL for preview frame/iframe display
  try {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error generating PDF Blob URL:', e);
    return null;
  }
}
