import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../hooks/useExpenses';

export const TransactionForm = ({ isOpen, onClose, onSubmit, editData }) => {
  // Local Date default YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Reset or populate fields when modal opens/changes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setType(editData.type);
        setDescription(editData.description);
        setAmount(editData.amount);
        setCategory(editData.category);
        setDate(editData.date);
        setNotes(editData.notes || '');
      } else {
        setType('expense');
        setDescription('');
        setAmount('');
        // set default category to first option
        setCategory(CATEGORIES.expense[0].id);
        setDate(getLocalDateString());
        setNotes('');
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  // Adjust category if type changes
  useEffect(() => {
    if (!editData || editData.type !== type) {
      setCategory(CATEGORIES[type][0].id);
    }
  }, [type, editData]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors = {};
    if (!description.trim()) {
      tempErrors.description = 'Deskripsi transaksi tidak boleh kosong.';
    }
    if (!amount || Number(amount) <= 0) {
      tempErrors.amount = 'Jumlah uang harus lebih besar dari Rp 0.';
    }
    if (!category) {
      tempErrors.category = 'Silakan pilih kategori.';
    }
    if (!date) {
      tempErrors.date = 'Tanggal transaksi harus diisi.';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      description,
      amount: Number(amount),
      type,
      category,
      date,
      notes
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{editData ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup modal">
            &times;
          </button>
        </div>

        {/* Type Selector Toggle */}
        <div className="type-selector">
          <button 
            type="button"
            className={`type-btn type-btn-income ${type === 'income' ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            <span style={{ fontSize: '1.1rem' }}>📈</span> Pemasukan
          </button>
          <button 
            type="button"
            className={`type-btn type-btn-expense ${type === 'expense' ? 'active' : ''}`}
            onClick={() => setType('expense')}
          >
            <span style={{ fontSize: '1.1rem' }}>📉</span> Pengeluaran
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Deskripsi */}
          <div className="form-group">
            <label className="form-label">Deskripsi / Nama</label>
            <input 
              type="text" 
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Belanja Bulanan, Gaji Projek"
              autoFocus
              required
            />
            {errors.description && <span style={{ color: 'var(--expense)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.description}</span>}
          </div>

          <div className="form-row-2">
            {/* Jumlah Uang */}
            <div className="form-group">
              <label className="form-label">Jumlah Uang (Rp)</label>
              <input 
                type="number" 
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
              {errors.amount && <span style={{ color: 'var(--expense)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.amount}</span>}
            </div>

            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input 
                type="date" 
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {errors.date && <span style={{ color: 'var(--expense)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.date}</span>}
            </div>
          </div>

          {/* Kategori */}
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select 
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {CATEGORIES[type].map(cat => (
                <option key={cat.id} value={cat.id} style={{ background: '#111827', color: 'white' }}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <span style={{ color: 'var(--expense)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.category}</span>}
          </div>

          {/* Catatan Tambahan */}
          <div className="form-group">
            <label className="form-label">Catatan Tambahan (Opsional)</label>
            <textarea 
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis rincian atau keterangan tambahan di sini..."
              rows="3"
              style={{ resize: 'none' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              style={{ minWidth: '100px' }}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ 
                minWidth: '120px',
                background: type === 'income' ? 'var(--income)' : 'var(--expense)',
                boxShadow: type === 'income' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : '0 4px 12px rgba(244, 63, 94, 0.25)'
              }}
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
