/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Play, Ban, Timer, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export interface RetryTask {
  paymentId: string;
  invoiceNumber: string;
  vendorName: string;
  recipientEmail: string;
  countdown: number;
  attempt: number;
  maxRetries: number;
  lastFailure: string;
}

interface RetryQueueProps {
  tasks: RetryTask[];
  onForceRetry: (paymentId: string) => void;
  onCancelRetry: (paymentId: string) => void;
  retryDelaySeconds: number;
}

export default function RetryQueue({ tasks, onForceRetry, onCancelRetry, retryDelaySeconds }: RetryQueueProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center py-12" id="retry-queue-empty">
        <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Retry Queue Clear</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          No automated background retries are scheduled. All payment advices have either delivered successfully or cleared their workflows.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4" id="retry-queue-root">
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
            <RefreshCw className="h-4.5 w-4.5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Automated Retry Scheduler</h3>
            <p className="text-[11px] text-slate-400">Live monitoring of background re-dispatch counters.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold font-mono bg-amber-500 text-white px-2.5 py-1 rounded-full">
          {tasks.length} Pending Retry
        </span>
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {tasks.map((task) => {
          const progressPercent = Math.max(0, Math.min(100, (task.countdown / retryDelaySeconds) * 100));

          return (
            <div
              key={task.paymentId}
              className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50"
              id={`retry-task-row-${task.paymentId}`}
            >
              {/* Task info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-amber-50 border border-amber-100 text-amber-500 rounded-xl shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold font-mono text-slate-900">{task.invoiceNumber}</span>
                    <span className="text-[10px] font-semibold text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-700 truncate">{task.vendorName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Mail: {task.recipientEmail}</p>
                  <p className="text-[10px] text-rose-500 font-medium font-mono leading-relaxed truncate" title={task.lastFailure}>
                    Last Err: {task.lastFailure}
                  </p>
                </div>
              </div>

              {/* Progress and Actions */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                {/* Visual Timer Countdown */}
                <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-100 shadow-xs">
                  <Timer className="h-4 w-4 text-amber-500 animate-pulse" />
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 font-mono">{task.countdown}s</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Attempt {task.attempt} / {task.maxRetries}
                    </span>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onForceRetry(task.paymentId)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all cursor-pointer"
                    title="Force Immediate Dispatch"
                    id={`btn-force-retry-${task.paymentId}`}
                  >
                    <Play className="h-4 w-4 fill-indigo-700 stroke-none" />
                  </button>
                  <button
                    onClick={() => onCancelRetry(task.paymentId)}
                    className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                    title="Cancel Retry & Fail Payment"
                    id={`btn-cancel-retry-${task.paymentId}`}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
