import { getSupabaseClient, getSupabaseConfig, setSupabaseConfig } from './supabase.js';

// Unique Sync Code setup
const DEFAULT_SYNC_CODE = 'FN-UTAMA';
let syncCode = localStorage.getItem('et_sync_code');
const isCustomized = localStorage.getItem('et_sync_customized') === 'true';

// Default to 'FN-UTAMA' so all devices automatically sync out-of-the-box
if (!syncCode || (!isCustomized && syncCode !== DEFAULT_SYNC_CODE)) {
  syncCode = DEFAULT_SYNC_CODE;
  localStorage.setItem('et_sync_code', syncCode);
}

let lastSyncTimestamp = Number(localStorage.getItem('et_last_sync_time') || '0');
let supabaseRealtimeChannel = null;
let isUpdatingFromSync = false;

// Preset Categories
const CATEGORIES = {
  income: [
    { id: 'pekerjaan', label: 'Gaji / Pekerjaan', color: '#10b981', icon: '💼' },
    { id: 'freelance', label: 'Freelance / Projek', color: '#34d399', icon: '💻' },
    { id: 'bisnis', label: 'Bisnis & Usaha', color: '#14b8a6', icon: '🏬' },
    { id: 'investasi', label: 'Investasi & Dividen', color: '#6ee7b7', icon: '📈' },
    { id: 'jualan', label: 'Jualan', color: '#ec4899', icon: '🏪' },
    { id: 'bonus', label: 'Bonus & THR', color: '#f59e0b', icon: '🎁' },
    { id: 'lain-lain-in', label: 'Lain-lain', color: '#a7f3d0', icon: '💰' },
  ],
  expense: [
    { id: 'makanan', label: 'Makanan & Minuman', color: '#f87171', icon: '🍔' },
    { id: 'belanja-harian', label: 'Belanja Sembako / Pasar', color: '#fb923c', icon: '🛒' },
    { id: 'paket-data', label: 'Paket Data & Pulsa', color: '#38bdf8', icon: '📶' },
    { id: 'tagihan', label: 'Tagihan Listrik, Air & IPL', color: '#60a5fa', icon: '🔌' },
    { id: 'wifi', label: 'Internet Rumah & WiFi', color: '#6366f1', icon: '🌐' },
    { id: 'transportasi', label: 'Transportasi Umum & Ojol', color: '#fbbf24', icon: '🛵' },
    { id: 'bensin', label: 'Bensin & Parkir', color: '#f59e0b', icon: '⛽' },
    { id: 'servis', label: 'Servis Kendaraan', color: '#eab308', icon: '🔧' },
    { id: 'tempat-tinggal', label: 'Sewa Kost / Kontrakan', color: '#f97316', icon: '🏠' },
    { id: 'belanja', label: 'Belanja Pakaian & Barang', color: '#c084fc', icon: '🛍️' },
    { id: 'langganan', label: 'Langganan Digital (Streaming/App)', color: '#a855f7', icon: '📺' },
    { id: 'hiburan', label: 'Hiburan & Nongkrong', color: '#f472b6', icon: '🎬' },
    { id: 'perawatan', label: 'Perawatan Diri & Skincare', color: '#ec4899', icon: '🧴' },
    { id: 'kesehatan', label: 'Kesehatan & Obat', color: '#2dd4bf', icon: '🏥' },
    { id: 'pendidikan', label: 'Pendidikan & Kursus', color: '#34d399', icon: '📚' },
    { id: 'keluarga', label: 'Keluarga & Orang Tua', color: '#10b981', icon: '👨‍👩‍👧' },
    { id: 'sedekah', label: 'Sedekah, Zakat & Donasi', color: '#059669', icon: '🤲' },
    { id: 'cicilan', label: 'Cicilan & Hutang', color: '#818cf8', icon: '💳' },
    { id: 'nabung', label: 'Tabungan & Investasi', color: '#06b6d4', icon: '🐷' },
    { id: 'pembayaran', label: 'Pembayaran Lainnya', color: '#a78bfa', icon: '🧾' },
    { id: 'lain-lain-out', label: 'Lain-lain', color: '#9ca3af', icon: '💸' },
  ]
};

const getCategoryLabel = (type, catId) => {
  const list = CATEGORIES[type] || [];
  const found = list.find(c => c.id === catId || c.label === catId);
  return found ? found.label : (catId || '-');
};

const getCategoryId = (type, labelOrId) => {
  if (!labelOrId) return type === 'income' ? 'pekerjaan' : 'makanan';
  const list = CATEGORIES[type] || [];
  const found = list.find(c => c.id === labelOrId || c.label === labelOrId);
  return found ? found.id : labelOrId;
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
    }
  ];
};

const getSeedBudgets = () => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    [`gaji_${monthKey}`]: 6000000
  };
};

// Global App State
const hasInitialized = localStorage.getItem('et_initialized');

let transactions = [];
let budgets = {};

