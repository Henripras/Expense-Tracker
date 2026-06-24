import React, { useState } from 'react';
import { CATEGORIES } from '../hooks/useExpenses';
import { formatIDR } from './Dashboard';

export const formatDateID = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = months[parseInt(month, 10) - 1] || month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

export const TransactionList = ({ filteredTransactions, onEditClick, onDeleteClick }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Find category detail details
  const getCategoryDetails = (type, catId) => {
    const list = CATEGORIES[type] || [];
    const found = list.find(c => c.id === catId);
    if (found) return found;
    
    // Check in the other list as well just in case
    const oppositeList = type === 'income' ? CATEGORIES.expense : CATEGORIES.income;
    return oppositeList.find(c => c.id === catId) || { label: 'Lain-lain', color: '#9ca3af', icon: '💸' };
  };

  // 1. Search filter
  let processed = filteredTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                          (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
    
    // 2. Type filter
    const matchesType = typeFilter === 'all' ? true : t.type === typeFilter;

    // 3. Category filter
    const matchesCategory = categoryFilter === 'all' ? true : t.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // 4. Sorting
  processed.sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === 'date-asc') {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === 'amount-desc') {
      return b.amount - a.amount;
    } else if (sortBy === 'amount-asc') {
      return a.amount - b.amount;
    }
    return 0;
  });

  // Reset category filter if it doesn't apply to the active type filter
  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
    setCategoryFilter('all'); // Reset category selection
  };

  // Get active category list based on type filter
  const activeCategories = typeFilter === 'all' 
    ? [...CATEGORIES.income, ...CATEGORIES.expense]
    : CATEGORIES[typeFilter];

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Riwayat Transaksi</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Menampilkan {processed.length} transaksi
        </span>
      </div>

      {/* Filters & Search Row */}
      <div className="list-header-row">
        <div className="filters-wrapper">
          {/* Search bar */}
          <div className="search-input-wrapper">
            <svg 
              className="search-icon-inside"
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="form-control"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Tipe */}
          <select 
            className="form-control filter-select"
            value={typeFilter}
            onChange={handleTypeFilterChange}
          >
            <option value="all">Semua Tipe</option>
            <option value="income">📈 Pemasukan</option>
            <option value="expense">📉 Pengeluaran</option>
          </select>

          {/* Filter Kategori */}
          <select 
            className="form-control filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {activeCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          {/* Urutan (Sorting) */}
          <select 
            className="form-control filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">📅 Terbaru</option>
            <option value="date-asc">📅 Terlama</option>
            <option value="amount-desc">🪙 Nominal Terbesar</option>
            <option value="amount-asc">🪙 Nominal Terkecil</option>
          </select>
        </div>
      </div>

      {/* Transaction Records List */}
      {processed.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 1rem' }}>
          <div className="empty-state-icon">💸</div>
          <h3>Tidak ada transaksi ditemukan</h3>
          <p style={{ fontSize: '0.85rem' }}>Coba ubah filter pencarian Anda atau buat transaksi baru.</p>
        </div>
      ) : (
        <div className="transactions-container">
          {processed.map(t => {
            const cat = getCategoryDetails(t.type, t.category);
            
            return (
              <div key={t.id} className="tx-row">
                <div className="tx-info-left">
                  {/* Category icon */}
                  <div 
                    className="tx-category-badge"
                    style={{ 
                      backgroundColor: `${cat.color}15`, 
                      border: `1px solid ${cat.color}30`,
                      color: cat.color
                    }}
                  >
                    {cat.icon}
                  </div>

                  <div className="tx-details">
                    <span className="tx-title" title={t.description}>{t.description}</span>
                    <div className="tx-meta">
                      <span className="tx-meta-date">{formatDateID(t.date)}</span>
                      <span className="tx-meta-cat">{cat.label}</span>
                    </div>
                    {t.notes && (
                      <span className="tx-notes-bubble" title={t.notes}>
                        📝 {t.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="tx-amount-right">
                  <span className={`tx-amount ${t.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense'}`}>
                    {t.type === 'income' ? '+' : '-'} {formatIDR(t.amount)}
                  </span>

                  {/* Actions */}
                  <div className="tx-actions">
                    <button 
                      className="btn btn-outline btn-icon"
                      onClick={() => onEditClick(t)}
                      title="Edit Transaksi"
                      style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                      </svg>
                    </button>
                    <button 
                      className="btn btn-danger-outline btn-icon"
                      onClick={() => onDeleteClick(t.id)}
                      title="Hapus Transaksi"
                      style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
