/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Server, Mail, CheckCircle2 } from 'lucide-react';
import { DeliveryEngineConfig, DeliveryEngineType } from '../types';

interface EngineConfigProps {
  config: DeliveryEngineConfig;
  onUpdateConfig: (c: DeliveryEngineConfig) => void;
}

export default function EngineConfig({
  config,
  onUpdateConfig,
}: EngineConfigProps) {
  const [activeEngine, setActiveEngine] = useState<DeliveryEngineType>(config.activeEngine);
  const [autoRetryLimit, setAutoRetryLimit] = useState(config.autoRetryLimit);
  const [retryDelaySeconds, setRetryDelaySeconds] = useState(config.retryDelaySeconds);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setActiveEngine(config.activeEngine);
    setAutoRetryLimit(config.autoRetryLimit);
    setRetryDelaySeconds(config.retryDelaySeconds);
  }, [config]);

  const engines: { id: DeliveryEngineType; title: string; desc: string; badging: string }[] = [
    {
      id: 'Sandbox',
      title: 'Direct Send (Simulated)',
      desc: 'Simulates direct background transmission instantly. Perfect for demonstrating full payment reconciliation, status auditing, and retry triggers completely local and secure.',
      badging: 'Ready & Standalone',
    },
    {
      id: 'Native Share',
      title: 'Native Share (Manual Client)',
      desc: 'Compiles payment details and launches your local email application (such as Gmail, Outlook, or Mail) pre-filled with formatted templates, alongside direct PDF downloads.',
      badging: 'Zero Configuration',
    },
  ];

  const handleSave = () => {
    onUpdateConfig({
      activeEngine,
      senderEmail: 'joseon359@gmail.com', // Enforced sender
      autoRetryLimit,
      retryDelaySeconds,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6" id="engine-config-root">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Email Dispatch Delivery Engines</h2>
        <p className="text-sm text-slate-500">
          Configure how payment remittances are transmitted. Standard simulated servers and native pre-filled mail clients are configured out-of-the-box with zero setup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Select active dispatcher */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
            <Server className="h-4.5 w-4.5 text-indigo-600" />
            <span>Active Sending Mode Selection</span>
          </h3>

          <div className="space-y-3.5" id="engine-options-list">
            {engines.map((engine) => {
              const isSelected = activeEngine === engine.id;

              return (
                <div
                  key={engine.id}
                  onClick={() => setActiveEngine(engine.id)}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-500/80'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                  id={`engine-option-${engine.id}`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
                        {engine.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600 border border-slate-200">
                        {engine.badging}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {engine.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Security & Configurations */}
        <div className="lg:col-span-5 space-y-6">
          {/* General Config parameters card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings className="h-4.5 w-4.5 text-indigo-600" />
              <span>Retry & Sender Parameters</span>
            </h3>

            {/* Sender Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Sender Email Address (Enforced)
              </label>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold font-mono">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>joseon359@gmail.com</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Remittances dispatch logs and prefilled envelopes are strictly bound to <strong>joseon359@gmail.com</strong>.
              </p>
            </div>

            {/* Auto Retry Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Automated Retry Limit
                </label>
                <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {autoRetryLimit} attempts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={autoRetryLimit}
                onChange={(e) => setAutoRetryLimit(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-150 rounded-lg appearance-none"
                id="retry-limit-range"
              />
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                If simulated transmission fails, the scheduler triggers automated retries up to this threshold.
              </p>
            </div>

            {/* Retry Interval */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Retry Countdown Interval
                </label>
                <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {retryDelaySeconds} seconds
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={retryDelaySeconds}
                onChange={(e) => setRetryDelaySeconds(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-150 rounded-lg appearance-none"
                id="retry-delay-range"
              />
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Cool-down delay between failure and the next retry (perfect for watching the automated queue countdown).
              </p>
            </div>
          </div>

          {/* Save Action Card */}
          <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl border border-slate-200">
            {isSaved ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4 animate-bounce" />
                <span>Configs saved!</span>
              </span>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium font-mono uppercase">Local State Saved</div>
            )}
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer transition-colors"
              id="btn-save-configs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
