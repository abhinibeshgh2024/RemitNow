/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  User, 
  DollarSign, 
  X,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Download,
  Layers
} from 'lucide-react';
import { Vendor } from '../types';
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

interface VendorManagementProps {
  vendors: Vendor[];
  onAddVendor: (v: Vendor) => boolean | string; // Returns success or error message
  onUpdateVendor: (oldCode: string, v: Vendor) => boolean | string;
  onDeleteVendor: (code: string) => void;
}

export default function VendorManagement({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
}: VendorManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [formError, setFormError] = useState('');

  // CSV Import state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // CSV Handlers
  const downloadRemittancesStandard = () => {
    const csvContent = [
      'Invoice Number,Vendor Code,Cleared Amount,UTR Number,Payment Date',
      'INV-2026-001,VND-INFOSTAR,5400.00,UTR-COMM-9901,2026-06-25',
      'INV-2026-002,VND-RUDRA,12450.50,UTR-ACME-8812,2026-06-26',
      'INV-2026-003,VND-INFOSTAR,850.00,UTR-MISS-0000,2026-06-27'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '1_standard_remittances_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadVendorsMaster = () => {
    const csvContent = [
      'Vendor Code,Company Name,Email,Contact Person,Phone,Currency',
      'VND-INFOSTAR,Infostar Media Group,infostarmedia133@gmail.com,Finance Director,+1 (555) 019-2834,USD',
      'VND-RUDRA,Rudra Associates,rudrapratapsingh072006@gmail.com,Rudra Pratapsingh,+91 98765 43210,INR',
      'VND-GLOBE,Globe Contractors Ltd,payments@globe.com,Jane Doe,+44 20 7946 0958,GBP'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '2_vendor_master_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCorporateSettlements = () => {
    const csvContent = [
      'Invoice Number,Vendor Code,Cleared Amount,UTR Number,Payment Date',
      'INV-BULK-001,VND-INFOSTAR,25000.00,UTR-B100-9281,2026-06-25',
      'INV-BULK-002,VND-RUDRA,150000.00,UTR-B100-9282,2026-06-26',
      'INV-BULK-003,VND-INFOSTAR,1250.75,UTR-B100-9283,2026-06-27'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '3_corporate_settlements_comprehensive.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllThreeTemplates = () => {
    downloadRemittancesStandard();
    setTimeout(() => downloadVendorsMaster(), 200);
    setTimeout(() => downloadCorporateSettlements(), 400);
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
        const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('vendorid') || h === 'id');
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('company') || h.includes('vendor'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('address'));
        const contactIdx = headers.findIndex(h => h.includes('contact') || h.includes('person') || h.includes('attn'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
        const currencyIdx = headers.findIndex(h => h.includes('currency') || h.includes('curr') || h === 'ccy');

        if (codeIdx === -1 || nameIdx === -1 || emailIdx === -1) {
          setCsvError('Could not find required columns in header. Please ensure your CSV has "Vendor Code", "Company Name", and "Email" headers.');
          return;
        }

        const rows: any[] = [];
        const existingCodes = new Set(vendors.map(v => v.code.toUpperCase()));
        const parsedCodesInBatch = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length < 3) continue; // Skip malformed rows

          const vendorCode = (values[codeIdx] || '').trim().toUpperCase();
          const vendorName = (values[nameIdx] || '').trim();
          const vendorEmail = (values[emailIdx] || '').trim();
          const contactPersonVal = contactIdx !== -1 && values[contactIdx] ? values[contactIdx].trim() : 'Accounts Team';
          const phoneVal = phoneIdx !== -1 && values[phoneIdx] ? values[phoneIdx].trim() : 'N/A';
          const currencyVal = currencyIdx !== -1 && values[currencyIdx] ? values[currencyIdx].trim().toUpperCase() : 'USD';

          const errors: string[] = [];
          if (!vendorCode) {
            errors.push('Missing Vendor Code');
          } else if (existingCodes.has(vendorCode)) {
            errors.push(`Code "${vendorCode}" is already registered`);
          } else if (parsedCodesInBatch.has(vendorCode)) {
            errors.push(`Duplicate code "${vendorCode}" in CSV`);
          }

          if (!vendorName) errors.push('Missing Company Name');
          
          if (!vendorEmail) {
            errors.push('Missing Email Address');
          } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(vendorEmail)) {
              errors.push('Invalid Email Address format');
            }
          }

          const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'JPY'];
          if (currencyVal && !supportedCurrencies.includes(currencyVal)) {
            errors.push(`Unsupported Currency "${currencyVal}"`);
          }

          if (vendorCode) {
            parsedCodesInBatch.add(vendorCode);
          }

          rows.push({
            code: vendorCode,
            name: vendorName,
            email: vendorEmail,
            contactPerson: contactPersonVal,
            phone: phoneVal || 'N/A',
            currency: currencyVal || 'USD',
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
    validRows.forEach((row) => {
      const newVendor: Vendor = {
        code: row.code,
        name: row.name,
        email: row.email,
        phone: row.phone,
        contactPerson: row.contactPerson,
        currency: row.currency,
      };

      const result = onAddVendor(newVendor);
      if (typeof result !== 'string') {
        successCount++;
      }
    });

    setIsCsvModalOpen(false);
    setCsvFile(null);
    setParsedRows([]);
    setCsvError('');
  };

  // Delete modal state
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  // Search filter logic
  const filteredVendors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.phone.includes(q)
    );
  }, [vendors, searchQuery]);

  const handleOpenAddForm = () => {
    setEditingVendor(null);
    setCode('');
    setName('');
    setEmail('');
    setPhone('');
    setContactPerson('');
    setCurrency('USD');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (v: Vendor) => {
    setEditingVendor(v);
    setCode(v.code);
    setName(v.name);
    setEmail(v.email);
    setPhone(v.phone);
    setContactPerson(v.contactPerson);
    setCurrency(v.currency);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Pre-validation
    const cleanCode = code.toUpperCase().trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanContact = contactPerson.trim();

    if (!cleanCode || !cleanName || !cleanEmail || !cleanContact) {
      setFormError('Please fill in all required fields.');
      return;
    }

    // Email pattern check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError('Please provide a valid registered email address.');
      return;
    }

    const newVendor: Vendor = {
      code: cleanCode,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || 'N/A',
      contactPerson: cleanContact,
      currency,
    };

    let result: boolean | string;
    if (editingVendor) {
      result = onUpdateVendor(editingVendor.code, newVendor);
    } else {
      result = onAddVendor(newVendor);
    }

    if (typeof result === 'string') {
      setFormError(result);
    } else {
      setIsFormOpen(false);
      // Reset
      setEditingVendor(null);
    }
  };

  return (
    <div className="space-y-6" id="vendor-management-root">
      {/* Top Banner and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Master Directory</h2>
          <p className="text-sm text-slate-500">
            Maintain official business partner contact registries, communication end-points, and trade currencies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              setCsvFile(null);
              setParsedRows([]);
              setCsvError('');
              setIsCsvModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-full border border-slate-200 transition-colors cursor-pointer shadow-xs"
            id="btn-import-vendor-csv-trigger"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
            id="btn-add-new-vendor"
          >
            <Plus className="h-4 w-4" />
            <span>Register Partner</span>
          </button>
        </div>
      </div>

      {/* Query Bar and Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor code, company name, contact, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-full text-sm outline-none transition-all placeholder:text-slate-400"
            id="vendor-query-bar"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
              id="clear-vendor-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="md:col-span-4 bg-slate-100 rounded-2xl px-6 py-3 flex items-center justify-between border border-slate-200">
          <span className="text-sm font-semibold text-slate-700">Total Partners Listed</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{vendors.length}</span>
        </div>
      </div>

      {/* Vendor List View */}
      {filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-8">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No partner records matched</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm">
            Try adjusting your query term or register a new business partner profile to populate this list.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="vendor-cards-grid">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.code}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300"
              id={`vendor-card-${vendor.code}`}
            >
              <div className="space-y-4">
                {/* Card Title & Code */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-slate-100 text-slate-700 rounded-lg uppercase">
                      {vendor.code}
                    </span>
                    <h4 className="mt-2 text-base font-bold text-slate-900 tracking-tight leading-5">
                      {vendor.name}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold text-xs border border-indigo-100/30">
                    <DollarSign className="h-3.5 w-3.5 shrink-0" />
                    <span>{vendor.currency}</span>
                  </span>
                </div>

                {/* Grid Attributes */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      <span className="text-slate-400">Contact:</span> {vendor.contactPerson}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-indigo-600" title={vendor.email}>
                      {vendor.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      <span className="text-slate-400">Phone:</span> {vendor.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-50">
                <button
                  onClick={() => handleOpenEditForm(vendor)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                  title="Modify Profile"
                  id={`btn-edit-vendor-${vendor.code}`}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteCode(vendor.code)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Remove Vendor"
                  id={`btn-delete-vendor-${vendor.code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Form Overlay / Sidebar Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Form Content Side-Sheet */}
          <div
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10 animate-in slide-in-from-right duration-300"
            id="vendor-form-drawer"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingVendor ? 'Modify Partner Profile' : 'Register New Partner'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fields with asterisks (*) are strictly required.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
                id="btn-close-vendor-form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 leading-relaxed">
                  {formError}
                </div>
              )}

              {/* Vendor Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Vendor Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., VEND-ACME"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editingVendor}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all font-mono uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                  id="input-vendor-code"
                />
                {!editingVendor && (
                  <p className="text-[11px] text-slate-400">
                    A unique corporate code. Cannot be modified after registration.
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all"
                  required
                  id="input-vendor-name"
                />
              </div>

              {/* Registered Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g., accounts@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all"
                  required
                  id="input-vendor-email"
                />
                <p className="text-[11px] text-slate-400">
                  The primary endpoint where payment advice PDFs will be dispatched.
                </p>
              </div>

              {/* Contact Person */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Contact Person / Attn *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Wile E. Coyote"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all"
                  required
                  id="input-vendor-contact"
                />
              </div>

              {/* Primary Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Primary Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g., +1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all"
                  id="input-vendor-phone"
                />
              </div>

              {/* Payment Currency */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Payment Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white rounded-2xl text-sm outline-none transition-all cursor-pointer"
                  id="input-vendor-currency"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="AUD">AUD ($) - Australian Dollar</option>
                  <option value="SGD">SGD ($) - Singapore Dollar</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Standard settlement currency used on advice layouts.
                </p>
              </div>
            </form>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                id="btn-cancel-vendor-form"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-full text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer"
                id="btn-save-vendor-form"
              >
                {editingVendor ? 'Save Changes' : 'Register Partner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Batch Ingestion Drawer */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsCsvModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300" id="vendor-csv-ingestion-drawer">
            {/* Header */}
            <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                  <span>CSV Vendor Master Batch Ingestor</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Bulk-import corporate partner directories securely into the local workspace memory.</p>
              </div>
              <button 
                onClick={() => setIsCsvModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-2 rounded-full transition-colors" 
                id="btn-close-vendor-csv-ingestion"
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
                    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                      handleCsvFileSelected(file);
                    } else {
                      setCsvError('Please drop a valid .csv file.');
                    }
                  }}
                  id="vendor-csv-drag-drop-zone"
                >
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Drag and drop your partner list here</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Select a comma-separated `.csv` containing your vendor details.
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center gap-4 pt-2 w-full">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs hover:shadow transition-all">
                          Browse Files
                          <input 
                            type="file" 
                            accept=".csv,text/csv,application/csv,application/vnd.ms-excel,text/plain" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCsvFileSelected(file);
                              e.target.value = ''; // clears the input so selecting the same file again triggers onChange with no barriers!
                            }}
                          />
                        </label>
                        <button 
                          type="button"
                          onClick={downloadAllThreeTemplates}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100 transition-colors cursor-pointer"
                          id="btn-download-all-three-vendors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download All 3 Templates</span>
                        </button>
                      </div>

                      <div className="w-full max-w-lg mt-4 border-t border-slate-150 pt-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left sm:text-center">Select individual sample templates to download:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={downloadRemittancesStandard}
                            className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer text-left sm:text-center"
                          >
                            <FileSpreadsheet className="h-5 w-5 text-indigo-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-800">1. Standard Remittances</span>
                            <span className="text-[9px] text-slate-400">Basic record format</span>
                          </button>
                          <button
                            type="button"
                            onClick={downloadVendorsMaster}
                            className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer text-left sm:text-center"
                          >
                            <User className="h-5 w-5 text-indigo-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-800">2. Vendor Directory</span>
                            <span className="text-[9px] text-slate-400">With specified emails</span>
                          </button>
                          <button
                            type="button"
                            onClick={downloadCorporateSettlements}
                            className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer text-left sm:text-center"
                          >
                            <Layers className="h-5 w-5 text-indigo-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-800">3. Corporate Batch</span>
                            <span className="text-[9px] text-slate-400">Comprehensive data</span>
                          </button>
                        </div>
                      </div>
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
                      onClick={downloadVendorsMaster}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-semibold text-[11px] transition-colors cursor-pointer"
                      id="btn-download-vendor-sample-csv-inline"
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
                      id="btn-remove-vendor-csv-file"
                    >
                      Choose Different File
                    </button>
                  </div>
                </div>
              )}

              {csvError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 leading-normal flex items-start gap-2.5" id="vendor-csv-error-banner">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Data Table Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-3" id="vendor-csv-preview-table-container">
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
                          <th className="py-3 px-4">Vendor Code</th>
                          <th className="py-3 px-4">Company Name</th>
                          <th className="py-3 px-4">Registered Email</th>
                          <th className="py-3 px-4">Contact Person</th>
                          <th className="py-3 px-4">Phone</th>
                          <th className="py-3 px-4">Currency</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row, index) => {
                          return (
                            <tr key={index} className={`hover:bg-slate-50/40 transition-colors ${!row.isValid ? 'bg-rose-50/20' : ''}`}>
                              <td className="py-3 px-4 font-bold font-mono text-slate-900 uppercase">{row.code || '—'}</td>
                              <td className="py-3 px-4 font-semibold text-slate-800">{row.name || '—'}</td>
                              <td className="py-3 px-4 font-mono text-indigo-600 text-[11px]">{row.email || '—'}</td>
                              <td className="py-3 px-4 text-slate-600">{row.contactPerson || '—'}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{row.phone || '—'}</td>
                              <td className="py-3 px-4 text-slate-700 font-bold font-mono text-[11px]">{row.currency || '—'}</td>
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
                Only valid parsed rows will be imported. Unregistered/duplicate codes or incorrect email formats are highlighted and automatically isolated for protection.
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button 
                  type="button" 
                  onClick={() => setIsCsvModalOpen(false)} 
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  id="btn-cancel-vendor-csv-import"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleImportParsedRows}
                  disabled={parsedRows.filter(r => r.isValid).length === 0}
                  className="px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  id="btn-submit-vendor-csv-import"
                >
                  <Check className="h-4 w-4" />
                  <span>Import {parsedRows.filter(r => r.isValid).length} Valid Partners</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Protective Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={deleteCode !== null}
        onClose={() => setDeleteCode(null)}
        onConfirm={() => {
          if (deleteCode) {
            onDeleteVendor(deleteCode);
            setDeleteCode(null);
          }
        }}
        title="Delete Vendor Profile"
        message={`Are you sure you want to permanently delete vendor code "${deleteCode}"? This action cannot be undone and will prevent automatic identification match-ups during new remittance ingestions.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
