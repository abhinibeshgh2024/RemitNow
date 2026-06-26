/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Mail, Phone, User, DollarSign, X } from 'lucide-react';
import { Vendor } from '../types';
import ConfirmationModal from './Modal';

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
        <button
          onClick={handleOpenAddForm}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all cursor-pointer self-start md:self-auto"
          id="btn-add-new-vendor"
        >
          <Plus className="h-4 w-4" />
          <span>Register Partner</span>
        </button>
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
