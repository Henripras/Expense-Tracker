import { db } from './firebase.js';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// Unique Sync Code setup
const DEFAULT_SYNC_CODE = 'FN-UTAMA';
let syncCode = localStorage.getItem('et_sync_code');
const isCustomized = localStorage.getItem('et_sync_customized') === 'true';

// If no sync code is set, or if the user is using a legacy random code and hasn't customized it,
// we default to 'FN-UTAMA' so that all their devices automatically sync out-of-the-box.
if (!syncCode || (!isCustomized && syncCode !== DEFAULT_SYNC_CODE)) {
  syncCode = DEFAULT_SYNC_CODE;
  localStorage.setItem('et_sync_code', syncCode);
}

let lastSyncTimestamp = Number(localStorage.getItem('et_last_sync_time') || '0');
let unsubscribeSync = null;
let isUpdatingFromSync = false;

// Preset Categories
const CATEGORIES = {
  income: [
    { id: 'pekerjaan', label: 'Gaji / Pekerjaan', color: '#10b981', icon: '💼' },
    { id: 'freelance', label: 'Freelance', color: '#34d399', icon: '💻' },
    { id: 'investasi', label: 'Investasi', color: '#6ee7b7', icon: '📈' },
    { id: 'jualan', label: 'Jualan', color: '#ec4899', icon: '🏪' },
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
    { id: 'nabung', label: 'Nabung', color: '#06b6d4', icon: '🐷' },
    { id: 'pembayaran', label: 'Pembayaran', color: '#818cf8', icon: '💳' },
    { id: 'lain-lain-out', label: 'Lain-lain', color: '#9ca3af', icon: '💸' },
  ]
};

// Seed/Mock Data for both accounts
const getSeedTransactions = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    // --- AKUN GAJI (Personal) ---
    {
      id: 'gaji-seed-1',
      description: 'Gaji Bulanan Utama',
      amount: 15000000,
      type: 'income',
      category: 'pekerjaan',
      date: `${year}-${month}-01`,
      notes: 'Gaji pokok bulanan masuk rekening utama.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-2',
      description: 'Bonus Keberhasilan Projek',
      amount: 3000000,
      type: 'income',
      category: 'pekerjaan',
      date: `${year}-${month}-15`,
      notes: 'Bonus keberhasilan rilis aplikasi.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-3',
      description: 'Bayar Sewa Kost',
      amount: 3000000,
      type: 'expense',
      category: 'tempat-tinggal',
      date: `${year}-${month}-02`,
      notes: 'Sewa kamar kost bulanan.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-4',
      description: 'Belanja Sayur & Sembako',
      amount: 1500000,
      type: 'expense',
      category: 'makanan',
      date: `${year}-${month}-05`,
      notes: 'Kebutuhan makan dan dapur bulanan.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-5',
      description: 'Tagihan WiFi & Token Listrik',
      amount: 750000,
      type: 'expense',
      category: 'tagihan',
      date: `${year}-${month}-10`,
      notes: 'Indihome & PLN.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-6',
      description: 'Makan Malam Restoran',
      amount: 500000,
      type: 'expense',
      category: 'makanan',
      date: `${year}-${month}-18`,
      notes: 'Traktir keluarga di restoran.',
      account: 'gaji'
    },
    {
      id: 'gaji-seed-7',
      description: 'Tiket Nonton Bioskop & Jajan',
      amount: 150000,
      type: 'expense',
      category: 'hiburan',
      date: `${year}-${month}-20`,
      notes: 'Beli tiket IMAX & popcorn.',
      account: 'gaji'
    },

    // --- AKUN JUALAN (Store Business) ---
    {
      id: 'jualan-seed-1',
      description: 'Penjualan Produk Sepatu',
      amount: 8500000,
      type: 'income',
      category: 'freelance',
      date: `${year}-${month}-03`,
      notes: 'Pesanan grosir 10 pasang sepatu.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-2',
      description: 'Omset Harian Marketplace',
      amount: 6200000,
      type: 'income',
      category: 'freelance',
      date: `${year}-${month}-12`,
      notes: 'Pencairan saldo Shopee & Tokopedia.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-3',
      description: 'Pemasukan Agen Reseller',
      amount: 3800000,
      type: 'income',
      category: 'freelance',
      date: `${year}-${month}-22`,
      notes: 'Setoran penjualan reseller Bandung.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-4',
      description: 'Kulakan Bahan Baku Sepatu',
      amount: 4200000,
      type: 'expense',
      category: 'belanja',
      date: `${year}-${month}-04`,
      notes: 'Beli kulit sintetis & sol karet.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-5',
      description: 'Ongkir Ekspedisi Pengiriman',
      amount: 850000,
      type: 'expense',
      category: 'transportasi',
      date: `${year}-${month}-08`,
      notes: 'Ongkos kirim paket pelanggan J&T.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-6',
      description: 'Biaya Iklan Facebook Ads',
      amount: 1200000,
      type: 'expense',
      category: 'lain-lain-out',
      date: `${year}-${month}-15`,
      notes: 'Iklan kampanye iklan produk baru.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-7',
      description: 'Beli Dus & Lakban Packing',
      amount: 600000,
      type: 'expense',
      category: 'belanja',
      date: `${year}-${month}-18`,
      notes: 'Kardus packing ukuran sedang.',
      account: 'jualan'
    },
    {
      id: 'jualan-seed-8',
      description: 'Perpanjangan Hosting Toko Online',
      amount: 350000,
      type: 'expense',
      category: 'tagihan',
      date: `${year}-${month}-20`,
      notes: 'Sewa server website domain.',
      account: 'jualan'
    }
  ];
};

const getSeedBudgets = () => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    [`gaji_${monthKey}`]: 6000000,
    [`jualan_${monthKey}`]: 10000000
  };
};

// Global App State
const hasInitialized = localStorage.getItem('et_initialized');

let transactions = [];
let budgets = {};

if (hasInitialized) {
  transactions = localStorage.getItem('et_transactions') 
    ? JSON.parse(localStorage.getItem('et_transactions')) 
    : [];
  budgets = localStorage.getItem('et_budgets') 
    ? JSON.parse(localStorage.getItem('et_budgets')) 
    : {};
} else {
  // First time load: use seed data
  transactions = getSeedTransactions();
  budgets = getSeedBudgets();
  localStorage.setItem('et_transactions', JSON.stringify(transactions));
  localStorage.setItem('et_budgets', JSON.stringify(budgets));
  localStorage.setItem('et_initialized', 'true');
}

