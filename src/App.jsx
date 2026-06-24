import React, { useState, useRef } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { MonthSelector } from './components/MonthSelector';
import { Dashboard } from './components/Dashboard';
import { VisualAnalytics } from './components/VisualAnalytics';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';

function App() {
  const {
    filteredTransactions,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
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
  } = useExpenses();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (tx) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      deleteTransaction(id);
    }
  };

  const handleFormSubmit = (data) => {
    if (editingTransaction) {
      editTransaction(editingTransaction.id, data);
    } else {
      addTransaction(data);
    }
    setIsFormOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const result = importData(text);
        if (result.success) {
          alert('Data berhasil diimpor!');
        } else {
          alert('Gagal mengimpor data: ' + result.error);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  return (
    <>
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="logo-icon">💸</div>
          <div>
            <h1>Finansiku</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pelacak Keuangan Dinamis &amp; Responsif</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Month/Year selector navigation */}
          <MonthSelector 
            selectedMonth={selectedMonth} 
            setSelectedMonth={setSelectedMonth} 
            selectedYear={selectedYear} 
            setSelectedYear={setSelectedYear} 
          />

          {/* Import/Export buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={handleExportClick => exportData()} title="Ekspor Data ke JSON">
              📥 Backup
            </button>
            <button className="btn btn-outline" onClick={handleImportClick} title="Impor Data dari JSON">
              📤 Restore
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json" 
              onChange={handleFileChange}
            />
          </div>

          {/* Add Transaction Button */}
          <button className="btn btn-primary" onClick={handleAddClick}>
            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>+</span> Transaksi Baru
          </button>
        </div>
      </header>

      {/* Financial Aggregates Dashboard Cards */}
      <Dashboard 
        totalIncome={totalIncome} 
        totalExpense={totalExpense} 
        netBalance={netBalance} 
        currentBudget={currentBudget} 
        updateBudget={updateBudget} 
      />

      {/* Main Grid: Left is Transaction List, Right is Visual Analytics */}
      <main className="main-dashboard-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Transactions list */}
          <TransactionList 
            filteredTransactions={filteredTransactions} 
            onEditClick={handleEditClick} 
            onDeleteClick={handleDeleteClick} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Analytics Pie Chart and category cards */}
          <VisualAnalytics filteredTransactions={filteredTransactions} />
        </div>
      </main>

      {/* Transaction modal form */}
      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleFormSubmit} 
        editData={editingTransaction} 
      />
    </>
  );
}

export default App;
