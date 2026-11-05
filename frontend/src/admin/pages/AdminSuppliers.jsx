// frontend/src/admin/pages/AdminSuppliers.jsx
// Gestion des Fournisseurs, Dettes Fournisseurs et Versements

import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import AdminPagination from '../components/AdminPagination';

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [kpi, setKpi] = useState({
    total_suppliers: 0,
    total_purchases: 0,
    total_paid: 0,
    total_debt: 0,
    debtors_count: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    id: null,
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    supplier_id: '',
    amount: '',
    payment_method: 'Espèces',
    reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSuppliers({ search });
      if (res && res.success) {
        setSuppliers(res.data || []);
        if (res.kpi) setKpi(res.kpi);
      }
    } catch (err) {
      console.error('Erreur chargement fournisseurs:', err);
    } finally {
      setLoading(false);
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

  // Gestion Fournisseur (Créer / Modifier)
  const handleOpenSupplierModal = (sup = null) => {
    if (sup) {
      setSupplierFormData({
        id: sup.id,
        name: sup.name || '',
        company: sup.company || '',
        phone: sup.phone || '',
        email: sup.email || '',
        address: sup.address || '',
        notes: sup.notes || ''
      });
    } else {
      setSupplierFormData({
        id: null,
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      alert('Le nom du fournisseur est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      const res = supplierFormData.id
        ? await adminApi.updateSupplier(supplierFormData)
        : await adminApi.createSupplier(supplierFormData);

      if (res && res.success) {
        showToast(supplierFormData.id ? 'Fournisseur mis à jour avec succès !' : 'Fournisseur ajouté avec succès !');
        setIsSupplierModalOpen(false);
        await loadSuppliers();
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

  const handleDeleteSupplier = async (id) => {
    try {
      const res = await adminApi.deleteSupplier(id);
      if (res && res.success) {
        showToast('Fournisseur supprimé avec succès.');
        setDeleteConfirmId(null);
        await loadSuppliers();
      } else {
        alert(res?.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  // Gestion Versement
  const handleOpenPaymentModal = (sup = null) => {
    setSelectedSupplierForPayment(sup);
    setPaymentFormData({
      supplier_id: sup ? sup.id : '',
      amount: '',
      payment_method: 'Espèces',
      reference: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentFormData.amount);
    if (!paymentFormData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      alert('Veuillez saisir un montant valide supérieur à 0 DA.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.addSupplierPayment({
        ...paymentFormData,
        amount: amountNum
      });

      if (res && res.success) {
        showToast(res.message || 'Versement enregistré avec succès !');
        setIsPaymentModalOpen(false);
        await loadSuppliers();
        if (isDetailsModalOpen && supplierDetails && supplierDetails.id === parseInt(paymentFormData.supplier_id)) {
          handleViewDetails(supplierDetails.id);
        }
      } else {
        alert(res?.message || 'Erreur lors de l’enregistrement du versement');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur serveur lors de l’enregistrement du versement');
    } finally {
      setSubmitting(false);
    }
  };

  // Détails Fournisseur
  const handleViewDetails = async (id) => {
    setLoadingDetails(true);
    setIsDetailsModalOpen(true);
    try {
      const res = await adminApi.getSupplierDetails(id);
      if (res && res.success) {
        setSupplierDetails(res.data);
      }
    } catch (err) {
      console.error('Erreur chargement détails fournisseur:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredSuppliers = suppliers.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.company || '').toLowerCase().includes(q) ||
      (item.phone || '').includes(q) ||
      (item.address || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <i className="fas fa-truck" style={{ color: '#3b82f6' }} />
            <span>FOURNISSEURS</span>
          </h1>
          <p className="breadcrumb-sub" style={{ margin: '0.25rem 0 0', color: '#71717a', fontSize: '0.9rem' }}>
            Gestion des fournisseurs, suivi des achats, progression de règlement et dettes
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-light-custom"
            onClick={loadSuppliers}
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
            onClick={() => handleOpenSupplierModal()}
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
            <span>NOUVEAU FOURNISSEUR</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          4 KPI CARDS (MATCHING PROCONSTRUCT SCREENSHOT 5)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* KPI 1 : TOTAL FOURNISSEURS */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              fontSize: '1.35rem'
            }}
          >
            <i className="fas fa-truck" />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL FOURNISSEURS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111111', lineHeight: 1.2, marginTop: '2px' }}>
              {kpi.total_suppliers || 0}
            </div>
          </div>
        </div>

        {/* KPI 2 : TOTAL ACHATS MATÉRIEL */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              fontSize: '1.35rem'
            }}
          >
            <i className="fas fa-shopping-cart" />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL ACHATS MATÉRIEL
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2, marginTop: '2px' }}>
              {formatDA(kpi.total_purchases)} DA
            </div>
          </div>
        </div>

        {/* KPI 3 : TOTAL VERSÉ / RÉGLÉ */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#f0fdfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
              fontSize: '1.35rem'
            }}
          >
            <i className="fas fa-wallet" />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL VERSÉ / RÉGLÉ
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0ea5e9', lineHeight: 1.2, marginTop: '2px' }}>
              {formatDA(kpi.total_paid)} DA
            </div>
          </div>
        </div>

        {/* KPI 4 : DETTES GLOBALES (ENCADRÉ ROUGE) */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              fontSize: '1.35rem'
            }}
          >
            <i className="fas fa-hand-holding-usd" />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DETTES GLOBALES <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#991b1b', textTransform: 'none' }}>({kpi.debtors_count || 0} endetté(s))</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.2, marginTop: '2px' }}>
              {formatDA(kpi.total_debt)} DA
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
              placeholder="Rechercher un fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: '#71717a', fontWeight: 600 }}>
            {filteredSuppliers.length} fournisseur(s) listé(s)
          </div>
        </div>
      </div>

      {/* Table Principale */}
      <div className="admin-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-responsive-custom">
          <table className="table-custom" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>FOURNISSEUR / SOCIÉTÉ</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>TÉLÉPHONE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>TOTAL ACHATS</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>TOTAL PAYÉ</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>DETTE (DA)</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', minWidth: '220px' }}>PROGRESSION RÈGLEMENT</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#888' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                    Chargement des fournisseurs...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#888' }}>
                    <i className="fas fa-truck" style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.65rem', color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.98rem' }}>Aucun fournisseur trouvé.</div>
                    <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Cliquez sur "+ NOUVEAU FOURNISSEUR" pour enregistrer votre premier fournisseur.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((row) => {
                  const progress = row.progress !== undefined ? row.progress : 100;
                  const isFullyPaid = progress >= 100;
                  const hasDebt = (row.balance || 0) > 0;

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      {/* FOURNISSEUR / SOCIÉTÉ */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111111', textTransform: 'uppercase' }}>
                          {row.name}
                        </div>
                        {row.company && row.company !== row.name && (
                          <div style={{ fontSize: '0.74rem', color: '#71717a', textTransform: 'uppercase', marginTop: '1px' }}>
                            {row.company}
                          </div>
                        )}
                      </td>

                      {/* TÉLÉPHONE */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.84rem', color: '#52525b' }}>
                        {row.phone || '-'}
                      </td>

                      {/* TOTAL ACHATS */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.86rem', fontWeight: 700, color: '#111111' }}>
                        {formatDA(row.total_purchases)} DA
                      </td>

                      {/* TOTAL PAYÉ */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.86rem', fontWeight: 700, color: '#16a34a' }}>
                        {formatDA(row.total_paid)} DA
                      </td>

                      {/* DETTE (DA) */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <strong style={{ fontSize: '0.88rem', color: (row.balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                          {formatDA(row.balance)} DA
                        </strong>
                      </td>

                      {/* PROGRESSION RÈGLEMENT */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.74rem' }}>
                          <span style={{ fontWeight: 700, color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                            {progress}%
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: isFullyPaid ? '#ecfdf5' : '#fffbeb',
                              color: isFullyPaid ? '#16a34a' : '#d97706',
                              border: `1px solid ${isFullyPaid ? '#bbf7d0' : '#fde68a'}`
                            }}
                          >
                            {isFullyPaid ? 'Réglé' : `Reste: ${formatDA(row.balance)} DA`}
                          </span>
                        </div>
                        {/* Barre de progression */}
                        <div style={{ height: '6px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${progress}%`,
                              backgroundColor: isFullyPaid ? '#16a34a' : (progress < 50 ? '#dc2626' : '#d97706'),
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {/* Bouton VERSEMENT */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(row)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#111111',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                            title="Ajouter un versement pour ce fournisseur"
                          >
                            <i className="fas fa-money-bill-wave" />
                            <span>VERSEMENT</span>
                          </button>

                          {/* Voir détails */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(row.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #e4e4e7',
                              backgroundColor: '#ffffff',
                              color: '#0ea5e9',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                            title="Voir détails, factures et versements"
                          >
                            <i className="fas fa-eye" />
                          </button>

                          {/* Modifier */}
                          <button
                            type="button"
                            onClick={() => handleOpenSupplierModal(row)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #e4e4e7',
                              backgroundColor: '#ffffff',
                              color: '#71717a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                            title="Modifier les coordonnées"
                          >
                            <i className="fas fa-edit" />
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
                            title="Supprimer ce fournisseur"
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

      {/* =========================================================================
          MODAL 1 : NOUVEAU / MODIFIER FOURNISSEUR
          ========================================================================= */}
      {isSupplierModalOpen && (
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
              maxWidth: '520px',
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
                {supplierFormData.id ? 'Modifier le Fournisseur' : '+ Nouveau Fournisseur'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Nom du Fournisseur / Raison Sociale *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control-custom"
                    placeholder="ex: COLORAMA, MIDY PEINTURE, AFRO STEEL..."
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Nom Société / Enseigne
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="ex: SARL..."
                      value={supplierFormData.company}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Téléphone
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="0550 00 00 00"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control-custom"
                      placeholder="fournisseur@contact.dz"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Adresse / Ville
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="ex: Alger, Sétif, Oran..."
                      value={supplierFormData.address}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Notes / Remarques (Optionnel)
                  </label>
                  <textarea
                    rows={2}
                    className="form-control-custom"
                    placeholder="Conditions de paiement, RIB, détails..."
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5' }}>
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => setIsSupplierModalOpen(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer le Fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2 : AJOUTER UN VERSEMENT (💰 VERSEMENT)
          ========================================================================= */}
      {isPaymentModalOpen && (
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
              maxWidth: '520px',
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
                alignItems: 'center',
                backgroundColor: '#fffdf0'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-money-bill-wave" style={{ color: '#d97706' }} />
                  Nouveau Versement Fournisseur
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '2px' }}>
                  Enregistre une sortie de caisse dans le Journal et déduit la dette du fournisseur
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePayment} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Fournisseur */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Fournisseur Bénéficiaire *
                  </label>
                  {selectedSupplierForPayment ? (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                          {selectedSupplierForPayment.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Dette actuelle: <strong style={{ color: selectedSupplierForPayment.balance > 0 ? '#dc2626' : '#16a34a' }}>{formatDA(selectedSupplierForPayment.balance)} DA</strong>
                        </div>
                      </div>
                      <span className="badge-custom bg-soft-warning" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                        {selectedSupplierForPayment.progress}% Réglé
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      className="form-control-custom"
                      value={paymentFormData.supplier_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, supplier_id: e.target.value })}
                    >
                      <option value="">Sélectionner un fournisseur...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Dette: {formatDA(s.balance)} DA)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Montant Versement */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Montant du Versement (DA) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      className="form-control-custom"
                      placeholder="ex: 15000"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      style={{ fontSize: '1.1rem', fontWeight: 800, paddingRight: '3rem' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#9ca3af' }}>
                      DA
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Date du Versement
                    </label>
                    <input
                      type="date"
                      className="form-control-custom"
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                      Mode de Règlement
                    </label>
                    <select
                      className="form-control-custom"
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    >
                      <option value="Espèces">Espèces (Caisse)</option>
                      <option value="Virement bancaire">Virement bancaire</option>
                      <option value="Chèque">Chèque</option>
                      <option value="BaridiMob">BaridiMob</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    N° Référence / Quittance (Optionnel)
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Laissez vide pour auto: VRST-XX"
                    value={paymentFormData.reference}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Remarque / Motif
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="ex: Acompte sur commande d'écrans..."
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5' }}>
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => setIsPaymentModalOpen(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Validation...' : 'Valider le Versement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3 : DÉTAILS DU FOURNISSEUR (FACTURES & HISTORIQUE DES VERSEMENTS)
          ========================================================================= */}
      {isDetailsModalOpen && (
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
              maxWidth: '820px',
              maxHeight: '90vh',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f4f4f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111111' }}>
                  Fiche Fournisseur : {supplierDetails?.name || 'Chargement...'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '2px' }}>
                  {supplierDetails?.phone ? `Tél: ${supplierDetails.phone}` : ''} {supplierDetails?.address ? `• ${supplierDetails.address}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                  Chargement de la fiche...
                </div>
              ) : supplierDetails ? (
                <div>
                  {/* Résumé Financier Fournisseur */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Achats</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {formatDA(supplierDetails.total_purchases)} DA
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Total Réglé</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                        {formatDA(supplierDetails.total_paid)} DA
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: supplierDetails.balance > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${supplierDetails.balance > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: supplierDetails.balance > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>Solde Restant Dû</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: supplierDetails.balance > 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                        {formatDA(supplierDetails.balance)} DA
                      </div>
                    </div>
                  </div>

                  {/* Bouton rapide versement */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(supplierDetails)}
                      style={{
                        padding: '0.5rem 1.15rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#111111',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-plus" />
                      <span>Ajouter un Versement</span>
                    </button>
                  </div>

                  {/* Section Factures d'Achat */}
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <i className="fas fa-file-invoice" style={{ color: '#3b82f6' }} />
                    Factures d'Achats ({supplierDetails.purchases?.length || 0})
                  </h4>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #ebebeb' }}>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>N° FACTURE</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>MONTANT TOTAL</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>ACOMPTE PAYÉ</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>RESTE</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!supplierDetails.purchases || supplierDetails.purchases.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                              Aucun achat enregistré pour ce fournisseur.
                            </td>
                          </tr>
                        ) : (
                          supplierDetails.purchases.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{p.purchase_number}</td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{formatDA(p.total_amount)} DA</td>
                              <td style={{ padding: '0.65rem 0.85rem', color: '#16a34a' }}>{formatDA(p.paid_amount)} DA</td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: p.remaining_amount > 0 ? '#dc2626' : '#16a34a' }}>
                                {formatDA(p.remaining_amount)} DA
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{p.purchase_date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Section Versements Réalisés */}
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <i className="fas fa-receipt" style={{ color: '#0ea5e9' }} />
                    Historique des Versements ({supplierDetails.payments?.length || 0})
                  </h4>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #ebebeb' }}>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>RÉFÉRENCE</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>MONTANT</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>MODE</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>DATE</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>NOTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!supplierDetails.payments || supplierDetails.payments.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                              Aucun versement enregistré pour ce fournisseur.
                            </td>
                          </tr>
                        ) : (
                          supplierDetails.payments.map((v) => (
                            <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{v.reference}</td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#16a34a' }}>{formatDA(v.amount)} DA</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>{v.payment_method}</td>
                              <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{v.payment_date}</td>
                              <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{v.notes || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f4f4f5', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fafafa' }}>
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Fermer
              </button>
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
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>Supprimer ce fournisseur ?</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              Cette action supprimera également l'historique des achats et versements associés.
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
                onClick={() => handleDeleteSupplier(deleteConfirmId)}
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