const now = new Date();
let selectedMonth = localStorage.getItem('et_selected_month');
let selectedYear = localStorage.getItem('et_selected_year');

if (!selectedMonth || !selectedYear) {
  if (transactions && transactions.length > 0) {
    // Sort transactions by date descending to find the latest active transaction date
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestTx = sortedTxs[0];
    const dateParts = latestTx.date.split('-');
    if (dateParts.length >= 2) {
      selectedYear = dateParts[0];
      selectedMonth = dateParts[1];
    }
  }
  
  // Fallback if still not set
  if (!selectedMonth) {
    selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
  }
  if (!selectedYear) {
    selectedYear = String(now.getFullYear());
  }
}

// Form Editing Temp State
let editingTxId = null;
let currentFormType = 'expense';
const hoveredCategory = {
  gaji: null,
  jualan: null
};

// Helpers
const formatIDR = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDateID = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
};

const formatNumberInput = (value) => {
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(clean);
};

const getRawNumber = (formattedStr) => {
  if (!formattedStr) return 0;
  return Number(String(formattedStr).replace(/\./g, '')) || 0;
};

// Static DOM Elements Mapping Utility
const getDomForAccount = (acc) => {
  return {
    valIncome: document.getElementById(`val-${acc}-income`),
    valExpense: document.getElementById(`val-${acc}-expense`),
    valBalance: document.getElementById(`val-${acc}-balance`),
    iconBalanceWrapper: document.getElementById(`icon-${acc}-balance-wrapper`),
    
    valBudget: document.getElementById(`val-${acc}-budget`),
    btnEditBudget: document.getElementById(`btn-edit-${acc}-budget`),
    budgetDisplayView: document.getElementById(`${acc}-budget-display-view`),
    budgetProgressSec: document.getElementById(`${acc}-budget-progress-sec`),
    budgetProgressFill: document.getElementById(`${acc}-budget-progress-fill`),
    budgetPercentText: document.getElementById(`${acc}-budget-percent-text`),
    budgetStatusText: document.getElementById(`${acc}-budget-status-text`),
    budgetEmptyDesc: document.getElementById(`${acc}-budget-empty-desc`),
    budgetEditForm: document.getElementById(`${acc}-budget-edit-form`),
    inputBudgetLimit: document.getElementById(`input-${acc}-budget-limit`),
    btnCancelBudget: document.getElementById(`btn-cancel-${acc}-budget`),
    
    inputSearch: document.getElementById(`${acc}-input-search`),
    filterType: document.getElementById(`${acc}-filter-type`),
    filterCategory: document.getElementById(`${acc}-filter-category`),
    filterSort: document.getElementById(`${acc}-filter-sort`),
    txCountIndicator: document.getElementById(`${acc}-tx-count-indicator`),
    transactionsContainer: document.getElementById(`${acc}-transactions-container`),
    
    donutGroup: document.getElementById(`${acc}-donut-sectors-group`),
    lblCenter: document.getElementById(`${acc}-chart-center-label`),
    valCenter: document.getElementById(`${acc}-chart-center-value`),
    pctCenter: document.getElementById(`${acc}-chart-center-percent`),
    legendContainer: document.getElementById(`${acc}-chart-legend`),
    progressList: document.getElementById(`${acc}-category-bar-list`),
    activeAnalyticsView: document.getElementById(`${acc}-analytics-active-view`),
    emptyAnalyticsView: document.getElementById(`${acc}-analytics-empty-view`),
  };
};

const selectMonth = document.getElementById('select-month');
const selectYear = document.getElementById('select-year');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');

const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFileInput = document.getElementById('import-file-input');
const btnAddTransaction = document.getElementById('btn-add-transaction');

const transactionModal = document.getElementById('transaction-modal');
const modalTitle = document.getElementById('modal-title');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnTypeIncome = document.getElementById('btn-type-income');
const btnTypeExpense = document.getElementById('btn-type-expense');
const transactionForm = document.getElementById('transaction-form');
const inputTxId = document.getElementById('input-tx-id');
const inputAccount = document.getElementById('input-account');
const inputDescription = document.getElementById('input-description');
const inputAmount = document.getElementById('input-amount');
const inputDate = document.getElementById('input-date');
const inputCategory = document.getElementById('input-category');
const inputNotes = document.getElementById('input-notes');

// Save states to localstorage and sync to cloud
const saveToLocalStorage = (skipCloudSync = false) => {
  localStorage.setItem('et_transactions', JSON.stringify(transactions));
  localStorage.setItem('et_budgets', JSON.stringify(budgets));
  
  if (!skipCloudSync && syncCode) {
    const nowTime = Date.now();
    lastSyncTimestamp = nowTime;
    localStorage.setItem('et_last_sync_time', String(nowTime));
    
    // Save to Firestore
    const docRef = doc(db, 'sync', syncCode);
    setDoc(docRef, {
      transactions,
      budgets,
      updatedAt: nowTime
    }).catch(err => {
      console.error('Failed to sync to cloud:', err);
    });
  }
};

const setupFirebaseListener = () => {
  if (unsubscribeSync) {
    unsubscribeSync();
  }
  
  const docRef = doc(db, 'sync', syncCode);
  unsubscribeSync = onSnapshot(docRef, (docSnap) => {
    if (isUpdatingFromSync) return;
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const cloudTransactions = data.transactions || [];
      const cloudBudgets = data.budgets || {};
      
      const localTxsStr = localStorage.getItem('et_transactions') || '[]';
      const localBudgetsStr = localStorage.getItem('et_budgets') || '{}';
      
      const cloudTxsStr = JSON.stringify(cloudTransactions);
      const cloudBudgetsStr = JSON.stringify(cloudBudgets);
      
      // Compare actual data changes rather than client timestamps to prevent clock-skew sync failure
      if (localTxsStr !== cloudTxsStr || localBudgetsStr !== cloudBudgetsStr) {
        console.log('Syncing updates from cloud database...');
        isUpdatingFromSync = true;
        
        transactions = cloudTransactions;
        budgets = cloudBudgets;
        lastSyncTimestamp = data.updatedAt || Date.now();
        
        localStorage.setItem('et_last_sync_time', String(lastSyncTimestamp));
        saveToLocalStorage(true); // Save to local but skip pushing back to cloud
        
        renderAll();
        
        isUpdatingFromSync = false;
      }
    } else {
      // Document does not exist on cloud yet, push initial local data
      console.log('Initializing cloud sync document with local state...');
      saveToLocalStorage(false);
    }
  }, (err) => {
    console.error('Firestore listener error:', err);
  });
};

