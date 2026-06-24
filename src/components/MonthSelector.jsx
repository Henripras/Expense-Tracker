import React from 'react';

const MONTH_NAMES = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember'
};

export const MonthSelector = ({ selectedMonth, setSelectedMonth, selectedYear, setSelectedYear }) => {
  
  const handlePrevMonth = () => {
    let monthNum = parseInt(selectedMonth, 10);
    let yearNum = parseInt(selectedYear, 10);
    
    monthNum -= 1;
    if (monthNum < 1) {
      monthNum = 12;
      yearNum -= 1;
    }
    
    setSelectedMonth(String(monthNum).padStart(2, '0'));
    setSelectedYear(String(yearNum));
  };

  const handleNextMonth = () => {
    let monthNum = parseInt(selectedMonth, 10);
    let yearNum = parseInt(selectedYear, 10);
    
    monthNum += 1;
    if (monthNum > 12) {
      monthNum = 1;
      yearNum += 1;
    }
    
    setSelectedMonth(String(monthNum).padStart(2, '0'));
    setSelectedYear(String(yearNum));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // Generate year options (e.g. current year - 3 to current year + 3)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 4; y <= currentYear + 4; y++) {
    yearOptions.push(String(y));
  }

  return (
    <div className="month-nav-container">
      <button 
        className="btn btn-outline btn-icon" 
        onClick={handlePrevMonth}
        title="Bulan Sebelumnya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <select 
          className="form-control filter-select" 
          value={selectedMonth} 
          onChange={handleMonthChange}
          style={{ border: 'none', background: 'transparent', fontWeight: '600', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '1rem', width: 'auto', textAlignLast: 'center' }}
        >
          {Object.entries(MONTH_NAMES).map(([num, name]) => (
            <option key={num} value={num} style={{ background: '#1f2937', color: 'white' }}>{name}</option>
          ))}
        </select>

        <select 
          className="form-control filter-select" 
          value={selectedYear} 
          onChange={handleYearChange}
          style={{ border: 'none', background: 'transparent', fontWeight: '600', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '1rem', width: 'auto', textAlignLast: 'center' }}
        >
          {yearOptions.map(y => (
            <option key={y} value={y} style={{ background: '#1f2937', color: 'white' }}>{y}</option>
          ))}
        </select>
      </div>

      <button 
        className="btn btn-outline btn-icon" 
        onClick={handleNextMonth}
        title="Bulan Berikutnya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};
