import { useState, useEffect } from 'react';

// Preset Categories
export const CATEGORIES = {
  income: [
    { id: 'pekerjaan', label: 'Gaji / Pekerjaan', color: '#10b981', icon: '💼' },
    { id: 'freelance', label: 'Freelance', color: '#34d399', icon: '💻' },
    { id: 'investasi', label: 'Investasi', color: '#6ee7b7', icon: '📈' },
    { id: 'lain-lain-in', label: 'Lain-lain', color: '#a7f3d0', icon: '💰' },
  ],
  expense: [
    { id: 'makanan', label: 'Makanan & Minuman', color: '#f87171', icon: '🍔' },
    { id: 'tempat-tinggal', label: 'Tempat Tinggal', color: '#fb923c', icon: '🏠' },
    { id: 'transportasi', label: 'Transportasi', color: '#fbbf24', icon: '🚗' },
    { id: 'tagihan', label: 'Tagihan & Utilitas', color: '#60a5fa', icon: '🔌' },
    { id: 'belanja', label: 'Belanja', color: '#c084fc', icon: '🛍️' },
    { id: 'hiburan', label: 'Hiburan', color: '#f472b6', icon: '🎬' },
    { id: 'kesehatan', label: 'Kesehatan', color: '#2dd4bf', icon: '🏥' },
    { id: 'lain-lain-out', label: 'Lain-lain', color: '#9ca3af', icon: '💸' },
  ]
};

// Default Seed/Dummy Data based on June 2026
const getSeedTransactions = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
  const prevYear = now.getMonth() === 0 ? year - 1 : year;

  return [
    // Current Month Seed Data
    {
      id: 'seed-1',
      description: 'Gaji Bulanan Utama',
      amount: 15000000,
      type: 'income',
      category: 'pekerjaan',
      date: `${year}-${month}-01`,
      notes: 'Gaji bulanan dari kantor pusat.'
    },
    {
      id: 'seed-2',
      description: 'Pembayaran Sewa Kost',
      amount: 3500000,
      type: 'expense',
      category: 'tempat-tinggal',
      date: `${year}-${month}-02`,
      notes: 'Pembayaran kost bulanan termasuk air.'
    },
    {
      id: 'seed-3',
      description: 'Belanja Bulanan Supermarket',
      amount: 1200000,
      type: 'expense',
      category: 'makanan',
      date: `${year}-${month}-05`,
      notes: 'Stok beras, minyak, daging, dan sabun.'
    },
    {
      id: 'seed-4',
      description: 'Proyek Website Freelance',
      amount: 4500000,
      type: 'income',
      category: 'freelance',
      date: `${year}-${month}-10`,
      notes: 'DP proyek landing page klien.'
    },
    {
      id: 'seed-5',
      description: 'Tagihan Listrik & Internet',
      amount: 850000,
      type: 'expense',
      category: 'tagihan',
      date: `${year}-${month}-12`,
      notes: 'PLN Token & langganan Indihome.'
    },
    {
      id: 'seed-6',
      description: 'Makan Malam Restoran',
      amount: 600000,
      type: 'expense',
      category: 'makanan',
      date: `${year}-${month}-15`,
      notes: 'Traktir teman ulang tahun.'
    },
    {
      id: 'seed-7',
      description: 'Bensin & Tol Pekanan',
      amount: 450000,
      type: 'expense',
      category: 'transportasi',
      date: `${year}-${month}-18`,
      notes: 'Pengisian Pertamax & top-up e-Toll.'
    },
    {
      id: 'seed-8',
      description: 'Langganan Netflix & Spotify',
      amount: 186000,
      type: 'expense',
      category: 'hiburan',
      date: `${year}-${month}-20`,
      notes: 'Paket premium bulanan.'
    },

    // Previous Month Seed Data
    {
      id: 'seed-prev-1',
      description: 'Gaji Bulanan Utama',
      amount: 15000000,
      type: 'income',
      category: 'pekerjaan',
      date: `${prevYear}-${prevMonth}-01`,
      notes: 'Gaji bulan lalu.'
    },
    {
      id: 'seed-prev-2',
      description: 'Pembayaran Sewa Kost',
      amount: 3500000,
      type: 'expense',
      category: 'tempat-tinggal',
      date: `${prevYear}-${prevMonth}-02`,
      notes: 'Kost.'
    },
    {
      id: 'seed-prev-3',
      description: 'Belanja Sayur & Buah',
      amount: 980000,
      type: 'expense',
      category: 'makanan',
      date: `${prevYear}-${prevMonth}-06`,
      notes: ''
    },
    {
      id: 'seed-prev-4',
      description: 'Tagihan Listrik & WiFi',
      amount: 820000,
      type: 'expense',
      category: 'tagihan',
      date: `${prevYear}-${prevMonth}-11`,
      notes: ''
    },
    {
      id: 'seed-prev-5',
      description: 'Beli Sepatu Olahraga',
      amount: 750000,
      type: 'expense',
      category: 'belanja',
      date: `${prevYear}-${prevMonth}-17`,
      notes: 'Sepatu lari baru.'
    },
    {
      id: 'seed-prev-6',
      description: 'Transportasi Umum',
      amount: 320000,
      type: 'expense',
      category: 'transportasi',
      date: `${prevYear}-${prevMonth}-22`,
      notes: 'KRL & MRT.'
    }
  ];
};

export const useExpenses = () => {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('et_transactions');
    return saved ? JSON.parse(saved) : getSeedTransactions();
  });

  const [budgets, setBudgets] = useState(() => {
    const saved = localStorage.getItem('et_budgets');
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthKey = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`;
    
    if (saved) {
      return JSON.parse(saved);
    } else {
      // Default budgets
      return {
        [currentMonthKey]: 8000000,
        [prevMonthKey]: 7500000,
      };
    }
  });

  // Track currently selected month and year
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0'); // "MM"
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear()); // "YYYY"
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('et_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('et_budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Current Month/Year Key, e.g. "2026-06"
  const currentMonthKey = `${selectedYear}-${selectedMonth}`;

  // Filtered transactions for selected month/year
  const filteredTransactions = transactions.filter(t => {
    const [tYear, tMonth] = t.date.split('-');
    return tYear === selectedYear && tMonth === selectedMonth;
  });

  // Derived financial aggregates
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;
  
  const currentBudget = budgets[currentMonthKey] || 0; // 0 means no budget set

  // CRUD Operations
  const addTransaction = (t) => {
    const newTx = {
      ...t,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      amount: Number(t.amount)
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const editTransaction = (id, updatedTx) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx, amount: Number(updatedTx.amount) } : t));
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateBudget = (limit) => {
    setBudgets(prev => ({
      ...prev,
      [currentMonthKey]: Number(limit)
    }));
  };

  // Export / Import
  const exportData = () => {
    const dataStr = JSON.stringify({ transactions, budgets }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `expense_tracker_backup_${currentMonthKey}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (fileText) => {
    try {
      const parsed = JSON.parse(fileText);
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        setTransactions(parsed.transactions);
      }
      if (parsed.budgets && typeof parsed.budgets === 'object') {
        setBudgets(parsed.budgets);
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'File format JSON tidak valid.' };
    }
  };

  return {
    transactions,
    filteredTransactions,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    currentMonthKey,
    totalIncome,
    totalExpense,
    netBalance,
    currentBudget,
    addTransaction,
    editTransaction,
    deleteTransaction,
    updateBudget,
    exportData,
    importData
  };
};