const connectToSyncCode = async (newCode) => {
  newCode = newCode.trim().toUpperCase();
  if (!newCode.startsWith('FN-') || newCode.length !== 9) {
    alert('Format Kode Sinkronisasi salah! Contoh: FN-A1B2C3');
    return;
  }
  
  if (confirm(`Apakah Anda yakin ingin menyinkronkan dengan perangkat "${newCode}"? Data lokal saat ini akan digabungkan dengan data dari cloud.`)) {
    const docRef = doc(db, 'sync', newCode);
    try {
      const docSnap = await getDoc(docRef);
      let cloudTransactions = [];
      let cloudBudgets = {};
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        cloudTransactions = data.transactions || [];
        cloudBudgets = data.budgets || {};
      }
      
      // Merge unique transactions
      const mergedTxs = [...transactions];
      cloudTransactions.forEach(ctx => {
        if (!mergedTxs.some(lx => lx.id === ctx.id)) {
          mergedTxs.push(ctx);
        }
      });
      
      // Merge budgets
      const mergedBudgets = { ...budgets, ...cloudBudgets };
      
      transactions = mergedTxs;
      budgets = mergedBudgets;
      syncCode = newCode;
      
      localStorage.setItem('et_sync_code', syncCode);
      localStorage.setItem('et_sync_customized', 'true');
      localStorage.setItem('et_initialized', 'true');
      
      saveToLocalStorage(false); 
      setupFirebaseListener();
      
      document.getElementById('sync-code-display').innerText = syncCode;
      document.getElementById('input-sync-code').value = '';
      alert(`Berhasil terhubung ke perangkat: ${syncCode}! Data telah disinkronkan.`);
      
      renderAll();
    } catch (err) {
      console.error('Failed to connect sync code:', err);
      alert('Gagal menghubungkan ke database cloud. Pastikan internet Anda aktif.');
    }
  }
};

const initSyncCodeUI = () => {
  const syncDisplay = document.getElementById('sync-code-display');
  const btnCopySync = document.getElementById('btn-copy-sync-code');
  const btnConnectSync = document.getElementById('btn-connect-sync');
  const inputSyncCode = document.getElementById('input-sync-code');

  if (syncDisplay) {
    syncDisplay.innerText = syncCode;
  }

  if (btnCopySync) {
    btnCopySync.addEventListener('click', () => {
      navigator.clipboard.writeText(syncCode)
        .then(() => {
          alert('Kode Sinkronisasi berhasil disalin ke clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          const tempInput = document.createElement('input');
          tempInput.value = syncCode;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          alert('Kode Sinkronisasi berhasil disalin!');
        });
    });
  }

  if (btnConnectSync && inputSyncCode) {
    btnConnectSync.addEventListener('click', () => {
      const code = inputSyncCode.value;
      if (!code) {
        alert('Masukkan Kode Sinkronisasi tujuan terlebih dahulu!');
        return;
      }
      connectToSyncCode(code);
    });
  }
};

// Initialize Year Dropdowns
const initSelectors = () => {
  const currentY = new Date().getFullYear();
  const years = [];
  for (let y = currentY - 4; y <= currentY + 4; y++) {
    years.push(String(y));
  }
  if (!years.includes(selectedYear)) {
    years.push(selectedYear);
    years.sort();
  }

  selectYear.innerHTML = '';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = y;
    opt.style.background = '#1f2937';
    opt.style.color = 'white';
    selectYear.appendChild(opt);
  });
  
  selectMonth.value = selectedMonth;
  selectYear.value = selectedYear;
};

// CRUD Operations
const autoNavigateToDate = (dateStr) => {
  if (!dateStr) return;
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const [year, month] = parts;
    selectedMonth = month;
    selectedYear = year;
    
    // Save to localStorage
    localStorage.setItem('et_selected_month', selectedMonth);
    localStorage.setItem('et_selected_year', selectedYear);
    
    // Update dropdown UI
    initSelectors();
  }
};

const addTransaction = (data) => {
  const newTx = {
    id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    ...data
  };
  transactions.unshift(newTx);
  saveToLocalStorage();
  autoNavigateToDate(data.date);
  renderAll();
};

const editTransaction = (id, data) => {
  transactions = transactions.map(t => t.id === id ? { ...t, ...data } : t);
  saveToLocalStorage();
  autoNavigateToDate(data.date);
  renderAll();
};

const deleteTransaction = (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    renderAll();
  }
};

// Render Functions for a specific account ('gaji' or 'jualan')
const renderDashboard = (acc, filteredTxs, budgetLimit) => {
  const dom = getDomForAccount(acc);
  
  const totalIncome = filteredTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filteredTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;

  // Set values
  dom.valIncome.innerText = formatIDR(totalIncome);
  dom.valExpense.innerText = formatIDR(totalExpense);
  dom.valBalance.innerText = formatIDR(netBalance);

  // Style Net Balance
  if (netBalance >= 0) {
    dom.valBalance.style.color = 'var(--income)';
    dom.iconBalanceWrapper.style.background = 'var(--income-bg)';
    dom.iconBalanceWrapper.style.borderColor = 'var(--income-border)';
    dom.iconBalanceWrapper.style.color = 'var(--income)';
  } else {
    dom.valBalance.style.color = 'var(--expense)';
    dom.iconBalanceWrapper.style.background = 'var(--expense-bg)';
    dom.iconBalanceWrapper.style.borderColor = 'var(--expense-border)';
    dom.iconBalanceWrapper.style.color = 'var(--expense)';
  }

  // Budget card UI
  if (budgetLimit > 0) {
    dom.valBudget.innerText = formatIDR(budgetLimit);
    dom.budgetProgressSec.style.display = 'block';
    dom.budgetEmptyDesc.style.display = 'none';

    const percent = Math.min((totalExpense / budgetLimit) * 100, 100);
    dom.budgetPercentText.innerText = `${percent.toFixed(0)}%`;
    dom.budgetProgressFill.style.width = `${percent}%`;

    const isOver = totalExpense > budgetLimit;
    const isNear = !isOver && (totalExpense / budgetLimit) >= 0.85;

    if (isOver) {
      dom.budgetProgressFill.style.backgroundColor = 'var(--expense)';
      dom.budgetStatusText.innerText = 'Melebihi Anggaran!';
      dom.budgetStatusText.style.color = 'var(--expense)';
    } else if (isNear) {
      dom.budgetProgressFill.style.backgroundColor = 'var(--warning)';
      dom.budgetStatusText.innerText = 'Mendekati Batas!';
      dom.budgetStatusText.style.color = 'var(--warning)';
    } else {
      dom.budgetProgressFill.style.backgroundColor = 'var(--primary)';
      dom.budgetStatusText.innerText = 'Pemakaian Anggaran';
      dom.budgetStatusText.style.color = 'var(--text-secondary)';
    }
  } else {
    dom.valBudget.innerText = 'Belum Diatur';
    dom.budgetProgressSec.style.display = 'none';
    dom.budgetEmptyDesc.style.display = 'block';
  }
};

