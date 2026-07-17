import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import * as XLSX from 'xlsx';

// Preset Categories (for translating IDs to labels in Excel)
const CATEGORIES = {
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

// Formatting IDR Currency for Console print
const formatIDR = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

// Locate Chrome installation on Windows
const getChromePath = () => {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  return paths.find(p => fs.existsSync(p));
};

// Helper to clone Chrome's local storage folder to prevent profile locking
const copyLocalStorage = (tempProfileDir) => {
  const srcLocalStorageDir = path.join(
    process.env.LOCALAPPDATA || '',
    'Google/Chrome/User Data/Default/Local Storage'
  );
  const destLocalStorageDir = path.join(tempProfileDir, 'Default/Local Storage');

  if (fs.existsSync(srcLocalStorageDir)) {
    fs.mkdirSync(destLocalStorageDir, { recursive: true });
    const files = fs.readdirSync(srcLocalStorageDir);
    for (const file of files) {
      const srcFile = path.join(srcLocalStorageDir, file);
      const destFile = path.join(destLocalStorageDir, file);
      const stat = fs.statSync(srcFile);
      if (stat.isFile()) {
        fs.copyFileSync(srcFile, destFile);
      } else if (stat.isDirectory()) {
        fs.mkdirSync(destFile, { recursive: true });
        const subFiles = fs.readdirSync(srcFile);
        for (const subFile of subFiles) {
          fs.copyFileSync(path.join(srcFile, subFile), path.join(destFile, subFile));
        }
      }
    }
    return true;
  }
  return false;
};

async function main() {
  console.log('=== Finansiku Excel Automation Script ===');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  
  // Format Month Name for display
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthLabel = `${monthsIndo[now.getMonth()]} ${year}`;

  let transactions = [];
  let budgets = {};
  
  // Step 1: Try to retrieve from running Live Server (localhost:5500)
  const chromePath = getChromePath();
  const tempProfileDir = path.resolve('temp_rekap_profile');
  let hasCopiedLocalStorage = false;

  if (chromePath) {
    console.log('Mencoba mengambil data dari browser LocalStorage (Live Server)...');
    try {
      hasCopiedLocalStorage = copyLocalStorage(tempProfileDir);
      
      const launchArgs = [];
      if (hasCopiedLocalStorage) {
        launchArgs.push(`--user-data-dir=${tempProfileDir}`);
      }

      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: launchArgs
      });
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:5500/index.html', { waitUntil: 'networkidle2', timeout: 5000 });
      
      const rawTx = await page.evaluate(() => localStorage.getItem('et_transactions'));
      const rawBudget = await page.evaluate(() => localStorage.getItem('et_budgets'));
      
      if (rawTx) {
        const parsed = JSON.parse(rawTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          transactions = parsed;
          console.log(`✓ Berhasil mengambil ${transactions.length} transaksi dari LocalStorage browser!`);
        }
      }
      if (rawBudget) budgets = JSON.parse(rawBudget);
      
      await browser.close();
    } catch (err) {
      console.error('Error detail:', err);
      console.log('⚠ Gagal terhubung ke Live Server atau LocalStorage kosong. Melakukan fallback...');
    } finally {
      if (fs.existsSync(tempProfileDir)) {
        try {
          fs.rmSync(tempProfileDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore removal error
        }
      }
    }
  } else {
    console.log('⚠ Google Chrome tidak ditemukan. Menggunakan fallback...');
  }

  // Step 2: Fallback to local JSON backup if browser fetch fails or is empty
  if (transactions.length === 0) {
    const backupPath = path.resolve('et_backup.json');
    if (fs.existsSync(backupPath)) {
      console.log(`Membaca file cadangan lokal: ${backupPath}...`);
      try {
        const rawData = fs.readFileSync(backupPath, 'utf8');
        const parsed = JSON.parse(rawData);
        if (parsed.transactions) transactions = parsed.transactions;
        if (parsed.budgets) budgets = parsed.budgets;
        console.log('✓ Berhasil memuat data dari et_backup.json!');
      } catch (err) {
        console.error('✗ Gagal mengurai file et_backup.json:', err.message);
      }
    } else {
      console.log('⚠ File cadangan et_backup.json tidak ditemukan di root proyek.');
    }
  }

  if (transactions.length === 0) {
    console.log('✗ Tidak ada transaksi ditemukan untuk direkap. Ekspor dibatalkan.');
    process.exit(1);
  }

  // Filter Gaji Transactions for target month
  const txsGaji = transactions.filter(t => {
    const [tYear, tMonth] = t.date.split('-');
    const tAcc = t.account || 'gaji';
    return tYear === String(year) && tMonth === month && tAcc === 'gaji';
  });

  // Calculates aggregates
  const calcAggregates = (txList) => {
    const income = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  };

  const aggGaji = calcAggregates(txsGaji);
  const budgetGaji = budgets[`gaji_${monthKey}`] || 0;

  const isOverBudget = (expense, limit) => limit > 0 && expense > limit ? 'MELEBIHI LIMIT' : limit > 0 ? 'AMAN' : 'BELUM DIATUR';

  // --- SHEET 1: RINGKASAN ---
  const summaryRows = [
    ['REKAPITULASI KEUANGAN BULANAN - FINANSIKU'],
    [`Periode: ${monthLabel}`],
    [`Tanggal Cetak: ${now.toLocaleDateString('id-ID')}`],
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

  // --- SHEET 2: DETAIL TRANSAKSI ---
  const mapTransactionRows = (txList) => {
    const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Kategori', 'Jumlah (Rp)', 'Catatan'];
    const rows = txList.map(t => [
      t.date,
      t.description,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      CATEGORIES[t.category] || t.category,
      Number(t.amount),
      t.notes || '-'
    ]);
    return [headers, ...rows];
  };

  const sheetGajiRows = mapTransactionRows(txsGaji);

  // Helper to apply thousands separator formatting to all numeric cells in a worksheet
  const formatNumericCells = (ws) => {
    for (const key in ws) {
      if (key.startsWith('!')) continue;
      const cell = ws[key];
      if (cell && cell.t === 'n') {
        cell.z = '#,##0';
      }
    }
  };

  // --- CREATE WORKBOOK & WRITE ---
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  formatNumericCells(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

  const wsGaji = XLSX.utils.aoa_to_sheet(sheetGajiRows);
  formatNumericCells(wsGaji);
  XLSX.utils.book_append_sheet(wb, wsGaji, 'Transaksi Gaji');

  // Generate output file inside 'Rekaptulasi' directory
  const outputDir = path.resolve('Rekaptulasi');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filename = `Rekaptulasi Keuangan - ${monthLabel}.xlsx`;
  const outputPath = path.join(outputDir, filename);
  XLSX.writeFile(wb, outputPath);

  console.log('\n======================================');
  console.log(`✓ REKAPITULASI SELESAI!`);
  console.log(`File Excel berhasil diekspor ke:`);
  console.log(`👉 ${outputPath}`);
  console.log('======================================');
  console.log(`Ringkasan ${monthLabel}:`);
  console.log(`- Gaji   | Pemasukan: ${formatIDR(aggGaji.income)} | Pengeluaran: ${formatIDR(aggGaji.expense)} | Saldo: ${formatIDR(aggGaji.balance)}`);
  console.log('======================================');
}

main().catch(err => {
  console.error('✗ Terjadi kesalahan saat menjalankan skrip:', err);
  process.exit(1);
});