if (hasInitialized) {
  try {
    const rawTx = localStorage.getItem('et_transactions');
    transactions = rawTx ? JSON.parse(rawTx) : [];
  } catch (e) {
    console.warn('Failed to parse transactions, falling back to seed:', e);
    transactions = getSeedTransactions();
  }
  try {
    const rawBg = localStorage.getItem('et_budgets');
    budgets = rawBg ? JSON.parse(rawBg) : {};
  } catch (e) {
    console.warn('Failed to parse budgets, falling back to seed:', e);
    budgets = getSeedBudgets();
  }
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
let editingTxYear = null;
let editingTxMonth = null;
let currentFormType = 'expense';
const hoveredCategory = {
  gaji: null
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

let selectMonth, selectYear, btnPrevMonth, btnNextMonth;
let btnExport, btnImport, importFileInput, btnAddTransaction;
let transactionModal, modalTitle, btnCloseModal, btnCancelModal;
let btnTypeIncome, btnTypeExpense, transactionForm;
let inputTxId, inputAccount, inputDescription, inputAmount, inputDate, inputCategory, inputNotes;

const refreshDomElements = () => {
  selectMonth = document.getElementById('select-month');
  selectYear = document.getElementById('select-year');
  btnPrevMonth = document.getElementById('btn-prev-month');
  btnNextMonth = document.getElementById('btn-next-month');

  btnExport = document.getElementById('btn-export');
  btnImport = document.getElementById('btn-import');
  importFileInput = document.getElementById('import-file-input');
  btnAddTransaction = document.getElementById('btn-add-transaction');

  transactionModal = document.getElementById('transaction-modal');
  modalTitle = document.getElementById('modal-title');
  btnCloseModal = document.getElementById('btn-close-modal');
  btnCancelModal = document.getElementById('btn-cancel-modal');
  btnTypeIncome = document.getElementById('btn-type-income');
  btnTypeExpense = document.getElementById('btn-type-expense');
  transactionForm = document.getElementById('transaction-form');
  inputTxId = document.getElementById('input-tx-id');
  inputAccount = document.getElementById('input-account');
  inputDescription = document.getElementById('input-description');
  inputAmount = document.getElementById('input-amount');
  inputDate = document.getElementById('input-date');
  inputCategory = document.getElementById('input-category');
  inputNotes = document.getElementById('input-notes');
};

// Initial quick grab
if (typeof document !== 'undefined') {
  refreshDomElements();
}

// ==========================================
// SUPABASE REALTIME CLOUD SYNC MODULE
// ==========================================
const updateSupabaseStatusBadge = (status, customText = '') => {
  const badge = document.getElementById('supabase-status-badge');
  if (!badge) return;

  badge.className = 'sync-status-badge';
  if (status === 'online') {
    badge.classList.add('badge-online');
    badge.innerText = customText || '🟢 Realtime Aktif';
  } else if (status === 'offline') {
    badge.classList.add('badge-offline');
    badge.innerText = customText || '🔴 Offline';
  } else {
    badge.classList.add('badge-warning');
    badge.innerText = customText || '🟡 Belum Dihubungkan';
  }
};

const syncToSupabase = async () => {
  const client = getSupabaseClient();
  if (!client || !syncCode) return;

  const nowTime = Date.now();
  lastSyncTimestamp = nowTime;
  localStorage.setItem('et_last_sync_time', String(nowTime));

  try {
    const { error } = await client
      .from('sync_data')
      .upsert({
        sync_code: syncCode,
        transactions,
        budgets,
        cart_items: typeof cartItems !== 'undefined' ? cartItems : [],
        updated_at: nowTime
      });

    if (error) {
      console.warn('Supabase sync warning:', error.message);
      updateSupabaseStatusBadge('warning', 'Tabel Belum Siap');
    } else {
      updateSupabaseStatusBadge('online');
    }

    // Also sync structured records into 'transaksi' table
    if (transactions && transactions.length > 0) {
      const rows = transactions.map(t => ({
        id: t.id,
        kategori: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        jenis: getCategoryLabel(t.type, t.category),
        nama: t.description || '-',
        jumlah_uang: Number(t.amount) || 0,
        tanggal: t.date || '',
        catatan: t.notes || '',
        sync_code: syncCode
      }));

      client.from('transaksi').upsert(rows).then(({ error: txErr }) => {
        if (txErr) {
          console.warn('Supabase transaksi table notice:', txErr.message);
        } else {
          console.log('✅ Berhasil menyinkronkan data ke tabel transaksi!');
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to sync to Supabase:', err);
    updateSupabaseStatusBadge('offline', 'Koneksi Gagal');
  }
};

// Save states to localstorage
const saveToLocalStorage = (skipCloudSync = false) => {
  localStorage.setItem('et_transactions', JSON.stringify(transactions));
  localStorage.setItem('et_budgets', JSON.stringify(budgets));
  if (!skipCloudSync) {
    syncToSupabase();
  }
};

const setupSupabaseRealtimeListener = () => {
  const client = getSupabaseClient();
  if (!client) {
    updateSupabaseStatusBadge('warning', 'Belum Dihubungkan');
    return;
  }

  // Remove existing realtime channels if any
  if (supabaseRealtimeChannel) {
    try { client.removeChannel(supabaseRealtimeChannel); } catch (e) {}
    supabaseRealtimeChannel = null;
  }

  updateSupabaseStatusBadge('warning', 'Menghubungkan...');

  // 1. Initial Fetch from Supabase ('transaksi' table & 'sync_data')
  const performInitialFetch = async () => {
    try {
      let remoteTxs = null;

      // A. Query primary 'transaksi' table
      const { data: dbTxs, error: txError } = await client
        .from('transaksi')
        .select('*')
        .eq('sync_code', syncCode)
        .order('tanggal', { ascending: false });

      if (dbTxs && !txError && dbTxs.length > 0) {
        remoteTxs = dbTxs.map(row => {
          const type = row.kategori === 'Pemasukan' ? 'income' : 'expense';
          return {
            id: row.id,
            description: row.nama || '-',
            amount: Number(row.jumlah_uang) || 0,
            type: type,
            category: getCategoryId(type, row.jenis),
            date: row.tanggal,
            notes: row.catatan || '',
            account: 'gaji'
          };
        });
      }

      // B. Query 'sync_data' table (for budgets, cart items, or fallback txs)
      const { data: syncData, error: syncError } = await client
        .from('sync_data')
        .select('*')
        .eq('sync_code', syncCode)
        .single();

      if (syncData && !syncError) {
        if (syncData.budgets && typeof syncData.budgets === 'object') {
          budgets = { ...budgets, ...syncData.budgets };
          localStorage.setItem('et_budgets', JSON.stringify(budgets));
        }
        if (syncData.cart_items && Array.isArray(syncData.cart_items) && typeof cartItems !== 'undefined') {
          cartItems = syncData.cart_items;
          localStorage.setItem('et_cart_items', JSON.stringify(cartItems));
        }
        if (!remoteTxs && syncData.transactions && Array.isArray(syncData.transactions) && syncData.transactions.length > 0) {
          remoteTxs = syncData.transactions;
        }
      }

      if (remoteTxs && remoteTxs.length > 0) {
        isUpdatingFromSync = true;
        transactions = remoteTxs;
        localStorage.setItem('et_transactions', JSON.stringify(transactions));
        isUpdatingFromSync = false;
        renderAll();
        if (typeof renderCartUI === 'function') renderCartUI();
        console.log(`✅ Berhasil menyinkronkan ${transactions.length} transaksi dari Supabase!`);
      } else if (transactions.length > 0) {
        // Cloud is empty but local has data: upload local transactions to cloud
        syncToSupabase();
      }

      updateSupabaseStatusBadge('online');
    } catch (err) {
      console.warn('Initial fetch notice:', err);
    }
  };

  performInitialFetch();

  // 2. Realtime Subscription on 'transaksi' table
  supabaseRealtimeChannel = client
    .channel(`realtime_all_${syncCode}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'transaksi',
      filter: `sync_code=eq.${syncCode}`
    }, (payload) => {
      console.log('⚡ Realtime event on transaksi:', payload.eventType);
      if (isUpdatingFromSync) return;

      if (payload.eventType === 'INSERT') {
        const row = payload.new;
        if (!row) return;
        const type = row.kategori === 'Pemasukan' ? 'income' : 'expense';
        const newTx = {
          id: row.id,
          description: row.nama || '-',
          amount: Number(row.jumlah_uang) || 0,
          type: type,
          category: getCategoryId(type, row.jenis),
          date: row.tanggal,
          notes: row.catatan || '',
          account: 'gaji'
        };
        if (!transactions.some(t => t.id === newTx.id)) {
          transactions.unshift(newTx);
          saveToLocalStorage(true);
          renderAll();
        }
      } else if (payload.eventType === 'UPDATE') {
        const row = payload.new;
        if (!row) return;
        const type = row.kategori === 'Pemasukan' ? 'income' : 'expense';
        transactions = transactions.map(t => {
          if (t.id === row.id) {
            return {
              ...t,
              description: row.nama || '-',
              amount: Number(row.jumlah_uang) || 0,
              type: type,
              category: getCategoryId(type, row.jenis),
              date: row.tanggal,
              notes: row.catatan || ''
            };
          }
          return t;
        });
        saveToLocalStorage(true);
        renderAll();
      } else if (payload.eventType === 'DELETE') {
        const oldRow = payload.old;
        if (oldRow && oldRow.id) {
          transactions = transactions.filter(t => t.id !== oldRow.id);
          saveToLocalStorage(true);
          renderAll();
        }
      }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sync_data',
      filter: `sync_code=eq.${syncCode}`
    }, (payload) => {
      if (isUpdatingFromSync) return;
      const newData = payload.new;
      if (!newData) return;
      if (newData.budgets) {
        budgets = { ...budgets, ...newData.budgets };
        localStorage.setItem('et_budgets', JSON.stringify(budgets));
        renderAll();
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        updateSupabaseStatusBadge('online');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        updateSupabaseStatusBadge('offline', 'Realtime Terputus');
      }
    });
};

const connectToSyncCode = async (newCode) => {
  newCode = newCode.trim().toUpperCase();
  if (!newCode.startsWith('FN-') || newCode.length < 5) {
    alert('Format Kode Sinkronisasi salah! Contoh: FN-UTAMA atau FN-A1B2C3');
    return;
  }
  
  if (confirm(`Apakah Anda yakin ingin menyinkronkan dengan kode perangkat "${newCode}"? Data lokal akan digabungkan dengan cloud.`)) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.from('sync_data').select('*').eq('sync_code', newCode).single();
        if (data) {
          const cloudTxs = data.transactions || [];
          const cloudBudgets = data.budgets || {};
          
          // Merge unique transactions
          const mergedTxs = [...transactions];
          cloudTxs.forEach(ctx => {
            if (!mergedTxs.some(lx => lx.id === ctx.id)) {
              mergedTxs.push(ctx);
            }
          });
          
          transactions = mergedTxs;
          budgets = { ...budgets, ...cloudBudgets };
          if (data.cart_items && Array.isArray(data.cart_items) && typeof cartItems !== 'undefined') {
            cartItems = data.cart_items;
          }
        }
      } catch (err) {
        console.warn('Connect merge notice:', err);
      }
    }
    
    syncCode = newCode;
    localStorage.setItem('et_sync_code', syncCode);
    localStorage.setItem('et_sync_customized', 'true');
    saveToLocalStorage(false);
    setupSupabaseRealtimeListener();
    
    const display = document.getElementById('sync-code-display');
    if (display) display.innerText = syncCode;
    const input = document.getElementById('input-sync-code');
    if (input) input.value = '';
    
    renderAll();
    alert(`Berhasil terhubung ke kode perangkat: ${syncCode}!`);
  }
};

const initSyncCodeUI = () => {
  const syncDisplay = document.getElementById('sync-code-display');
  const btnCopySync = document.getElementById('btn-copy-sync-code');
  const btnConnectSync = document.getElementById('btn-connect-sync');
  const inputSyncCode = document.getElementById('input-sync-code');

  // Supabase Settings Modal elements
  const btnOpenSupabase = document.getElementById('btn-open-supabase-settings');
  const btnCloseSupabase = document.getElementById('btn-close-supabase-modal');
  const supabaseModal = document.getElementById('supabase-modal');
  const formSupabase = document.getElementById('supabase-config-form');
  const inputSupabaseUrl = document.getElementById('input-supabase-url');
  const inputSupabaseKey = document.getElementById('input-supabase-anon-key');
  const btnCopySql = document.getElementById('btn-copy-supabase-sql');
  const btnClearSupabase = document.getElementById('btn-clear-supabase');

  if (syncDisplay) {
    syncDisplay.innerText = syncCode;
  }

  if (btnCopySync) {
    btnCopySync.addEventListener('click', () => {
      navigator.clipboard.writeText(syncCode)
        .then(() => alert('Kode Sinkronisasi berhasil disalin ke clipboard!'))
        .catch(() => alert('Kode Sinkronisasi: ' + syncCode));
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

  // Supabase Modal triggers
  if (btnOpenSupabase && supabaseModal) {
    btnOpenSupabase.addEventListener('click', () => {
      const cfg = getSupabaseConfig();
      if (inputSupabaseUrl) inputSupabaseUrl.value = cfg.url;
      if (inputSupabaseKey) inputSupabaseKey.value = cfg.anonKey;
      supabaseModal.style.display = 'flex';
    });
  }

  if (btnCloseSupabase && supabaseModal) {
    btnCloseSupabase.addEventListener('click', () => {
      supabaseModal.style.display = 'none';
    });
  }

  if (supabaseModal) {
    supabaseModal.addEventListener('click', (e) => {
      if (e.target === supabaseModal) supabaseModal.style.display = 'none';
    });
  }

  // Copy SQL Schema
  if (btnCopySql) {
    btnCopySql.addEventListener('click', () => {
      const sql = `-- Buat tabel sync_data di SQL Editor Supabase
create table if not exists public.sync_data (
  sync_code text primary key,
  transactions jsonb default '[]'::jsonb,
  budgets jsonb default '{}'::jsonb,
  cart_items jsonb default '[]'::jsonb,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

alter table public.sync_data enable row level security;

drop policy if exists "Akses penuh anon untuk sync data" on public.sync_data;
create policy "Akses penuh anon untuk sync data" on public.sync_data
  for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.sync_data;`;
      navigator.clipboard.writeText(sql)
        .then(() => alert('Skrip SQL berhasil disalin! Silakan jalankan di Supabase Dashboard -> SQL Editor.'))
        .catch(() => alert('Silakan buka file supabase_schema.sql di folder proyek untuk menyalin SQL.'));
    });
  }

  // Clear Supabase configuration
  if (btnClearSupabase) {
    btnClearSupabase.addEventListener('click', () => {
      if (confirm('Hapus konfigurasi Supabase? Sinkronisasi cloud akan dinonaktifkan.')) {
        setSupabaseConfig('', '');
        if (inputSupabaseUrl) inputSupabaseUrl.value = '';
        if (inputSupabaseKey) inputSupabaseKey.value = '';
        if (supabaseModal) supabaseModal.style.display = 'none';
        updateSupabaseStatusBadge('warning', 'Belum Dihubungkan');
        alert('Konfigurasi Supabase dihapus.');
      }
    });
  }

  // Save & Test Supabase Configuration
  if (formSupabase) {
    formSupabase.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = (inputSupabaseUrl ? inputSupabaseUrl.value : '').trim();
      const key = (inputSupabaseKey ? inputSupabaseKey.value : '').trim();

      if (!url.startsWith('https://')) {
        alert('Supabase Project URL harus diawali dengan https://\nContoh: https://xxxxxxxx.supabase.co');
        return;
      }

      setSupabaseConfig(url, key);
      const client = getSupabaseClient();
      if (!client) {
        alert('Gagal membuat koneksi Supabase. Periksa format URL dan Key Anda.');
        return;
      }

      const saveBtn = document.getElementById('btn-save-supabase');
      if (saveBtn) saveBtn.innerText = 'Menguji Koneksi...';

      try {
        const { error } = await client.from('sync_data').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
            alert('Koneksi ke Supabase BERHASIL! Namun tabel "sync_data" belum dibuat.\n\nSilakan klik tombol "Salin SQL" lalu jalankan di Supabase Dashboard -> SQL Editor.');
          } else {
            alert('Peringatan dari Supabase: ' + error.message);
          }
        } else {
          alert('🎉 Koneksi ke Supabase BERHASIL dan tabel "sync_data" siap digunakan untuk Realtime!');
          await syncToSupabase();
          setupSupabaseRealtimeListener();
          if (supabaseModal) supabaseModal.style.display = 'none';
        }
      } catch (err) {
        alert('Gagal menghubungkan ke Supabase: ' + err.message);
      } finally {
        if (saveBtn) saveBtn.innerText = 'Test & Simpan Koneksi';
      }
    });
  }
};

// Initialize Year Dropdowns
const initSelectors = () => {
  const selYear = document.getElementById('select-year') || selectYear;
  const selMonth = document.getElementById('select-month') || selectMonth;
  if (!selYear) return;

  const currentY = new Date().getFullYear();
  const years = [];
  for (let y = currentY - 4; y <= currentY + 4; y++) {
    years.push(String(y));
  }
  if (!years.includes(selectedYear)) {
    years.push(selectedYear);
    years.sort();
  }

  selYear.innerHTML = '';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = y;
    opt.style.background = '#1a3d58';
    opt.style.color = '#f2f2ef';
    selYear.appendChild(opt);
  });
  
  if (selMonth) selMonth.value = selectedMonth;
  selYear.value = selectedYear;
};

// Global Month Navigation
window.navigateMonth = (direction) => {
  let m = parseInt(selectedMonth, 10) || (new Date().getMonth() + 1);
  let y = parseInt(selectedYear, 10) || new Date().getFullYear();
  m += direction;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  selectedMonth = String(m).padStart(2, '0');
  selectedYear = String(y);
  initSelectors();
  localStorage.setItem('et_selected_month', selectedMonth);
  localStorage.setItem('et_selected_year', selectedYear);
  renderAll();
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

    const client = getSupabaseClient();
    if (client) {
      client.from('transaksi').delete().eq('id', id).then(() => {}).catch(() => {});
    }
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
  if (!dom || !dom.filterType || !dom.filterCategory) return;

  const activeType = dom.filterType.value || 'all';
  const currentSelectedCat = dom.filterCategory.value || 'all';

  dom.filterCategory.innerHTML = '<option value="all">Semua Kategori</option>';

  const list = (activeType === 'all' || !CATEGORIES[activeType])
    ? [...CATEGORIES.income, ...CATEGORIES.expense]
    : (CATEGORIES[activeType] || []);

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

  if (Array.from(dom.filterCategory.options || []).some(o => o.value === currentSelectedCat)) {
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
          <button class="btn btn-outline btn-icon btn-counting-tx" data-id="${t.id}" title="Counting Pembelian Berkala" style="width: 28px; height: 28px; border-radius: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"></rect>
              <line x1="8" y1="6" x2="16" y2="6"></line>
              <line x1="16" y1="14" x2="16" y2="18"></line>
              <path d="M16 10h.01"></path>
              <path d="M12 10h.01"></path>
              <path d="M8 10h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M8 14h.01"></path>
              <path d="M12 18h.01"></path>
              <path d="M8 18h.01"></path>
            </svg>
          </button>
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

    row.querySelector('.btn-counting-tx').addEventListener('click', () => openTxCountingModal(t));
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

// Render Main Controller (Runs Gaji independently)
const renderAll = () => {
  const monthKey = `${selectedYear}-${selectedMonth}`;

  // Process Gaji
  const filteredGaji = transactions.filter(t => {
    const [tYear, tMonth] = t.date.split('-');
    const tAcc = t.account || 'gaji';
    return tYear === selectedYear && tMonth === selectedMonth && tAcc === 'gaji';
  });
  const budgetGaji = budgets[`gaji_${monthKey}`] || 0;
  renderDashboard('gaji', filteredGaji, budgetGaji);
  renderTransactions('gaji', filteredGaji);
  renderAnalytics('gaji', filteredGaji);
};

// Form Management (Modal Dialog)
const openFormModal = (editData = null) => {
  const modal = document.getElementById('transaction-modal') || transactionModal;
  if (!modal) {
    console.error('transaction-modal element not found in DOM');
    return;
  }
  modal.style.display = 'flex';

  try {
    const inCategory = document.getElementById('input-category') || inputCategory;
    const populateModalCategories = (type) => {
      if (!inCategory) return;
      inCategory.innerHTML = '';
      const catList = CATEGORIES[type] || [];
      catList.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = `${cat.icon} ${cat.label}`;
        opt.style.background = '#1a3d58';
        opt.style.color = '#f2f2ef';
        inCategory.appendChild(opt);
      });
    };

    const errDesc = document.getElementById('err-description');
    const errAmt = document.getElementById('err-amount');
    const errDate = document.getElementById('err-date');
    if (errDesc) errDesc.style.display = 'none';
    if (errAmt) errAmt.style.display = 'none';
    if (errDate) errDate.style.display = 'none';

    const mTitle = document.getElementById('modal-title') || modalTitle;
    const inAccount = document.getElementById('input-account') || inputAccount;
    const inDesc = document.getElementById('input-description') || inputDescription;
    const inAmt = document.getElementById('input-amount') || inputAmount;
    const inDate = document.getElementById('input-date') || inputDate;
    const inNotes = document.getElementById('input-notes') || inputNotes;

    if (editData) {
      editingTxId = editData.id;
      if (mTitle) mTitle.innerText = 'Edit Transaksi';
      currentFormType = editData.type || 'expense';
      if (inAccount) inAccount.value = editData.account || 'gaji';
      if (inDesc) inDesc.value = editData.description || '';
      if (inAmt) inAmt.value = formatNumberInput(String(editData.amount || ''));
      
      // Parse day from date
      if (editData.date) {
        const dateParts = editData.date.split('-');
        editingTxYear = dateParts[0];
        editingTxMonth = dateParts[1];
        if (inDate) inDate.value = parseInt(dateParts[2], 10) || 1;
      }
      
      if (inNotes) inNotes.value = editData.notes || '';
      
      populateModalCategories(editData.type || 'expense');
      if (inCategory && editData.category) inCategory.value = editData.category;

      pendingCountingItems = editData.items && Array.isArray(editData.items) ? JSON.parse(JSON.stringify(editData.items)) : [];
      updateCountingBadgeInForm();
    } else {
      editingTxId = null;
      editingTxYear = null;
      editingTxMonth = null;
      if (mTitle) mTitle.innerText = 'Tambah Transaksi';
      currentFormType = 'expense';
      if (inAccount) inAccount.value = 'gaji';
      if (inDesc) inDesc.value = '';
      if (inAmt) inAmt.value = '';
      
      // Default to 25
      if (inDate) {
        inDate.value = 25;
      }
      
      if (inNotes) inNotes.value = '';
      
      populateModalCategories('expense');
      if (inCategory && CATEGORIES.expense.length > 0) {
        inCategory.value = CATEGORIES.expense[0].id;
      }

      pendingCountingItems = [];
      updateCountingBadgeInForm();
    }

    updateFormTypeButtons();
  } catch (err) {
    console.error('Error inside openFormModal:', err);
  }
};

const closeFormModal = () => {
  const modal = document.getElementById('transaction-modal') || transactionModal;
  if (modal) modal.style.display = 'none';
  pendingCountingItems = [];
  updateCountingBadgeInForm();
};

window.openFormModal = openFormModal;
window.closeFormModal = closeFormModal;

const switchFormType = (type) => {
  currentFormType = type;
  updateFormTypeButtons();
  const inCat = document.getElementById('input-category') || inputCategory;
  if (inCat) {
    inCat.innerHTML = '';
    const catList = CATEGORIES[type] || [];
    catList.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = `${cat.icon} ${cat.label}`;
      opt.style.background = '#1a3d58';
      opt.style.color = '#f2f2ef';
      inCat.appendChild(opt);
    });
    if (catList.length > 0) {
      inCat.value = catList[0].id;
    }
  }
};
window.switchFormType = switchFormType;

const updateFormTypeButtons = () => {
  const submitBtn = document.getElementById('btn-submit-modal');
  const typeIncomeBtn = document.getElementById('btn-type-income') || btnTypeIncome;
  const typeExpenseBtn = document.getElementById('btn-type-expense') || btnTypeExpense;

  if (currentFormType === 'income') {
    if (typeIncomeBtn) typeIncomeBtn.classList.add('active');
    if (typeExpenseBtn) typeExpenseBtn.classList.remove('active');
    if (submitBtn) {
      submitBtn.style.backgroundColor = 'var(--income)';
      submitBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
    }
  } else {
    if (typeIncomeBtn) typeIncomeBtn.classList.remove('active');
    if (typeExpenseBtn) typeExpenseBtn.classList.add('active');
    if (submitBtn) {
      submitBtn.style.backgroundColor = 'var(--expense)';
      submitBtn.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.25)';
    }
  }
};

// Event Listeners Binding
const bindEvents = () => {
  refreshDomElements();

  // Month selector navigations
  const prevBtn = document.getElementById('btn-prev-month') || btnPrevMonth;
  const nextBtn = document.getElementById('btn-next-month') || btnNextMonth;
  const selMonth = document.getElementById('select-month') || selectMonth;
  const selYear = document.getElementById('select-year') || selectYear;

  if (prevBtn) {
    prevBtn.addEventListener('click', () => window.navigateMonth(-1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => window.navigateMonth(1));
  }

  if (selMonth) {
    selMonth.addEventListener('change', (e) => {
      selectedMonth = e.target.value;
      localStorage.setItem('et_selected_month', selectedMonth);
      renderAll();
    });
  }

  if (selYear) {
    selYear.addEventListener('change', (e) => {
      selectedYear = e.target.value;
      localStorage.setItem('et_selected_year', selectedYear);
      renderAll();
    });
  }

  // Gaji Budget Edit/Save/Cancel
  ['gaji'].forEach(acc => {
    const dom = getDomForAccount(acc);
    if (!dom) return;
    
    if (dom.btnEditBudget) {
      dom.btnEditBudget.addEventListener('click', () => {
        const currentKey = `${acc}_${selectedYear}-${selectedMonth}`;
        if (dom.inputBudgetLimit) dom.inputBudgetLimit.value = formatNumberInput(String(budgets[currentKey] || ''));
        if (dom.budgetDisplayView) dom.budgetDisplayView.style.display = 'none';
        if (dom.budgetEditForm) dom.budgetEditForm.style.display = 'flex';
        if (dom.inputBudgetLimit) dom.inputBudgetLimit.focus();
      });
    }

    if (dom.btnCancelBudget) {
      dom.btnCancelBudget.addEventListener('click', () => {
        if (dom.budgetDisplayView) dom.budgetDisplayView.style.display = 'block';
        if (dom.budgetEditForm) dom.budgetEditForm.style.display = 'none';
      });
    }

    if (dom.inputBudgetLimit) {
      dom.inputBudgetLimit.addEventListener('input', (e) => {
        e.target.value = formatNumberInput(e.target.value);
      });
    }

    if (dom.budgetEditForm) {
      dom.budgetEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentKey = `${acc}_${selectedYear}-${selectedMonth}`;
        const newLimit = getRawNumber(dom.inputBudgetLimit ? dom.inputBudgetLimit.value : '0');
        budgets[currentKey] = newLimit;
        saveToLocalStorage();
        if (dom.budgetDisplayView) dom.budgetDisplayView.style.display = 'block';
        if (dom.budgetEditForm) dom.budgetEditForm.style.display = 'none';
        renderAll();
      });
    }

    // Filter Change listeners for each account
    if (dom.inputSearch) dom.inputSearch.addEventListener('input', () => renderAll());
    if (dom.filterType) {
      dom.filterType.addEventListener('change', () => {
        populateCategoryFilterOptions(acc);
        renderAll();
      });
    }
    if (dom.filterCategory) dom.filterCategory.addEventListener('change', () => renderAll());
    if (dom.filterSort) dom.filterSort.addEventListener('change', () => renderAll());
  });

  // Modal triggers
  const addTxBtn = document.getElementById('btn-add-transaction') || btnAddTransaction;
  const closeMBtn = document.getElementById('btn-close-modal') || btnCloseModal;
  const cancelMBtn = document.getElementById('btn-cancel-modal') || btnCancelModal;
  const txModal = document.getElementById('transaction-modal') || transactionModal;

  if (addTxBtn) {
    addTxBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openFormModal();
    });
  }
  if (closeMBtn) closeMBtn.addEventListener('click', closeFormModal);
  if (cancelMBtn) cancelMBtn.addEventListener('click', closeFormModal);
  if (txModal) {
    txModal.addEventListener('click', (e) => {
      if (e.target === txModal) closeFormModal();
    });
  }

  const typeInc = document.getElementById('btn-type-income') || btnTypeIncome;
  if (typeInc) {
    typeInc.addEventListener('click', () => switchFormType('income'));
  }

  const typeExp = document.getElementById('btn-type-expense') || btnTypeExpense;
  if (typeExp) {
    typeExp.addEventListener('click', () => switchFormType('expense'));
  }

  const inAmt = document.getElementById('input-amount') || inputAmount;
  if (inAmt) {
    inAmt.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
    });
  }

  const txForm = document.getElementById('transaction-form') || transactionForm;
  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const inAcc = document.getElementById('input-account') || inputAccount;
      const inDesc = document.getElementById('input-description') || inputDescription;
      const inAmtVal = document.getElementById('input-amount') || inputAmount;
      const inDateVal = document.getElementById('input-date') || inputDate;
      const inCatVal = document.getElementById('input-category') || inputCategory;
      const inNotesVal = document.getElementById('input-notes') || inputNotes;

      const acc = inAcc ? inAcc.value : 'gaji';
      const desc = inDesc ? inDesc.value.trim() : '';
      const amt = getRawNumber(inAmtVal ? inAmtVal.value : '0');
      const dt = inDateVal ? parseInt(inDateVal.value, 10) : 1;
      const cat = inCatVal ? inCatVal.value : '';
      const nts = inNotesVal ? inNotesVal.value.trim() : '';

      let hasError = false;

      const errDesc = document.getElementById('err-description');
      const errAmt = document.getElementById('err-amount');
      const errDt = document.getElementById('err-date');

      if (!desc) {
        if (errDesc) {
          errDesc.innerText = 'Deskripsi tidak boleh kosong.';
          errDesc.style.display = 'block';
        }
        hasError = true;
      }
      if (!amt || amt <= 0) {
        if (errAmt) {
          errAmt.innerText = 'Jumlah uang harus lebih besar dari Rp 0.';
          errAmt.style.display = 'block';
        }
        hasError = true;
      }
      if (isNaN(dt) || dt < 1 || dt > 31) {
        if (errDt) {
          errDt.innerText = 'Tanggal harus diisi antara 1 sampai 31.';
          errDt.style.display = 'block';
        }
        hasError = true;
      }

      if (hasError) return;

      localStorage.setItem('et_last_entered_day', String(dt));

      const targetYear = editingTxId ? editingTxYear : selectedYear;
      const targetMonth = editingTxId ? editingTxMonth : selectedMonth;
      const dateStr = `${targetYear}-${targetMonth}-${String(dt).padStart(2, '0')}`;

      const payload = {
        description: desc,
        amount: amt,
        type: currentFormType,
        category: cat,
        date: dateStr,
        notes: nts,
        account: acc,
        items: pendingCountingItems && pendingCountingItems.length > 0 ? pendingCountingItems : undefined
      };

      if (editingTxId) {
        editTransaction(editingTxId, payload);
      } else {
        addTransaction(payload);
      }

      closeFormModal();
    });
  }

  // Counting Triggers from Transaction Form Modal
  const btnOpenCounting = document.getElementById('btn-open-counting-from-form');
  const btnEditCounting = document.getElementById('btn-edit-counting-items');

  if (btnOpenCounting) {
    btnOpenCounting.addEventListener('click', (e) => {
      e.preventDefault();
      openTxCountingModalForForm();
    });
  }
  if (btnEditCounting) {
    btnEditCounting.addEventListener('click', (e) => {
      e.preventDefault();
      openTxCountingModalForForm();
    });
  }

  // Backup, Restore & Reset
  if (btnExport) {
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

    const calcAggregates = (txList) => {
      const income = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return { income, expense, balance: income - expense };
    };

    const aggGaji = calcAggregates(txsGaji);
    const budgetGaji = budgets[`gaji_${monthKey}`] || 0;

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
      ['REKAPITULASI KEUANGAN BULANAN - EXPENSE TRACKER'],
      [`Periode: ${monthLabel}`],
      [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ['1. RINGKASAN PEMBUKUAN'],
      ['Total Pemasukan', 'Total Pengeluaran', 'Saldo Bersih', 'Batas Anggaran', 'Status Anggaran'],
      [
        aggGaji.income,
        aggGaji.expense,
        aggGaji.balance,
        budgetGaji || '-',
        isOverBudget(aggGaji.expense, budgetGaji)
      ],
      [],
      ['2. RINCIAN SUMBER PEMASUKAN'],
      ['Kategori Pemasukan', 'Total (Rp)']
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
      const totalAmt = txsGaji.filter(t => t.category === cat.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      if (totalAmt > 0) {
        summaryRows.push([cat.label, totalAmt]);
      }
    });

    summaryRows.push(
      [],
      ['3. RINCIAN POS PENGELUARAN'],
      ['Kategori Pengeluaran', 'Total (Rp)']
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
      const totalAmt = txsGaji.filter(t => t.category === cat.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      if (totalAmt > 0) {
        summaryRows.push([cat.label, totalAmt]);
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

    // Trigger Excel file download
    const filename = `Rekaptulasi Keuangan - ${monthLabel}.xlsx`;
    XLSX.writeFile(wb, filename);
    });
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener('click', () => {
      importFileInput.click();
    });
  }

  if (importFileInput) {
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
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus semua data transaksi dan anggaran? Tindakan ini tidak dapat dibatalkan.')) {
        localStorage.removeItem('et_transactions');
        localStorage.removeItem('et_budgets');
        transactions = [];
        budgets = {};
        renderAll();
      }
    });
  }
};

// ==========================================
// CART & PERIODIC PURCHASE COUNTING MODULE
// ==========================================
const DEFAULT_CART_ITEMS = [
  // 🍔 Makanan & Minuman
  { id: 'cart-makanan-1', name: 'Galon Air Mineral', category: 'makanan', price: 20000, qty: 0, unit: 'galon', isCustom: false },
  { id: 'cart-makanan-2', name: 'Beras Premium 5kg', category: 'makanan', price: 75000, qty: 0, unit: 'sak', isCustom: false },
  { id: 'cart-makanan-3', name: 'Minyak Goreng 2L', category: 'makanan', price: 36000, qty: 0, unit: 'pouch', isCustom: false },
  { id: 'cart-makanan-4', name: 'Telur Ayam 1kg', category: 'makanan', price: 28000, qty: 0, unit: 'kg', isCustom: false },
  { id: 'cart-makanan-5', name: 'Kopi / Minuman Rutin', category: 'makanan', price: 18000, qty: 0, unit: 'cup', isCustom: false },
  { id: 'cart-makanan-6', name: 'Makan Harian / Lauk', category: 'makanan', price: 25000, qty: 0, unit: 'porsi', isCustom: false },

  // 🛍️ Belanja
  { id: 'cart-belanja-1', name: 'Sabun Mandi & Sampo', category: 'belanja', price: 35000, qty: 0, unit: 'botol', isCustom: false },
  { id: 'cart-belanja-2', name: 'Deterjen & Pewangi Pakaian', category: 'belanja', price: 25000, qty: 0, unit: 'pack', isCustom: false },
  { id: 'cart-belanja-3', name: 'Tisu Wajah & Dapur', category: 'belanja', price: 15000, qty: 0, unit: 'pack', isCustom: false },
  { id: 'cart-belanja-4', name: 'Pasta Gigi & Sikat Gigi', category: 'belanja', price: 18000, qty: 0, unit: 'pcs', isCustom: false },
  { id: 'cart-belanja-5', name: 'Sabun Cuci Piring', category: 'belanja', price: 15000, qty: 0, unit: 'pouch', isCustom: false },

  // 🏠 Tempat Tinggal
  { id: 'cart-tempat-1', name: 'Isi Ulang Gas Elpiji 3kg', category: 'tempat-tinggal', price: 22000, qty: 0, unit: 'tabung', isCustom: false },
  { id: 'cart-tempat-2', name: 'Perlengkapan Kebersihan Rumah', category: 'tempat-tinggal', price: 30000, qty: 0, unit: 'set', isCustom: false },

  // 🚗 Transportasi
  { id: 'cart-trans-1', name: 'Bensin Motor (Pertalite/Pertamax)', category: 'transportasi', price: 35000, qty: 0, unit: 'isi', isCustom: false },
  { id: 'cart-trans-2', name: 'Bensin Mobil', category: 'transportasi', price: 150000, qty: 0, unit: 'isi', isCustom: false },
  { id: 'cart-trans-3', name: 'Tarif Tol / Parkir Harian', category: 'transportasi', price: 20000, qty: 0, unit: 'hari', isCustom: false },

  // 🔌 Tagihan & Utilitas
  { id: 'cart-tagihan-1', name: 'Token Listrik PLN', category: 'tagihan', price: 100000, qty: 0, unit: 'token', isCustom: false },
  { id: 'cart-tagihan-2', name: 'Paket Internet / Pulsa', category: 'tagihan', price: 75000, qty: 0, unit: 'bulan', isCustom: false },
  { id: 'cart-tagihan-3', name: 'Iuran Air / Kebersihan Lingkungan', category: 'tagihan', price: 50000, qty: 0, unit: 'bulan', isCustom: false },

  // 🏥 Kesehatan
  { id: 'cart-kes-1', name: 'Vitamin & Suplemen', category: 'kesehatan', price: 45000, qty: 0, unit: 'strip', isCustom: false },
  { id: 'cart-kes-2', name: 'Obat-obatan Rutin', category: 'kesehatan', price: 25000, qty: 0, unit: 'kotak', isCustom: false },

  // 🎬 Hiburan
  { id: 'cart-hib-1', name: 'Cemilan & Snack Nonton', category: 'hiburan', price: 25000, qty: 0, unit: 'pack', isCustom: false },
];

let cartItems = [];
const savedCart = localStorage.getItem('et_cart_items');
if (savedCart) {
  try {
    cartItems = JSON.parse(savedCart);
  } catch (e) {
    cartItems = [...DEFAULT_CART_ITEMS];
  }
} else {
  cartItems = [...DEFAULT_CART_ITEMS];
  localStorage.setItem('et_cart_items', JSON.stringify(cartItems));
}

let cartShippingFee = Number(localStorage.getItem('et_cart_shipping') || '0');
let activeCartCategory = 'all';
let cartFilterOnlyActive = false;
let cartSearchKeyword = '';
let editingCartPriceItemId = null;

const saveCartToLocalStorage = () => {
  localStorage.setItem('et_cart_items', JSON.stringify(cartItems));
  localStorage.setItem('et_cart_shipping', String(cartShippingFee));
  updateCartBadge();
};

const getCartTotals = () => {
  let totalQty = 0;
  let subtotal = 0;
  const categoryCounts = {};

  cartItems.forEach(item => {
    const q = Math.max(0, Number(item.qty) || 0);
    const p = Math.max(0, Number(item.price) || 0);
    totalQty += q;
    subtotal += q * p;

    if (q > 0) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + q;
    }
  });

  const grandTotal = subtotal + (totalQty > 0 ? cartShippingFee : 0);
  return { totalQty, subtotal, shipping: cartShippingFee, grandTotal, categoryCounts };
};

const updateCartBadge = () => {
  const { totalQty } = getCartTotals();
  const headerBadge = document.getElementById('cart-header-badge');
  const modalBadge = document.getElementById('cart-modal-item-badge');
  const activeCountEl = document.getElementById('cart-active-count');

  if (headerBadge) {
    headerBadge.innerText = totalQty;
    headerBadge.style.display = totalQty > 0 ? 'flex' : 'none';
  }
  if (modalBadge) {
    modalBadge.innerText = totalQty;
  }
  if (activeCountEl) {
    const activeDistinctItems = cartItems.filter(i => (Number(i.qty) || 0) > 0).length;
    activeCountEl.innerText = activeDistinctItems;
  }
};

const openCartModal = () => {
  editingCartPriceItemId = null;
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    cartModal.style.display = 'flex';
    renderCartUI();
  }
};

const closeCartModal = () => {
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    cartModal.style.display = 'none';
  }
  editingCartPriceItemId = null;
};

const renderCartCategoryPills = () => {
  const container = document.getElementById('cart-category-pills');
  if (!container) return;

  const { totalQty, categoryCounts } = getCartTotals();
  container.innerHTML = '';

  const createPill = (catId, icon, label, count) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `cart-cat-pill ${activeCartCategory === catId ? 'active' : ''}`;
    pill.innerHTML = `
      <span>${icon}</span>
      <span>${label}</span>
      <span class="cart-pill-badge">${count}</span>
    `;
    pill.addEventListener('click', () => {
      activeCartCategory = catId;
      renderCartUI();
    });
    return pill;
  };

  // 'Semua Kategori' pill
  container.appendChild(createPill('all', '📋', 'Semua Kategori', totalQty));

  // Expense categories
  CATEGORIES.expense.forEach(cat => {
    const count = categoryCounts[cat.id] || 0;
    container.appendChild(createPill(cat.id, cat.icon, cat.label, count));
  });
};

const renderCartItems = () => {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  if (!container) return;

  // Filter items based on active category and active filter toggle
  const filtered = cartItems.filter(item => {
    const matchCategory = (activeCartCategory === 'all' || item.category === activeCartCategory);
    const matchActive = (!cartFilterOnlyActive || (Number(item.qty) || 0) > 0);
    return matchCategory && matchActive;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = '';

  filtered.forEach(item => {
    const cat = CATEGORIES.expense.find(c => c.id === item.category) || { label: 'Lain-lain', icon: '🛍️', color: '#818cf8' };
    const qty = Math.max(0, Number(item.qty) || 0);
    const price = Math.max(0, Number(item.price) || 0);
    const lineTotal = qty * price;
    const isEditingPrice = (editingCartPriceItemId === item.id);

    const card = document.createElement('div');
    card.className = `cart-item-card ${qty > 0 ? 'has-qty' : ''}`;

    let priceHtml = '';
    if (isEditingPrice) {
      priceHtml = `
        <form class="cart-item-price-edit-form" data-id="${item.id}">
          <input type="text" inputmode="numeric" class="cart-item-price-input" value="${formatNumberInput(String(price))}" />
          <button type="submit" class="cart-item-price-save-btn" title="Simpan Harga">✓</button>
          <button type="button" class="btn-cancel-edit-price" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;" title="Batal">✕</button>
        </form>
      `;
    } else {
      priceHtml = `
        <div class="cart-item-price-view" data-id="${item.id}" title="Klik untuk edit harga">
          <span>${formatIDR(price)}</span>
          <button type="button" class="btn-inline-price-edit" data-id="${item.id}" title="Ubah harga satuan">✏️</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="cart-item-left">
        <div class="cart-item-thumb" style="background: ${cat.color}15; border-color: ${cat.color}35;">
          <span>${cat.icon}</span>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title" title="${item.name}">${item.name}</div>
          <div class="cart-item-price-row">
            ${priceHtml}
          </div>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-stepper">
          <button type="button" class="cart-step-btn btn-qty-minus" data-id="${item.id}" title="Kurangi kuantitas">−</button>
          <input type="number" min="0" max="999" class="cart-qty-input" data-id="${item.id}" value="${qty}" />
          <button type="button" class="cart-step-btn btn-qty-plus" data-id="${item.id}" title="Tambah kuantitas">+</button>
        </div>
        <div class="cart-item-total ${qty > 0 ? '' : 'muted'}">
          ${formatIDR(lineTotal)}
        </div>
        ${item.isCustom ? `
          <button type="button" class="btn-delete-cart-item" data-id="${item.id}" title="Hapus Barang">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        ` : ''}
      </div>
    `;

    // Bind quantity events
    const minusBtn = card.querySelector('.btn-qty-minus');
    const plusBtn = card.querySelector('.btn-qty-plus');
    const qtyInput = card.querySelector('.cart-qty-input');
    const deleteBtn = card.querySelector('.btn-delete-cart-item');

    minusBtn.addEventListener('click', () => {
      if (item.qty > 0) {
        item.qty -= 1;
        saveCartToLocalStorage();
        renderCartUI();
      }
    });

    plusBtn.addEventListener('click', () => {
      item.qty = (Number(item.qty) || 0) + 1;
      saveCartToLocalStorage();
      renderCartUI();
    });

    qtyInput.addEventListener('change', (e) => {
      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
      item.qty = val;
      saveCartToLocalStorage();
      renderCartUI();
    });

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Hapus "${item.name}" dari daftar barang?`)) {
          cartItems = cartItems.filter(i => i.id !== item.id);
          saveCartToLocalStorage();
          renderCartUI();
        }
      });
    }

    // Bind price edit events
    if (isEditingPrice) {
      const form = card.querySelector('.cart-item-price-edit-form');
      const input = card.querySelector('.cart-item-price-input');
      const cancelBtn = card.querySelector('.btn-cancel-edit-price');

      input.addEventListener('input', (e) => {
        e.target.value = formatNumberInput(e.target.value);
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPrice = getRawNumber(input.value);
        if (newPrice > 0) {
          item.price = newPrice;
          editingCartPriceItemId = null;
          saveCartToLocalStorage();
          renderCartUI();
        } else {
          alert('Harga satuan harus lebih besar dari Rp 0!');
        }
      });

      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingCartPriceItemId = null;
        renderCartItems();
      });

      setTimeout(() => input.focus(), 30);
    } else {
      const priceView = card.querySelector('.cart-item-price-view');
      priceView.addEventListener('click', () => {
        editingCartPriceItemId = item.id;
        renderCartItems();
      });
    }

    container.appendChild(card);
  });
};