const populateCategoryFilterOptions = (acc) => {
  const dom = getDomForAccount(acc);
  const activeType = dom.filterType.value;
  const currentSelectedCat = dom.filterCategory.value;

  dom.filterCategory.innerHTML = '<option value="all">Semua Kategori</option>';

  const list = activeType === 'all'
    ? [...CATEGORIES.income, ...CATEGORIES.expense]
    : CATEGORIES[activeType];

  const uniqueCats = [];
  const map = new Map();
  for (const item of list) {
    if(!map.has(item.id)){
      map.set(item.id, true);
      uniqueCats.push(item);
    }
  }

  uniqueCats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.innerText = `${cat.icon} ${cat.label}`;
    dom.filterCategory.appendChild(opt);
  });

  if (Array.from(dom.filterCategory.options).some(o => o.value === currentSelectedCat)) {
    dom.filterCategory.value = currentSelectedCat;
  } else {
    dom.filterCategory.value = 'all';
  }
};

const renderTransactions = (acc, filteredTxs) => {
  const dom = getDomForAccount(acc);
  
  const search = dom.inputSearch.value.trim().toLowerCase();
  const typeF = dom.filterType.value;
  const categoryF = dom.filterCategory.value;
  const sortF = dom.filterSort.value;

  // Apply filters
  let processed = filteredTxs.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search) || 
                          (t.notes && t.notes.toLowerCase().includes(search));
    const matchesType = typeF === 'all' ? true : t.type === typeF;
    const matchesCategory = categoryF === 'all' ? true : t.category === categoryF;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Update count indicator
  dom.txCountIndicator.innerText = `Menampilkan ${processed.length} transaksi`;

  // Apply sorting
  processed.sort((a, b) => {
    if (sortF === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortF === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortF === 'amount-desc') return b.amount - a.amount;
    if (sortF === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  // Render HTML
  if (processed.length === 0) {
    dom.transactionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💸</div>
        <h3>Tidak ada transaksi ditemukan</h3>
        <p style="font-size: 0.85rem;">Coba ubah filter pencarian Anda atau buat transaksi baru.</p>
      </div>
    `;
    return;
  }

  dom.transactionsContainer.innerHTML = '';
  processed.forEach(t => {
    const list = CATEGORIES[t.type] || [];
    let cat = list.find(c => c.id === t.category);
    if (!cat) {
      const oppositeList = t.type === 'income' ? CATEGORIES.expense : CATEGORIES.income;
      cat = oppositeList.find(c => c.id === t.category) || { label: 'Lain-lain', color: '#9ca3af', icon: '💸' };
    }

    const row = document.createElement('div');
    row.className = 'tx-row';
    row.innerHTML = `
      <div class="tx-info-left">
        <div class="tx-category-badge" style="background-color: ${cat.color}15; border: 1px solid ${cat.color}30; color: ${cat.color};">
          ${cat.icon}
        </div>
        <div class="tx-details">
          <span class="tx-title" title="${t.description}">${t.description}</span>
          <div class="tx-meta">
            <span class="tx-meta-date">${formatDateID(t.date)}</span>
            <span class="tx-meta-cat">${cat.label}</span>
          </div>
          ${t.notes ? `<span class="tx-notes-bubble" title="${t.notes}">📝 ${t.notes}</span>` : ''}
        </div>
      </div>
      <div class="tx-amount-right">
        <span class="tx-amount ${t.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense'}">
          ${t.type === 'income' ? '+' : '-'} ${formatIDR(t.amount)}
        </span>
        <div class="tx-actions">
          <button class="btn btn-outline btn-icon btn-edit-tx" data-id="${t.id}" title="Edit Transaksi" style="width: 28px; height: 28px; border-radius: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
            </svg>
          </button>
          <button class="btn btn-danger-outline btn-icon btn-delete-tx" data-id="${t.id}" title="Hapus Transaksi" style="width: 28px; height: 28px; border-radius: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    row.querySelector('.btn-edit-tx').addEventListener('click', () => openFormModal(t));
    row.querySelector('.btn-delete-tx').addEventListener('click', () => deleteTransaction(t.id));

    dom.transactionsContainer.appendChild(row);
  });
};

const renderAnalytics = (acc, filteredTxs) => {
  const dom = getDomForAccount(acc);
  const expenses = filteredTxs.filter(t => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  if (expenses.length === 0) {
    dom.activeAnalyticsView.style.display = 'none';
    dom.emptyAnalyticsView.style.display = 'flex';
    return;
  }

  dom.activeAnalyticsView.style.display = 'flex';
  dom.emptyAnalyticsView.style.display = 'none';

  // Group by category
  const expenseByCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});

  const categoryData = CATEGORIES.expense
    .map(cat => {
      const amount = expenseByCategory[cat.id] || 0;
      const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return { ...cat, amount, percent };
    })
    .filter(cat => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Render Donut Sectors
  dom.donutGroup.innerHTML = '';
  const RADIUS = 60;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  let accumulatedPercent = 0;

  categoryData.forEach(cat => {
    const strokeLength = (cat.percent / 100) * CIRCUMFERENCE;
    const strokeOffset = CIRCUMFERENCE - (accumulatedPercent / 100) * CIRCUMFERENCE;
    accumulatedPercent += cat.percent;

    const isHovered = hoveredCategory[acc] === cat.id;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '80');
    circle.setAttribute('cy', '80');
    circle.setAttribute('r', String(RADIUS));
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', cat.color);
    circle.setAttribute('stroke-width', String(isHovered ? 22 : 18));
    circle.setAttribute('stroke-dasharray', `${strokeLength} ${CIRCUMFERENCE}`);
    circle.setAttribute('stroke-dashoffset', String(strokeOffset));
    circle.setAttribute('stroke-linecap', cat.percent === 100 ? 'butt' : 'round');
    circle.style.transition = 'all 0.3s ease';
    circle.style.cursor = 'pointer';

    circle.addEventListener('mouseenter', () => {
      hoveredCategory[acc] = cat.id;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });
    circle.addEventListener('mouseleave', () => {
      hoveredCategory[acc] = null;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });

    dom.donutGroup.appendChild(circle);
  });

  updateDonutLabels(acc, categoryData, totalExpense);

  // Render Legend List
  dom.legendContainer.innerHTML = '';
  categoryData.forEach(cat => {
    const legItem = document.createElement('div');
    legItem.className = 'legend-item';
    legItem.style.background = hoveredCategory[acc] === cat.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
    legItem.innerHTML = `
      <div class="legend-color" style="background-color: ${cat.color}"></div>
      <span style="font-size: 0.75rem; font-weight: ${hoveredCategory[acc] === cat.id ? '600' : '400'}; color: ${hoveredCategory[acc] === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)'}">
        ${cat.icon} ${cat.label}
      </span>
    `;

    legItem.addEventListener('mouseenter', () => {
      hoveredCategory[acc] = cat.id;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });
    legItem.addEventListener('mouseleave', () => {
      hoveredCategory[acc] = null;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });

    dom.legendContainer.appendChild(legItem);
  });

  // Render Category Progress Bars
  dom.progressList.innerHTML = '';
  categoryData.forEach(cat => {
    const barItem = document.createElement('div');
    barItem.className = 'category-bar-item';
    barItem.style.opacity = hoveredCategory[acc] && hoveredCategory[acc] !== cat.id ? '0.5' : '1';
    barItem.style.transition = 'opacity 0.2s ease';
    barItem.innerHTML = `
      <div class="category-bar-header">
        <div class="category-name-wrapper">
          <span>${cat.icon}</span>
          <span style="font-weight: 500">${cat.label}</span>
        </div>
        <div>
          <span style="font-weight: 600; margin-right: 0.5rem">${formatIDR(cat.amount)}</span>
          <span class="category-bar-percent">(${cat.percent.toFixed(0)}%)</span>
        </div>
      </div>
      <div class="progress-bar-bg" style="height: 8px;">
        <div class="progress-bar-fill" style="width: ${cat.percent}%; background-color: ${cat.color}; box-shadow: 0 0 8px ${cat.color}40"></div>
      </div>
    `;

    barItem.addEventListener('mouseenter', () => {
      hoveredCategory[acc] = cat.id;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });
    barItem.addEventListener('mouseleave', () => {
      hoveredCategory[acc] = null;
      updateDonutLabels(acc, categoryData, totalExpense);
      renderAnalytics(acc, filteredTxs);
    });

    dom.progressList.appendChild(barItem);
  });
};

