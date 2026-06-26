/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Mail, ShieldAlert, CheckCircle, XCircle, Search, Trash2, Calendar, RefreshCw } from 'lucide-react';
import { EmailLog } from '../types';
import ConfirmationModal from './Modal';

interface AuditLogsProps {
  logs: EmailLog[];
  onClearLogs: () => void;
  onManualRetryLog: (log: EmailLog) => Promise<void>;
}

export default function AuditLogs({ logs, onClearLogs, onManualRetryLog }: AuditLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Search logic
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.vendorCode.toLowerCase().includes(q) ||
        log.vendorName.toLowerCase().includes(q) ||
        log.recipientEmail.toLowerCase().includes(q) ||
        log.invoiceNumber.toLowerCase().includes(q) ||
        log.feedback.toLowerCase().includes(q) ||
        log.engine.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter((l) => l.status === 'Success').length;
    const failures = logs.filter((l) => l.status === 'Failed').length;
    return { total, successes, failures };
  }, [logs]);

  const handleManualRetryClick = async (log: EmailLog) => {
    setRetryingLogId(log.id);
    try {
      await onManualRetryLog(log);
    } catch (e) {
      console.error(e);
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <div className="space-y-6" id="audit-logs-root">
      {/* Top Header Control Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Delivery Audit Trails & Logs</h2>
          <p className="text-sm text-slate-500">
            A centralized, immutable ledger tracking all dispatch attempts, transmission payloads, engine modes, and delivery reports.
          </p>
        </div>
        <button
          onClick={() => setIsWipeConfirmOpen(true)}
          disabled={logs.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-3 border border-rose-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 font-semibold text-xs rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          id="btn-wipe-audit-logs"
        >
          <Trash2 className="h-4 w-4" />
          <span>Wipe Audit Ledger</span>
        </button>
      </div>

      {/* Stats Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/60 flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-500 rounded-2xl">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Attempts Logs</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/60 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Successful Deliveries</span>
            <span className="text-xl font-black text-emerald-600 font-mono">{stats.successes}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/60 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Failed Dispatches</span>
            <span className="text-xl font-black text-rose-600 font-mono">{stats.failures}</span>
          </div>
        </div>
      </div>

      {/* Query input and Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden" id="audit-table-container">
        <div className="p-5 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter audits by invoice, vendor, mailbox or feedback status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-full text-xs outline-none transition-all"
              id="audit-search-input"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Invoice</th>
                <th className="py-4 px-6">Recipient Partner / Box</th>
                <th className="py-4 px-6">Engine Mode</th>
                <th className="py-4 px-6">Report Status</th>
                <th className="py-4 px-6">Attempts</th>
                <th className="py-4 px-6">Detailed Response / Feedback</th>
                <th className="py-4 px-6 text-center">Retry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No audit records found matching query</p>
                      <p className="text-[11px] text-slate-400">
                        Dispatch a payment advice notification to record an activity trail.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...filteredLogs].reverse().map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/40 transition-colors"
                    id={`log-row-${log.id}`}
                  >
                    {/* Timestamp */}
                    <td className="py-4 px-6 whitespace-nowrap text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Invoice */}
                    <td className="py-4 px-6 font-bold font-mono text-slate-900">
                      {log.invoiceNumber}
                    </td>

                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-slate-800">{log.vendorName}</h5>
                        <p className="text-[10px] text-indigo-600 font-mono">{log.recipientEmail}</p>
                      </div>
                    </td>

                    {/* Engine */}
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/50 rounded font-mono font-bold text-[9.5px]">
                        {log.engine}
                      </span>
                    </td>

                    {/* Report Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9.5px] uppercase border ${
                          log.status === 'Success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}
                      >
                        {log.status === 'Success' ? (
                          <CheckCircle className="h-3 w-3 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0" />
                        )}
                        <span>{log.status}</span>
                      </span>
                    </td>

                    {/* Retry Count */}
                    <td className="py-4 px-6 text-center font-mono font-semibold">
                      {log.retryAttempt}
                    </td>

                    {/* Feedback report description */}
                    <td className="py-4 px-6 max-w-[220px] truncate font-medium text-slate-500" title={log.feedback}>
                      {log.feedback}
                    </td>

                    {/* Manual retry button */}
                    <td className="py-4 px-6 text-center">
                      {log.status === 'Failed' ? (
                        <button
                          onClick={() => handleManualRetryClick(log)}
                          disabled={retryingLogId === log.id}
                          className="flex items-center justify-center gap-1 mx-auto px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-100/40 cursor-pointer transition-all disabled:opacity-55"
                          id={`btn-manual-retry-log-${log.id}`}
                        >
                          <RefreshCw className={`h-3 w-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                          <span>{retryingLogId === log.id ? 'Retrying...' : 'Manual Retry'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/10">
                          Dispatched
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Safeguard Modal */}
      <ConfirmationModal
        isOpen={isWipeConfirmOpen}
        onClose={() => setIsWipeConfirmOpen(false)}
        onConfirm={onClearLogs}
        title="Flush Audit Ledger"
        message="Are you sure you want to permanently clear the communication audit log? This is an irreversible operation and will erase all electronic reports of vendor remittance deliveries."
        confirmText="Confirm Wipe"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
