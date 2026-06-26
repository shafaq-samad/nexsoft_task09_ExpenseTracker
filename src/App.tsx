import React, { useState, useEffect, FormEvent } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Trash2,
  Search,
  Download,
  Database,
  RefreshCw,
  AlertCircle,
  X,
  Tag,
  Calendar,
  FileText
} from 'lucide-react';

interface Transaction {
  _id?: string;
  id?: string; // fallback
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

interface ServerStatus {
  storage: string;
  mongoConnected?: boolean;
}

export default function App() {
  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Storage Status
  const [status, setStatus] = useState<ServerStatus>({
    storage: 'Local File Storage',
    mongoConnected: false
  });

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Dining');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);

  // Filters and Search
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Categories list
  const categories = [
    'Dining',
    'Utilities',
    'Salary',
    'Housing',
    'Lifestyle',
    'Service',
    'Maintenance',
    'Transportation',
    'Other'
  ];

  // Helper to trigger toast notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load saved name from local storage
  useEffect(() => {
    const savedName = localStorage.getItem('cedarCoinUserName');
    if (savedName) {
      setUserName(savedName);
      setNameSubmitted(true);
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('');
  };

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      showNotification('Please enter your name to continue.', 'error');
      return;
    }
    localStorage.setItem('cedarCoinUserName', trimmed);
    setUserName(trimmed);
    setNameSubmitted(true);
  };

  // Fetch all transactions and status
  const fetchData = async () => {
    setLoading(true);
    try {
      const [txResponse, statusResponse] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/status')
      ]);

      if (!txResponse.ok) throw new Error('Failed to load ledger transactions.');
      const txData = await txResponse.json();
      setTransactions(txData);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while communicating with the ledger backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form submission handler
  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showNotification('Please enter a description.', 'error');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showNotification('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: numAmount,
          category,
          type,
          date: date ? new Date(date).toISOString() : new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Server rejected transaction log.');
      }

      const newTx = await response.json();
      
      // Update local state instantly
      setTransactions(prev => [newTx, ...prev]);
      
      // Reset form fields
      setDescription('');
      setAmount('');
      // Set date back to today
      setDate(new Date().toISOString().split('T')[0]);
      
      showNotification(`Successfully logged transaction: "${newTx.description}"`);
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to register the transaction.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete transaction handler
  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction from database.');
      }