const updateDonutLabels = (acc, categoryData, totalExpense) => {
  const dom = getDomForAccount(acc);
  if (hoveredCategory[acc]) {
    const matched = categoryData.find(c => c.id === hoveredCategory[acc]);
    if (matched) {
      dom.lblCenter.innerText = `${matched.icon} ${matched.label}`;
      dom.valCenter.innerText = formatIDR(matched.amount);
      dom.pctCenter.innerText = `${matched.percent.toFixed(1)}%`;
      dom.pctCenter.style.color = matched.color;
      return;
    }
  }

  dom.lblCenter.innerText = 'Total Belanja';
  dom.valCenter.innerText = formatIDR(totalExpense);
  dom.pctCenter.innerText = '100%';
  dom.pctCenter.style.color = 'var(--text-secondary)';
};

const renderGrandTotal = (filteredGaji, filteredJualan, budgetGaji, budgetJualan) => {
  const totalGajiIncome = filteredGaji.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalGajiExpense = filteredGaji.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  const totalJualanIncome = filteredJualan.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalJualanExpense = filteredJualan.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  const grandIncome = totalGajiIncome + totalJualanIncome;
  const grandExpense = totalGajiExpense + totalJualanExpense;
  const grandBalance = grandIncome - grandExpense;
  const grandBudget = budgetGaji + budgetJualan;

  document.getElementById('val-grand-income').innerText = formatIDR(grandIncome);
  document.getElementById('val-grand-expense').innerText = formatIDR(grandExpense);
  document.getElementById('val-grand-balance').innerText = formatIDR(grandBalance);

  const balCard = document.getElementById('card-grand-balance');
  if (grandBalance >= 0) {
    document.getElementById('val-grand-balance').style.color = 'var(--income)';
    balCard.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    balCard.style.background = 'rgba(16, 185, 129, 0.03)';
  } else {
    document.getElementById('val-grand-balance').style.color = 'var(--expense)';
    balCard.style.borderColor = 'rgba(244, 63, 94, 0.3)';
    balCard.style.background = 'rgba(244, 63, 94, 0.03)';
  }

  const progressSec = document.getElementById('grand-budget-progress-sec');
  const fill = document.getElementById('grand-budget-progress-fill');
  const percentText = document.getElementById('grand-budget-percent-text');
  const statusText = document.getElementById('grand-budget-status-text');

  if (grandBudget > 0) {
    document.getElementById('val-grand-budget').innerText = formatIDR(grandBudget);
    progressSec.style.display = 'block';

    const percent = Math.min((grandExpense / grandBudget) * 100, 100);
    percentText.innerText = `${percent.toFixed(0)}%`;
    fill.style.width = `${percent}%`;

    const isOver = grandExpense > grandBudget;
    const isNear = !isOver && (grandExpense / grandBudget) >= 0.85;

    if (isOver) {
      fill.style.backgroundColor = 'var(--expense)';
      statusText.innerText = 'Gabungan Melebihi Anggaran!';
      statusText.style.color = 'var(--expense)';
    } else if (isNear) {
      fill.style.backgroundColor = 'var(--warning)';
      statusText.innerText = 'Gabungan Mendekati Batas!';
      statusText.style.color = 'var(--warning)';
    } else {
      fill.style.backgroundColor = 'var(--primary)';
      statusText.innerText = 'Pemakaian Anggaran Gabungan';
      statusText.style.color = 'var(--text-secondary)';
    }
  } else {
    document.getElementById('val-grand-budget').innerText = 'Belum Diatur';
    progressSec.style.display = 'none';
  }
};

