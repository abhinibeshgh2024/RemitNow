/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Server, Mail, CheckCircle2, Globe, Shield, Lock, Info, Eye, EyeOff } from 'lucide-react';
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

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState(config.smtp?.host || '');
  const [smtpPort, setSmtpPort] = useState(config.smtp?.port || 587);
  const [smtpSecure, setSmtpSecure] = useState(config.smtp?.secure || false);
  const [smtpUser, setSmtpUser] = useState(config.smtp?.user || '');
  const [smtpPass, setSmtpPass] = useState(config.smtp?.pass || '');
  const [smtpSenderName, setSmtpSenderName] = useState(config.smtp?.senderName || 'RemitFlow Advice Dispatcher');
  const [smtpEnabled, setSmtpEnabled] = useState(config.smtp?.isEnabled || false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  useEffect(() => {
    setActiveEngine(config.activeEngine);
    setAutoRetryLimit(config.autoRetryLimit);
    setRetryDelaySeconds(config.retryDelaySeconds);
    if (config.smtp) {
      setSmtpHost(config.smtp.host || '');
      setSmtpPort(config.smtp.port || 587);
      setSmtpSecure(config.smtp.secure || false);
      setSmtpUser(config.smtp.user || '');
      setSmtpPass(config.smtp.pass || '');
      setSmtpSenderName(config.smtp.senderName || 'RemitFlow Advice Dispatcher');
      setSmtpEnabled(config.smtp.isEnabled || false);
    }
  }, [config]);

  const engines: { id: DeliveryEngineType; title: string; desc: string; badging: string }[] = [
    {
      id: 'Sandbox',
      title: 'Direct Background Send',
      desc: 'Transmits advice files silently. When SMTP Connection is Enabled, it fires real outgoing emails with A4 PDF attachments instantly to vendors.',
      badging: 'Real SMTP or Sandbox',
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
      senderEmail: config.senderEmail,
      autoRetryLimit,
      retryDelaySeconds,
      smtp: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465 ? true : smtpSecure,
        user: smtpUser,
        pass: smtpPass,
        senderName: smtpSenderName,
        isEnabled: smtpEnabled,
      },
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
          Configure how payment remittances are transmitted. Standard simulated servers, manual client share, and automatic SMTP transports are fully integrated.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Select active dispatcher */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
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

          {/* Interactive SMTP Connection Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-emerald-600" />
                <span>SMTP Outbound Server Config</span>
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer select-none" htmlFor="smtp-toggle">
                  {smtpEnabled ? 'Outbox Active' : 'Offline'}
                </label>
                <button
                  id="smtp-toggle"
                  onClick={() => setSmtpEnabled(!smtpEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    smtpEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      smtpEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When <strong>Direct Background Send</strong> is selected and the Outbox is enabled, RemitFlow will use these custom SMTP details to securely route your vendor notices with PDF attachments.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="smtp-inputs-grid">
              {/* Host */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                  disabled={!smtpEnabled}
                />
              </div>

              {/* Port */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Port
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                  disabled={!smtpEnabled}
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  SMTP Username / Authorized Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="finance@yourcompany.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                    disabled={!smtpEnabled}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  SMTP Password / Application Pass
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-9 pr-10 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                    disabled={!smtpEnabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                    disabled={!smtpEnabled}
                  >
                    {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Friendly Name */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Sender Display Name (Alias)
                </label>
                <input
                  type="text"
                  value={smtpSenderName}
                  onChange={(e) => setSmtpSenderName(e.target.value)}
                  placeholder="RemitFlow Finance Ops"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none"
                  disabled={!smtpEnabled}
                />
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-250 flex gap-2.5 text-xs text-slate-600">
              <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Using Personal Email Providers:</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  To send via Gmail, set the host to <code className="font-mono bg-slate-200 px-1 rounded">smtp.gmail.com</code> with port <code className="font-mono bg-slate-200 px-1 rounded">587</code>, and use a generated <strong>16-digit App Password</strong> rather than your standard account login.
                </p>
              </div>
            </div>
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
                Default Operator Address
              </label>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold font-mono">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{config.senderEmail}</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Remittances dispatch logs and standard prefilled templates are bound to <strong>{config.senderEmail}</strong>.
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
