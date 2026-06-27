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
  serverKeys?: {
    smtpConfigured: boolean;
    smtpUser: string;
    smtpHost: string;
    smtpPort: string;
  };
}

export default function EngineConfig({
  config,
  onUpdateConfig,
  serverKeys,
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
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(config.smtp?.isEnabled || false);

  // API Key Settings State
  const [apiProvider, setApiProvider] = useState<'Resend' | 'SendGrid' | 'Sandbox/Mock Bypass'>(config.apiKeyConfig?.provider || 'Resend');
  const [apiKey, setApiKey] = useState(config.apiKeyConfig?.apiKey || '');
  const [apiSenderEmail, setApiSenderEmail] = useState(config.apiKeyConfig?.senderEmail || '');
  const [apiSenderName, setApiSenderName] = useState(config.apiKeyConfig?.senderName || 'RemitFlow Advice Dispatcher');
  const [apiEnabled, setApiEnabled] = useState(config.apiKeyConfig?.isEnabled || false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvancedApi, setShowAdvancedApi] = useState(config.apiKeyConfig?.isEnabled || false);

  // Diagnostic SMTP testing state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Diagnostic API Key testing state
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [apiTestMessage, setApiTestMessage] = useState('');

  const handleTestSmtp = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      // Determine if testing custom UI values or system environment values
      const isUsingServerEnv = !smtpHost && !smtpUser && serverKeys?.smtpConfigured;
      
      const payload = {
        host: isUsingServerEnv ? serverKeys.smtpHost : smtpHost,
        port: isUsingServerEnv ? parseInt(serverKeys.smtpPort) || 587 : smtpPort,
        secure: isUsingServerEnv ? (serverKeys.smtpPort === '465') : smtpSecure,
        user: isUsingServerEnv ? serverKeys.smtpUser : smtpUser,
        pass: isUsingServerEnv ? 'env' : smtpPass,
      };

      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        const snippet = text.length > 250 ? text.substring(0, 250) + '...' : text;
        throw new Error(`The server returned an unexpected response format (${res.status}): ${snippet}`);
      }

      if (res.ok && data.success) {
        setTestStatus('success');
        setTestMessage(data.message || 'SMTP Handshake verified successfully!');
      } else {
        setTestStatus('failed');
        setTestMessage(data.error || 'SMTP Authentication rejected by outbound host.');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(err.message || 'Express gateway timeout or network failure.');
    }
  };

  const handleTestApiKey = async () => {
    setApiTestStatus('testing');
    setApiTestMessage('');
    try {
      const payload = {
        provider: apiProvider,
        apiKey: apiKey,
        senderEmail: apiSenderEmail || config.senderEmail,
        senderName: apiSenderName,
      };

      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        const snippet = text.length > 250 ? text.substring(0, 250) + '...' : text;
        throw new Error(`The server returned an unexpected response format (${res.status}): ${snippet}`);
      }

      if (res.ok && data.success) {
        setApiTestStatus('success');
        setApiTestMessage(data.message || 'API Key verified successfully!');
      } else {
        setApiTestStatus('failed');
        setApiTestMessage(data.error || 'API Key verification failed.');
      }
    } catch (err: any) {
      setApiTestStatus('failed');
      setApiTestMessage(err.message || 'Express gateway timeout or network failure.');
    }
  };

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
    if (config.apiKeyConfig) {
      setApiProvider(config.apiKeyConfig.provider || 'Resend');
      setApiKey(config.apiKeyConfig.apiKey || '');
      setApiSenderEmail(config.apiKeyConfig.senderEmail || '');
      setApiSenderName(config.apiKeyConfig.senderName || 'RemitFlow Advice Dispatcher');
      setApiEnabled(config.apiKeyConfig.isEnabled || false);
    }
  }, [config]);

  const engines: { id: DeliveryEngineType; title: string; desc: string; badging: string }[] = [
    {
      id: 'Sandbox',
      title: 'Direct Background Send',
      desc: 'Transmits advice files silently. When SMTP or modern API Delivery is configured and enabled, it fires real outgoing emails with A4 PDF attachments instantly.',
      badging: 'Real Outbox, API, or Sandbox',
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
      apiKeyConfig: {
        provider: apiProvider,
        apiKey: apiKey,
        senderEmail: apiSenderEmail,
        senderName: apiSenderName,
        isEnabled: apiEnabled,
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

          {/* Automated Zero-Configuration Dispatch Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-emerald-600" />
                <span>Background Delivery Status</span>
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
                Active & Ready
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Your <strong>Direct Background Send</strong> engine is active! Remittance advice sheets, payment updates, and PDF documents are automatically dispatched securely to your vendor's email address in real time.
              </p>

              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  <span>Zero-Configuration Delivery Enabled</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  No SMTP credentials or complicated outbound configurations are required. RemitFlow routes your transactional payment dispatches instantly through the integrated cloud relay gateway.
                </p>
              </div>

              {/* Collapsible Trigger button for advanced manual SMTP override */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span>{showAdvancedSmtp ? 'Hide Advanced SMTP Configuration (Optional) ▴' : 'Configure Custom SMTP Mail Server (Optional) ▾'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedApi(!showAdvancedApi)}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer select-none sm:border-l sm:border-slate-200 sm:pl-3"
                >
                  <span>{showAdvancedApi ? 'Hide API Key SMTP Bypass (Optional) ▴' : 'Configure API Key SMTP Bypass (Optional) ▾'}</span>
                </button>
              </div>
            </div>

            {showAdvancedSmtp && (
              <div className="pt-4 border-t border-slate-100 space-y-5" id="advanced-smtp-options">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Custom SMTP Server Outbox</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer" htmlFor="smtp-toggle">
                      {smtpEnabled ? 'Custom Outbox Enabled' : 'Disabled'}
                    </label>
                    <button
                      id="smtp-toggle"
                      onClick={() => setSmtpEnabled(!smtpEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        smtpEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          smtpEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  If you prefer to bypass the cloud relay and route notices through your own server (e.g. corporate mail, custom Outlook, G Suite), enable the toggle above and provide credentials below.
                </p>

                {serverKeys?.smtpConfigured && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">System-wide Outbox Ready</h4>
                      <p className="text-[11px] text-emerald-700 font-medium leading-normal">
                        A secure outbound mail server has been configured on the backend at <strong className="font-mono bg-emerald-100/60 px-1 rounded text-emerald-800">{serverKeys.smtpHost}:{serverKeys.smtpPort}</strong> authorized for <strong className="font-mono bg-emerald-100/60 px-1 rounded text-emerald-800">{serverKeys.smtpUser}</strong>.
                      </p>
                    </div>
                  </div>
                )}

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

                {/* SMTP Diagnostics Test Connection */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      SMTP Handshake Diagnostics
                    </span>
                    <button
                      type="button"
                      onClick={handleTestSmtp}
                      disabled={testStatus === 'testing' || (!smtpEnabled && !serverKeys?.smtpConfigured)}
                      className="px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer"
                    >
                      {testStatus === 'testing' ? 'Handshaking...' : 'Verify Transport'}
                    </button>
                  </div>

                  {testStatus !== 'idle' && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs leading-normal transition-all ${
                        testStatus === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-rose-50 border-rose-200 text-rose-800 font-mono text-[11px]'
                      }`}
                    >
                      {testStatus === 'success' ? (
                        <p className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{testMessage}</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-black uppercase tracking-wide text-rose-950">Handshake Rejected</p>
                          <p className="font-normal text-rose-800">{testMessage}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showAdvancedApi && (
              <div className="pt-4 border-t border-slate-100 space-y-5" id="advanced-api-options">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Modern API Outbound (Bypass)</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer" htmlFor="api-toggle">
                      {apiEnabled ? 'API Bypass Active' : 'Disabled'}
                    </label>
                    <button
                      id="api-toggle"
                      onClick={() => {
                        const nextVal = !apiEnabled;
                        setApiEnabled(nextVal);
                        if (nextVal) {
                          // Disable SMTP if API key is active to avoid confusion
                          setSmtpEnabled(false);
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        apiEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          apiEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  If SMTP servers are experiencing connection/handshake errors, route all transactional batch email dispatches directly via a modern HTTPS provider API.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="api-inputs-grid">
                  {/* Provider Selection */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      API Provider
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Resend', 'SendGrid', 'Sandbox/Mock Bypass'].map((providerName) => {
                        const isSelected = apiProvider === providerName;
                        return (
                          <button
                            key={providerName}
                            type="button"
                            onClick={() => setApiProvider(providerName as any)}
                            disabled={!apiEnabled}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
                            }`}
                          >
                            {providerName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {apiProvider} API Key
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={apiProvider === 'Sandbox/Mock Bypass' ? 'e.g. mock_key_bypass' : 're_12345678 or SG.xxxxxxxx'}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl pl-9 pr-10 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                        disabled={!apiEnabled}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                        disabled={!apiEnabled}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Verified Sender Email */}
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Verified Sender Email
                    </label>
                    <input
                      type="email"
                      value={apiSenderEmail}
                      onChange={(e) => setApiSenderEmail(e.target.value)}
                      placeholder="e.g. onboarding@resend.dev"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-400 font-mono text-slate-800 focus:outline-none"
                      disabled={!apiEnabled}
                    />
                  </div>

                  {/* Sender Name Alias */}
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Sender Name Alias
                    </label>
                    <input
                      type="text"
                      value={apiSenderName}
                      onChange={(e) => setApiSenderName(e.target.value)}
                      placeholder="RemitFlow Advice Dispatcher"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none"
                      disabled={!apiEnabled}
                    />
                  </div>
                </div>

                {/* Hint Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-250 flex gap-2.5 text-xs text-slate-600">
                  <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Domain verification notes:</p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      For providers like Resend or SendGrid, the <strong>Verified Sender Email</strong> must match a domain you have fully verified with DKIM records in your provider's dashboard, otherwise outgoing bulk dispatches will fail.
                    </p>
                  </div>
                </div>

                {/* API Key Connection Diagnostics */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      API Handshake Diagnostics
                    </span>
                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={apiTestStatus === 'testing' || !apiEnabled || !apiKey}
                      className="px-3.5 py-1.5 bg-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer"
                    >
                      {apiTestStatus === 'testing' ? 'Handshaking...' : 'Verify Outbound Key'}
                    </button>
                  </div>

                  {apiTestStatus !== 'idle' && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs leading-normal transition-all ${
                        apiTestStatus === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-rose-50 border-rose-200 text-rose-800 font-mono text-[11px]'
                      }`}
                    >
                      {apiTestStatus === 'success' ? (
                        <p className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{apiTestMessage}</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-black uppercase tracking-wide text-rose-950">Handshake Rejected</p>
                          <p className="font-normal text-rose-800">{apiTestMessage}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
