/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Eye,
  Download,
  X,
  Trash2,
  AlertTriangle,
  Play,
  Layers,
  Mail,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Payment, Vendor, PaymentStatus } from '../types';
import { generateRemittancePDF } from '../utils/pdfGenerator';
import ConfirmationModal from './Modal';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

interface RemittanceIngestionProps {
  payments: Payment[];
  vendors: Vendor[];
  currentUserEmail?: string;
  onAddPayment: (p: Payment) => boolean | string;
  onDeletePayment: (id: string) => void;
  onClearPayments: () => void;
  onDispatchSingle: (p: Payment, senderEmail?: string) => Promise<void>;
  onDispatchBatch: (pIds: string[], senderEmail?: string) => Promise<void>;
  batchProcessingStatus: {
    isProcessing: boolean;
    currentInvoice: string;
    progressPercent: number;
    processedCount: number;
    totalCount: number;
  };
}

export default function RemittanceIngestion({
  payments,
  vendors,
  currentUserEmail,
  onAddPayment,
  onDeletePayment,
  onClearPayments,
  onDispatchSingle,
  onDispatchBatch,
  batchProcessingStatus,
}: RemittanceIngestionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'Delivered' | 'Failed' | 'In Progress'>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // CSV Import state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // PDF Preview Drawer state
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<string>('');

  // Dynamic dispatch selection modal state
  const [dispatchSelection, setDispatchSelection] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    payment?: Payment;
    pendingIds?: string[];
  }>({
    isOpen: false,
    type: 'single',
  });
  const [selectedSenderEmail, setSelectedSenderEmail] = useState(currentUserEmail || 'operations@remitflow.co');

  useEffect(() => {
    if (currentUserEmail) {
      setSelectedSenderEmail(currentUserEmail);
    }
  }, [currentUserEmail]);

  const triggerSingleDispatch = (payment: Payment) => {
    setDispatchSelection({
      isOpen: true,
      type: 'single',
      payment,
    });
  };

  const handleConfirmDispatch = async () => {
    const { type, payment, pendingIds } = dispatchSelection;
    setDispatchSelection(prev => ({ ...prev, isOpen: false }));
    if (type === 'single' && payment) {
      await onDispatchSingle(payment, selectedSenderEmail);
    } else if (type === 'batch' && pendingIds) {
      await onDispatchBatch(pendingIds, selectedSenderEmail);
    }
  };

  // CSV Handlers
  const downloadSampleCSV = () => {
    const sampleVendorCode = vendors.length > 0 ? vendors[0].code : 'VND-001';
    const csvContent = [
      'Invoice Number,Vendor Code,Cleared Amount,UTR Number,Payment Date',
      `INV-2026-001,${sampleVendorCode},5400.00,UTR-COMM-9901,2026-06-25`,
      `INV-2026-002,${sampleVendorCode},12450.50,UTR-ACME-8812,2026-06-26`,
      'INV-2026-003,VND-INVALID,850.00,UTR-MISS-0000,2026-06-27'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'remittance_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileSelected = (file: File) => {
    setCsvFile(file);
    setCsvError('');
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError('The CSV file is empty.');
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          setCsvError('The CSV file must contain a header row and at least one data row.');
          return;
        }

        // Parse headers
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
        
        // Find header indices dynamically to support flexible column order
        const invoiceIdx = headers.findIndex(h => h.includes('invoice'));
        const vendorIdx = headers.findIndex(h => h.includes('vendor') || h.includes('payee') || h === 'code');
        const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('cleared') || h.includes('total') || h === 'val');
        const utrIdx = headers.findIndex(h => h.includes('utr') || h.includes('ref') || h.includes('reference'));
        const dateIdx = headers.findIndex(h => h.includes('date'));

        if (invoiceIdx === -1 || vendorIdx === -1 || amountIdx === -1 || utrIdx === -1) {
          setCsvError('Could not find required columns in header. Please ensure your CSV has "Invoice Number", "Vendor Code", "Cleared Amount", and "UTR Number" headers.');
          return;
        }

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length < 4) continue; // Skip malformed rows

          const invoiceNumber = (values[invoiceIdx] || '').trim().toUpperCase();
          const vendorCode = (values[vendorIdx] || '').trim().toUpperCase();
          const amountRaw = (values[amountIdx] || '').trim().replace(/[$,]/g, '');
          const utrNumber = (values[utrIdx] || '').trim().toUpperCase();
          
          let paymentDate = dateIdx !== -1 && values[dateIdx] ? values[dateIdx].trim() : '';
          if (!paymentDate) {
            paymentDate = new Date().toISOString().split('T')[0];
          }

          const amountVal = parseFloat(amountRaw);
          const hasVendor = vendorMap.has(vendorCode);
          const vendorObj = vendorMap.get(vendorCode);
          const vendorName = hasVendor ? vendorObj?.name : '';
          
          const alreadyExists = payments.some(p => p.invoiceNumber === invoiceNumber);

          const errors: string[] = [];
          if (!invoiceNumber) errors.push('Missing Invoice Reference');
          if (!vendorCode) {
            errors.push('Missing Vendor Code');
          } else if (!hasVendor) {
            errors.push(`Vendor Code "${vendorCode}" is not registered`);
          }
          if (isNaN(amountVal) || amountVal <= 0) {
            errors.push('Amount must be positive');
          }
          if (!utrNumber) errors.push('Missing UTR Number');
          if (alreadyExists) {
            errors.push(`Invoice "${invoiceNumber}" already registered`);
          }

          rows.push({
            invoiceNumber,
            vendorCode,
            vendorName,
            amount: isNaN(amountVal) ? 0 : amountVal,
            utrNumber,
            paymentDate,
            errors,
            isValid: errors.length === 0,
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        setCsvError(`Failed to parse file: ${err.message || 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImportParsedRows = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid records found to import.');
      return;
    }

    let successCount = 0;
    validRows.forEach((row, idx) => {
      const newPayment: Payment = {
        id: `pay-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        invoiceNumber: row.invoiceNumber,
        vendorCode: row.vendorCode,
        amount: row.amount,
        utrNumber: row.utrNumber,
        paymentDate: row.paymentDate,
        status: 'Unprocessed',
        retryCount: 0,
        maxRetries: 3,
      };

      const result = onAddPayment(newPayment);
      if (typeof result !== 'string') {
        successCount++;
      }
    });

    setIsCsvModalOpen(false);
    setCsvFile(null);
    setParsedRows([]);
    setCsvError('');
  };

  // Destructive confirmations
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Vendor Lookup Map for lightning fast lookups
  const vendorMap = useMemo(() => {
    const map = new Map<string, Vendor>();
    vendors.forEach((v) => map.set(v.code, v));
    return map;
  }, [vendors]);

  // Filters to track pending payments, successful payments, and other states
  const filteredPayments = useMemo(() => {
    let list = payments;

    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const v = vendorMap.get(p.vendorCode);
        return (
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.utrNumber.toLowerCase().includes(q) ||
          p.vendorCode.toLowerCase().includes(q) ||
          (v && v.name.toLowerCase().includes(q))
        );
      });
    }

    // 2. Status Filters
    if (activeFilter === 'Pending') {
      // Pending payments = Unprocessed (awaiting dispatch)
      list = list.filter((p) => p.status === 'Unprocessed');
    } else if (activeFilter === 'Delivered') {
      // Successful payments
      list = list.filter((p) => p.status === 'Delivered');
    } else if (activeFilter === 'Failed') {
      list = list.filter((p) => p.status === 'Failed');
    } else if (activeFilter === 'In Progress') {
      list = list.filter((p) => p.status === 'In Progress');
    }

    return list;
  }, [payments, searchQuery, activeFilter, vendorMap]);

  // Quick statistics for indicators
  const stats = useMemo(() => {
    const total = payments.length;
    const pending = payments.filter((p) => p.status === 'Unprocessed').length;
    const delivered = payments.filter((p) => p.status === 'Delivered').length;
    const failed = payments.filter((p) => p.status === 'Failed').length;
    const inProgress = payments.filter((p) => p.status === 'In Progress').length;
    return { total, pending, delivered, failed, inProgress };
  }, [payments]);

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanInvoice = invoiceNumber.trim().toUpperCase();
    const cleanVendor = vendorCode.trim().toUpperCase();
    const cleanUtr = utrNumber.trim().toUpperCase();
    const numericAmount = parseFloat(amount);

    if (!cleanInvoice || !cleanVendor || !cleanUtr || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please fill in all details correctly. Amount must be positive.');
      return;
    }

    // Check if vendor code exists
    if (!vendorMap.has(cleanVendor)) {
      setFormError(`Vendor code "${cleanVendor}" is not registered in the Master Directory.`);
      return;
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceNumber: cleanInvoice,
      vendorCode: cleanVendor,
      amount: numericAmount,
      utrNumber: cleanUtr,
      paymentDate,
      status: 'Unprocessed',
      retryCount: 0,
      maxRetries: 3,
    };

    const result = onAddPayment(newPayment);
    if (typeof result === 'string') {
      setFormError(result);
    } else {
      setIsFormOpen(false);
      // Reset fields
      setInvoiceNumber('');
      setVendorCode('');
      setAmount('');
      setUtrNumber('');
    }
  };

  const handleOpenPreview = (payment: Payment) => {
    const vendor = vendorMap.get(payment.vendorCode);
    if (!vendor) {
      alert(`Cannot preview PDF: Vendor profile for code ${payment.vendorCode} does not exist in the system.`);
      return;
    }
    const blobUrl = generateRemittancePDF(payment, vendor, 'bloburl');
    if (blobUrl) {
      setPreviewPdfUrl(blobUrl);
      setPreviewInvoice(payment.invoiceNumber);
    }
  };

  const handleDownloadPDF = (payment: Payment) => {
    const vendor = vendorMap.get(payment.vendorCode);
    if (!vendor) return;
    generateRemittancePDF(payment, vendor, 'download');
  };

  const handleBatchTrigger = () => {
    // Process all "Unprocessed" payments in batch
    const pendingIds = payments.filter((p) => p.status === 'Unprocessed').map((p) => p.id);
    if (pendingIds.length === 0) {
      alert('There are no Unprocessed pending payments ready for batch dispatch.');
      return;
    }
    setDispatchSelection({
      isOpen: true,
      type: 'batch',
      pendingIds,
    });
  };

  return (
    <div className="space-y-6" id="remittance-ingestion-root">
      {/* Top Banner Control Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Remittance Ingestion & Batch Processing</h2>
          <p className="text-sm text-slate-500">
            Register pending bank settlement transfers, reconcile corporate vendor contacts, and broadcast A4 advices in batches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="px-4 py-2.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full border border-slate-200 hover:border-rose-100 font-semibold text-xs transition-colors cursor-pointer"
            id="btn-clear-all-transactions"
          >
            Clear Ingestions
          </button>
          <button
            onClick={() => {
              setCsvFile(null);
              setParsedRows([]);
              setCsvError('');
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            id="btn-import-csv-trigger"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
            id="btn-register-payment"
          >
            <Plus className="h-4 w-4" />
            <span>Ingest Transaction</span>
          </button>
        </div>
      </div>

      {/* Batch Processing Status Bar / Queue Monitor */}
      {batchProcessingStatus.isProcessing && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg space-y-4 animate-pulse border border-indigo-500/30" id="batch-progress-monitor">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-indigo-400 animate-spin" />
              <div>
                <h4 className="text-sm font-bold">Executing Automated Batch Advice Dispatcher...</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Currently compiling and transmitting PDF for invoice <strong className="text-indigo-300 font-mono">{batchProcessingStatus.currentInvoice}</strong>
                </p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold bg-indigo-900/50 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30">
              {batchProcessingStatus.processedCount} / {batchProcessingStatus.totalCount} Dispatched
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${batchProcessingStatus.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0% Queue Cleared</span>
              <span>{batchProcessingStatus.progressPercent}% Complete</span>
              <span>100% Fully Sent</span>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Filters Cards - Highly responsive design with tactile buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="stats-filter-grid">
        {/* Total Ingestions Card */}
        <button
          onClick={() => setActiveFilter('All')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-colors ${
            activeFilter === 'All'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800'
          }`}
          id="stat-all-payments"
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block font-semibold ${activeFilter === 'All' ? 'text-indigo-200' : 'text-slate-500'}`}>
            All Payments
          </span>
          <span className="text-2xl font-black mt-2 block tracking-tight font-mono">{stats.total}</span>
        </button>

        {/* Pending Ingestions Filter */}
        <button
          onClick={() => setActiveFilter('Pending')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-colors ${
            activeFilter === 'Pending'
              ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800'
          }`}
          id="stat-pending-payments"
        >
          <span className="flex items-center justify-between gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider block font-semibold ${activeFilter === 'Pending' ? 'text-amber-100' : 'text-slate-500'}`}>
              Pending Remittances
            </span>
            <Clock className={`h-3.5 w-3.5 ${activeFilter === 'Pending' ? 'text-white' : 'text-amber-500'}`} />
          </span>
          <span className="text-2xl font-black mt-2 block tracking-tight font-mono">{stats.pending}</span>
        </button>

        {/* Successful Ingestions Filter */}
        <button
          onClick={() => setActiveFilter('Delivered')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-colors ${
            activeFilter === 'Delivered'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800'
          }`}
          id="stat-delivered-payments"
        >
          <span className="flex items-center justify-between gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider block font-semibold ${activeFilter === 'Delivered' ? 'text-emerald-100' : 'text-slate-500'}`}>
              Successful Dispatches
            </span>
            <CheckCircle2 className={`h-3.5 w-3.5 ${activeFilter === 'Delivered' ? 'text-white' : 'text-emerald-500'}`} />
          </span>
          <span className="text-2xl font-black mt-2 block tracking-tight font-mono">{stats.delivered}</span>
        </button>

        {/* Failed Ingestions Filter */}
        <button
          onClick={() => setActiveFilter('Failed')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-colors ${
            activeFilter === 'Failed'
              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800'
          }`}
          id="stat-failed-payments"
        >
          <span className="flex items-center justify-between gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider block font-semibold ${activeFilter === 'Failed' ? 'text-rose-100' : 'text-slate-500'}`}>
              Delivery Failures
            </span>
            <XCircle className={`h-3.5 w-3.5 ${activeFilter === 'Failed' ? 'text-white' : 'text-rose-500'}`} />
          </span>
          <span className="text-2xl font-black mt-2 block tracking-tight font-mono">{stats.failed}</span>
        </button>

        {/* Batch Delivery Box Action */}
        <button
          onClick={handleBatchTrigger}
          disabled={stats.pending === 0 || batchProcessingStatus.isProcessing}
          className="p-4 bg-slate-900 hover:bg-indigo-900 text-white rounded-2xl text-left border border-slate-800 flex flex-col justify-between cursor-pointer transition-all hover:shadow disabled:opacity-50 disabled:cursor-not-allowed group"
          id="btn-batch-dispatch-remittances"
        >
          <span className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-300 font-semibold">
            <span>Execute Batch Delivery</span>
            <Play className="h-3.5 w-3.5 fill-indigo-400 stroke-none animate-pulse" />
          </span>
          <span className="text-xs font-bold leading-tight mt-2 block text-indigo-200">
            Send {stats.pending} Advices Now
          </span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="payments-table-container">
        {/* Table Controls (Search and Filters) */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice, vendor code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-full text-xs outline-none transition-all"
              id="payment-table-search"
            />
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-slate-400 bg-slate-50 p-1.5 rounded-full border border-slate-100">
            <Filter className="h-3.5 w-3.5 ml-2 mr-1 text-slate-400" />
            <button
              onClick={() => setActiveFilter('All')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${activeFilter === 'All' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/40' : 'hover:text-slate-700'}`}
            >
              All ({payments.length})
            </button>
            <button
              onClick={() => setActiveFilter('Pending')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${activeFilter === 'Pending' ? 'bg-white text-amber-600 shadow-xs border border-slate-200/40' : 'hover:text-slate-700'}`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveFilter('Delivered')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${activeFilter === 'Delivered' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/40' : 'hover:text-slate-700'}`}
            >
              Successful ({stats.delivered})
            </button>
            <button
              onClick={() => setActiveFilter('Failed')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${activeFilter === 'Failed' ? 'bg-white text-rose-600 shadow-xs border border-slate-200/40' : 'hover:text-slate-700'}`}
            >
              Failed ({stats.failed})
            </button>
          </div>
        </div>

        {/* Transactions Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Invoice Ref</th>
                <th className="py-4 px-6">Vendor Master Match</th>
                <th className="py-4 px-6 text-right">Cleared Amount</th>
                <th className="py-4 px-6">UTR Code</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Retries</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No payment remittances matched your filters</p>
                      <p className="text-[11px] max-w-xs text-slate-400 leading-relaxed">
                        Register a transaction or choose an alternative filter tab from the controls above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const vendor = vendorMap.get(payment.vendorCode);
                  const isUnresolved = !vendor;

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50/50 transition-colors"
                      id={`payment-row-${payment.id}`}
                    >
                      {/* Invoice Ref */}
                      <td className="py-4 px-6 font-bold font-mono tracking-tight text-slate-900">
                        {payment.invoiceNumber}
                      </td>

                      {/* Vendor Name */}
                      <td className="py-4 px-6">
                        {isUnresolved ? (
                          <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 w-fit font-semibold text-[10.5px]">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Unresolved Code: {payment.vendorCode}</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-slate-800 leading-none">{vendor.name}</h5>
                            <p className="text-[10px] text-slate-400 font-medium font-mono">
                              {vendor.code} • {vendor.email}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Cleared Amount */}
                      <td className="py-4 px-6 text-right font-black font-mono text-slate-900">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: vendor ? vendor.currency : 'USD',
                        }).format(payment.amount)}
                      </td>

                      {/* UTR Code */}
                      <td className="py-4 px-6 font-mono text-slate-500 font-medium uppercase">
                        {payment.utrNumber}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {payment.paymentDate}
                      </td>

                      {/* Status Indicators */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border ${
                            payment.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : payment.status === 'Failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : payment.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {payment.status === 'Delivered' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                          {payment.status === 'Failed' && <XCircle className="h-3 w-3 shrink-0" />}
                          {payment.status === 'In Progress' && <RotateCw className="h-3 w-3 shrink-0 animate-spin" />}
                          {payment.status === 'Unprocessed' && <Clock className="h-3 w-3 shrink-0" />}
                          <span>{payment.status}</span>
                        </span>
                        {payment.status === 'Failed' && payment.failureReason && (
                          <p className="text-[9.5px] text-rose-500 font-medium leading-normal mt-1 max-w-[150px] truncate mx-auto" title={payment.failureReason}>
                            {payment.failureReason}
                          </p>
                        )}
                      </td>

                      {/* Retries count */}
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-500">
                        {payment.retryCount} / {payment.maxRetries}
                      </td>

                      {/* Operations */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Preview PDF */}
                          <button
                            onClick={() => handleOpenPreview(payment)}
                            disabled={isUnresolved}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-35 cursor-pointer"
                            title="Interactive PDF Preview"
                            id={`btn-preview-pdf-${payment.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPDF(payment)}
                            disabled={isUnresolved}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-35 cursor-pointer"
                            title="Download PDF Advice"
                            id={`btn-download-pdf-${payment.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Single Dispatch Trigger */}
                          <button
                            onClick={() => triggerSingleDispatch(payment)}
                            disabled={isUnresolved || batchProcessingStatus.isProcessing || payment.status === 'In Progress'}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              payment.status === 'Delivered'
                                ? 'text-emerald-500 hover:bg-emerald-50'
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={payment.status === 'Delivered' ? 'Re-dispatch Advice' : 'Dispatch Remittance'}
                            id={`btn-dispatch-single-${payment.id}`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => setDeleteId(payment.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Wipe Record"
                            id={`btn-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Payment Registration Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity" onClick={() => setIsFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10 animate-in slide-in-from-right duration-300" id="payment-form-drawer">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ingest Payment Remittance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Register a pending transfer for advice compiling.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors" id="btn-close-payment-form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 leading-normal">{formError}</div>}

              {/* Invoice Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Invoice Reference *</label>
                <input
                  type="text"
                  placeholder="e.g., INV-2026-77A"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm font-mono outline-none uppercase transition-all"
                  required
                  id="input-payment-invoice"
                />
              </div>

              {/* Vendor Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Recipient Vendor *</label>
                <select
                  value={vendorCode}
                  onChange={(e) => setVendorCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none cursor-pointer transition-all"
                  required
                  id="input-payment-vendor"
                >
                  <option value="">-- Choose Corporate Payee --</option>
                  {vendors.map((v) => (
                    <option key={v.code} value={v.code}>
                      [{v.code}] {v.name} ({v.currency})
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-400">Selecting will resolve trade currencies and registered mail addresses instantly.</p>
              </div>

              {/* Cleared Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cleared Amount *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g., 12450.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm font-mono outline-none transition-all"
                    required
                    id="input-payment-amount"
                  />
                </div>
              </div>

              {/* UTR Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Unique Transaction Reference (UTR) *</label>
                <input
                  type="text"
                  placeholder="e.g., UTR-ACME-90812749"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm font-mono outline-none uppercase transition-all"
                  required
                  id="input-payment-utr"
                />
                <p className="text-[10.5px] text-slate-400">The banking settlement ID generated upon actual transaction clearance.</p>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Payment Processing Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all cursor-pointer"
                  required
                  id="input-payment-date"
                />
              </div>
            </form>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" id="btn-cancel-payment-form">Cancel</button>
              <button type="button" onClick={handleSubmit} className="px-5 py-2.5 rounded-full text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer" id="btn-save-payment-form">Ingest Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Batch Ingestion Drawer */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsCsvModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300" id="csv-ingestion-drawer">
            {/* Header */}
            <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                  <span>CSV Remittance Batch Ingestor</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Bulk-import corporate settlement records securely into the local workspace memory.</p>
              </div>
              <button 
                onClick={() => setIsCsvModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-2 rounded-full transition-colors" 
                id="btn-close-csv-ingestion"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* File upload or active preview area */}
              {!csvFile ? (
                <div 
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50/40' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.name.endsWith('.csv')) {
                      handleCsvFileSelected(file);
                    } else {
                      setCsvError('Please drop a valid .csv file.');
                    }
                  }}
                  id="csv-drag-drop-zone"
                >
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Drag and drop your spreadsheet here</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Select a comma-separated `.csv` containing your pending transactions.
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs hover:shadow transition-all">
                        Browse Files
                        <input 
                          type="file" 
                          accept=".csv,text/csv,application/csv,application/vnd.ms-excel,text/plain" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCsvFileSelected(file);
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={downloadSampleCSV}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-full border border-slate-250 transition-colors cursor-pointer"
                        id="btn-download-csv-sample"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        <span>Download Sample Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CSV Loaded Info Header */
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 text-sm">{csvFile.name}</h5>
                      <p className="text-[11px] text-slate-400 font-mono">{(csvFile.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows parsed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={downloadSampleCSV}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-semibold text-[11px] transition-colors cursor-pointer"
                      id="btn-download-sample-csv-inline"
                    >
                      Sample Template
                    </button>
                    <button 
                      onClick={() => {
                        setCsvFile(null);
                        setParsedRows([]);
                        setCsvError('');
                      }}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-full font-semibold text-[11px] transition-colors cursor-pointer"
                      id="btn-remove-csv-file"
                    >
                      Choose Different File
                    </button>
                  </div>
                </div>
              )}

              {csvError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 leading-normal flex items-start gap-2.5" id="csv-error-banner">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Data Table Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-3" id="csv-preview-table-container">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Parsed Records Preview</h4>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10.5px]">
                        <Check className="h-3.5 w-3.5" />
                        <strong>{parsedRows.filter(r => r.isValid).length}</strong> Valid & Ready
                      </span>
                      {parsedRows.filter(r => !r.isValid).length > 0 && (
                        <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full text-[10.5px]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <strong>{parsedRows.filter(r => !r.isValid).length}</strong> Skipped / Issues
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Invoice Ref</th>
                          <th className="py-3 px-4">Vendor Code</th>
                          <th className="py-3 px-4 text-right">Cleared Amount</th>
                          <th className="py-3 px-4">UTR Number</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row, index) => {
                          return (
                            <tr key={index} className={`hover:bg-slate-50/40 transition-colors ${!row.isValid ? 'bg-rose-50/20' : ''}`}>
                              <td className="py-3 px-4 font-bold font-mono text-slate-900 uppercase">{row.invoiceNumber || '—'}</td>
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-mono font-bold text-slate-800">{row.vendorCode || '—'}</div>
                                  {row.vendorName && <div className="text-[10px] text-slate-400 font-medium">{row.vendorName}</div>}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold font-mono">{row.amount > 0 ? `$${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                              <td className="py-3 px-4 font-mono text-slate-600 text-[11px] uppercase">{row.utrNumber || '—'}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{row.paymentDate || '—'}</td>
                              <td className="py-3 px-4 text-center">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <Check className="h-2.5 w-2.5" />
                                    <span>Valid</span>
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                    {row.errors.map((errStr: string, errIdx: number) => (
                                      <span key={errIdx} className="inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide bg-rose-50 text-rose-600 border border-rose-100" title={errStr}>
                                        {errStr}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 leading-normal max-w-sm hidden sm:block">
                Only valid parsed rows will be imported. Unregistered vendor codes or duplicate invoices are highlighted and automatically isolated for protection.
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button 
                  type="button" 
                  onClick={() => setIsCsvModalOpen(false)} 
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  id="btn-cancel-csv-import"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleImportParsedRows}
                  disabled={parsedRows.filter(r => r.isValid).length === 0}
                  className="px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  id="btn-submit-csv-import"
                >
                  <Check className="h-4 w-4" />
                  <span>Import {parsedRows.filter(r => r.isValid).length} Valid Ingestions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Visual Preview Drawer (Side-sheet) */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setPreviewPdfUrl(null)} />
          <div className="relative w-full max-w-4xl bg-slate-100 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300" id="pdf-preview-drawer">
            <div className="bg-white p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <span>A4 Remittance PDF Viewer • Invoice {previewInvoice}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">High-fidelity programmatically generated document layout.</p>
              </div>
              <button onClick={() => setPreviewPdfUrl(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors" id="btn-close-pdf-preview">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Embedded interactive IFrame pointing directly to our generated Blob URL */}
            <div className="flex-1 p-6 flex justify-center overflow-y-auto">
              <iframe src={previewPdfUrl} className="w-full h-full max-w-2xl bg-white shadow-lg rounded-2xl border border-slate-200" title="Remittance PDF advice preview" id="pdf-preview-iframe" />
            </div>

            <div className="bg-white p-5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={() => setPreviewPdfUrl(null)} className="px-5 py-2.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors" id="btn-close-drawer-bottom">Close Preview</button>
              <a href={previewPdfUrl} download={`Remittance_Advice_${previewInvoice}.pdf`} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow transition-all cursor-pointer" id="btn-download-pdf-drawer">
                <Download className="h-4 w-4" />
                <span>Download PDF advice</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Safety Safeguard: Individual deletion confirmation */}
      <ConfirmationModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            onDeletePayment(deleteId);
            setDeleteId(null);
          }
        }}
        title="Wipe Payment Record"
        message="Are you sure you want to delete this payment record? Doing so wipes all matching references. If the record had pending retries, they will be discarded immediately."
        confirmText="Confirm Deletion"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Safety Safeguard: Batch reset confirmation */}
      <ConfirmationModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={onClearPayments}
        title="Flush Remittance List"
        message="This is a highly destructive action. You are about to wipe all ingested payments from the storage disk. Dispatched transaction statuses and pending queues will be cleared permanently."
        confirmText="Flush Database"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Dynamic Dispatcher Account Selection Modal */}
      {dispatchSelection.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="sender-select-modal">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setDispatchSelection({ isOpen: false, type: 'single' })} />
          
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                      Verify Delivery Channel
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {dispatchSelection.type === 'single' ? 'Select sending identity for single invoice' : 'Select sending identity for batch run'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDispatchSelection({ isOpen: false, type: 'single' })}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
                  id="btn-close-sender-modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose which verified corporate outbound email address should authorize and dispatch this remittance. This label will be shown in the vendor's mail receipt headers.
              </p>

              {/* Selections list */}
              <div className="space-y-2.5">
                {[
                  {
                    email: currentUserEmail || 'operations@remitflow.co',
                    label: 'Primary RemitFlow Account',
                    desc: 'Default high-delivery corporate finance address.',
                  },
                  {
                    email: 'rudrapratapsingh072006@gmail.com',
                    label: 'Alternative Delivery Channel',
                    desc: 'Secondary transaction channel for fallback routing.',
                  }
                ].map((channel) => {
                  const isSelected = selectedSenderEmail === channel.email;
                  return (
                    <button
                      key={channel.email}
                      type="button"
                      onClick={() => setSelectedSenderEmail(channel.email)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3.5 focus:outline-none cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                      id={`channel-option-${channel.email.replace(/[@.]/g, '-')}`}
                    >
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold leading-none ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {channel.label}
                          </span>
                        </div>
                        <p className={`text-[11px] font-mono font-semibold ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {channel.email}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {channel.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDispatchSelection({ isOpen: false, type: 'single' })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all"
                id="btn-cancel-sender-dispatch"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                id="btn-confirm-sender-dispatch"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