// Render Main Controller (Runs Gaji and Jualan independently)
const renderAll = () => {
  const monthKey = `${selectedYear}-${selectedMonth}`;

  // 1. Process Gaji
  const filteredGaji = transactions.filter(t => {
    const [tYear, tMonth] = t.date.split('-');
    const tAcc = t.account || 'gaji';
    return tYear === selectedYear && tMonth === selectedMonth && tAcc === 'gaji';
  });
  const budgetGaji = budgets[`gaji_${monthKey}`] || 0;
  renderDashboard('gaji', filteredGaji, budgetGaji);
  renderTransactions('gaji', filteredGaji);
  renderAnalytics('gaji', filteredGaji);

  // 2. Process Jualan
  const filteredJualan = transactions.filter(t => {
    const [tYear, tMonth] = t.date.split('-');
    const tAcc = t.account || 'gaji';
    return tYear === selectedYear && tMonth === selectedMonth && tAcc === 'jualan';
  });
  const budgetJualan = budgets[`jualan_${monthKey}`] || 0;
  renderDashboard('jualan', filteredJualan, budgetJualan);
  renderTransactions('jualan', filteredJualan);
  renderAnalytics('jualan', filteredJualan);

  // 3. Process Consolidated Grand Total
  renderGrandTotal(filteredGaji, filteredJualan, budgetGaji, budgetJualan);
};

// Form Management (Modal Dialog)
const openFormModal = (editData = null) => {
  const populateModalCategories = (type) => {
    inputCategory.innerHTML = '';
    CATEGORIES[type].forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = `${cat.icon} ${cat.label}`;
      opt.style.background = '#111827';
      opt.style.color = 'white';
      inputCategory.appendChild(opt);
    });
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  document.getElementById('err-description').style.display = 'none';
  document.getElementById('err-amount').style.display = 'none';
  document.getElementById('err-date').style.display = 'none';

  if (editData) {
    editingTxId = editData.id;
    modalTitle.innerText = 'Edit Transaksi';
    currentFormType = editData.type;
    inputAccount.value = editData.account || 'gaji';
    inputDescription.value = editData.description;
    inputAmount.value = formatNumberInput(String(editData.amount));
    inputDate.value = editData.date;
    inputNotes.value = editData.notes || '';
    
    populateModalCategories(editData.type);
    inputCategory.value = editData.category;
  } else {
    editingTxId = null;
    modalTitle.innerText = 'Tambah Transaksi';
    currentFormType = 'expense';
    inputAccount.value = 'gaji';
    inputDescription.value = '';
    inputAmount.value = '';
    inputDate.value = getLocalDateString();
    inputNotes.value = '';
    
    populateModalCategories('expense');
    inputCategory.value = CATEGORIES.expense[0].id;
  }

  updateFormTypeButtons();
  transactionModal.style.display = 'flex';
};

const closeFormModal = () => {
  transactionModal.style.display = 'none';
};

const updateFormTypeButtons = () => {
  const submitBtn = document.getElementById('btn-submit-modal');
  if (currentFormType === 'income') {
    btnTypeIncome.classList.add('active');
    btnTypeExpense.classList.remove('active');
    submitBtn.style.backgroundColor = 'var(--income)';
    submitBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
  } else {
    btnTypeIncome.classList.remove('active');
    btnTypeExpense.classList.add('active');
    submitBtn.style.backgroundColor = 'var(--expense)';
    submitBtn.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.25)';
  }
};

