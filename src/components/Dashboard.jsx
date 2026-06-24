import React, { useState } from 'react';

export const formatIDR = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const Dashboard = ({ totalIncome, totalExpense, netBalance, currentBudget, updateBudget }) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(currentBudget);

  const handleEditClick = () => {
    setBudgetVal(currentBudget);
    setIsEditingBudget(true);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    updateBudget(Number(budgetVal) || 0);
    setIsEditingBudget(false);
  };

  const handleCancelBudget = () => {
    setIsEditingBudget(false);
  };

  // Calculate budget usage percentage
  const budgetPercent = currentBudget > 0 ? Math.min((totalExpense / currentBudget) * 100, 100) : 0;
  const isOverBudget = totalExpense > currentBudget && currentBudget > 0;
  const isNearBudget = currentBudget > 0 && !isOverBudget && (totalExpense / currentBudget) >= 0.85;

  let progressBarColor = 'var(--primary)'; // Indigo
  if (isOverBudget) progressBarColor = 'var(--expense)'; // Red
  else if (isNearBudget) progressBarColor = 'var(--warning)'; // Amber

  return (
    <section className="dashboard-grid" aria-label="Ringkasan Finansial">
      {/* Total Income */}
      <div className="card card-income">
        <div className="card-header">
          <span className="card-title">Total Pemasukan</span>
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </div>
        </div>
        <div className="card-value">{formatIDR(totalIncome)}</div>
      </div>

      {/* Total Expense */}
      <div className="card card-expense">
        <div className="card-header">
          <span className="card-title">Total Pengeluaran</span>
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </div>
        </div>
        <div className="card-value">{formatIDR(totalExpense)}</div>
      </div>

      {/* Net Balance */}
      <div className="card card-balance">
        <div className="card-header">
          <span className="card-title">Saldo Bersih</span>
          <div className="card-icon" style={{
            background: netBalance >= 0 ? 'var(--income-bg)' : 'var(--expense-bg)',
            border: netBalance >= 0 ? '1px solid var(--income-border)' : '1px solid var(--expense-border)',
            color: netBalance >= 0 ? 'var(--income)' : 'var(--expense)',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="12" y1="10" x2="12" y2="10"></line>
              <line x1="8" y1="10" x2="8" y2="10"></line>
              <line x1="16" y1="10" x2="16" y2="10"></line>
              <line x1="6" y1="14" x2="18" y2="14"></line>
            </svg>
          </div>
        </div>
        <div className="card-value" style={{ color: netBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {formatIDR(netBalance)}
        </div>
      </div>

      {/* Budget Card */}
      <div className="card card-budget">
        <div className="card-header">
          <span className="card-title">Batas Anggaran</span>
          {!isEditingBudget ? (
            <button 
              className="btn btn-outline" 
              onClick={handleEditClick}
              style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Ubah
            </button>
          ) : null}
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
        </div>

        {isEditingBudget ? (
          <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input 
              type="number" 
              className="form-control" 
              value={budgetVal} 
              onChange={(e) => setBudgetVal(e.target.value)}
              placeholder="Limit Anggaran (Rp)"
              autoFocus
              min="0"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flexGrow: 1 }}>Simpan</button>
              <button type="button" className="btn btn-outline" onClick={handleCancelBudget} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Batal</button>
            </div>
          </form>
        ) : (
          <>
            <div className="card-value">{currentBudget > 0 ? formatIDR(currentBudget) : 'Belum Diatur'}</div>
            
            {currentBudget > 0 ? (
              <div className="budget-progress-container">
                <div className="budget-text-row">
                  <span>
                    {isOverBudget 
                      ? 'Melebihi Anggaran!' 
                      : isNearBudget 
                        ? 'Mendekati Batas!' 
                        : 'Pemakaian Anggaran'}
                  </span>
                  <span>{budgetPercent.toFixed(0)}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${budgetPercent}%`, 
                      backgroundColor: progressBarColor 
                    }}
                  ></div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Atur limit untuk memantau pengeluaran Anda.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
