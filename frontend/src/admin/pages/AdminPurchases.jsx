// frontend/src/admin/pages/AdminPurchases.jsx
// Gestion des Achats & Factures Fournisseurs (Stocks & Marchandises)

import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import AdminPagination from '../components/AdminPagination';

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [kpi, setKpi] = useState({
    total_purchases: 0,
    total_paid: 0,
    total_remaining: 0,
    count: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [toastMessage, setToastMessage] = useState('');

  // Modal Nouvel Achat / Modifier Achat
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_number: '',
    total_amount: '',
    paid_amount: '0',
    purchase_date: new Date().toISOString().split('T')[0],
    payment_method: 'Espèces',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    loadPurchases();
    loadSuppliersList();
  }, [search]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPurchases({ search });
      if (res && res.success) {
        setPurchases(res.data || []);
        if (res.kpi) setKpi(res.kpi);
      }
    } catch (err) {
      console.error('Erreur chargement achats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliersList = async () => {
    try {
      const res = await adminApi.getSuppliers();
      if (res && res.success) {
        setSuppliers(res.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement liste fournisseurs:', err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const formatDA = (val) => {
    const n = Math.round(parseFloat(val || 0));
    return n.toLocaleString('fr-FR');
  };

  const handleOpenModal = () => {
    setEditingPurchaseId(null);
    setFormData({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      purchase_number: '',
      total_amount: '',
      paid_amount: '0',
      purchase_date: new Date().toISOString().split('T')[0],
      payment_method: 'Espèces',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (purchase) => {
    setEditingPurchaseId(purchase.id);
    setFormData({
      supplier_id: purchase.supplier_id || (suppliers.length > 0 ? suppliers[0].id : ''),
      purchase_number: purchase.purchase_number || '',
      total_amount: purchase.total_amount || '',
      paid_amount: purchase.paid_amount || '0',
      purchase_date: purchase.purchase_date || new Date().toISOString().split('T')[0],
      payment_method: purchase.payment_method || 'Espèces',
      notes: purchase.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalNum = parseFloat(formData.total_amount);
    const paidNum = parseFloat(formData.paid_amount || 0);

    if (!formData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (!totalNum || totalNum <= 0) {
      alert('Veuillez saisir un montant total valide (> 0 DA).');
      return;
    }
    if (paidNum < 0 || paidNum > totalNum) {
      alert('Le montant payé doit être compris entre 0 DA et le montant total.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: parseInt(formData.supplier_id),
        purchase_number: formData.purchase_number.trim(),
        total_amount: totalNum,
        paid_amount: paidNum,
        purchase_date: formData.purchase_date,
        payment_method: formData.payment_method,
        notes: formData.notes
      };

      const res = editingPurchaseId
        ? await adminApi.updatePurchase({ id: editingPurchaseId, ...payload })
        : await adminApi.createPurchase(payload);

      if (res && res.success) {
        showToast(res.message || (editingPurchaseId ? 'Facture d’achat modifiée avec succès !' : 'Facture d’achat enregistrée avec succès !'));
        setIsModalOpen(false);
        setEditingPurchaseId(null);
        await loadPurchases();
      } else {
        alert(res?.message || 'Erreur lors de l’enregistrement');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur serveur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await adminApi.deletePurchase(id);
      if (res && res.success) {
        showToast('Facture d’achat supprimée.');
        setDeleteConfirmId(null);
        await loadPurchases();
      } else {
        alert(res?.message || 'Erreur suppression');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur serveur');
    }
  };

  const filteredPurchases = purchases.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.purchase_number || '').toLowerCase().includes(q) ||
      (item.supplier_name || '').toLowerCase().includes(q) ||
      (item.notes || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage) || 1;
  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculatedRemaining = Math.max(
    0,
    parseFloat(formData.total_amount || 0) - parseFloat(formData.paid_amount || 0)
  );

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast" style={{ backgroundColor: '#209f84' }}>
          <i className="fas fa-check-circle" /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="page-title-wrap">
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i className="fas fa-shopping-cart" style={{ color: '#10b981' }} />
            <span>ACHATS & FACTURES FOURNISSEURS</span>
          </h1>
          <p className="breadcrumb-sub" style={{ margin: '0.25rem 0 0', color: '#71717a', fontSize: '0.9rem' }}>
            Enregistrez les factures d'achat de stocks matériel et suivez les règlements immédiats ou dettes
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-light-custom"
            onClick={loadPurchases}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid #d4d4d8',
              backgroundColor: '#ffffff',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <i className="flaticon-381-refresh" /> Actualiser
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              padding: '0.65rem 1.35rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#111111',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <i className="fas fa-plus" />
            <span>NOUVEL ACHAT</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem 1.4rem', border: '1px solid #e4e4e7', borderRadius: '12px', backgroundColor: '#ffffff', marginBottom: 0 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Nombre de Factures</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111111', lineHeight: 1.2, marginTop: '2px' }}>
            {kpi.count || 0}
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem 1.4rem', border: '1px solid #e4e4e7', borderRadius: '12px', backgroundColor: '#ffffff', marginBottom: 0 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Achats</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2, marginTop: '2px' }}>
            {formatDA(kpi.total_purchases)} DA
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem 1.4rem', border: '1px solid #e4e4e7', borderRadius: '12px', backgroundColor: '#ffffff', marginBottom: 0 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Montant Payé / Réglé</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0ea5e9', lineHeight: 1.2, marginTop: '2px' }}>
            {formatDA(kpi.total_paid)} DA
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem 1.4rem', border: '1px solid #fecaca', borderRadius: '12px', backgroundColor: '#ffffff', marginBottom: 0 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Reste Total à Payer</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.2, marginTop: '2px' }}>
            {formatDA(kpi.total_remaining)} DA
          </div>
        </div>
      </div>

      {/* Search Bar matching Screenshot 3 */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
        <div className="card-body-custom" style={{ padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <i
              className="flaticon-381-search-2"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#888'
              }}
            />
            <input
              type="text"
              className="form-control-custom"
              placeholder="Rechercher un achat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: '#71717a', fontWeight: 600 }}>
            {filteredPurchases.length} facture(s) trouvée(s)
          </div>
        </div>
      </div>

      {/* Table matching Screenshot 3 */}
      <div className="admin-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-responsive-custom">
          <table className="table-custom" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>N° FACTURE ACHAT</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>FOURNISSEUR</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>MONTANT TOTAL</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>MONTANT PAYÉ</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>RESTE À PAYER</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>DATE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#888' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                    Chargement des factures d'achat...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#888' }}>
                    <div style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>
                      Aucune facture d'achat trouvée.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((row) => {
                  const hasRemaining = parseFloat(row.remaining_amount || 0) > 0;
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontWeight: 700, color: '#111111' }}>
                        {row.purchase_number}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{row.supplier_name}</div>
                        {row.notes && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{row.notes}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontWeight: 800, color: '#111111' }}>
                        {formatDA(row.total_amount)} DA
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontWeight: 700, color: '#16a34a' }}>
                        {formatDA(row.paid_amount)} DA
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontWeight: 800, color: hasRemaining ? '#dc2626' : '#16a34a' }}>
                        {formatDA(row.remaining_amount)} DA
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.82rem', color: '#64748b' }}>
                        {row.purchase_date}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          {/* Voir Détails */}
                          <button
                            type="button"
                            onClick={() => setViewingPurchase(row)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #e0f2fe',
                              backgroundColor: '#f0f9ff',
                              color: '#0284c7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                            title="Voir les détails de l'achat"
                          >
                            <i className="fas fa-eye" />
                          </button>

                          {/* Modifier */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #dbeafe',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                            title="Modifier cette facture"
                          >
                            <i className="fas fa-pen" />
                          </button>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(row.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff',
                              color: '#ef4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                            title="Supprimer cette facture"
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid #f4f4f5' }}>
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal Nouvel Achat */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f4f4f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111' }}>
                {editingPurchaseId ? "Modifier la Facture d'Achat" : "Enregistrer un Nouvel Achat / Facture Fournisseur"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPurchaseId(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Fournisseur */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Fournisseur *
                  </label>
                  {suppliers.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#dc2626' }}>
                      Aucun fournisseur enregistré. Veuillez d'abord ajouter un fournisseur dans la section Fournisseurs.
                    </div>
                  ) : (
                    <select
                      required
                      className="form-control-custom"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    >
                      <option value="">Sélectionner le fournisseur...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.company && s.company !== s.name ? `(${s.company})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* N° Facture & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      N° Facture Achat
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Laissez vide pour auto: FACT-..."
                      value={formData.purchase_number}
                      onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Date d'Achat *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-control-custom"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Montants */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Montant Total Achat (DA) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      className="form-control-custom"
                      placeholder="0"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Montant Payé Immédiat (DA)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control-custom"
                      placeholder="0"
                      value={formData.paid_amount}
                      onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                      style={{ fontWeight: 700, color: '#16a34a' }}
                    />
                  </div>
                </div>

                {/* Calcul Reste à Payer en direct */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: calculatedRemaining > 0 ? '#fef2f2' : '#f0fdf4',
                    borderRadius: '8px',
                    border: `1px solid ${calculatedRemaining > 0 ? '#fecaca' : '#bbf7d0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: calculatedRemaining > 0 ? '#991b1b' : '#166534' }}>
                    Reste dû (Dette fournisseur) :
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: calculatedRemaining > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatDA(calculatedRemaining)} DA
                  </div>
                </div>

                {/* Mode de règlement de l'acompte */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Mode de Règlement de l'Acompte
                  </label>
                  <select
                    className="form-control-custom"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  >
                    <option value="Espèces">Espèces (Caisse POS)</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="BaridiMob">BaridiMob</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Notes / Désignation des Articles Achetés
                  </label>
                  <textarea
                    rows={2}
                    className="form-control-custom"
                    placeholder="ex: 10x écrans OLED, 20x chargeurs type-C..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5' }}>
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPurchaseId(null);
                  }}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || suppliers.length === 0}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting || suppliers.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Enregistrement...' : (editingPurchaseId ? 'Enregistrer les Modifications' : 'Enregistrer la Facture')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Achat (VOIR) */}
      {viewingPurchase && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: '600px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f4f4f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111' }}>
                  Détails de la Facture d'Achat
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 600 }}>
                  Réf: {viewingPurchase.purchase_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Cartes KPI Montants */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Facture</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111111', marginTop: '0.25rem' }}>
                    {formatDA(viewingPurchase.total_amount)} DA
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Montant Payé</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                    {formatDA(viewingPurchase.paid_amount)} DA
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: parseFloat(viewingPurchase.remaining_amount) > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${parseFloat(viewingPurchase.remaining_amount) > 0 ? '#fecaca' : '#bbf7d0'}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: parseFloat(viewingPurchase.remaining_amount) > 0 ? '#991b1b' : '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Reste à Payer</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: parseFloat(viewingPurchase.remaining_amount) > 0 ? '#dc2626' : '#16a34a', marginTop: '0.25rem' }}>
                    {formatDA(viewingPurchase.remaining_amount)} DA
                  </div>
                </div>
              </div>

              {/* Tableau d'Informations */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Fournisseur :</span>
                  <span style={{ fontWeight: 700, color: '#111111' }}>{viewingPurchase.supplier_name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Date d'Achat :</span>
                  <span style={{ color: '#111111' }}>{viewingPurchase.purchase_date}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Mode de Paiement :</span>
                  <span style={{ color: '#111111', fontWeight: 600 }}>{viewingPurchase.payment_method || 'Espèces'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Statut Règlement :</span>
                  <span>
                    {parseFloat(viewingPurchase.remaining_amount) <= 0 ? (
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>
                        ✓ Totalement Réglé
                      </span>
                    ) : parseFloat(viewingPurchase.paid_amount) > 0 ? (
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.75rem' }}>
                        ⏳ Acompte Partiel (Reste {formatDA(viewingPurchase.remaining_amount)} DA)
                      </span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '0.75rem' }}>
                        ✗ Non Payé (Dette Totale)
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '0.75rem 1rem', backgroundColor: '#ffffff', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Notes & Désignation :</span>
                  <span style={{ color: viewingPurchase.notes ? '#111111' : '#94a3b8', fontStyle: viewingPurchase.notes ? 'normal' : 'italic' }}>
                    {viewingPurchase.notes || 'Aucune note ou désignation fournie.'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5' }}>
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => setViewingPurchase(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = viewingPurchase;
                    setViewingPurchase(null);
                    handleOpenEdit(p);
                  }}
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-pen" />
                  <span>Modifier cette Facture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Suppression */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '420px', width: '100%', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.25rem' }}>
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>Supprimer cette facture ?</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              Cette action supprimera également l'écriture associée dans le Journal de Caisse.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setDeleteConfirmId(null)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