const renderCartSummary = () => {
  const { totalQty, subtotal, shipping, grandTotal } = getCartTotals();

  const totalQtyEl = document.getElementById('cart-summary-total-qty');
  const subtotalEl = document.getElementById('cart-summary-subtotal');
  const shippingEl = document.getElementById('cart-summary-shipping');
  const grandTotalEl = document.getElementById('cart-summary-total');

  if (totalQtyEl) totalQtyEl.innerText = totalQty;
  if (subtotalEl) subtotalEl.innerText = formatIDR(subtotal);
  if (shippingEl) {
    if (shipping > 0) {
      shippingEl.innerText = formatIDR(shipping);
      shippingEl.style.color = 'var(--text-primary)';
    } else {
      shippingEl.innerText = 'Gratis (Rp 0)';
      shippingEl.style.color = 'var(--income)';
    }
  }
  if (grandTotalEl) grandTotalEl.innerText = formatIDR(grandTotal);
};

const renderCartUI = () => {
  renderCartCategoryPills();
  renderCartItems();
  renderCartSummary();
  updateCartBadge();
};

const handleCheckoutCart = () => {
  const { totalQty, grandTotal, subtotal } = getCartTotals();
  if (totalQty === 0) {
    alert('Keranjang belanja masih kosong! Tambahkan kuantitas barang terlebih dahulu sebelum mencatat ke transaksi.');
    return;
  }

  const activeItems = cartItems.filter(i => (Number(i.qty) || 0) > 0);
  const categoriesInvolved = [...new Set(activeItems.map(i => i.category))];

  // Itemized breakdown text for notes
  const itemLines = activeItems.map(i => {
    const p = Number(i.price) || 0;
    const q = Number(i.qty) || 0;
    return `• ${i.name}: ${q}x @ ${formatIDR(p)} = ${formatIDR(q * p)}`;
  });

  if (cartShippingFee > 0) {
    itemLines.push(`• Ongkir / Biaya Tambahan: ${formatIDR(cartShippingFee)}`);
  }
  itemLines.push(`Total Belanja: ${formatIDR(grandTotal)}`);
  const notesText = `Rincian Pembelian Berkala:\n${itemLines.join('\n')}`;

  // Description short summary
  const summaryNames = activeItems.slice(0, 3).map(i => `${i.name} (${i.qty}x)`).join(', ');
  const remaining = activeItems.length - 3;
  const descText = `Pembelian: ${summaryNames}${remaining > 0 ? ` +${remaining} barang lain` : ''}`;

  // Date
  const today = new Date();
  const todayYear = String(today.getFullYear());
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');

  const targetYear = selectedYear || todayYear;
  const targetMonth = selectedMonth || todayMonth;
  const targetDay = (selectedYear === todayYear && selectedMonth === todayMonth) ? todayDay : '01';
  const txDate = `${targetYear}-${targetMonth}-${targetDay}`;

  // Main category
  let mainCat = 'belanja';
  if (categoriesInvolved.length === 1) {
    mainCat = categoriesInvolved[0];
  } else if (activeCartCategory !== 'all') {
    mainCat = activeCartCategory;
  }

  const confirmMsg = `Catat pengeluaran pembelian berkala sebesar ${formatIDR(grandTotal)} (${totalQty} barang) ke riwayat transaksi?`;
  if (confirm(confirmMsg)) {
    addTransaction({
      description: descText,
      amount: grandTotal,
      type: 'expense',
      category: mainCat,
      date: txDate,
      notes: notesText,
      account: 'gaji'
    });

    if (confirm('Transaksi berhasil dicatat!\n\nApakah Anda ingin mereset kuantitas keranjang menjadi 0 untuk sesi belanja berikutnya?')) {
      cartItems.forEach(i => { i.qty = 0; });
      saveCartToLocalStorage();
    }

    closeCartModal();
    renderAll();
  }
};