// Event Listeners Binding
const bindEvents = () => {
  // Month selector navigations
  btnPrevMonth.addEventListener('click', () => {
    let m = parseInt(selectedMonth, 10);
    let y = parseInt(selectedYear, 10);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    selectedMonth = String(m).padStart(2, '0');
    selectedYear = String(y);
    initSelectors();
    localStorage.setItem('et_selected_month', selectedMonth);
    localStorage.setItem('et_selected_year', selectedYear);
    renderAll();
  });

  btnNextMonth.addEventListener('click', () => {
    let m = parseInt(selectedMonth, 10);
    let y = parseInt(selectedYear, 10);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    selectedMonth = String(m).padStart(2, '0');
    selectedYear = String(y);
    initSelectors();
    localStorage.setItem('et_selected_month', selectedMonth);
    localStorage.setItem('et_selected_year', selectedYear);
    renderAll();
  });

  selectMonth.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    localStorage.setItem('et_selected_month', selectedMonth);
    renderAll();
  });

  selectYear.addEventListener('change', (e) => {
    selectedYear = e.target.value;
    localStorage.setItem('et_selected_year', selectedYear);
    renderAll();
  });

  // Gaji & Jualan Budget Edit/Save/Cancel
  ['gaji', 'jualan'].forEach(acc => {
    const dom = getDomForAccount(acc);
    
    dom.btnEditBudget.addEventListener('click', () => {
      const currentKey = `${acc}_${selectedYear}-${selectedMonth}`;
      dom.inputBudgetLimit.value = formatNumberInput(String(budgets[currentKey] || ''));
      dom.budgetDisplayView.style.display = 'none';
      dom.budgetEditForm.style.display = 'flex';
      dom.inputBudgetLimit.focus();
    });

    dom.btnCancelBudget.addEventListener('click', () => {
      dom.budgetDisplayView.style.display = 'block';
      dom.budgetEditForm.style.display = 'none';
    });

    dom.inputBudgetLimit.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
    });

    dom.budgetEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentKey = `${acc}_${selectedYear}-${selectedMonth}`;
      const newLimit = getRawNumber(dom.inputBudgetLimit.value);
      budgets[currentKey] = newLimit;
      saveToLocalStorage();
      dom.budgetDisplayView.style.display = 'block';
      dom.budgetEditForm.style.display = 'none';
      renderAll();
    });

    // Filter Change listeners for each account
    dom.inputSearch.addEventListener('input', () => renderAll());
    dom.filterType.addEventListener('change', () => {
      populateCategoryFilterOptions(acc);
      renderAll();
    });
    dom.filterCategory.addEventListener('change', () => renderAll());
    dom.filterSort.addEventListener('change', () => renderAll());
  });

  // Modal triggers
  btnAddTransaction.addEventListener('click', () => openFormModal());
  btnCloseModal.addEventListener('click', closeFormModal);
  btnCancelModal.addEventListener('click', closeFormModal);
  transactionModal.addEventListener('click', (e) => {
    if (e.target === transactionModal) closeFormModal();
  });

  btnTypeIncome.addEventListener('click', () => {
    if (currentFormType !== 'income') {
      currentFormType = 'income';
      updateFormTypeButtons();
      inputCategory.innerHTML = '';
      CATEGORIES.income.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = `${cat.icon} ${cat.label}`;
        inputCategory.appendChild(opt);
      });
      inputCategory.value = CATEGORIES.income[0].id;
    }
  });

  btnTypeExpense.addEventListener('click', () => {
    if (currentFormType !== 'expense') {
      currentFormType = 'expense';
      updateFormTypeButtons();
      inputCategory.innerHTML = '';
      CATEGORIES.expense.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = `${cat.icon} ${cat.label}`;
        inputCategory.appendChild(opt);
      });
      inputCategory.value = CATEGORIES.expense[0].id;
    }
  });

  inputAmount.addEventListener('input', (e) => {
    e.target.value = formatNumberInput(e.target.value);
  });

  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const acc = inputAccount.value;
    const desc = inputDescription.value.trim();
    const amt = getRawNumber(inputAmount.value);
    const dt = inputDate.value;
    const cat = inputCategory.value;
    const nts = inputNotes.value.trim();

    let hasError = false;

    if (!desc) {
      document.getElementById('err-description').innerText = 'Deskripsi tidak boleh kosong.';
      document.getElementById('err-description').style.display = 'block';
      hasError = true;
    }
    if (!amt || amt <= 0) {
      document.getElementById('err-amount').innerText = 'Jumlah uang harus lebih besar dari Rp 0.';
      document.getElementById('err-amount').style.display = 'block';
      hasError = true;
    }
    if (!dt) {
      document.getElementById('err-date').innerText = 'Tanggal harus dipilih.';
      document.getElementById('err-date').style.display = 'block';
      hasError = true;
    }

    if (hasError) return;

    const payload = {
      description: desc,
      amount: amt,
      type: currentFormType,
      category: cat,
      date: dt,
      notes: nts,
      account: acc
    };

    if (editingTxId) {
      editTransaction(editingTxId, payload);
    } else {
      addTransaction(payload);
    }

    closeFormModal();
  });

  // Backup, Restore & Reset
  // Backup, Restore & Reset
  btnExport.addEventListener('click', () => {
    // Generate Excel report directly from browser state
    const year = selectedYear;
    const month = selectedMonth;
    const monthKey = `${year}-${month}`;
    
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthLabel = `${monthsIndo[parseInt(month, 10) - 1]} ${year}`;

    const txsGaji = transactions.filter(t => {
      const [tYear, tMonth] = t.date.split('-');
      const tAcc = t.account || 'gaji';
      return tYear === year && tMonth === month && tAcc === 'gaji';
    });

    const txsJualan = transactions.filter(t => {
      const [tYear, tMonth] = t.date.split('-');
      const tAcc = t.account || 'gaji';
      return tYear === year && tMonth === month && tAcc === 'jualan';
    });

    const calcAggregates = (txList) => {
      const income = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return { income, expense, balance: income - expense };
    };

    const aggGaji = calcAggregates(txsGaji);
    const aggJualan = calcAggregates(txsJualan);

    const budgetGaji = budgets[`gaji_${monthKey}`] || 0;
    const budgetJualan = budgets[`jualan_${monthKey}`] || 0;

    const isOverBudget = (expense, limit) => limit > 0 && expense > limit ? 'MELEBIHI LIMIT' : limit > 0 ? 'AMAN' : 'BELUM DIATUR';

    const categoriesMap = {
      pekerjaan: '💼 Gaji / Pekerjaan',
      freelance: '💻 Freelance',
      investasi: '📈 Investasi',
      jualan: '🏪 Jualan',
      'lain-lain-in': '💰 Lain-lain (Masuk)',
      makanan: '🍔 Makanan & Minuman',
      'tempat-tinggal': '🏠 Tempat Tinggal',
      transportasi: '🚗 Transportasi',
      tagihan: '🔌 Tagihan & Utilitas',
      belanja: '🛍️ Belanja',
      hiburan: '🎬 Hiburan',
      kesehatan: '🏥 Kesehatan',
      nabung: '🐷 Nabung',
      pembayaran: '💳 Pembayaran',
      'lain-lain-out': '💸 Lain-lain (Keluar)'
    };

    const summaryRows = [
      ['REKAPITULASI KEUANGAN BULANAN - FINANSIKU'],
      [`Periode: ${monthLabel}`],
      [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ['1. RINGKASAN PEMBUKUAN'],
      ['Pembukuan / Akun', 'Total Pemasukan', 'Total Pengeluaran', 'Saldo Bersih', 'Batas Anggaran', 'Status Anggaran'],
      [
        'Keuangan Gaji (Pribadi)',
        aggGaji.income,
        aggGaji.expense,
        aggGaji.balance,
        budgetGaji || '-',
        isOverBudget(aggGaji.expense, budgetGaji)
      ],
      [
        'Keuangan Jualan (Store)',
        aggJualan.income,
        aggJualan.expense,
        aggJualan.balance,
        budgetJualan || '-',
        isOverBudget(aggJualan.expense, budgetJualan)
      ],
      [
        'TOTAL GABUNGAN',
        aggGaji.income + aggJualan.income,
        aggGaji.expense + aggJualan.expense,
        aggGaji.balance + aggJualan.balance,
        budgetGaji + budgetJualan || '-',
        '-'
      ],
      [],
      ['2. RINCIAN SUMBER PEMASUKAN (DARI MANA)'],
      ['Kategori Pemasukan', 'Keuangan Gaji (Rp)', 'Keuangan Jualan (Rp)', 'Total Gabungan (Rp)']
    ];

    // Populate Income Category breakdown
    const incomeCats = [
      { id: 'pekerjaan', label: '💼 Gaji / Pekerjaan' },
      { id: 'freelance', label: '💻 Freelance' },
      { id: 'investasi', label: '📈 Investasi' },
      { id: 'jualan', label: '🏪 Jualan' },
      { id: 'lain-lain-in', label: '💰 Lain-lain' }
    ];

    incomeCats.forEach(cat => {
      const gajiAmt = txsGaji.filter(t => t.category === cat.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const jualanAmt = txsJualan.filter(t => t.category === cat.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalAmt = gajiAmt + jualanAmt;
      if (totalAmt > 0) {
        summaryRows.push([cat.label, gajiAmt, jualanAmt, totalAmt]);
      }
    });

    summaryRows.push(
      [],
      ['3. RINCIAN POS PENGELUARAN (KE MANA SAJA)'],
      ['Kategori Pengeluaran', 'Keuangan Gaji (Rp)', 'Keuangan Jualan (Rp)', 'Total Gabungan (Rp)']
    );

    // Populate Expense Category breakdown
    const expenseCats = [
      { id: 'makanan', label: '🍔 Makanan & Minuman' },
      { id: 'tempat-tinggal', label: '🏠 Tempat Tinggal' },
      { id: 'transportasi', label: '🚗 Transportasi' },
      { id: 'tagihan', label: '🔌 Tagihan & Utilitas' },
      { id: 'belanja', label: '🛍️ Belanja' },
      { id: 'hiburan', label: '🎬 Hiburan' },
      { id: 'kesehatan', label: '🏥 Kesehatan' },
      { id: 'nabung', label: '🐷 Nabung' },
      { id: 'pembayaran', label: '💳 Pembayaran' },
      { id: 'lain-lain-out', label: '💸 Lain-lain' }
    ];

    expenseCats.forEach(cat => {
      const gajiAmt = txsGaji.filter(t => t.category === cat.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const jualanAmt = txsJualan.filter(t => t.category === cat.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalAmt = gajiAmt + jualanAmt;
      if (totalAmt > 0) {
        summaryRows.push([cat.label, gajiAmt, jualanAmt, totalAmt]);
      }
    });

    // Details
    const mapTransactionRows = (txList) => {
      const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Kategori', 'Jumlah (Rp)', 'Catatan'];
      const rows = txList.map(t => [
        t.date,
        t.description,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        categoriesMap[t.category] || t.category,
        Number(t.amount),
        t.notes || '-'
      ]);
      return [headers, ...rows];
    };

    const sheetGajiRows = mapTransactionRows(txsGaji);
    const sheetJualanRows = mapTransactionRows(txsJualan);

    // --- CREATE WORKBOOK & WRITE ---
    const wb = XLSX.utils.book_new();

    const formatNumericCells = (ws) => {
      for (const key in ws) {
        if (key.startsWith('!')) continue;
        const cell = ws[key];
        if (cell && cell.t === 'n') {
          cell.z = '#,##0';
        }
      }
    };

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    formatNumericCells(wsSummary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

    const wsGaji = XLSX.utils.aoa_to_sheet(sheetGajiRows);
    formatNumericCells(wsGaji);
    XLSX.utils.book_append_sheet(wb, wsGaji, 'Transaksi Gaji');

    const wsJualan = XLSX.utils.aoa_to_sheet(sheetJualanRows);
    formatNumericCells(wsJualan);
    XLSX.utils.book_append_sheet(wb, wsJualan, 'Transaksi Jualan');

    // Trigger Excel file download
    const filename = `Total Rekaptulasi - ${monthLabel}.xlsx`;
    XLSX.writeFile(wb, filename);
  });

  btnImport.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          transactions = parsed.transactions;
        }
        if (parsed.budgets && typeof parsed.budgets === 'object') {
          budgets = parsed.budgets;
        }
        localStorage.setItem('et_initialized', 'true');
        saveToLocalStorage();
        renderAll();
        alert('Data berhasil diimpor!');
      } catch (err) {
        alert('Gagal mengimpor data: File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  const btnReset = document.getElementById('btn-reset');
  btnReset.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data transaksi dan anggaran? Tindakan ini tidak dapat dibatalkan.')) {
      localStorage.removeItem('et_transactions');
      localStorage.removeItem('et_budgets');
      transactions = [];
      budgets = {};
      renderAll();
    }
  });
};

const migrateToDefaultSyncCode = async () => {
  if (localStorage.getItem('et_sync_migrated_v2') === 'true') {
    return;
  }
  
  console.log('Running one-time sync migration to FN-UTAMA...');
  const docRef = doc(db, 'sync', DEFAULT_SYNC_CODE);
  try {
    const docSnap = await getDoc(docRef);
    let cloudTransactions = [];
    let cloudBudgets = {};
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      cloudTransactions = data.transactions || [];
      cloudBudgets = data.budgets || {};
    }
    
    // Merge local and cloud transactions based on unique ID
    const mergedTxs = [...transactions];
    cloudTransactions.forEach(ctx => {
      if (!mergedTxs.some(lx => lx.id === ctx.id)) {
        mergedTxs.push(ctx);
      }
    });
    
    // Merge budgets
    const mergedBudgets = { ...budgets, ...cloudBudgets };
    
    transactions = mergedTxs;
    budgets = mergedBudgets;
    
    // Mark as migrated
    localStorage.setItem('et_sync_migrated_v2', 'true');
    
    // Save the merged data locally and push to cloud
    saveToLocalStorage(false);
    
    console.log('Sync migration to FN-UTAMA completed successfully.');
  } catch (err) {
    console.error('Failed to run sync migration:', err);
  }
};

// Start application
const init = async () => {
  // Ensure the selected month and year are locked into localStorage on startup
  localStorage.setItem('et_selected_month', selectedMonth);
  localStorage.setItem('et_selected_year', selectedYear);

  initSelectors();
  populateCategoryFilterOptions('gaji');
  populateCategoryFilterOptions('jualan');
  bindEvents();
  
  setupFirebaseListener();
  initSyncCodeUI();
  renderAll();

  // Run migration in the background so it does not block the UI render on startup
  if (syncCode === DEFAULT_SYNC_CODE && localStorage.getItem('et_sync_migrated_v2') !== 'true') {
    migrateToDefaultSyncCode();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
