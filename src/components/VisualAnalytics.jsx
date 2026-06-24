import React, { useState } from 'react';
import { CATEGORIES } from '../hooks/useExpenses';
import { formatIDR } from './Dashboard';

export const VisualAnalytics = ({ filteredTransactions }) => {
  const [activeCategory, setActiveCategory] = useState(null);

  // Filter only expenses
  const expenses = filteredTransactions.filter(t => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Group by category
  const expenseByCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});

  // Map to categories info list
  const categoryData = CATEGORIES.expense
    .map(cat => {
      const amount = expenseByCategory[cat.id] || 0;
      const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        ...cat,
        amount,
        percent
      };
    })
    .filter(cat => cat.amount > 0) // Only show categories with actual expenses
    .sort((a, b) => b.amount - a.amount); // Sort descending

  // Donut chart math
  const RADIUS = 60;
  const STROKE_WIDTH = 18;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~376.99
  
  let accumulatedPercent = 0;

  const handleMouseEnter = (catId) => {
    setActiveCategory(catId);
  };

  const handleMouseLeave = () => {
    setActiveCategory(null);
  };

  // Find info to display in the center of donut
  const hoveredCategoryInfo = activeCategory 
    ? CATEGORIES.expense.find(c => c.id === activeCategory) 
    : null;
  const hoveredAmount = activeCategory 
    ? (expenseByCategory[activeCategory] || 0) 
    : totalExpense;
  const hoveredPercent = activeCategory && totalExpense > 0
    ? ((expenseByCategory[activeCategory] || 0) / totalExpense) * 100 
    : 100;

  return (
    <div className="panel analytics-card-grid" aria-label="Analisis Pengeluaran">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Analisis Pengeluaran</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bulan Ini</span>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Belum ada pengeluaran dicatat</h3>
          <p style={{ fontSize: '0.85rem' }}>Masukkan transaksi pengeluaran untuk melihat diagram analisis.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Custom SVG Donut Chart */}
          <div className="chart-container">
            <svg 
              width="180" 
              height="180" 
              viewBox="0 0 160 160" 
              className="pie-chart-svg"
            >
              {/* Outer track if empty, or base background track */}
              <circle
                cx="80"
                cy="80"
                r={RADIUS}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={STROKE_WIDTH}
              />
              
              {categoryData.map(cat => {
                const strokeLength = (cat.percent / 100) * CIRCUMFERENCE;
                const strokeOffset = CIRCUMFERENCE - (accumulatedPercent / 100) * CIRCUMFERENCE;
                accumulatedPercent += cat.percent;

                const isHovered = activeCategory === cat.id;

                return (
                  <circle
                    key={cat.id}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth={isHovered ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                    strokeDasharray={`${strokeLength} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap={cat.percent === 100 ? 'butt' : 'round'}
                    style={{
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => handleMouseEnter(cat.id)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </svg>

            {/* Content inside the donut */}
            <div className="chart-center-text">
              <span className="chart-center-lbl">
                {hoveredCategoryInfo ? `${hoveredCategoryInfo.icon} ${hoveredCategoryInfo.label}` : 'Total Belanja'}
              </span>
              <span className="chart-center-value">
                {formatIDR(hoveredAmount)}
              </span>
              <span className="chart-center-lbl" style={{ color: hoveredCategoryInfo ? hoveredCategoryInfo.color : 'var(--text-secondary)' }}>
                {hoveredPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Interactive Legend Items */}
          <div className="chart-legend">
            {categoryData.map(cat => (
              <div 
                key={cat.id} 
                className="legend-item"
                onMouseEnter={() => handleMouseEnter(cat.id)}
                onMouseLeave={handleMouseLeave}
                style={{
                  background: activeCategory === cat.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderRadius: '8px'
                }}
              >
                <div className="legend-color" style={{ backgroundColor: cat.color }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: activeCategory === cat.id ? '600' : '400', color: activeCategory === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {cat.icon} {cat.label}
                </span>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--panel-border)', margin: '0.5rem 0' }} />

          {/* Progress Bars for Categories */}
          <div>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Rincian Kategori</h3>
            <div className="category-bar-list">
              {categoryData.map(cat => (
                <div 
                  key={cat.id} 
                  className="category-bar-item"
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    opacity: activeCategory && activeCategory !== cat.id ? 0.5 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  <div className="category-bar-header">
                    <div className="category-name-wrapper">
                      <span>{cat.icon}</span>
                      <span style={{ fontWeight: '500' }}>{cat.label}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>{formatIDR(cat.amount)}</span>
                      <span className="category-bar-percent">({cat.percent.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${cat.percent}%`, 
                        backgroundColor: cat.color,
                        boxShadow: `0 0 8px ${cat.color}40`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