const initCart = () => {
  const btnOpenCart = document.getElementById('btn-open-cart');
  const btnCloseCartModal = document.getElementById('btn-close-cart-modal');
  const cartModal = document.getElementById('cart-modal');
  const cartFilterAll = document.getElementById('cart-filter-all');
  const cartFilterActive = document.getElementById('cart-filter-active');
  const btnOpenAddCartItem = document.getElementById('btn-open-add-cart-item');
  const cartNewItemForm = document.getElementById('cart-new-item-form');
  const inputNewCartName = document.getElementById('input-new-cart-name');
  const inputNewCartCategory = document.getElementById('input-new-cart-category');
  const inputNewCartPrice = document.getElementById('input-new-cart-price');
  const btnCancelAddCartItem = document.getElementById('btn-cancel-add-cart-item');
  const btnResetCart = document.getElementById('btn-reset-cart');
  const btnCheckoutCart = document.getElementById('btn-checkout-cart');
  
  // Shipping controls
  const btnEditShipping = document.getElementById('btn-edit-shipping');
  const shippingDisplay = document.getElementById('cart-summary-shipping');
  const shippingEditRow = document.getElementById('cart-shipping-edit-row');
  const inputCartShipping = document.getElementById('input-cart-shipping');
  const btnSaveShipping = document.getElementById('btn-save-shipping');
  const btnCancelShipping = document.getElementById('btn-cancel-shipping');

  // Modal open/close
  if (btnOpenCart) btnOpenCart.addEventListener('click', openCartModal);
  if (btnCloseCartModal) btnCloseCartModal.addEventListener('click', closeCartModal);
  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) closeCartModal();
    });
  }

  // Filter Segment
  if (cartFilterAll && cartFilterActive) {
    cartFilterAll.addEventListener('click', () => {
      cartFilterOnlyActive = false;
      cartFilterAll.classList.add('active');
      cartFilterActive.classList.remove('active');
      renderCartItems();
    });
    cartFilterActive.addEventListener('click', () => {
      cartFilterOnlyActive = true;
      cartFilterActive.classList.add('active');
      cartFilterAll.classList.remove('active');
      renderCartItems();
    });
  }

  // Populate New Item Category Dropdown
  if (inputNewCartCategory) {
    inputNewCartCategory.innerHTML = '';
    CATEGORIES.expense.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = `${cat.icon} ${cat.label}`;
      inputNewCartCategory.appendChild(opt);
    });
  }

  // Add Item Toggle & Form
  if (btnOpenAddCartItem && cartNewItemForm) {
    btnOpenAddCartItem.addEventListener('click', () => {
      const isHidden = cartNewItemForm.style.display === 'none';
      cartNewItemForm.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        inputNewCartName.value = '';
        inputNewCartPrice.value = '';
        if (activeCartCategory !== 'all') {
          inputNewCartCategory.value = activeCartCategory;
        }
        inputNewCartName.focus();
      }
    });
  }

  if (btnCancelAddCartItem && cartNewItemForm) {
    btnCancelAddCartItem.addEventListener('click', () => {
      cartNewItemForm.style.display = 'none';
    });
  }

  if (inputNewCartPrice) {
    inputNewCartPrice.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
    });
  }

  if (cartNewItemForm) {
    cartNewItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputNewCartName.value.trim();
      const cat = inputNewCartCategory.value;
      const price = getRawNumber(inputNewCartPrice.value);

      if (!name) {
        alert('Nama barang tidak boleh kosong!');
        return;
      }
      if (price <= 0) {
        alert('Harga barang harus lebih besar dari Rp 0!');
        return;
      }

      const newItem = {
        id: 'cart-custom-' + Date.now(),
        name,
        category: cat,
        price,
        qty: 1, // Start with qty 1 when adding new item
        isCustom: true
      };

      cartItems.unshift(newItem);
      saveCartToLocalStorage();
      cartNewItemForm.style.display = 'none';
      activeCartCategory = cat; // Switch to the category of the newly added item
      renderCartUI();
    });
  }

  // Shipping fee edit
  const openShippingEdit = () => {
    if (shippingEditRow) {
      shippingEditRow.style.display = 'flex';
      inputCartShipping.value = formatNumberInput(String(cartShippingFee));
      inputCartShipping.focus();
    }
  };

  if (btnEditShipping) btnEditShipping.addEventListener('click', openShippingEdit);
  if (shippingDisplay) shippingDisplay.addEventListener('click', openShippingEdit);

  if (inputCartShipping) {
    inputCartShipping.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
    });
  }

  if (btnSaveShipping && shippingEditRow) {
    btnSaveShipping.addEventListener('click', () => {
      cartShippingFee = getRawNumber(inputCartShipping.value);
      saveCartToLocalStorage();
      shippingEditRow.style.display = 'none';
      renderCartSummary();
    });
  }

  if (btnCancelShipping && shippingEditRow) {
    btnCancelShipping.addEventListener('click', () => {
      shippingEditRow.style.display = 'none';
    });
  }

  // Reset Cart
  if (btnResetCart) {
    btnResetCart.addEventListener('click', () => {
      const { totalQty } = getCartTotals();
      if (totalQty === 0) {
        alert('Kuantitas keranjang sudah 0.');
        return;
      }
      if (confirm('Reset semua kuantitas barang belanjaan menjadi 0?')) {
        cartItems.forEach(i => { i.qty = 0; });
        saveCartToLocalStorage();
        renderCartUI();
      }
    });
  }

  // Checkout
  if (btnCheckoutCart) {
    btnCheckoutCart.addEventListener('click', handleCheckoutCart);
  }

  // Helper inside transaction modal
  const btnModalOpenCartCalc = document.getElementById('btn-modal-open-cart-calc');
  if (btnModalOpenCartCalc) {
    btnModalOpenCartCalc.addEventListener('click', () => {
      const { totalQty, grandTotal } = getCartTotals();
      if (grandTotal > 0) {
        const inputAmount = document.getElementById('input-amount');
        const inputDesc = document.getElementById('input-description');
        const inputNotes = document.getElementById('input-notes');
        const inputCat = document.getElementById('input-category');

        if (inputAmount) inputAmount.value = formatNumberInput(String(grandTotal));

        const activeItems = cartItems.filter(i => (Number(i.qty) || 0) > 0);
        const summaryNames = activeItems.slice(0, 2).map(i => `${i.name} (${i.qty}x)`).join(', ');
        if (inputDesc && !inputDesc.value) {
          inputDesc.value = `Pembelian: ${summaryNames}`;
        }

        const itemLines = activeItems.map(i => `• ${i.name}: ${i.qty}x @ ${formatIDR(i.price)} = ${formatIDR(i.qty * i.price)}`);
        if (cartShippingFee > 0) itemLines.push(`• Ongkir: ${formatIDR(cartShippingFee)}`);
        itemLines.push(`Total: ${formatIDR(grandTotal)}`);

        if (inputNotes && !inputNotes.value) {
          inputNotes.value = `Rincian Keranjang:\n${itemLines.join('\n')}`;
        }

        const cats = [...new Set(activeItems.map(i => i.category))];
        if (cats.length === 1 && inputCat) {
          inputCat.value = cats[0];
        }

        alert(`Nominal ${formatIDR(grandTotal)} berhasil diisikan dari Keranjang Belanja!`);
      } else {
        openCartModal();
      }
    });
  }

  updateCartBadge();
};