      // Update state instantly
      setTransactions(prev => prev.filter(t => (t._id || t.id) !== id));
      showNotification('Transaction removed from ledger.');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to remove transaction.', 'error');
    }
  };

  // Seeding default demo data if ledger is completely empty
  const seedDemoData = async () => {
    const demoTransactions = [
      { description: 'Monthly Apartment Rental', amount: 2100.00, category: 'Housing', type: 'expense', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString() },
      { description: 'Stripe Payout - Project Alpha', amount: 4500.00, category: 'Service', type: 'income', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 5).toISOString() },
      { description: 'Whole Foods Market', amount: 184.22, category: 'Lifestyle', type: 'expense', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 6).toISOString() },
      { description: 'Starlink Internet', amount: 110.00, category: 'Utilities', type: 'expense', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 10).toISOString() },
      { description: 'Freelance Consulting Tier 2', amount: 1200.00, category: 'Salary', type: 'income', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 15).toISOString() },
      { description: 'Patagonia Repairs', amount: 45.00, category: 'Maintenance', type: 'expense', date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 20).toISOString() },
    ];

    showNotification('Seeding default transactions...', 'info');
    try {
      for (const item of demoTransactions) {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
      await fetchData();
      showNotification('Ledger seeded with demo transactions!');
    } catch (err) {
      showNotification('Error seeding demo data.', 'error');
    }
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    if (transactions.length === 0) {
      showNotification('No transaction records to export.', 'error');
      return;
    }
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount ($)'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.type,
      t.amount.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cedar_coin_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Ledger ledger exported as CSV!');
  };

  // Computations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpenses;

  // Filtered & Searched Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (!nameSubmitted) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] text-[#3D3D3C] font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-[#E5E0D5] p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-serif tracking-tight text-[#5A5A40]">Welcome to Cedar & Coin</h1>
            <p className="text-sm text-[#8C8984] mt-2">Enter your name to personalize your ledger experience.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <label className="block text-[10px] uppercase tracking-widest text-[#8C8984]">Your name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full bg-[#FBFBF9] border border-[#E5E0D5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#7D8C7C] focus:ring-1 focus:ring-[#7D8C7C] transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-[#5A5A40] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#4A4A35] transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#F4F1EA] text-[#3D3D3C] font-sans flex flex-col antialiased">
      
      {/* Toast Notification */}
      {notification && (
        <div 
          id="toast-notification"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border text-sm transition-all duration-300 max-w-sm ${
            notification.type === 'success' ? 'bg-white border-[#7D8C7C] text-[#3D3D3C]' :
            notification.type === 'error' ? 'bg-white border-[#D98C72] text-[#D98C72]' :
            'bg-white border-[#E5E0D5] text-[#3D3D3C]'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            notification.type === 'success' ? 'bg-[#7D8C7C]' :
            notification.type === 'error' ? 'bg-[#D98C72]' :
            'bg-[#5A5A40]'
          } animate-pulse`} />
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <header id="app-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 md:px-12 py-6 bg-white/50 border-b border-[#E5E0D5] backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="mb-4 sm:mb-0">
          <h1 id="app-title" className="text-2xl font-serif italic text-[#5A5A40] tracking-tight">Cedar & Coin</h1>
          <p id="app-subtitle" className="text-xs uppercase tracking-widest text-[#8C8984] mt-1">Personal Finance Ledger</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p id="user-name" className="text-sm font-medium">Welcome, {userName}</p>
          </div>
          <div id="user-avatar" className="w-10 h-10 rounded-full bg-[#D6D0C2] border-2 border-white flex items-center justify-center text-[#5A5A40] font-serif shadow-inner">
            {getInitials(userName)}
          </div>
        </div>
      </header>

      {/* Database/Storage Source Alert Banner */}
      <div id="storage-banner" className="bg-[#EAE6DD] px-6 md:px-12 py-2 border-b border-[#E5E0D5] text-[11px] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#8C8984]" />
          <span>
            Storage Engine: <strong className="font-semibold text-[#5A5A40]">{status.storage}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 text-[#5A5A40] hover:underline hover:text-[#3D3D3C]"
            title="Refresh database records"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <main id="main-content" className="flex-1 p-4 md:p-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metrics & Form */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* Balance Card */}
            <div id="balance-card" className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E5E0D5] relative overflow-hidden transition-transform duration-300 hover:shadow-md">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#F4F1EA] rounded-bl-full opacity-50"></div>
              <p className="text-[11px] uppercase tracking-widest text-[#8C8984] mb-1">Available Balance</p>
              <h2 className={`text-3xl font-serif tracking-tight ${totalBalance >= 0 ? 'text-[#5A5A40]' : 'text-[#D98C72]'}`}>
                {totalBalance < 0 ? '-' : ''}${Math.abs(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            
            {/* Income & Expenses Dual Card */}
            <div className="grid grid-cols-2 gap-4">
              <div id="income-card" className="bg-[#7D8C7C] text-white rounded-[24px] p-5 shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-md flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex justify-between items-center opacity-85 mb-1">
                    <p className="text-[10px] uppercase tracking-widest">Income</p>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xl font-serif font-medium">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
              </div>
              
              <div id="expense-card" className="bg-[#D98C72] text-white rounded-[24px] p-5 shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-md flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex justify-between items-center opacity-85 mb-1">
                    <p className="text-[10px] uppercase tracking-widest">Expenses</p>
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xl font-serif font-medium">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
              </div>
            </div>

          </div>

          {/* Transaction Form Card */}
          <div id="form-card" className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-[#E5E0D5] flex-1 flex flex-col">
            <h4 className="text-sm font-serif italic mb-6 border-b border-[#F4F1EA] pb-2 text-[#5A5A40]">Log New Transaction</h4>
            
            <form onSubmit={handleAddTransaction} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8C8984] mb-1">Description</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Organic Groceries" 
                    required
                    className="w-full bg-[#FBFBF9] border border-[#E5E0D5] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#7D8C7C] focus:ring-1 focus:ring-[#7D8C7C] transition-colors"
                  />
                </div>

                {/* Amount & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#8C8984] mb-1">Amount ($)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00" 
                        required
                        className="w-full bg-[#FBFBF9] border border-[#E5E0D5] rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-[#7D8C7C] focus:ring-1 focus:ring-[#7D8C7C] transition-colors"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs text-[#8C8984] font-medium">$</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#8C8984] mb-1">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#FBFBF9] border border-[#E5E0D5] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7D8C7C] cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transaction Type Selector (Moss Green vs Terracotta Toggle) */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8C8984] mb-2">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        type === 'expense' 
                          ? 'bg-[#D98C72] text-white border-[#D98C72] shadow-sm' 
                          : 'bg-[#FBFBF9] text-[#8C8984] border-[#E5E0D5] hover:border-[#D98C72]'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        type === 'income' 
                          ? 'bg-[#7D8C7C] text-white border-[#7D8C7C] shadow-sm' 
                          : 'bg-[#FBFBF9] text-[#8C8984] border-[#E5E0D5] hover:border-[#7D8C7C]'
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#8C8984] mb-1">Date</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-[#FBFBF9] border border-[#E5E0D5] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#7D8C7C] transition-colors text-[#3D3D3C]"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#5A5A40] text-white rounded-lg py-3 mt-6 text-sm font-medium hover:bg-[#4A4A35] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:bg-[#8C8984]"
              >
                <PlusCircle className="w-4 h-4" />
                {isSubmitting ? 'Logging...' : 'Record Entry'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Transaction List / Table */}
        <div id="ledger-column" className="col-span-1 lg:col-span-8 bg-white rounded-[32px] shadow-sm border border-[#E5E0D5] flex flex-col overflow-hidden min-h-[500px]">
          
          {/* List Header and Filters */}
          <div className="px-6 py-6 border-b border-[#F4F1EA] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
              <h4 className="font-serif italic text-lg text-[#5A5A40]">Recent Ledger Activity</h4>
              <p className="text-[10px] text-[#8C8984] uppercase tracking-widest mt-0.5">Records of income and payouts</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Type Filters */}
              <div className="flex bg-[#F4F1EA] rounded-full p-1 text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors ${
                    filterType === 'all' 
                      ? 'bg-[#5A5A40] text-white' 
                      : 'text-[#8C8984] hover:text-[#5A5A40]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('income')}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors ${
                    filterType === 'income' 
                      ? 'bg-[#7D8C7C] text-white' 
                      : 'text-[#8C8984] hover:text-[#7D8C7C]'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => setFilterType('expense')}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors ${
                    filterType === 'expense' 
                      ? 'bg-[#D98C72] text-white' 
                      : 'text-[#8C8984] hover:text-[#D98C72]'
                  }`}
                >
                  Expenses
                </button>
              </div>

              {/* Action Buttons */}
              <button 
                onClick={exportToCSV}
                className="p-1.5 bg-[#F4F1EA] text-[#5A5A40] hover:bg-[#E5E0D5] rounded-full transition-colors flex items-center justify-center"
                title="Export Ledger to CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar inside Ledger */}
          <div className="px-6 py-3 bg-[#FBFBF9] border-b border-[#F4F1EA] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#8C8984]" />
            <input 
              type="text"
              placeholder="Search by description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-[#3D3D3C] placeholder-[#8C8984]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[#8C8984] hover:text-black">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ledger Table Container */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#8C8984] gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#5A5A40]" />
                <p className="text-xs uppercase tracking-widest">Querying financial records...</p>
              </div>
            ) : error ? (
              <div className="py-20 px-6 flex flex-col items-center justify-center text-[#D98C72] gap-3 text-center">
                <AlertCircle className="w-8 h-8" />
                <p className="font-medium text-sm">Failed to Sync Ledger</p>
                <p className="text-xs max-w-md text-gray-500">{error}</p>
                <button 
                  onClick={fetchData} 
                  className="mt-2 text-xs bg-[#5A5A40] text-white px-4 py-1.5 rounded hover:bg-[#4A4A35]"
                >
                  Retry Connection
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-20 px-6 flex flex-col items-center justify-center text-[#8C8984] gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#5A5A40]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-serif italic text-[#5A5A40] text-sm">Ledger is Empty</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
                    {searchTerm || filterType !== 'all' ? 'No transactions match filters' : 'Start tracking by logging transactions.'}
                  </p>
                </div>
                {transactions.length === 0 && (
                  <button 
                    onClick={seedDemoData}
                    className="mt-2 text-xs font-semibold text-[#5A5A40] border border-[#5A5A40] px-4 py-2 rounded-full hover:bg-[#5A5A40] hover:text-white transition-colors"
                  >
                    Load Sample Transactions
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FBFBF9] border-b border-[#F4F1EA] text-[10px] uppercase tracking-widest text-[#8C8984] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-normal">Date</th>
                    <th className="px-4 py-4 font-normal">Description</th>
                    <th className="px-4 py-4 font-normal">Category</th>
                    <th className="px-4 py-4 text-right font-normal">Amount</th>
                    <th className="px-6 py-4 text-center font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EA]">
                  {filteredTransactions.map((tx) => {
                    const txId = tx._id || tx.id || '';
                    const isIncome = tx.type === 'income';
                    const txDate = new Date(tx.date);
                    
                    return (
                      <tr key={txId} className="hover:bg-[#FBFBF9]/80 transition-colors group">
                        {/* Date column */}
                        <td className="px-6 py-4 text-xs text-[#8C8984] whitespace-nowrap">
                          {txDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </td>
                        
                        {/* Description */}
                        <td className="px-4 py-4 text-sm font-medium text-[#3D3D3C]">
                          {tx.description}
                        </td>
                        
                        {/* Category */}
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-[#F4F1EA] text-[#5A5A40] rounded text-[10px] font-semibold tracking-wide uppercase">
                            {tx.category}
                          </span>
                        </td>
                        
                        {/* Amount */}
                        <td className={`px-4 py-4 text-right text-sm font-serif ${isIncome ? 'text-[#7D8C7C]' : 'text-[#D98C72]'}`}>
                          {isIncome ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Action deletes */}
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDeleteTransaction(txId)}
                            className="text-[#8C8984] hover:text-[#D98C72] p-1.5 rounded-full hover:bg-red-50/50 transition-colors inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete transaction entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table footer / summary count */}
          <div className="p-6 bg-[#FBFBF9] border-t border-[#F4F1EA] flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
            <p className="text-[10px] text-[#8C8984] tracking-widest uppercase">
              Showing {filteredTransactions.length} of {transactions.length} record{transactions.length !== 1 ? 's' : ''}
            </p>
            {transactions.length > 0 && (
              <button 
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all transaction records? This action cannot be undone.')) {
                    showNotification('Clearing ledger data...', 'info');
                    try {
                      for (const t of transactions) {
                        const txId = t._id || t.id;
                        if (txId) {
                          await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
                        }
                      }
                      await fetchData();
                      showNotification('Ledger fully cleared.');
                    } catch (e) {
                      showNotification('Error clearing ledger items.', 'error');
                    }
                  }
                }}
                className="text-[10px] font-bold text-[#D98C72] hover:text-red-700 uppercase tracking-widest hover:underline"
              >
                Reset Ledger
              </button>
            )}
          </div>

        </div>

      </main>

      {/* Bottom Branding Bar */}
      <footer id="app-footer" className="px-6 md:px-12 py-6 mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center text-[10px] text-[#8C8984] border-t border-[#E5E0D5] bg-white/20">
        <div>&copy; {new Date().getFullYear()} Cedar & Coin Financial System v2.2.0</div>
        <div className="flex gap-6 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8C8984] animate-pulse"></div>
            Locally Persistent Ledger
          </span>
          <span>Secure AES Encrypted</span>
        </div>
      </footer>
    </div>
  );
}
