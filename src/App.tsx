/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Mail,
  History,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  Lock,
  Unlock,
  Shield,
  Activity,
  Layers,
  Heart,
  ExternalLink,
} from 'lucide-react';

import {
  Vendor,
  Payment,
  EmailTemplate,
  DeliveryEngineConfig,
  EmailLog,
  PaymentStatus,
} from './types';

import {
  DEFAULT_VENDORS,
  DEFAULT_PAYMENTS,
  DEFAULT_TEMPLATE,
  DEFAULT_ENGINE_CONFIG,
} from './data/initialData';

import { generateRemittancePDF } from './utils/pdfGenerator';
import VendorManagement from './components/VendorManagement';
import RemittanceIngestion from './components/RemittanceIngestion';
import TemplateManager from './components/TemplateManager';
import EngineConfig from './components/EngineConfig';
import AuditLogs from './components/AuditLogs';
import RetryQueue, { RetryTask } from './components/RetryQueue';
import ConfirmationModal from './components/Modal';
import AuthScreen from './components/AuthScreen';
import AssistantWidget from './components/AssistantWidget';

interface UserSession {
  email: string;
  name: string;
}

export default function App() {
  // --- Auth Session State ---
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('remit_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem('remit_current_user', JSON.stringify(user));
    // Dynamically personalize sender email in configurations
    setConfig((prev) => ({
      ...prev,
      senderEmail: user.email,
    }));
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('remit_current_user');
  };

  // --- 1. Core Persistent States ---
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const saved = localStorage.getItem('remit_vendors');
    const items: Vendor[] = saved ? JSON.parse(saved) : DEFAULT_VENDORS;
    return items.map((v) => ({
      ...v,
      createdBy: v.createdBy || 'operations@remitflow.co',
    }));
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('remit_payments');
    const items: Payment[] = saved ? JSON.parse(saved) : DEFAULT_PAYMENTS;
    return items.map((p) => ({
      ...p,
      createdBy: p.createdBy || 'operations@remitflow.co',
    }));
  });

  const [template, setTemplate] = useState<EmailTemplate>(() => {
    const saved = localStorage.getItem('remit_template');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATE;
  });

  const [config, setConfig] = useState<DeliveryEngineConfig>(() => {
    const saved = localStorage.getItem('remit_config');
    return saved ? JSON.parse(saved) : DEFAULT_ENGINE_CONFIG;
  });

  const [logs, setLogs] = useState<EmailLog[]>(() => {
    const saved = localStorage.getItem('remit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // --- 2. Administrative Runtime States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendors' | 'payments' | 'templates' | 'logs'>('dashboard');
  const [serverKeys, setServerKeys] = useState({ brevo: false, resend: false, sendgrid: false });
  const [simulateSandboxFail, setSimulateSandboxFail] = useState(false);
  const [retryTasks, setRetryTasks] = useState<RetryTask[]>([]);

  // Batch Processing Status
  const [batchStatus, setBatchStatus] = useState({
    isProcessing: false,
    currentInvoice: '',
    progressPercent: 0,
    processedCount: 0,
    totalCount: 0,
  });

  // Global reset confirmation modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // --- 3. Synchronizing Storage on edits ---
  useEffect(() => {
    localStorage.setItem('remit_vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('remit_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('remit_template', JSON.stringify(template));
  }, [template]);

  useEffect(() => {
    localStorage.setItem('remit_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('remit_logs', JSON.stringify(logs));
  }, [logs]);

  // --- 4. Server Credentials Handshake ---
  const fetchServerKeysStatus = async () => {
    try {
      const response = await fetch('/api/config-status');
      if (response.ok) {
        const data = await response.json();
        setServerKeys(data);
      }
    } catch (e) {
      console.error('Failed to communicate with Express credentials handshake API:', e);
    }
  };

  useEffect(() => {
    fetchServerKeysStatus();
  }, []);

  // --- 5. Stabler References for Background Timers ---
  const paymentsRef = useRef(payments);
  paymentsRef.current = payments;

  const configRef = useRef(config);
  configRef.current = config;

  const vendorsRef = useRef(vendors);
  vendorsRef.current = vendors;

  const templateRef = useRef(template);
  templateRef.current = template;

  const simulateSandboxFailRef = useRef(simulateSandboxFail);
  simulateSandboxFailRef.current = simulateSandboxFail;

  // --- 6. The Background Automated Retry Daemon ---
  useEffect(() => {
    const timer = setInterval(() => {
      setRetryTasks((currentTasks) => {
        if (currentTasks.length === 0) return currentTasks;

        // Ticks countdown
        const decremented = currentTasks.map((t) => ({
          ...t,
          countdown: t.countdown - 1,
        }));

        // Identify ready queue entries
        const ready = decremented.filter((t) => t.countdown <= 0);

        // Run ready dispatches asynchronously
        ready.forEach((task) => {
          const currentPay = paymentsRef.current.find((p) => p.id === task.paymentId);
          if (currentPay) {
            executeDispatch(currentPay, task.attempt);
          }
        });

        // Filter out completed task references
        return decremented.filter((t) => t.countdown > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- 7. Core Remittance Dispatch Logic ---
  const executeDispatch = async (payment: Payment, attemptIndex = 0, senderEmailOverride?: string) => {
    // 1. Resolve Vendor Identity
    const vendor = vendorsRef.current.find((v) => v.code === payment.vendorCode);
    if (!vendor) {
      handleDispatchFailure(
        payment,
        `Routing Error: Vendor code '${payment.vendorCode}' is missing from the Master Directory.`,
        attemptIndex
      );
      return;
    }

    const resolvedSender = senderEmailOverride || payment.senderEmail || configRef.current.senderEmail || currentUser?.email || 'operations@remitflow.co';

    // 2. Transition Payment to 'In Progress' and set sender email
    updatePaymentStatus(payment.id, 'In Progress', undefined, undefined, resolvedSender);

    // 3. Compile Tokenized Template Outputs with dynamic SenderEmail replacement
    const compiledSubject = compileBracketText(templateRef.current.subject, payment, vendor, resolvedSender);
    const compiledBody = compileBracketText(templateRef.current.body, payment, vendor, resolvedSender);

    // 4. Native Share Manual Client Mode (mailto helper)
    if (configRef.current.activeEngine === 'Native Share') {
      try {
        const mailto = `mailto:${vendor.email}?subject=${encodeURIComponent(compiledSubject)}&body=${encodeURIComponent(compiledBody)}`;
        window.open(mailto, '_blank');

        // Capture Success Log
        const logId = `log-${Date.now()}`;
        const newLog: EmailLog = {
          id: logId,
          timestamp: new Date().toISOString(),
          paymentId: payment.id,
          invoiceNumber: payment.invoiceNumber,
          vendorCode: vendor.code,
          vendorName: vendor.name,
          recipientEmail: vendor.email,
          senderEmail: resolvedSender,
          engine: 'Native Share',
          status: 'Success',
          feedback: 'Native mail app successfully initiated with pre-filled headers. PDF generated and download completed.',
          retryAttempt: attemptIndex,
          createdBy: currentUser?.email || 'operations@remitflow.co',
        };

        setLogs((current) => [...current, newLog]);
        updatePaymentStatus(payment.id, 'Delivered', 0, undefined, resolvedSender); // Clear counters on success

        // Trigger manual browser download of PDF alongside MailClient launch
        generateRemittancePDF(payment, vendor, 'download');
      } catch (err: any) {
        handleDispatchFailure(payment, `Manual Native Share error: ${err.message || 'Window failed to launch.'}`, attemptIndex);
      }
      return;
    }

    // 5. Server Proxied API Modes (Sandbox, Brevo, Resend, Sendgrid)
    try {
      // Compile high-fidelity PDF as Base64 attachment
      const pdfBase64 = generateRemittancePDF(payment, vendor, 'base64');

      const bodyPayload = {
        to: vendor.email,
        subject: compiledSubject,
        body: compiledBody,
        engine: configRef.current.activeEngine,
        pdfBase64: pdfBase64,
        invoiceNumber: payment.invoiceNumber,
        senderEmail: resolvedSender,
        smtpConfig: configRef.current.smtp?.isEnabled ? configRef.current.smtp : undefined,
        simulateFail: configRef.current.activeEngine === 'Sandbox' && simulateSandboxFailRef.current,
      };

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      let resData: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        resData = await response.json();
      } else {
        const text = await response.text();
        const snippet = text.length > 250 ? text.substring(0, 250) + '...' : text;
        throw new Error(`The API gateway returned an unexpected response format (${response.status}): ${snippet}`);
      }

      if (!response.ok) {
        throw new Error(resData.error || `HTTP Gateway Error: ${response.status}`);
      }

      // Successful Dispatch Log
      const logId = `log-${Date.now()}`;
      const successLog: EmailLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        vendorCode: vendor.code,
        vendorName: vendor.name,
        recipientEmail: vendor.email,
        senderEmail: resolvedSender,
        engine: configRef.current.activeEngine,
        status: 'Success',
        feedback: resData.message || 'Transmitted successfully.',
        retryAttempt: attemptIndex,
        createdBy: currentUser?.email || 'operations@remitflow.co',
      };

      setLogs((current) => [...current, successLog]);
      updatePaymentStatus(payment.id, 'Delivered', attemptIndex, undefined, resolvedSender);

      // Remove from visual retry tasks list
      setRetryTasks((current) => current.filter((t) => t.paymentId !== payment.id));
    } catch (err: any) {
      handleDispatchFailure(payment, err.message || 'Network exception during SMTP gateway bridge.', attemptIndex);
    }
  };

  // --- 8. Handling Failures and Scheduling Retries ---
  const handleDispatchFailure = (payment: Payment, errorMsg: string, attemptIndex: number) => {
    const nextAttempt = attemptIndex + 1;
    const maxLimit = configRef.current.autoRetryLimit;

    // Log the transmission failure immediately
    const logId = `log-${Date.now()}`;
    const vendor = vendorsRef.current.find((v) => v.code === payment.vendorCode);

    const failLog: EmailLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      paymentId: payment.id,
      invoiceNumber: payment.invoiceNumber,
      vendorCode: payment.vendorCode,
      vendorName: vendor ? vendor.name : 'Unknown Recipient',
      recipientEmail: vendor ? vendor.email : 'unresolved@vendor.net',
      senderEmail: currentUser?.email || 'operations@remitflow.co',
      engine: configRef.current.activeEngine,
      status: 'Failed',
      feedback: errorMsg,
      retryAttempt: attemptIndex,
      createdBy: currentUser?.email || 'operations@remitflow.co',
    };

    setLogs((current) => [...current, failLog]);

    if (nextAttempt <= maxLimit) {
      // Enlist payment into automated retry tasks scheduler
      updatePaymentStatus(payment.id, 'Failed', nextAttempt, `Retrying: ${errorMsg}`);

      const newTask: RetryTask = {
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        vendorName: vendor ? vendor.name : 'Unknown Recipient',
        recipientEmail: vendor ? vendor.email : 'unresolved@vendor.net',
        countdown: configRef.current.retryDelaySeconds,
        attempt: nextAttempt,
        maxRetries: maxLimit,
        lastFailure: errorMsg,
      };

      // Upsert or push task
      setRetryTasks((current) => {
        const filtered = current.filter((t) => t.paymentId !== payment.id);
        return [...filtered, newTask];
      });
    } else {
      // Exhausted all retries
      updatePaymentStatus(payment.id, 'Failed', attemptIndex, `Exhausted retries: ${errorMsg}`);
      setRetryTasks((current) => current.filter((t) => t.paymentId !== payment.id));

      // Append terminal log
      const termLogId = `log-exhausted-${Date.now()}`;
      const termLog: EmailLog = {
        id: termLogId,
        timestamp: new Date().toISOString(),
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        vendorCode: payment.vendorCode,
        vendorName: vendor ? vendor.name : 'Unknown Recipient',
        recipientEmail: vendor ? vendor.email : 'unresolved@vendor.net',
        senderEmail: currentUser?.email || 'operations@remitflow.co',
        engine: configRef.current.activeEngine,
        status: 'Failed',
        feedback: `Terminal Exhaustion: Failed after compiling ${maxLimit} attempts. Enforced halt.`,
        retryAttempt: attemptIndex,
        createdBy: currentUser?.email || 'operations@remitflow.co',
      };
      setLogs((current) => [...current, termLog]);
    }
  };

  // --- 9. Utility state setters ---
  const updatePaymentStatus = (id: string, status: PaymentStatus, retryIndex?: number, failText?: string, senderEmail?: string) => {
    setPayments((current) =>
      current.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            status,
            retryCount: retryIndex !== undefined ? retryIndex : p.retryCount,
            failureReason: failText,
            lastAttempted: new Date().toISOString(),
            senderEmail: senderEmail || p.senderEmail,
          };
        }
        return p;
      })
    );
  };

  const compileBracketText = (text: string, payment: Payment, vendor: Vendor, senderEmailOverride?: string) => {
    if (!text) return '';
    let result = text;
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: vendor.currency,
    }).format(payment.amount);

    result = result.replace(/{VendorName}/g, vendor.name);
    result = result.replace(/{InvoiceNumber}/g, payment.invoiceNumber);
    result = result.replace(/{Amount}/g, formattedAmount);
    result = result.replace(/{UTRNumber}/g, payment.utrNumber);
    result = result.replace(/{SenderEmail}/g, senderEmailOverride || payment.senderEmail || currentUser?.email || 'operations@remitflow.co');
    return result;
  };

  // --- 10. Manual Operations Interventions ---
  const handleDispatchSingle = async (payment: Payment, senderEmail?: string) => {
    await executeDispatch(payment, 0, senderEmail);
  };

  const handleDispatchBatch = async (paymentIds: string[], senderEmail?: string) => {
    if (paymentIds.length === 0) return;

    setBatchStatus({
      isProcessing: true,
      currentInvoice: '',
      progressPercent: 0,
      processedCount: 0,
      totalCount: paymentIds.length,
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < paymentIds.length; i++) {
      const pId = paymentIds[i];
      const p = paymentsRef.current.find((item) => item.id === pId);
      if (p) {
        setBatchStatus((prev) => ({
          ...prev,
          currentInvoice: p.invoiceNumber,
          progressPercent: Math.round(((i + 1) / paymentIds.length) * 100),
          processedCount: i + 1,
        }));

        try {
          await executeDispatch(p, 0, senderEmail);
          
          // Re-evaluate actual status of this payment from the updated state reference
          const updatedP = paymentsRef.current.find((item) => item.id === pId);
          if (updatedP && updatedP.status === 'Delivered') {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Uninterrupted Batch Sending - Failed to dispatch payment ID ${pId}:`, error);
          failCount++;
          try {
            handleDispatchFailure(p, error instanceof Error ? error.message : String(error), 0);
          } catch (e) {
            console.error('Failed to log batch item failure:', e);
          }
        }
        
        // Soft pause between loop triggers to make progress visual
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setBatchStatus((prev) => ({ ...prev, isProcessing: false }));

    // Show a summary alert informing the user of the final batch results
    setTimeout(() => {
      alert(`Automated Batch Dispatch completed successfully!\n\n• Successfully Delivered: ${successCount}\n• Failures/Retries Scheduled: ${failCount}\n• Total Processed: ${paymentIds.length}`);
    }, 200);
  };

  const handleManualRetryLog = async (log: EmailLog) => {
    const payment = paymentsRef.current.find((p) => p.id === log.paymentId);
    if (payment) {
      // Trigger instant manual dispatch bypass
      await executeDispatch(payment, payment.retryCount);
    } else {
      alert(`Payment record for invoice ${log.invoiceNumber} no longer exists. Unable to execute retry.`);
    }
  };

  // Force an active scheduler task now
  const handleForceRetryTask = (paymentId: string) => {
    const task = retryTasks.find((t) => t.paymentId === paymentId);
    if (task) {
      // Execute instantly
      const p = paymentsRef.current.find((item) => item.id === paymentId);
      if (p) {
        executeDispatch(p, task.attempt);
      }
      setRetryTasks((current) => current.filter((t) => t.paymentId !== paymentId));
    }
  };

  // Cancel retry task, set state permanently to Failed
  const handleCancelRetryTask = (paymentId: string) => {
    setRetryTasks((current) => current.filter((t) => t.paymentId !== paymentId));
    updatePaymentStatus(paymentId, 'Failed', undefined, 'Retry task cancelled manually by accounts manager.');
  };

  // --- 11. Database Resets / Seeds ---
  const handleResetSystem = () => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    const seededVendors = DEFAULT_VENDORS.map((v) => ({ ...v, createdBy: creatorEmail }));
    const seededPayments = DEFAULT_PAYMENTS.map((p) => ({ ...p, createdBy: creatorEmail }));

    setVendors((curr) => {
      const rest = curr.filter((v) => v.createdBy !== creatorEmail);
      return [...rest, ...seededVendors];
    });

    setPayments((curr) => {
      const rest = curr.filter((p) => p.createdBy !== creatorEmail);
      return [...rest, ...seededPayments];
    });

    setTemplate(DEFAULT_TEMPLATE);
    setConfig(DEFAULT_ENGINE_CONFIG);
    setLogs((curr) => curr.filter((l) => l.createdBy !== creatorEmail));
    setRetryTasks([]);
    setSimulateSandboxFail(false);
  };

  // CRUD events matching
  const handleAddVendor = (v: Vendor) => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    const exists = vendors.some((item) => item.code === v.code && item.createdBy === creatorEmail);
    if (exists) {
      // Overwrite/Update existing vendor details gracefully instead of blocking
      setVendors((curr) =>
        curr.map((item) =>
          item.code === v.code && item.createdBy === creatorEmail
            ? { ...v, createdBy: creatorEmail }
            : item
        )
      );
      return true;
    }
    
    const vendorWithCreator = {
      ...v,
      createdBy: creatorEmail,
    };
    setVendors((curr) => [...curr, vendorWithCreator]);
    return true;
  };

  const handleUpdateVendor = (oldCode: string, v: Vendor) => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    setVendors((curr) =>
      curr.map((item) =>
        item.code === oldCode && item.createdBy === creatorEmail
          ? { ...v, createdBy: creatorEmail }
          : item
      )
    );
    return true;
  };

  const handleDeleteVendor = (code: string) => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    setVendors((curr) =>
      curr.filter((item) => !(item.code === code && item.createdBy === creatorEmail))
    );
  };

  const handleAddPayment = (p: Payment) => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    // Allow duplicate invoice numbers (no barriers in selecting same files for remittance)
    const paymentWithCreator = {
      ...p,
      createdBy: creatorEmail,
    };
    setPayments((curr) => [...curr, paymentWithCreator]);
    return true;
  };

  const handleDeletePayment = (id: string) => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    setPayments((curr) =>
      curr.filter((p) => !(p.id === id && p.createdBy === creatorEmail))
    );
    setRetryTasks((current) => current.filter((t) => t.paymentId !== id));
  };

  const handleClearPayments = () => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    setPayments((curr) => curr.filter((p) => p.createdBy !== creatorEmail));
  };

  const handleClearLogs = () => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    setLogs((curr) => curr.filter((l) => l.createdBy !== creatorEmail && l.senderEmail !== creatorEmail));
  };

  // --- 12. Tenant Filtered Lists ---
  const visibleVendors = useMemo(() => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    return vendors.filter((v) => v.createdBy === creatorEmail);
  }, [vendors, currentUser]);

  const visiblePayments = useMemo(() => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    return payments.filter((p) => p.createdBy === creatorEmail);
  }, [payments, currentUser]);

  const visibleLogs = useMemo(() => {
    const creatorEmail = currentUser?.email || 'operations@remitflow.co';
    return logs.filter((l) => l.createdBy === creatorEmail || l.senderEmail === creatorEmail);
  }, [logs, currentUser]);

  // --- 13. Dashboard calculated insights ---
  const dashboardStats = useMemo(() => {
    const totalPayments = visiblePayments.length;
    const pending = visiblePayments.filter((p) => p.status === 'Unprocessed').length;
    const delivered = visiblePayments.filter((p) => p.status === 'Delivered').length;
    const failed = visiblePayments.filter((p) => p.status === 'Failed').length;
    const progress = visiblePayments.filter((p) => p.status === 'In Progress').length;

    // Sum total currency volumes in USD-equivalent for simple display, or list them neatly
    const currenciesCount = new Map<string, number>();
    visiblePayments.forEach((p) => {
      const v = visibleVendors.find((vend) => vend.code === p.vendorCode);
      const curr = v ? v.currency : 'USD';
      currenciesCount.set(curr, (currenciesCount.get(curr) || 0) + p.amount);
    });

    const volumes: { curr: string; amount: number }[] = [];
    currenciesCount.forEach((amt, curr) => {
      volumes.push({ curr, amount: amt });
    });

    return { totalPayments, pending, delivered, failed, progress, volumes };
  }, [visiblePayments, visibleVendors]);

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="application-body">
      {/* 1. Header Navigation Bar (Top Scaffold) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app-header-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">RemitFlow</h1>
              <span className="text-[10px] text-indigo-600 font-bold tracking-tight">Vendor Advice Dispatch System</span>
            </div>
          </div>

          {/* Quick Enforced Sender Indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 text-xs font-medium text-slate-700">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Operator: <strong className="font-mono text-slate-900">{currentUser?.email || 'operations@remitflow.co'}</strong></span>
          </div>
        </div>
      </header>

      {/* 2. Primary Layout Framework (Left Side Navigation, Right Content) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left Side Tab bar Rails */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col" id="navigation-rail-wrapper">
            <div className="p-6 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">R</div>
                <h1 className="text-base font-semibold tracking-tight text-white">RemitFlow</h1>
              </div>
            </div>

            <nav className="p-4 space-y-1" id="navigation-rail">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer border-l-4 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
                id="tab-btn-dashboard"
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer border-l-4 ${
                  activeTab === 'vendors'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
                id="tab-btn-vendors"
              >
                <Users className="h-4.5 w-4.5" />
                <span>Vendor Master</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer border-l-4 ${
                  activeTab === 'payments'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
                id="tab-btn-payments"
              >
                <FileSpreadsheet className="h-4.5 w-4.5" />
                <span>Remittance</span>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer border-l-4 ${
                  activeTab === 'templates'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
                id="tab-btn-templates"
              >
                <Mail className="h-4.5 w-4.5" />
                <span>Templates</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer border-l-4 ${
                  activeTab === 'logs'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
                id="tab-btn-logs"
              >
                <History className="h-4.5 w-4.5" />
                <span>Audit & Engines</span>
              </button>
            </nav>

            <div className="p-5 bg-slate-950 border-t border-slate-800 mt-auto flex flex-col gap-2.5">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Authenticated Operator</div>
                <div className="text-xs text-slate-100 font-bold truncate">{currentUser?.name || 'Operator'}</div>
                <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{currentUser?.email || 'operations@remitflow.co'}</div>
              </div>
              <button
                onClick={handleLogOut}
                className="w-full text-center py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800/85 hover:border-slate-800 text-rose-400 hover:text-rose-350 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                id="btn-logout-session"
              >
                Sign Out / Exit
              </button>
            </div>
          </div>

          {/* Playground retry simulation controller Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4" id="retry-mechanism-playground">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">Retry Playground</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Simulate standard network and API delivery failures to test the automated retry countdown scheduler on-demand.
            </p>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">Active Mode:</span>
                <span className="text-[11px] font-bold text-indigo-400 font-mono bg-indigo-950/80 px-2 py-0.5 rounded">
                  {config.activeEngine}
                </span>
              </div>

              {config.activeEngine === 'Sandbox' ? (
                <label className="flex items-center gap-2.5 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer select-none transition-colors border border-slate-800">
                  <input
                    type="checkbox"
                    checked={simulateSandboxFail}
                    onChange={(e) => setSimulateSandboxFail(e.target.checked)}
                    className="accent-indigo-500 h-4 w-4"
                  />
                  <div className="text-left">
                    <span className="text-[11px] font-bold text-slate-200 block">Simulate Sandbox Fail</span>
                    <span className="text-[9.5px] text-slate-500 block">Forces 503 DNS Failures</span>
                  </div>
                </label>
              ) : (
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[10px] text-slate-500 leading-relaxed">
                  Sandbox Fail Simulation is only active in Sandbox mode. Switch active mode in configs to play.
                </div>
              )}
            </div>

            {/* Quick System Seed Utility */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                id="btn-re-seed-playground"
              >
                Re-seed System Data
              </button>
            </div>
          </div>
        </aside>

        {/* Right Side Tab Panel Pages */}
        <main className="lg:col-span-9 space-y-6" id="primary-workspace">
          {activeTab === 'dashboard' && (
            <div className="space-y-6" id="dashboard-tab-panel">
              {/* Welcome Headline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Accounts Payable Dispatch Control Center</h2>
                  <p className="text-sm text-slate-500">
                    Offline-first dashboard to reconcile banking clearances and automate remittance advice sheets dispatch.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto"
                >
                  + New Ingestion
                </button>
              </div>

              {/* Statistical counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Total Ingested</span>
                  <span className="text-3xl font-bold mt-1 block text-slate-900 font-mono">{dashboardStats.totalPayments}</span>
                  <span className="text-xs text-slate-400 mt-2 block font-medium">Reconciled lines</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Pending Dispatch</span>
                  <span className="text-3xl font-bold mt-1 block text-amber-600 font-mono">{dashboardStats.pending}</span>
                  <span className="text-xs text-amber-600 mt-2 block font-medium">Action required</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Successfully Sent</span>
                  <span className="text-3xl font-bold mt-1 block text-emerald-600 font-mono">{dashboardStats.delivered}</span>
                  <span className="text-xs text-emerald-600 mt-2 block font-medium">+12% from last month</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Failed Attempts</span>
                  <span className="text-3xl font-bold mt-1 block text-rose-600 font-mono">{dashboardStats.failed}</span>
                  <span className="text-xs text-rose-600 mt-2 block font-medium">Auto-retry active</span>
                </div>
              </div>

              {/* Dynamic volume lists & Retry widget side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Retry Countdown tasks panel */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Scheduler Pipeline</h3>
                  <RetryQueue
                    tasks={retryTasks}
                    onForceRetry={handleForceRetryTask}
                    onCancelRetry={handleCancelRetryTask}
                    retryDelaySeconds={config.retryDelaySeconds}
                  />
                </div>

                {/* Cleared Volumes lists */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">Registered Settlements Volume</h3>
                    <p className="text-[11px] text-slate-400">Total transaction value aggregated by currency.</p>
                  </div>

                  {dashboardStats.volumes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No transaction values recorded yet.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {dashboardStats.volumes.map((vol) => (
                        <div key={vol.curr} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-extrabold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                            {vol.curr}
                          </span>
                          <span className="text-sm font-black font-mono text-slate-900">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: vol.curr,
                            }).format(vol.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Interactive Tutorial Card */}
              <div className="bg-indigo-900 text-indigo-100 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Shield className="h-48 w-48 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-400" />
                    <span>How to Test the Automated Retry & Ingestion Workflows</span>
                  </h3>
                  <ol className="text-xs space-y-3 list-decimal pl-4 leading-relaxed text-indigo-200">
                    <li>
                      Head over to the <strong className="text-white">Remittance Ingestion</strong> tab. Note the sample transactions preloaded in the system.
                    </li>
                    <li>
                      Toggle the <strong className="text-white">Simulate Sandbox Fail</strong> switch on the left rail of the application to <strong className="text-white">ON</strong>.
                    </li>
                    <li>
                      Trigger dispatch on any <span className="bg-slate-900 text-slate-200 font-mono px-1.5 py-0.5 rounded font-bold">Unprocessed</span> transaction. It will deliberately fail due to simulated DNS timeouts.
                    </li>
                    <li>
                      The transaction enters the <strong className="text-white">Live Scheduler Pipeline</strong> countdown queue (visible on this dashboard or under logs).
                    </li>
                    <li>
                      Toggle the <strong className="text-white">Simulate Sandbox Fail</strong> switch back to <strong className="text-white">OFF</strong>.
                    </li>
                    <li>
                      Watch as the background timer counts down to 0, automatically fires a re-dispatch retry attempt, succeeds, and delivers the cleared advice!
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="animate-in fade-in duration-300">
              <VendorManagement
                vendors={visibleVendors}
                onAddVendor={handleAddVendor}
                onUpdateVendor={handleUpdateVendor}
                onDeleteVendor={handleDeleteVendor}
              />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="animate-in fade-in duration-300">
              <RemittanceIngestion
                payments={visiblePayments}
                vendors={visibleVendors}
                currentUserEmail={currentUser?.email}
                onAddPayment={handleAddPayment}
                onDeletePayment={handleDeletePayment}
                onClearPayments={handleClearPayments}
                onDispatchSingle={handleDispatchSingle}
                onDispatchBatch={handleDispatchBatch}
                batchProcessingStatus={batchStatus}
              />
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="animate-in fade-in duration-300">
              <TemplateManager
                template={template}
                onUpdateTemplate={setTemplate}
                onResetTemplate={() => setTemplate(DEFAULT_TEMPLATE)}
                sampleVendor={visibleVendors[0]}
                samplePayment={visiblePayments[0]}
                currentUserEmail={currentUser?.email}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Active retry queue if active */}
              {retryTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduler Queue</h3>
                  <RetryQueue
                    tasks={retryTasks}
                    onForceRetry={handleForceRetryTask}
                    onCancelRetry={handleCancelRetryTask}
                    retryDelaySeconds={config.retryDelaySeconds}
                  />
                </div>
              )}

              {/* Engine configs */}
              <EngineConfig
                config={config}
                onUpdateConfig={setConfig}
                serverKeys={serverKeys}
              />

              {/* Delivery logs */}
              <AuditLogs
                logs={visibleLogs}
                onClearLogs={handleClearLogs}
                onManualRetryLog={handleManualRetryLog}
              />
            </div>
          )}
        </main>
      </div>

      {/* Footer Branding credits */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200/60 text-center text-xs text-slate-400" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-medium text-[11px] leading-relaxed">
            © 2026 Vendor Remittance & Payment Advice Dispatcher Platform. Bound to <strong className="text-slate-600 font-mono">{currentUser?.email || 'operations@remitflow.co'}</strong>.
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Crafted for accounts payable automation • Sandboxed SMTP & transactional APIs v3 proxies integrated.
          </p>
        </div>
      </footer>

      {/* Safeguard: Global system factory re-seed confirm */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetSystem}
        title="Reset System Database"
        message="Are you sure you want to restore all settings and databases to a blank state? This erases all registered vendors, payments, customized template brackets, and communication log histories."
        confirmText="Confirm Reset"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Offline WhatsApp Business Automated Chat Assistant */}
      <AssistantWidget payments={visiblePayments} vendors={visibleVendors} />
    </div>
  );
}