// ==========================================
// TRANSACTION COUNTING MODULE (ITEMIZED)
// ==========================================
let selectedCountingTx = null;
let currentCountingItems = [];
let isNewCountingTx = false;
let pendingCountingItems = [];

// Update the visual indicator badge in the transaction form
const updateCountingBadgeInForm = () => {
  const badge = document.getElementById('counting-summary-badge');
  const textEl = document.getElementById('counting-summary-text');
  if (!badge) return;
  if (pendingCountingItems && pendingCountingItems.length > 0) {
    let totalQty = 0;
    let grandTotal = 0;
    pendingCountingItems.forEach(i => {
      const q = Math.max(0, Number(i.qty) || 0);
      const p = Math.max(0, Number(i.price) || 0);
      totalQty += q;
      grandTotal += q * p;
    });
    if (textEl) textEl.innerText = `🧮 Dihitung dari ${totalQty} pcs (${pendingCountingItems.length} item) • ${formatIDR(grandTotal)}`;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
};
window.updateCountingBadgeInForm = updateCountingBadgeInForm;

// Helper to extract or initialize items for a transaction
const extractItemsFromTx = (t) => {
  if (t.items && Array.isArray(t.items) && t.items.length > 0) {
    return JSON.parse(JSON.stringify(t.items));
  }

  // Parse from notes if notes has lines like:
  // "• rokok (1x @ Rp 35.000 = Rp 35.000)" or "• rokok: 1x @ Rp 35.000"
  if (t.notes) {
    const lines = t.notes.split('\n');
    const parsed = [];
    const itemRegex = /[•\-\*]\s*([^:(]+?)(?:\s*\(|\s*:)\s*(\d+)x\s*@\s*Rp\s*([\d\.]+)/i;
    
    lines.forEach((line, idx) => {
      const match = line.match(itemRegex);
      if (match) {
        parsed.push({
          id: 'item-' + Date.now() + '-' + idx,
          name: match[1].trim(),
          qty: parseInt(match[2], 10) || 1,
          price: getRawNumber(match[3]) || 0
        });
      }
    });

    if (parsed.length > 0) {
      return parsed;
    }
  }

  // If title suggests multiple items, e.g. "rokok & kopi" or "kopi, rokok"
  const title = t.description || 'Item';
  if (title.includes('&') || title.includes(',')) {
    const parts = title.split(/[&,]/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const splitPrice = Math.round(t.amount / parts.length);
      return parts.map((part, idx) => ({
        id: 'item-' + Date.now() + '-' + idx,
        name: part,
        price: splitPrice,
        qty: 1
      }));
    }
  }

  // Default: single item with the title and amount
  return [
    {
      id: 'item-' + Date.now() + '-0',
      name: title,
      price: t.amount || 0,
      qty: 1
    }
  ];
};

// Open Counting Modal from Transaction Form Modal (Tambah Transaksi / Edit Transaksi)
const openTxCountingModalForForm = () => {
  isNewCountingTx = true;
  selectedCountingTx = null;
  const modal = document.getElementById('tx-counting-modal');
  if (!modal) return;

  const inDesc = document.getElementById('input-description') || inputDescription;
  const inAmt = document.getElementById('input-amount') || inputAmount;
  const inDate = document.getElementById('input-date') || inputDate;
  const inCat = document.getElementById('input-category') || inputCategory;

  const descVal = inDesc ? inDesc.value.trim() : '';
  const amtVal = inAmt ? getRawNumber(inAmt.value) : 0;
  const dateVal = inDate ? parseInt(inDate.value, 10) : 25;
  const catVal = inCat ? inCat.value : '';

  const catList = [...CATEGORIES.income, ...CATEGORIES.expense];
  const cat = catList.find(c => c.id === catVal) || { label: 'Umum', icon: '🛍️' };

  const iconEl = document.getElementById('tx-counting-cat-icon');
  const badgeEl = document.getElementById('tx-counting-cat-badge');
  const nameEl = document.getElementById('tx-counting-item-name');
  const titleInput = document.getElementById('tx-counting-title-input');

  if (iconEl) iconEl.innerText = cat.icon;
  if (badgeEl) badgeEl.innerText = cat.label;
  
  if (nameEl) nameEl.style.display = 'none';
  if (titleInput) {
    titleInput.style.display = 'block';
    titleInput.value = descVal;
    titleInput.placeholder = 'Nama transaksi (misal: Jajan, Belanja, Rokok)';
  }

  // Items to use:
  if (pendingCountingItems && pendingCountingItems.length > 0) {
    currentCountingItems = JSON.parse(JSON.stringify(pendingCountingItems));
  } else if (descVal && amtVal > 0) {
    currentCountingItems = [
      {
        id: 'item-' + Date.now(),
        name: descVal,
        price: amtVal,
        qty: 1
      }
    ];
  } else if (descVal) {
    currentCountingItems = [
      {
        id: 'item-' + Date.now(),
        name: descVal,
        price: 0,
        qty: 1
      }
    ];
  } else {
    currentCountingItems = [];
  }

  // Set date
  const dateInput = document.getElementById('tx-counting-date');
  if (dateInput) {
    dateInput.value = (dateVal >= 1 && dateVal <= 31) ? dateVal : 25;
  }

  // Configure modal buttons for Form mode
  const btnApply = document.getElementById('btn-tx-count-apply-to-form');
  const btnSaveDirect = document.getElementById('btn-tx-count-save-direct');
  const btnUpdateExisting = document.getElementById('btn-tx-count-update-existing');
  const btnRecordNew = document.getElementById('btn-tx-count-record-new');

  if (btnApply) btnApply.style.display = 'flex';
  if (btnSaveDirect) btnSaveDirect.style.display = 'flex';
  if (btnUpdateExisting) btnUpdateExisting.style.display = 'none';
  if (btnRecordNew) btnRecordNew.style.display = 'none';

  // Toggle add item form
  const addForm = document.getElementById('tx-add-item-form');
  if (addForm) {
    addForm.style.display = currentCountingItems.length === 0 ? 'flex' : 'none';
    if (currentCountingItems.length === 0) {
      const inputNewItemName = document.getElementById('input-tx-new-item-name');
      if (inputNewItemName) setTimeout(() => inputNewItemName.focus(), 150);
    }
  }

  renderTxCountingUI();
  modal.style.display = 'flex';
};
window.openTxCountingModalForForm = openTxCountingModalForForm;

const openTxCountingModal = (t) => {
  isNewCountingTx = false;
  selectedCountingTx = t;
  const modal = document.getElementById('tx-counting-modal');
  if (!modal) return;

  const catList = [...CATEGORIES.income, ...CATEGORIES.expense];
  const cat = catList.find(c => c.id === t.category) || { label: 'Lain-lain', icon: '🛍️' };

  const iconEl = document.getElementById('tx-counting-cat-icon');
  const badgeEl = document.getElementById('tx-counting-cat-badge');
  const nameEl = document.getElementById('tx-counting-item-name');
  const titleInput = document.getElementById('tx-counting-title-input');

  if (iconEl) iconEl.innerText = cat.icon;
  if (badgeEl) badgeEl.innerText = cat.label;
  if (nameEl) {
    nameEl.style.display = 'block';
    nameEl.innerText = t.description;
  }
  if (titleInput) {
    titleInput.style.display = 'none';
  }

  // Extract items (e.g. rokok, kopi)
  currentCountingItems = extractItemsFromTx(t);

  // Set date
  const dateInput = document.getElementById('tx-counting-date');
  const txParts = t.date ? t.date.split('-') : [];
  const today = new Date();
  const currentDay = (selectedYear === String(today.getFullYear()) && selectedMonth === String(today.getMonth() + 1).padStart(2, '0'))
    ? today.getDate()
    : (txParts.length === 3 ? parseInt(txParts[2], 10) : 1);
  if (dateInput) dateInput.value = currentDay;

  // Configure modal buttons for existing transaction mode
  const btnApply = document.getElementById('btn-tx-count-apply-to-form');
  const btnSaveDirect = document.getElementById('btn-tx-count-save-direct');
  const btnUpdateExisting = document.getElementById('btn-tx-count-update-existing');
  const btnRecordNew = document.getElementById('btn-tx-count-record-new');

  if (btnApply) btnApply.style.display = 'none';
  if (btnSaveDirect) btnSaveDirect.style.display = 'none';
  if (btnUpdateExisting) btnUpdateExisting.style.display = 'flex';
  if (btnRecordNew) btnRecordNew.style.display = 'flex';

  // Hide add item form initially
  const addForm = document.getElementById('tx-add-item-form');
  if (addForm) addForm.style.display = 'none';

  renderTxCountingUI();
  modal.style.display = 'flex';
};

const closeTxCountingModal = () => {
  const modal = document.getElementById('tx-counting-modal');
  if (modal) modal.style.display = 'none';
  selectedCountingTx = null;
  currentCountingItems = [];
};

const getTxCountingGrandTotal = () => {
  let totalQty = 0;
  let grandTotal = 0;
  currentCountingItems.forEach(item => {
    const q = Math.max(0, Number(item.qty) || 0);
    const p = Math.max(0, Number(item.price) || 0);
    totalQty += q;
    grandTotal += (q * p);
  });
  return { totalQty, grandTotal };
};

const renderTxCountingUI = () => {
  const listContainer = document.getElementById('tx-counting-items-list');
  const emptyNotice = document.getElementById('tx-counting-empty-items');
  const itemsBadge = document.getElementById('tx-counting-items-badge');
  const totalQtyBadge = document.getElementById('tx-counting-total-qty-badge');
  const formulaEl = document.getElementById('tx-counting-items-formula');
  const totalDisplay = document.getElementById('tx-counting-total-display');
  const btnApplyToForm = document.getElementById('btn-tx-count-apply-to-form');

  if (!listContainer) return;

  const { totalQty, grandTotal } = getTxCountingGrandTotal();

  if (itemsBadge) itemsBadge.innerText = `${currentCountingItems.length} item`;
  if (totalQtyBadge) totalQtyBadge.innerText = totalQty;
  if (totalDisplay) totalDisplay.innerText = formatIDR(grandTotal);
  if (btnApplyToForm) {
    btnApplyToForm.innerText = `✓ Terapkan ke Formulir Transaksi (${formatIDR(grandTotal)})`;
  }

  if (currentCountingItems.length === 0) {
    listContainer.innerHTML = '';
    if (emptyNotice) emptyNotice.style.display = 'block';
    if (formulaEl) formulaEl.innerText = '0 item dihitung';
    return;
  }

  if (emptyNotice) emptyNotice.style.display = 'none';
  listContainer.innerHTML = '';

  const activeNames = currentCountingItems
    .filter(i => (Number(i.qty) || 0) > 0)
    .map(i => `${i.name} (${i.qty}x)`);
  if (formulaEl) {
    formulaEl.innerText = activeNames.length > 0 
      ? activeNames.slice(0, 2).join(' + ') + (activeNames.length > 2 ? ` +${activeNames.length - 2}` : '') 
      : 'Kuantitas 0';
  }

  currentCountingItems.forEach(item => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const price = Math.max(0, Number(item.price) || 0);
    const lineTotal = qty * price;

    const row = document.createElement('div');
    row.className = 'cart-item-card has-qty';
    row.style.padding = '0.65rem 0.85rem';
    row.style.gap = '0.5rem';

    row.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
          <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 700; background: rgba(56, 189, 248, 0.15); padding: 0.1rem 0.35rem; border-radius: 4px;">(counting)</span>
          <span style="font-weight: 600; font-size: 0.92rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.name}">${item.name}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: var(--text-secondary);">
          <span>Harga:</span>
          <div style="display: flex; align-items: center; gap: 0.2rem;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">Rp</span>
            <input type="text" inputmode="numeric" class="tx-item-price-input" data-id="${item.id}" value="${formatNumberInput(String(price))}" style="width: 85px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 0.15rem 0.35rem; color: #fff; font-size: 0.8rem; font-weight: 600;" title="Ketik untuk mengubah harga satuan" />
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0;">
        <div class="cart-stepper" style="border-color: rgba(56, 189, 248, 0.4);">
          <button type="button" class="cart-step-btn btn-tx-item-minus" data-id="${item.id}" title="Kurangi">−</button>
          <input type="number" min="0" max="999" class="cart-qty-input tx-item-qty-input" data-id="${item.id}" value="${qty}" style="width: 32px; height: 28px; font-size: 0.85rem;" />
          <button type="button" class="cart-step-btn btn-tx-item-plus" data-id="${item.id}" title="Tambah">+</button>
        </div>
        <div class="tx-item-line-total" style="font-size: 0.92rem; font-weight: 700; color: #f8fafc; min-width: 80px; text-align: right;">
          ${formatIDR(lineTotal)}
        </div>
        <button type="button" class="btn-delete-cart-item btn-delete-tx-item" data-id="${item.id}" title="Hapus item ini" style="opacity: 0.6; padding: 0.2rem; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Bind item events
    const minusBtn = row.querySelector('.btn-tx-item-minus');
    const plusBtn = row.querySelector('.btn-tx-item-plus');
    const qtyInput = row.querySelector('.tx-item-qty-input');
    const priceInput = row.querySelector('.tx-item-price-input');
    const deleteBtn = row.querySelector('.btn-delete-tx-item');

    minusBtn.addEventListener('click', () => {
      if (item.qty > 0) {
        item.qty -= 1;
        renderTxCountingUI();
      }
    });

    plusBtn.addEventListener('click', () => {
      item.qty = (Number(item.qty) || 0) + 1;
      renderTxCountingUI();
    });

    qtyInput.addEventListener('change', (e) => {
      item.qty = Math.max(0, parseInt(e.target.value, 10) || 0);
      renderTxCountingUI();
    });

    priceInput.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
      item.price = getRawNumber(e.target.value);
      const lineEl = row.querySelector('.tx-item-line-total');
      if (lineEl) lineEl.innerText = formatIDR(item.qty * item.price);
      const { grandTotal } = getTxCountingGrandTotal();
      if (totalDisplay) totalDisplay.innerText = formatIDR(grandTotal);
      if (btnApplyToForm) {
        btnApplyToForm.innerText = `✓ Terapkan ke Formulir Transaksi (${formatIDR(grandTotal)})`;
      }
    });

    deleteBtn.addEventListener('click', () => {
      currentCountingItems = currentCountingItems.filter(i => i.id !== item.id);
      renderTxCountingUI();
    });

    listContainer.appendChild(row);
  });
};

