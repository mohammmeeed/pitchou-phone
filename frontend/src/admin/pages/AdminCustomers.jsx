// frontend/src/admin/pages/AdminCustomers.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || ''
    });
    setFeedback(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFeedback(null);
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setFeedback({ type: 'error', message: 'Le nom et le numéro de téléphone sont requis.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await adminApi.updateCustomer({ id, ...editForm });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Informations du client mises à jour avec succès.' });
        setEditingId(null);
        await loadCustomers();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Erreur lors de la modification.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur de connexion au serveur.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Clients & Acheteurs</h1>
          <p className="breadcrumb-sub">Répertoire des clients, volume des commandes et dépenses cumulées en DA</p>
        </div>
        <div className="page-actions">
          <button className="btn-light-custom" onClick={loadCustomers}>
            <i className="flaticon-381-refresh" /> Actualiser
          </button>
        </div>
      </div>

      {/* Message de notification inline (aucun pop-up) */}
      {feedback && (
        <div 
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            fontWeight: 500,
            background: feedback.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: feedback.type === 'success' ? '#2e7d32' : '#c62828',
            border: `1px solid ${feedback.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
          }}
        >
          <span>
            <i className={feedback.type === 'success' ? "fas fa-check-circle me-2" : "fas fa-exclamation-circle me-2"} />
            {feedback.message}
          </span>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body-custom" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ position: 'relative', maxWidth: '380px' }}>
            <i className="flaticon-381-search-2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              className="form-control-custom"
              placeholder="Rechercher par nom, téléphone ou Wilaya..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="admin-card">
        <div className="card-header-custom">
          <h4>Clients Enregistrés ({filtered.length})</h4>
          <span className="badge-custom bg-soft-success">Base de Données MySQL</span>
        </div>
        <div className="table-responsive-custom">
          <table className="table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom Complet</th>
                <th>Numéro Téléphone</th>
                <th>Email</th>
                <th>Wilaya / Adresse</th>
                <th>Nb Commandes</th>
                <th>Total Dépensé (DA)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isEditing = editingId === c.id;

                  return (
                    <tr key={c.id}>
                      <td><strong style={{ color: '#111111' }}>#{c.id}</strong></td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Nom complet"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', minWidth: '130px' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: '#111111',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}
                            >
                              {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#333' }}>{c.name}</div>
                              <small style={{ color: '#888' }}>Client TikTok Shop</small>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="Numéro téléphone"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', minWidth: '120px' }}
                          />
                        ) : (
                          <a href={`tel:${c.phone}`} style={{ color: '#209f84', fontWeight: 600, textDecoration: 'none' }}>
                            <i className="fas fa-phone-alt me-1" /> {c.phone}
                          </a>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            className="form-control-custom"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Adresse email"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', minWidth: '150px' }}
                          />
                        ) : (
                          c.email || 'Non renseigné'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            placeholder="Wilaya / Adresse"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', minWidth: '110px' }}
                          />
                        ) : (
                          <span className="badge-custom bg-soft-primary">{c.address || 'Alger'}</span>
                        )}
                      </td>
                      <td>
                        <strong>{c.total_orders ?? 0}</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#111111', fontSize: '0.95rem' }}>
                          {Number(c.total_spent || 0).toLocaleString()} DA
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn-icon-custom bg-soft-success"
                                title="Enregistrer"
                                onClick={() => handleSaveEdit(c.id)}
                                disabled={saving}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                <i className={saving ? "fas fa-spinner fa-spin" : "fas fa-check"} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon-custom bg-soft-danger"
                                title="Annuler"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                <i className="fas fa-times" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn-icon-custom bg-soft-info"
                                title="Modifier les informations"
                                onClick={() => handleStartEdit(c)}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <Link
                                to="/admin/chat"
                                className="btn-icon-custom bg-soft-primary"
                                title="Discuter dans le Chat Admin"
                                style={{ textDecoration: 'none' }}
                              >
                                <i className="flaticon-381-send-2" />
                              </Link>
                              <a
                                href={`https://wa.me/213${c.phone.replace(/^0/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-icon-custom bg-soft-success"
                                title="Contacter sur WhatsApp"
                                style={{ textDecoration: 'none' }}
                              >
                                <i className="fab fa-whatsapp" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
