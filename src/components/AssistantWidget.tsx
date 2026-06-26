/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, ChevronRight, Sparkles, Building, AlertCircle, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Payment, Vendor } from '../types';

interface AssistantWidgetProps {
  payments: Payment[];
  vendors: Vendor[];
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  options?: string[]; // Quick reply options like WhatsApp interactive buttons
}

export default function AssistantWidget({ payments, vendors }: AssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewBadge, setHasNewBadge] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chatbot conversation
  useEffect(() => {
    const hours = new Date().getHours();
    const greet = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
    
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `*RemitFlow Business Bot* 🟢\n\n${greet}! Welcome to RemitFlow Automated Business Support. This offline chatbot is programmed to assist you instantly with your accounts payable dispatches.\n\nPlease select one of our self-service menu options below:`,
        timestamp: formatTime(new Date()),
        options: [
          '📊 Delivery Stats Summary',
          '👥 Active Vendor Directory',
          '⚙️ Retry & Simulation Help',
          '📝 Excel Ingestion Guide',
          '🔄 Payment Status Codes',
        ],
      },
    ]);
  }, [vendors, payments]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const handleSendMessage = (text: string, isFromOption = false) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!isFromOption) {
      setInputValue('');
    }

    // Trigger typing state
    setIsTyping(true);

    // Simulate WhatsApp-style short automated delay
    setTimeout(() => {
      setIsTyping(false);
      const botResponse = generateBotResponse(text);
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  const generateBotResponse = (input: string): Message => {
    const text = input.toLowerCase();
    const time = formatTime(new Date());
    const id = `bot-${Date.now()}`;

    // Helper menu definitions to cycle back
    const defaultOptions = [
      '📊 Delivery Stats Summary',
      '👥 Active Vendor Directory',
      '⚙️ Retry & Simulation Help',
      '📝 Excel Ingestion Guide',
      '🔄 Payment Status Codes',
    ];

    // 1. Delivery Stats Summary Option
    if (text.includes('stats') || text.includes('delivery stats') || text.includes('1') || text.includes('summary')) {
      const total = payments.length;
      const pending = payments.filter((p) => p.status === 'Unprocessed').length;
      const delivered = payments.filter((p) => p.status === 'Delivered').length;
      const failed = payments.filter((p) => p.status === 'Failed').length;

      return {
        id,
        sender: 'bot',
        text: `*📊 CURRENT SYSTEM HEALTH REPORT*\n\nHere is a real-time summary of your ingested vendor remittances:\n\n• *Total Ingestions:* ${total} advices\n• *Pending Dispatch:* ${pending} (Unprocessed)\n• *Successfully Sent:* ${delivered} dispatches 🟢\n• *Transmission Failed:* ${failed} attempts 🔴\n\n_Auto-retry daemon status: ACTIVE._\n\nTap another option below to continue exploring:`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // 2. Active Vendor Directory Option
    if (text.includes('vendor') || text.includes('directory') || text.includes('active vendor') || text.includes('2')) {
      const vendorList = vendors.slice(0, 5).map((v) => `• *${v.name}* (${v.code})\n  Email: ${v.email}\n  Currency: ${v.currency}`).join('\n\n');
      
      return {
        id,
        sender: 'bot',
        text: `*👥 REGISTERED BUSINESS PARTNERS*\n\nHere are the top active vendors configured in your Master Ledger:\n\n${vendorList}\n\n_Total vendors listed:_ ${vendors.length}.\n\nYou can manage partners directly under the *Vendor Master* tab in your navigation rail!`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // 3. Retry & Simulation Help Option
    if (text.includes('retry') || text.includes('simulation') || text.includes('3') || text.includes('help')) {
      return {
        id,
        sender: 'bot',
        text: `*⚙️ RETRY PLAYGROUND & OFF-LINE DAEMON*\n\nHow background retries are executed in this sandbox:\n\n1. *Simulation Trigger:* Toggle the **"Simulate Transmission Failures"** switch on your sidebar.\n2. *Background Queue:* Failed dispatches are pushed to the **Audit & Engines** ledger with automatic timers.\n3. *Auto-Retry:* The system waits for your configured cooldown (default 5s) and retries automatically!\n4. *Manual Force:* You can click **"Force Retry"** in the ledger to dispatch instantly.`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // 4. Excel Ingestion Guide Option
    if (text.includes('excel') || text.includes('ingestion') || text.includes('4') || text.includes('guide') || text.includes('format')) {
      return {
        id,
        sender: 'bot',
        text: `*📝 REMITTANCE INGESTION SPREADSHEET FORMAT*\n\nYou can copy-paste records directly from Microsoft Excel or CSV spreadsheets under the **Remittance** tab. The expected columns are:\n\n\`Invoice Number  |  Invoice Date  |  Amount  |  Vendor Code  |  Description\`\n\n*Example row:*\n\`INV-88902  |  2026-06-25  |  45000  |  VEND-MICRO  |  Server infrastructure license\`\n\n_The parser automatically sanitizes decimals, currency formatting, and validates corresponding vendor codes from your Ledger._`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // 5. Payment Status Codes Option
    if (text.includes('status') || text.includes('codes') || text.includes('5') || text.includes('meanings')) {
      return {
        id,
        sender: 'bot',
        text: `*🔄 DISPATCH STATUS CODES EXPLAINED*\n\n• **Unprocessed (Pending):** Remittance advice is parsed and ready to be transmitted.\n• **In Progress:** System is actively compiling the high-fidelity PDF advice and communicating with the server.\n• **Delivered:** Successfully sent and documented in transaction history.\n• **Failed:** Delivery crashed due to network timeouts (auto-retry queue takes over).`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // General answers based on keyword matches
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return {
        id,
        sender: 'bot',
        text: `Hello there! How can I help you today? Please tap one of the business options or type a topic like *stats*, *retry*, or *excel*:`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    if (text.includes('pdf') || text.includes('generate')) {
      return {
        id,
        sender: 'bot',
        text: `*📄 HIGH-FIDELITY PDF advices*\n\nRemitFlow compiles vector PDFs client-side dynamically including invoice details, bank codes, professional layout borders, and calculated totals. \n\nYou can click **"View PDF"** on any remittance line to preview or download locally!`,
        timestamp: time,
        options: defaultOptions,
      };
    }

    // Fallback response
    return {
      id,
      sender: 'bot',
      text: `I received your message: "${input}". Since I am an offline assistant, I can best assist you with preprogrammed workflows. \n\nPlease choose an option from the menu below or type *stats*, *excel*, or *retry* for specific guides:`,
      timestamp: time,
      options: defaultOptions,
    };
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasNewBadge(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="assistant-widget-container">
      {/* Floating launcher button */}
      <button
        onClick={toggleChat}
        className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-all relative border-2 border-emerald-500/20"
        id="btn-assistant-launcher"
        title="RemitFlow WhatsApp Business Assistant"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        
        {hasNewBadge && !isOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 text-white font-black text-[10px] flex items-center justify-center rounded-full border border-slate-50 animate-bounce">
            1
          </span>
        )}
      </button>

      {/* Slide up chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-16 right-0 w-92 md:w-100 h-132 bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            id="assistant-chat-panel"
          >
            {/* Chat header: WhatsApp Style */}
            <div className="bg-emerald-700 text-white p-4 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 bg-emerald-800 rounded-full flex items-center justify-center text-emerald-100 font-bold border border-emerald-600">
                  <span>R</span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-400 rounded-full border border-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">RemitFlow Business Assistant</h3>
                  <p className="text-[10px] text-emerald-200 font-medium flex items-center gap-1">
                    <span>Automated Chatbot</span>
                    <span>•</span>
                    <span className="font-bold">Online</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-emerald-100 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat message feed container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 0)', backgroundSize: '12px 12px' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs font-medium shadow-xs leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                    }`}
                  >
                    {/* Render message formatting support */}
                    {msg.text}

                    <div className={`text-[9px] mt-1 text-right block ${msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Render WhatsApp style interactive button list */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 w-full max-w-[85%]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Select an option:
                      </span>
                      {msg.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleSendMessage(opt, true)}
                          className="w-full text-left px-4 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 text-indigo-700 font-semibold rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                        >
                          <span>{opt}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Bot typing simulator */}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-xl rounded-tl-none px-4 py-3 shadow-xs text-xs flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom text Input field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your query here..."
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-2 text-xs font-medium focus:outline-none transition-colors placeholder-slate-400 text-slate-800"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="h-9 w-9 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