const initTxCounting = () => {
  const btnClose = document.getElementById('btn-close-tx-counting-modal');
  const modal = document.getElementById('tx-counting-modal');
  const dateInput = document.getElementById('tx-counting-date');
  const btnApplyToForm = document.getElementById('btn-tx-count-apply-to-form');
  const btnSaveDirect = document.getElementById('btn-tx-count-save-direct');
  const btnRecordNew = document.getElementById('btn-tx-count-record-new');
  const btnUpdateExisting = document.getElementById('btn-tx-count-update-existing');
  const btnOpenCart = document.getElementById('btn-tx-count-open-cart');
  
  // Add item form controls
  const btnOpenAddItem = document.getElementById('btn-tx-open-add-item');
  const addItemForm = document.getElementById('tx-add-item-form');
  const inputNewItemName = document.getElementById('input-tx-new-item-name');
  const inputNewItemPrice = document.getElementById('input-tx-new-item-price');
  const btnCancelAddItem = document.getElementById('btn-cancel-tx-add-item');

  if (btnClose) btnClose.addEventListener('click', closeTxCountingModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTxCountingModal();
    });
  }

  // Toggle add item form
  if (btnOpenAddItem && addItemForm) {
    btnOpenAddItem.addEventListener('click', () => {
      const isHidden = addItemForm.style.display === 'none';
      addItemForm.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputNewItemName) {
        inputNewItemName.value = '';
        inputNewItemPrice.value = '';
        inputNewItemName.focus();
      }
    });
  }

  if (btnCancelAddItem && addItemForm) {
    btnCancelAddItem.addEventListener('click', () => {
      addItemForm.style.display = 'none';
    });
  }

  if (inputNewItemPrice) {
    inputNewItemPrice.addEventListener('input', (e) => {
      e.target.value = formatNumberInput(e.target.value);
    });
  }

  if (addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputNewItemName.value.trim();
      const price = getRawNumber(inputNewItemPrice.value);

      if (!name) {
        alert('Nama item tidak boleh kosong!');
        return;
      }
      if (price <= 0) {
        alert('Harga item harus lebih besar dari Rp 0!');
        return;
      }

      currentCountingItems.push({
        id: 'item-' + Date.now(),
        name,
        price,
        qty: 1
      });

      addItemForm.style.display = 'none';
      renderTxCountingUI();
    });
  }

  // Apply to transaction form
  if (btnApplyToForm) {
    btnApplyToForm.addEventListener('click', () => {
      const { totalQty, grandTotal } = getTxCountingGrandTotal();
      if (grandTotal <= 0 && currentCountingItems.length === 0) {
        alert('Silakan tambahkan minimal 1 item dengan kuantitas dan harga lebih dari Rp 0!');
        return;
      }

      const inDesc = document.getElementById('input-description') || inputDescription;
      const inAmt = document.getElementById('input-amount') || inputAmount;
      const inDate = document.getElementById('input-date') || inputDate;
      const inNotes = document.getElementById('input-notes') || inputNotes;
      const titleInput = document.getElementById('tx-counting-title-input');

      // Update description if provided or blank
      const customTitle = titleInput ? titleInput.value.trim() : '';
      if (customTitle && inDesc) {
        inDesc.value = customTitle;
      } else if (inDesc && (!inDesc.value.trim() || inDesc.value.trim() === 'Transaksi Baru')) {
        const itemNames = currentCountingItems.filter(i => (Number(i.qty) || 0) > 0).map(i => i.name);
        if (itemNames.length > 0) inDesc.value = itemNames.join(', ');
      }

      // Update amount
      if (inAmt) {
        inAmt.value = formatNumberInput(String(grandTotal));
      }

      // Update date from modal if valid
      const d = parseInt(dateInput.value, 10);
      if (!isNaN(d) && d >= 1 && d <= 31 && inDate) {
        inDate.value = d;
      }

      // Format notes breakdown
      const activeItems = currentCountingItems.filter(i => (Number(i.qty) || 0) > 0);
      const itemLines = activeItems.map(i => `• ${i.name} (${i.qty}x @ ${formatIDR(i.price)} = ${formatIDR(i.qty * i.price)})`);
      const breakdownText = `Rincian Item:\n${itemLines.join('\n')}\nTotal: ${formatIDR(grandTotal)}`;
      if (inNotes) {
        const currentNotes = inNotes.value.trim();
        if (!currentNotes || currentNotes.startsWith('Rincian Item:')) {
          inNotes.value = breakdownText;
        } else {
          inNotes.value = currentNotes + '\n\n' + breakdownText;
        }
      }

      // Save pending items
      pendingCountingItems = JSON.parse(JSON.stringify(currentCountingItems));
      updateCountingBadgeInForm();

      closeTxCountingModal();
    });
  }

  // Save directly without going back to form
  if (btnSaveDirect) {
    btnSaveDirect.addEventListener('click', () => {
      const { grandTotal } = getTxCountingGrandTotal();
      if (grandTotal <= 0) {
        alert('Total transaksi harus lebih besar dari Rp 0!');
        return;
      }

      const inDesc = document.getElementById('input-description') || inputDescription;
      const inDate = document.getElementById('input-date') || inputDate;
      const inCat = document.getElementById('input-category') || inputCategory;
      const inAcc = document.getElementById('input-account') || inputAccount;
      const inNotes = document.getElementById('input-notes') || inputNotes;
      const titleInput = document.getElementById('tx-counting-title-input');

      const customTitle = titleInput ? titleInput.value.trim() : '';
      const existingDesc = inDesc ? inDesc.value.trim() : '';
      const activeItems = currentCountingItems.filter(i => (Number(i.qty) || 0) > 0);
      const fallbackTitle = activeItems.length > 0 ? activeItems.map(i => i.name).join(', ') : 'Transaksi Baru';
      const finalTitle = customTitle || existingDesc || fallbackTitle;

      const dayVal = parseInt(dateInput.value, 10) || (inDate ? parseInt(inDate.value, 10) : 25) || 25;
      const targetDate = `${selectedYear}-${selectedMonth}-${String(dayVal).padStart(2, '0')}`;

      const catVal = inCat ? inCat.value : 'makanan';
      const accVal = inAcc ? inAcc.value : 'gaji';

      const itemLines = activeItems.map(i => `• ${i.name} (${i.qty}x @ ${formatIDR(i.price)} = ${formatIDR(i.qty * i.price)})`);
      let notesText = `Rincian Item:\n${itemLines.join('\n')}\nTotal: ${formatIDR(grandTotal)}`;
      if (inNotes && inNotes.value.trim() && !inNotes.value.trim().startsWith('Rincian Item:')) {
        notesText = inNotes.value.trim() + '\n\n' + notesText;
      }

      const newTxPayload = {
        description: finalTitle,
        amount: grandTotal,
        type: currentFormType || 'expense',
        category: catVal,
        date: targetDate,
        items: currentCountingItems,
        notes: notesText,
        account: accVal
      };

      if (editingTxId) {
        editTransaction(editingTxId, newTxPayload);
        alert(`Transaksi "${finalTitle}" berhasil diperbarui sebesar ${formatIDR(grandTotal)}!`);
      } else {
        addTransaction(newTxPayload);
        alert(`Transaksi baru "${finalTitle}" berhasil disimpan sebesar ${formatIDR(grandTotal)}!`);
      }

      closeTxCountingModal();
      closeFormModal();
    });
  }

  // Record as new repeat purchase transaction
  if (btnRecordNew) {
    btnRecordNew.addEventListener('click', () => {
      if (!selectedCountingTx) return;
      const { grandTotal } = getTxCountingGrandTotal();
      if (grandTotal <= 0) {
        alert('Total transaksi harus lebih besar dari Rp 0!');
        return;
      }

      const dayVal = parseInt(dateInput.value, 10);
      if (isNaN(dayVal) || dayVal < 1 || dayVal > 31) {
        alert('Tanggal harus antara 1 dan 31!');
        return;
      }

      const targetDate = `${selectedYear}-${selectedMonth}-${String(dayVal).padStart(2, '0')}`;
      
      // Build clean notes breakdown
      const itemLines = currentCountingItems.map(i => `• ${i.name} (${i.qty}x @ ${formatIDR(i.price)} = ${formatIDR(i.qty * i.price)})`);
      const notesText = `Rincian Item:\n${itemLines.join('\n')}\nTotal: ${formatIDR(grandTotal)}`;

      addTransaction({
        description: selectedCountingTx.description,
        amount: grandTotal,
        type: selectedCountingTx.type,
        category: selectedCountingTx.category,
        date: targetDate,
        items: currentCountingItems,
        notes: notesText,
        account: selectedCountingTx.account || 'gaji'
      });

      alert(`Pembelian baru "${selectedCountingTx.description}" berhasil dicatat sebesar ${formatIDR(grandTotal)}!`);
      closeTxCountingModal();
    });
  }

  // Update existing transaction
  if (btnUpdateExisting) {
    btnUpdateExisting.addEventListener('click', () => {
      if (!selectedCountingTx) return;
      const { grandTotal } = getTxCountingGrandTotal();
      if (grandTotal <= 0) {
        alert('Total transaksi harus lebih besar dari Rp 0!');
        return;
      }

      // Build clean notes breakdown
      const itemLines = currentCountingItems.map(i => `• ${i.name} (${i.qty}x @ ${formatIDR(i.price)} = ${formatIDR(i.qty * i.price)})`);
      const notesText = `Rincian Item:\n${itemLines.join('\n')}\nTotal: ${formatIDR(grandTotal)}`;

      editTransaction(selectedCountingTx.id, {
        amount: grandTotal,
        items: currentCountingItems,
        notes: notesText
      });

      alert(`Transaksi "${selectedCountingTx.description}" berhasil diperbarui menjadi ${formatIDR(grandTotal)}!`);
      closeTxCountingModal();
    });
  }

  // Open Cart for this transaction's category
  if (btnOpenCart) {
    btnOpenCart.addEventListener('click', () => {
      if (selectedCountingTx && selectedCountingTx.category) {
        activeCartCategory = selectedCountingTx.category;
      }
      closeTxCountingModal();
      openCartModal();
    });
  }
};

