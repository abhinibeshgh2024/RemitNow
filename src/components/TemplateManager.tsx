/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, RefreshCw, FileText, CheckCircle2, Copy } from 'lucide-react';
import { EmailTemplate, Vendor, Payment } from '../types';
import ConfirmationModal from './Modal';

interface TemplateManagerProps {
  template: EmailTemplate;
  onUpdateTemplate: (t: EmailTemplate) => void;
  onResetTemplate: () => void;
  sampleVendor?: Vendor;
  samplePayment?: Payment;
  currentUserEmail?: string;
}

export default function TemplateManager({
  template,
  onUpdateTemplate,
  onResetTemplate,
  sampleVendor,
  samplePayment,
  currentUserEmail,
}: TemplateManagerProps) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isSaved, setIsSaved] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Helper list of supported tokens
  const tokens = [
    { key: '{VendorName}', desc: 'The corporate name of the vendor (e.g. Acme Corporation)' },
    { key: '{InvoiceNumber}', desc: 'The reference number of the payment invoice (e.g. INV-2026-77A)' },
    { key: '{Amount}', desc: 'The cleared total formatted with currency (e.g. $12,450.00)' },
    { key: '{UTRNumber}', desc: 'The bank Unique Transaction Reference code (e.g. UTR-ACME-9081)' },
    { key: '{SenderEmail}', desc: `The accounts email originating the dispatch (${currentUserEmail || 'your-email@example.com'})` },
  ];

  // Substitute brackets to create live compiled preview
  const compileText = (text: string) => {
    if (!text) return '';
    let result = text;
    const vName = sampleVendor ? sampleVendor.name : 'Globex Industries';
    const vCurr = sampleVendor ? sampleVendor.currency : 'EUR';
    const pAmt = samplePayment ? samplePayment.amount : 98500.0;
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: vCurr,
    }).format(pAmt);

    const pInv = samplePayment ? samplePayment.invoiceNumber : 'INV-2026-088';
    const pUtr = samplePayment ? samplePayment.utrNumber : 'UTR-GLOB-33491102';

    result = result.replace(/{VendorName}/g, vName);
    result = result.replace(/{InvoiceNumber}/g, pInv);
    result = result.replace(/{Amount}/g, formattedAmount);
    result = result.replace(/{UTRNumber}/g, pUtr);
    result = result.replace(/{SenderEmail}/g, currentUserEmail || 'your-email@example.com');
    return result;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTemplate({ subject, body });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    onResetTemplate();
    setSubject(template.subject);
    setBody(template.body);
    setIsSaved(false);
  };

  const handleTokenClick = (tokenKey: string) => {
    // Basic copy to clipboard
    navigator.clipboard.writeText(tokenKey);
  };

  return (
    <div className="space-y-6" id="template-manager-root">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notification Advice Templating</h2>
        <p className="text-sm text-slate-500">
          Tailor vendor email Subject and Body layouts. Standardize communications with dynamic metadata brackets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-indigo-500" />
              <span>Email Template Settings</span>
            </h3>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Reset to Factory Layout"
              id="btn-reset-template"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Layout</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Subject field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Subject Layout
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all font-medium text-slate-800"
                placeholder="Remittance Advice for Invoice {InvoiceNumber}"
                id="template-subject-input"
              />
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Body Plain Text Layout
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all font-mono leading-relaxed text-slate-700 resize-y"
                placeholder="Dear {VendorName}, ..."
                id="template-body-textarea"
              />
            </div>

            {/* Action Save button with status highlights */}
            <div className="flex items-center justify-between pt-2">
              {isSaved ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100/30">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Template saved successfully!</span>
                </span>
              ) : (
                <div />
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
                id="btn-save-template"
              >
                Save Template Layout
              </button>
            </div>
          </form>

          {/* Bracket legend panel */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Dynamic Metadata Legend (Click to copy)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tokens.map((token) => (
                <button
                  key={token.key}
                  onClick={() => handleTokenClick(token.key)}
                  type="button"
                  className="flex items-start text-left gap-2 p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100/30 transition-all text-xs cursor-pointer group"
                  id={`token-btn-${token.key.replace(/[{}]/g, '')}`}
                >
                  <code className="text-indigo-600 font-bold font-mono shrink-0 select-all group-hover:underline">
                    {token.key}
                  </code>
                  <span className="text-slate-400 text-[10.5px] leading-relaxed">
                    {token.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Compile Preview Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full min-h-[480px]">
            {/* Top graphic layer */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Mail className="h-48 w-48 text-white" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="text-xs font-mono tracking-wider text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Interactive Compiled Output Preview</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded uppercase font-mono">
                  SMTP Enriched
                </span>
              </div>

              {/* Sender & Recipient Metadata */}
              <div className="space-y-2 bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-xs font-mono leading-relaxed">
                <div>
                  <span className="text-slate-500">From: </span>
                  <span className="text-indigo-400 font-semibold">{currentUserEmail || 'your-email@example.com'}</span>
                </div>
                <div>
                  <span className="text-slate-500">To:   </span>
                  <span className="text-indigo-400 font-semibold">
                    {sampleVendor ? `${sampleVendor.email}` : 'vendor-relations@globex.co'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-slate-500">Subject: </span>
                  <span className="text-slate-200 font-medium">
                    {compileText(subject) || '(Empty Subject)'}
                  </span>
                </div>
              </div>

              {/* Body Content Preview Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[12px] font-mono leading-relaxed whitespace-pre-wrap text-slate-300 overflow-y-auto max-h-[300px]">
                {compileText(body) || '(Empty Body)'}
              </div>

              {/* Simulated PDF Attachment Badge */}
              <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-800 text-xs">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-slate-200 truncate">
                    Remittance_Advice_{samplePayment ? samplePayment.invoiceNumber : 'INV-2026-088'}.pdf
                  </h5>
                  <p className="text-[10px] text-slate-500">
                    Compiled A4 PDF document • Standard attachments
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 font-mono mt-4 pt-4 border-t border-slate-800/40">
              * The values of the preview are compiled dynamically from your active inputs using the currently selected sample record.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Reset */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="Reset Template to Factory Defaults"
        message="Are you sure you want to revert all customizations? Any custom Subject patterns or bracket text bodies will be overwritten with the standard accounting format."
        confirmText="Revert to Defaults"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