// App Opener / Splash Screen Controller
const initSplashOpener = () => {
  const splash = document.getElementById('app-splash-opener');
  const btnSkip = document.getElementById('btn-skip-opener');
  if (!splash) return;

  const closeOpener = () => {
    if (splash.style.opacity === '0') return;
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
      splash.style.display = 'none';
    }, 650);
  };

  if (btnSkip) {
    btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOpener();
    });
  }

  splash.addEventListener('click', closeOpener);

  // Auto close after GIF animation completes (~4.6s)
  setTimeout(closeOpener, 4600);
};

// Start application
const init = async () => {
  try { initSplashOpener(); } catch (e) { console.error('initSplashOpener error:', e); }

  // Ensure the selected month and year are locked into localStorage on startup
  localStorage.setItem('et_selected_month', selectedMonth);
  localStorage.setItem('et_selected_year', selectedYear);

  try { initSelectors(); } catch (e) { console.error('initSelectors error:', e); }
  try { populateCategoryFilterOptions('gaji'); } catch (e) { console.error('populateCategoryFilterOptions error:', e); }
  try { bindEvents(); } catch (e) { console.error('bindEvents error:', e); }
  try { initCart(); } catch (e) { console.error('initCart error:', e); }
  try { initTxCounting(); } catch (e) { console.error('initTxCounting error:', e); }
  try { initSyncCodeUI(); } catch (e) { console.error('initSyncCodeUI error:', e); }
  try { setupSupabaseRealtimeListener(); } catch (e) { console.error('setupSupabaseRealtimeListener error:', e); }
  
  try { renderAll(); } catch (e) { console.error('renderAll error:', e); }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
