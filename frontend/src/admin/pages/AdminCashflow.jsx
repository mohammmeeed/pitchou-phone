// frontend/src/admin/pages/AdminCashflow.jsx
// Journal de Caisse & Trésorerie (Recettes, Dépenses, Ventes, Versements, Créances et Dettes)

import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import AdminPagination from '../components/AdminPagination';

export default function AdminCashflow() {
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [kpi, setKpi] = useState({
    total_ventes_encaissees: '98500.00',
    ventes_produits: '97000.00',
    ventes_livraison: '1500.00',
    decaissements_achats: '99400.00',
    acomptes_achats: '90470.00',
    autres_recettes: '0.00',
    autres_depenses: '1000.00',
    creances_clients: '3800.00',
    dettes_fournisseurs: '800.00',
    solde_caisse: '-24300.00',
    total_benefice: '63100.00',
    benefice_journalier: '0.00'
  });
  const [counts, setCounts] = useState({
    all: 0,
    recettes: 0,
    depenses: 0,
    recettes_depenses: 0,
    ventes: 0,
    achats: 0,
    versements_clients: 0,
    versements_fournisseurs: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('RECETTE'); // 'RECETTE' | 'DEPENSE'
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    amount: '',
    operation_date: new Date().toISOString().split('T')[0],
    note: '',
    party_name: '',
    party_phone: '',
    order_type: '',
    source: 'CAISSE POS',
    attachment_url: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Autocomplete Tiers (Clients & Fournisseurs)
  const [tiersList, setTiersList] = useState([]);
  const [isTiersDropdownOpen, setIsTiersDropdownOpen] = useState(false);
  const tiersDropdownRef = useRef(null);

  // Vue Active : 'journal' (défaut) ou 'categories' (paramètres des catégories)
  const [viewMode, setViewMode] = useState('journal');

  // Catégories dynamiques d'opérations
  const [recettesList, setRecettesList] = useState([
    'VENTE BOUTIQUE / POS',
    'VERSEMENT CLIENT',
    'AUTRE RECETTE'
  ]);

  const [depensesList, setDepensesList] = useState([
    'ACHAT MARCHANDISE / STOCK',
    'FRAIS DE LIVRAISON',
    'FOURNITURES & EMBALLAGE',
    'MARKETING & PUBLICITÉ',
    'LOYER & CHARGES',
    'AUTRE DÉPENSE'
  ]);

  const [newRecetteInput, setNewRecetteInput] = useState('');
  const [editingRecette, setEditingRecette] = useState(null); // { oldName: string, value: string }

  const [newDepenseInput, setNewDepenseInput] = useState('');
  const [editingDepense, setEditingDepense] = useState(null); // { oldName: string, value: string }

  useEffect(() => {
    loadCashflow(activeTab, search);
    loadCategories();
  }, [activeTab]);

  const loadTiers = async () => {
    try {
      const [resSuppliers, resCustomers] = await Promise.all([
        adminApi.getSuppliers().catch(() => ({ data: [] })),
        adminApi.getCustomers().catch(() => [])
      ]);

      const suppliers = (resSuppliers && resSuppliers.data) || [];
      const customers = Array.isArray(resCustomers) ? resCustomers : ((resCustomers && resCustomers.data) || []);

      const list = [
        ...suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          sublabel: s.company || '',
          phone: s.phone || '',
          type: 'fournisseur',
          displayName: `${s.name} (Fournisseur)`
        })),
        ...customers.map((c) => ({
          id: c.id,
          name: c.name,
          sublabel: c.wilaya || '',
          phone: c.phone || '',
          type: 'client',
          displayName: `${c.name} (Client)`
        }))
      ];
      setTiersList(list);
    } catch (err) {
      console.warn('Erreur chargement tiers:', err);
    }
  };

  useEffect(() => {
    loadTiers();
    const handleClickOutside = (e) => {
      if (tiersDropdownRef.current && !tiersDropdownRef.current.contains(e.target)) {
        setIsTiersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCategories = async () => {
    try {
      const res = await adminApi.getCashflowCategories();
      if (res && res.success) {
        if (Array.isArray(res.recettes) && res.recettes.length > 0) {
          setRecettesList(res.recettes);
        }
        if (Array.isArray(res.depenses) && res.depenses.length > 0) {
          setDepensesList(res.depenses);
        }
      }
    } catch (e) {
      console.warn('Erreur chargement catégories de caisse:', e);
    }
  };

  // Handlers pour Catégories de Recettes
  const handleAddRecetteCategory = async (e) => {
    e.preventDefault();
    const trimmed = newRecetteInput.trim();
    if (!trimmed) return;
    if (recettesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette catégorie de recette existe déjà.');
      return;
    }
    const updated = [...recettesList, trimmed];
    setRecettesList(updated);
    setNewRecetteInput('');
    showToast(`Catégorie recette "${trimmed}" ajoutée avec succès !`);
    await adminApi.saveCashflowCategory({ action: 'add', type: 'RECETTE', name: trimmed });
  };

  const handleSaveEditRecetteCategory = async (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingRecette(null);
      return;
    }
    const updated = recettesList.map((c) => (c === oldName ? trimmed : c));
    setRecettesList(updated);
    setEditingRecette(null);
    showToast(`Catégorie renommée en "${trimmed}" !`);
    await adminApi.saveCashflowCategory({ action: 'edit', type: 'RECETTE', oldName, newName: trimmed });
    await loadCashflow();
  };

  const handleDeleteRecetteCategory = async (catName) => {
    if (!window.confirm(`Supprimer la catégorie de recette "${catName}" ?`)) return;
    const updated = recettesList.filter((c) => c !== catName);
    setRecettesList(updated);
    showToast(`Catégorie "${catName}" supprimée.`);
    await adminApi.saveCashflowCategory({ action: 'delete', type: 'RECETTE', name: catName });
  };

  // Handlers pour Catégories de Dépenses
  const handleAddDepenseCategory = async (e) => {
    e.preventDefault();
    const trimmed = newDepenseInput.trim();
    if (!trimmed) return;
    if (depensesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette catégorie de dépense existe déjà.');
      return;
    }
    const updated = [...depensesList, trimmed];
    setDepensesList(updated);
    setNewDepenseInput('');
    showToast(`Catégorie dépense "${trimmed}" ajoutée avec succès !`);
    await adminApi.saveCashflowCategory({ action: 'add', type: 'DEPENSE', name: trimmed });
  };

  const handleSaveEditDepenseCategory = async (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingDepense(null);
      return;
    }
    const updated = depensesList.map((c) => (c === oldName ? trimmed : c));
    setDepensesList(updated);
    setEditingDepense(null);
    showToast(`Catégorie renommée en "${trimmed}" !`);
    await adminApi.saveCashflowCategory({ action: 'edit', type: 'DEPENSE', oldName, newName: trimmed });
    await loadCashflow();
  };

  const handleDeleteDepenseCategory = async (catName) => {
    if (!window.confirm(`Supprimer la catégorie de dépense "${catName}" ?`)) return;
    const updated = depensesList.filter((c) => c !== catName);
    setDepensesList(updated);
    showToast(`Catégorie "${catName}" supprimée.`);
    await adminApi.saveCashflowCategory({ action: 'delete', type: 'DEPENSE', name: catName });
  };

  const loadCashflow = async (targetTab = activeTab, targetSearch = search) => {
    setLoading(true);
    try {
      const res = await adminApi.getCashflow({ tab: targetTab, search: targetSearch });
      if (res && res.success) {
        setEntries(res.data || []);
        if (res.kpi) setKpi(res.kpi);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err) {
      console.error('Erreur chargement journal de caisse:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleOpenModal = (initialType = 'RECETTE') => {
    setModalType(initialType);
    const defaultCat = initialType === 'RECETTE'
      ? (recettesList[0] || 'VENTE BOUTIQUE / POS')
      : (depensesList[0] || 'ACHAT MARCHANDISE / STOCK');
    setFormData({
      id: null,
      amount: '',
      operation_date: new Date().toISOString().split('T')[0],
      note: '',
      party_name: '',
      party_phone: '',
      order_type: defaultCat,
      source: 'CAISSE POS',
      attachment_url: '',
      tier_type: '',
      tier_id: null
    });
    loadTiers();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        setFormData((prev) => ({
          ...prev,
          attachment_url: res.url
        }));
        showToast('Fichier justificatif joint avec succès !');
      } else {
        alert('Erreur lors du téléversement du fichier.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléversement du fichier.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum <= 0) {
      alert('Veuillez saisir un montant valide supérieur à 0 DA.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: modalType,
        amount: amountNum,
        operation_date: formData.operation_date,
        note: formData.note,
        party_name: formData.party_name || (modalType === 'RECETTE' ? 'Client / Recette Divers' : 'Fournisseur / Dépense Divers'),
        party_phone: formData.party_phone,
        order_type: formData.order_type || (modalType === 'RECETTE' ? 'AUTRE RECETTE' : 'AUTRE DÉPENSE'),
        source: formData.source || 'CAISSE POS',
        attachment_url: formData.attachment_url || null,
        tier_type: formData.tier_type || '',
        tier_id: formData.tier_id || null
      };

      const res = formData.id
        ? await adminApi.updateCashflowEntry({ id: formData.id, ...payload })
        : await adminApi.createCashflowEntry(payload);

      if (res && res.success) {
        showToast(formData.id ? 'Écriture mise à jour avec succès !' : `Écriture comptable (${modalType}) enregistrée avec succès !`);
        handleCloseModal();
        await loadCashflow();
      } else {
        alert(res?.message || 'Erreur lors de l’enregistrement de l’écriture.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur serveur lors de la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await adminApi.deleteCashflowEntry(id);
      if (res && res.success) {
        showToast('Écriture supprimée du journal.');
        setDeleteConfirmId(null);
        await loadCashflow();
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.');
    }
  };

  const formatDA = (val) => {
    const n = Math.round(parseFloat(val || 0));
    return n.toLocaleString('fr-FR');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((item) => item.operation_date === todayStr);
  const computedDailyProfit = todayEntries.reduce((acc, row) => {
    if (row.type === 'VENTE') return acc + parseFloat(row.profit_amount || 0);
    if (row.type === 'RECETTE') return acc + parseFloat(row.profit_amount || row.paid_amount || 0);
    if (row.type === 'DEPENSE') return acc - parseFloat(row.paid_amount || 0);
    return acc;
  }, 0);

  const dailyProfit = kpi.benefice_journalier !== undefined && parseFloat(kpi.benefice_journalier) !== 0
    ? parseFloat(kpi.benefice_journalier)
    : computedDailyProfit;

  const filteredEntries = entries.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.ref_number || '').toLowerCase().includes(q) ||
      (item.party_name || '').toLowerCase().includes(q) ||
      (item.party_phone || '').includes(q) ||
      (item.note || '').toLowerCase().includes(q) ||
      (item.order_type || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedEntries = filteredEntries.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    loadCashflow(tabId, search);
  };

  const filteredTiers = tiersList.filter((item) => {
    if (!formData.party_name) return true;
    const q = formData.party_name.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.sublabel || '').toLowerCase().includes(q) ||
      (item.phone || '').includes(q) ||
      (item.displayName || '').toLowerCase().includes(q)
    );
  });

  const handleSelectTier = (tier) => {
    setFormData((prev) => {
      const isFournisseur = tier.type === 'fournisseur';
      const isClient = tier.type === 'client';
      let autoOrderType = prev.order_type;

      if (isFournisseur && modalType === 'DEPENSE') {
        autoOrderType = 'VERSEMENT FOURNISSEUR';
      } else if (isClient && modalType === 'RECETTE') {
        autoOrderType = 'VERSEMENT CLIENT';
      }

      return {
        ...prev,
        party_name: tier.name,
        party_phone: tier.phone || prev.party_phone,
        tier_type: tier.type,
        tier_id: tier.id,
        order_type: autoOrderType
      };
    });
    setIsTiersDropdownOpen(false);
  };

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast" style={{ backgroundColor: '#209f84' }}>
          <i className="fas fa-check-circle" /> {toastMessage}
        </div>
      )}

      {viewMode === 'categories' ? (
        <div>
          {/* Header Paramètres des Catégories */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="page-title-wrap">
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#111111' }}>
                Paramètres des Catégories de Caisse
              </h1>
              <p className="breadcrumb-sub" style={{ margin: '0.25rem 0 0', color: '#71717a', fontSize: '0.9rem' }}>
                Ajouter, modifier ou supprimer les catégories d'opérations (Recettes et Dépenses)
              </p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setViewMode('journal')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-arrow-left" /> Retour au Journal de Caisse
              </button>
            </div>
          </div>

          {/* Grille 2 colonnes : Recettes & Dépenses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start', marginBottom: '2rem' }}>
            {/* Carte 1 : Catégories de Recettes (+ Entrées) */}
            <div className="admin-card">
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-arrow-down" style={{ color: '#16a34a' }} />
                  Catégories de Recettes (+ Entrées)
                </h4>
                <span className="badge-custom bg-soft-success" style={{ fontWeight: 700 }}>
                  {recettesList.length} catégories
                </span>
              </div>
              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Formulaire d'ajout inline */}
                <form onSubmit={handleAddRecetteCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Nouvelle catégorie de recette..."
                    value={newRecetteInput}
                    onChange={(e) => setNewRecetteInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', padding: '0.65rem 1.15rem' }}
                  >
                    <i className="fas fa-plus" /> Ajouter
                  </button>
                </form>

                {/* Liste des catégories avec Modifier et Supprimer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {recettesList.map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0'
                      }}
                    >
                      {editingRecette?.oldName === cat ? (
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editingRecette.value}
                            onChange={(e) => setEditingRecette({ ...editingRecette, value: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn-primary-custom"
                            onClick={() => handleSaveEditRecetteCategory(cat, editingRecette.value)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Enregistrer"
                          >
                            <i className="fas fa-check" />
                          </button>
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => setEditingRecette(null)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Annuler"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <i className="fas fa-tag" style={{ color: '#16a34a', fontSize: '0.85rem' }} />
                            <span style={{ fontWeight: 600, color: '#18181b', fontSize: '0.92rem' }}>{cat}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditingRecette({ oldName: cat, value: cat })}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              title="Modifier cette catégorie"
                            >
                              <i className="fas fa-edit" style={{ color: '#3b82f6' }} /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecetteCategory(cat)}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                              title="Supprimer cette catégorie"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Carte 2 : Catégories de Dépenses (- Sorties) */}
            <div className="admin-card">
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-arrow-up" style={{ color: '#dc2626' }} />
                  Catégories de Dépenses (- Sorties)
                </h4>
                <span className="badge-custom bg-soft-danger" style={{ fontWeight: 700 }}>
                  {depensesList.length} catégories
                </span>
              </div>
              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Formulaire d'ajout inline */}
                <form onSubmit={handleAddDepenseCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Nouvelle catégorie de dépense..."
                    value={newDepenseInput}
                    onChange={(e) => setNewDepenseInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', padding: '0.65rem 1.15rem' }}
                  >
                    <i className="fas fa-plus" /> Ajouter
                  </button>
                </form>

                {/* Liste des catégories avec Modifier et Supprimer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {depensesList.map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0'
                      }}
                    >
                      {editingDepense?.oldName === cat ? (
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editingDepense.value}
                            onChange={(e) => setEditingDepense({ ...editingDepense, value: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn-primary-custom"
                            onClick={() => handleSaveEditDepenseCategory(cat, editingDepense.value)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Enregistrer"
                          >
                            <i className="fas fa-check" />
                          </button>
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => setEditingDepense(null)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Annuler"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <i className="fas fa-tag" style={{ color: '#dc2626', fontSize: '0.85rem' }} />
                            <span style={{ fontWeight: 600, color: '#18181b', fontSize: '0.92rem' }}>{cat}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditingDepense({ oldName: cat, value: cat })}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              title="Modifier cette catégorie"
                            >
                              <i className="fas fa-edit" style={{ color: '#3b82f6' }} /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDepenseCategory(cat)}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                              title="Supprimer cette catégorie"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Page Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="page-title-wrap">
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#111111' }}>
                Journal de Caisse
              </h1>
              <p className="breadcrumb-sub" style={{ margin: '0.25rem 0 0', color: '#71717a', fontSize: '0.9rem' }}>
                Suivi en temps réel des encaissements, décaissements et du solde de caisse
              </p>
            </div>

            <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Bouton Paramètres Catégories (Demandé par l'utilisateur !) */}
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setViewMode('categories')}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: '#18181b',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-sliders-h" style={{ color: '#fe2c55' }} />
                <span>Paramètres Catégories</span>
              </button>

              <button
                type="button"
                className="btn-light-custom"
                onClick={loadCashflow}
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
            onClick={() => handleOpenModal('RECETTE')}
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
            <span>RECETTE / DÉPENSE</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          STATS / KPI CARDS (TOTAL VENTES, DÉCAISSEMENTS, AUTRES, SOLDE CAISSE)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* KPI 1 : TOTAL VENTES ENCAISSÉES */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            TOTAL VENTES ENCAISSÉES
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {formatDA(kpi.total_ventes_encaissees)} DA
          </div>
          <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '0.4rem' }}>
            Produits: {formatDA(kpi.ventes_produits)} DA | Livr: {formatDA(kpi.ventes_livraison)} DA
          </div>
        </div>

        {/* KPI 2 : BÉNÉFICE JOURNALIER */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            BÉNÉFICE JOURNALIER
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: dailyProfit >= 0 ? '#16a34a' : '#dc2626',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            {dailyProfit >= 0 ? '+' : ''}{formatDA(dailyProfit)} DA
          </div>
          <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '0.4rem' }}>
            Aujourd'hui ({new Date().toLocaleDateString('fr-FR')})
          </div>
        </div>

        {/* KPI 2 : DÉCAISSEMENTS ACHATS */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            DÉCAISSEMENTS ACHATS
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            -{formatDA(kpi.decaissements_achats)} DA
          </div>
        </div>

        {/* KPI 3 : AUTRES RECETTES / DÉPENSES */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            AUTRES RECETTES / DÉPENSES
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            -{formatDA(kpi.autres_depenses)} DA
          </div>
          <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '0.4rem' }}>
            Recettes: +{formatDA(kpi.autres_recettes)} DA | Dépenses: -{formatDA(kpi.autres_depenses)} DA
          </div>
        </div>

        {/* KPI 4 : BÉNÉFICE NET / SOLDE CAISSE */}
        <div
          className="admin-card"
          style={{
            padding: '1.25rem 1.4rem',
            marginBottom: 0,
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            BÉNÉFICE NET / SOLDE CAISSE
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: parseFloat(kpi.solde_caisse) >= 0 ? '#16a34a' : '#dc2626',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            {parseFloat(kpi.solde_caisse) >= 0 ? '+' : ''}{formatDA(kpi.solde_caisse)} DA
          </div>
          <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '0.4rem' }}>
            Total Encaissé (Frais de livraison inclus) - Total Décaissé
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILTER TABS & SEARCH
          ========================================================================= */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
        <div
          className="card-body-custom"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: `TOUT JOURNAL (${counts.all ?? 0})`, icon: 'fas fa-book' },
              { id: 'recettes_depenses', label: `RECETTES & DÉPENSES (${counts.recettes_depenses ?? (counts.recettes + counts.depenses)})`, icon: 'fas fa-exchange-alt' },
              { id: 'ventes', label: `VENTES (${counts.ventes ?? 0})`, icon: 'fas fa-shopping-cart' },
              { id: 'achats', label: `ACHATS FOURNISSEURS (${counts.achats ?? 0})`, icon: 'fas fa-truck-loading' },
              { id: 'versements_clients', label: `VERSEMENTS CLIENTS (${counts.versements_clients ?? 0})`, icon: 'fas fa-user-check' },
              { id: 'versements_fournisseurs', label: `VERSEMENTS FOURNISSEURS (${counts.versements_fournisseurs ?? 0})`, icon: 'fas fa-money-bill-wave' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: activeTab === tab.id ? '#111111' : '#f4f4f5',
                  color: activeTab === tab.id ? '#ffffff' : '#3f3f46',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={tab.icon} style={{ fontSize: '0.72rem' }} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
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
              placeholder="Rechercher par réf, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem', fontSize: '0.84rem' }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABLE PRINCIPALE DU JOURNAL DE CAISSE
          ========================================================================= */}
      <div className="admin-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-responsive-custom">
          <table className="table-custom" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>TYPE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>N° COMMANDE / REF</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>CLIENT / FOURNISSEUR</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>TYPE ORDRE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>PRODUITS</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>MONTANT TOTAL</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>BÉNÉFICE PRODUITS</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>DATE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.74rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                    Chargement du journal de caisse...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                    <i className="flaticon-381-box" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', color: '#ccc' }} />
                    Aucune écriture trouvée dans cette section.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((row) => {
                  const isPositive = row.type === 'VENTE' || row.type === 'RECETTE' || row.type === 'VERSEMENT';
                  const isExpense = row.type === 'DEPENSE' || row.type === 'ACHAT';

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      {/* TYPE */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        {(row.order_type === 'VERSEMENT CLIENT' || row.order_type === 'VERSEMENT FOURNISSEUR' || row.type === 'VERSEMENT') ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: '4px', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800 }}>
                            <i className="fas fa-arrow-down" style={{ fontSize: '0.68rem' }} /> VERSEMENT
                          </span>
                        ) : row.type === 'VENTE' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: '4px', backgroundColor: '#15803d', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800 }}>
                            <i className="fas fa-shopping-cart" style={{ fontSize: '0.68rem' }} /> VENTE
                          </span>
                        ) : row.type === 'DEPENSE' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: '4px', backgroundColor: '#b91c1c', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800 }}>
                            <i className="fas fa-arrow-up" style={{ fontSize: '0.68rem' }} /> DÉPENSE
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: '4px', backgroundColor: '#15803d', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800 }}>
                            <i className="fas fa-arrow-down" style={{ fontSize: '0.68rem' }} /> RECETTE
                          </span>
                        )}
                      </td>

                      {/* N° COMMANDE / REF */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.84rem', fontWeight: 600, color: '#18181b' }}>
                        <div>{row.ref_number || `-`}</div>
                        {row.attachment_url && (
                          <a
                            href={row.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              color: '#0284c7',
                              fontWeight: 700,
                              textDecoration: 'none',
                              marginTop: '3px',
                              backgroundColor: '#f0f9ff',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #bae6fd'
                            }}
                            title="Voir le fichier justificatif joint"
                          >
                            <i className="fas fa-paperclip" /> Justificatif
                          </a>
                        )}
                      </td>

                      {/* CLIENT / FOURNISSEUR */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#111111' }}>
                          {row.party_name || 'Anonyme'}
                        </div>
                        {row.party_phone && (
                          <div style={{ fontSize: '0.76rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                            <i className="fab fa-whatsapp" style={{ color: '#22c55e', fontSize: '0.8rem' }} />
                            <span>{row.party_phone}</span>
                          </div>
                        )}
                      </td>

                      {/* TYPE ORDRE */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#f4f4f5', border: '1px solid #e4e4e7', fontSize: '0.74rem', fontWeight: 700, color: '#3f3f46' }}>
                          {row.order_type || 'STANDARD'}
                        </span>
                      </td>


                      {/* PRODUITS */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.84rem', color: '#0284c7', fontWeight: 600 }}>
                        {parseFloat(row.products_amount) > 0 ? `${formatDA(row.products_amount)} DA` : '-'}
                      </td>

                      {/* MONTANT TOTAL */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isExpense ? '#dc2626' : '#16a34a' }}>
                          {isExpense ? '-' : '+'}{formatDA(row.paid_amount || row.total_amount)} DA
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '2px' }}>
                          {parseFloat(row.remaining_amount) > 0 ? (
                            <span>Total: {formatDA(row.total_amount)} DA | Reste: <strong style={{ color: '#dc2626' }}>{formatDA(row.remaining_amount)} DA</strong></span>
                          ) : (
                            <span>Total: {formatDA(row.total_amount)} DA | Totalement Réglé</span>
                          )}
                        </div>
                      </td>

                      {/* BÉNÉFICE PRODUITS */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.84rem', fontWeight: 700, color: '#16a34a' }}>
                        {row.order_type?.includes('VERSEMENT') ? '-' : (parseFloat(row.profit_amount) > 0 ? `+${formatDA(row.profit_amount)} DA` : '-')}
                      </td>

                      {/* DATE */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.82rem', color: '#52525b', whiteSpace: 'nowrap' }}>
                        {row.operation_date ? row.operation_date.split('-').reverse().join('/') : '-'}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          {(row.order_type === 'VERSEMENT CLIENT' || row.order_type === 'VERSEMENT FOURNISSEUR' || row.type === 'VERSEMENT') && (
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <i className="fas fa-check" style={{ fontSize: '0.65rem' }} /> {row.order_type === 'VERSEMENT FOURNISSEUR' ? 'PAYÉ' : 'REÇU'}
                            </span>
                          )}

                          {/* Bouton Voir Fichier / Justificatif */}
                          {row.attachment_url && (
                            <a
                              href={row.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #bae6fd',
                                backgroundColor: '#f0f9ff',
                                color: '#0284c7',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                textDecoration: 'none'
                              }}
                              title="Voir le fichier justificatif"
                            >
                              <i className="fas fa-paperclip" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                id: row.id,
                                amount: row.paid_amount || row.total_amount,
                                operation_date: row.operation_date,
                                note: row.note || '',
                                party_name: row.party_name || '',
                                party_phone: row.party_phone || '',
                                order_type: row.order_type || '',
                                source: row.source || 'CAISSE POS',
                                attachment_url: row.attachment_url || ''
                              });
                              setModalType(row.type === 'DEPENSE' ? 'DEPENSE' : 'RECETTE');
                              setIsModalOpen(true);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              border: '1px solid #d4d4d8',
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem'
                            }}
                            title="Modifier"
                          >
                            <i className="fas fa-pen" />
                          </button>

                          {deleteConfirmId === row.id ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(row.id)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              Confirmer ?
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(row.id)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #fecdd3',
                                backgroundColor: '#fff1f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem'
                              }}
                              title="Supprimer"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
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

        {/* Pagination Numérique */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 300, behavior: 'smooth' });
          }}
          totalItems={filteredEntries.length}
          itemsPerPage={itemsPerPage}
          itemLabel="écritures"
        />
      </div>
    </div>
  )}

      {/* =========================================================================
          MODAL : NOUVELLE ÉCRITURE COMPTABLE (Fidèle aux Captures d'écran 1 & 2)
          ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '620px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                NOUVELLE ÉCRITURE COMPTABLE ({modalType === 'RECETTE' ? 'RECETTE' : 'DEPENSE'})
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
              {/* Segmented Switcher : RECETTE vs DÉPENSE */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setModalType('RECETTE');
                    setFormData((prev) => ({ ...prev, order_type: recettesList[0] || 'VENTE BOUTIQUE / POS' }));
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: modalType === 'RECETTE' ? 'none' : '1px solid #d4d4d8',
                    backgroundColor: modalType === 'RECETTE' ? '#15803d' : '#ffffff',
                    color: modalType === 'RECETTE' ? '#ffffff' : '#3f3f46',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-arrow-down" />
                  <span>↓ RECETTE (+ ENTRÉE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalType('DEPENSE');
                    setFormData((prev) => ({ ...prev, order_type: depensesList[0] || 'ACHAT MARCHANDISE / STOCK' }));
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: modalType === 'DEPENSE' ? 'none' : '1px solid #d4d4d8',
                    backgroundColor: modalType === 'DEPENSE' ? '#b91c1c' : '#ffffff',
                    color: modalType === 'DEPENSE' ? '#ffffff' : '#3f3f46',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className="fas fa-arrow-up" />
                  <span>↑ DÉPENSE (- SORTIE)</span>
                </button>
              </div>

              {/* Ligne 1 : Montant & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    MONTANT (DA) *
                  </label>
                  <input
                    type="number"
                    step="50"
                    placeholder="0.00 DA"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    DATE D'OPÉRATION *
                  </label>
                  <input
                    type="date"
                    value={formData.operation_date}
                    onChange={(e) => setFormData({ ...formData, operation_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Ligne 2 : Tiers / Bénéficiaire & Téléphone avec Recherche Automatique Client / Fournisseur */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ position: 'relative' }} ref={tiersDropdownRef}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    <span>CLIENT / FOURNISSEUR (TIERS)</span>
                    {formData.tier_type && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: formData.tier_type === 'fournisseur' ? '#eff6ff' : '#ecfdf5',
                          color: formData.tier_type === 'fournisseur' ? '#2563eb' : '#16a34a',
                          fontWeight: 700,
                          textTransform: 'none'
                        }}
                      >
                        ✓ {formData.tier_type === 'fournisseur' ? 'Fournisseur sélectionné' : 'Client sélectionné'}
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={modalType === 'RECETTE' ? 'Rechercher ou écrire un client/fournisseur...' : 'Rechercher ou écrire un fournisseur/client...'}
                      value={formData.party_name}
                      onFocus={() => setIsTiersDropdownOpen(true)}
                      onChange={(e) => {
                        setFormData({ ...formData, party_name: e.target.value, tier_type: '', tier_id: null });
                        setIsTiersDropdownOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.7rem 2.2rem 0.7rem 1rem',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        border: formData.tier_type ? (formData.tier_type === 'fournisseur' ? '1.5px solid #3b82f6' : '1.5px solid #16a34a') : '1px solid #e4e4e7',
                        backgroundColor: '#f8fafc',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {formData.party_name && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, party_name: '', party_phone: '', tier_type: '', tier_id: null });
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '1.1rem',
                          lineHeight: 1
                        }}
                        title="Effacer"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {/* Liste déroulante avec recherche automatique */}
                  {isTiersDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '8px',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                        marginTop: '4px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        zIndex: 1050
                      }}
                    >
                      {filteredTiers.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#71717a' }}>
                          Aucun contact existant ne correspond. Le texte saisi sera enregistré comme tiers libre.
                        </div>
                      ) : (
                        filteredTiers.map((t) => (
                          <div
                            key={`${t.type}-${t.id}`}
                            onClick={() => handleSelectTier(t)}
                            style={{
                              padding: '0.65rem 0.95rem',
                              borderBottom: '1px solid #f4f4f5',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              <span
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.74rem',
                                  backgroundColor: t.type === 'fournisseur' ? '#eff6ff' : '#ecfdf5',
                                  color: t.type === 'fournisseur' ? '#3b82f6' : '#16a34a'
                                }}
                              >
                                <i className={t.type === 'fournisseur' ? 'fas fa-truck' : 'fas fa-user'} />
                              </span>
                              <div>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111111' }}>
                                  {t.name}{' '}
                                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: t.type === 'fournisseur' ? '#2563eb' : '#16a34a' }}>
                                    ({t.type === 'fournisseur' ? 'Fournisseur' : 'Client'})
                                  </span>
                                </div>
                                {(t.phone || t.sublabel) && (
                                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>
                                    {t.phone ? `Tél: ${t.phone}` : ''} {t.sublabel ? `• ${t.sublabel}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: t.type === 'fournisseur' ? '#eff6ff' : '#ecfdf5',
                                color: t.type === 'fournisseur' ? '#2563eb' : '#16a34a'
                              }}
                            >
                              {t.type === 'fournisseur' ? 'Fournisseur' : 'Client'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    TÉLÉPHONE (OPTIONNEL)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0550123456"
                    value={formData.party_phone}
                    onChange={(e) => setFormData({ ...formData, party_phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Ligne 2.5 : Nature / Catégorie d'opération */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', margin: 0 }}>
                    CATÉGORIE / NATURE DE L'OPÉRATION
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setViewMode('categories');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fe2c55',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <i className="fas fa-cog" /> Gérer les catégories
                  </button>
                </div>
                <select
                  value={formData.order_type}
                  onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#f8fafc',
                    color: '#18181b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {(modalType === 'RECETTE' ? recettesList : depensesList).map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                  {formData.order_type && !(modalType === 'RECETTE' ? recettesList : depensesList).includes(formData.order_type) && (
                    <option value={formData.order_type}>
                      {formData.order_type} (Autre)
                    </option>
                  )}
                </select>
              </div>

              {/* Ligne 3 : Note / Motif / Description */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  NOTE / MOTIF / DESCRIPTION
                </label>
                <textarea
                  rows="3"
                  placeholder="Description de l'opération..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Ligne 4 : Pièce jointe / Justificatif depuis l'appareil */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  PIÈCE JOINTE / JUSTIFICATIF (FACTURE, REÇU, BON DE CAISSE)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />

                {!formData.attachment_url ? (
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px dashed #d4d4d8',
                      backgroundColor: '#fafafa',
                      color: '#52525b',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: uploadingFile ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {uploadingFile ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ color: '#2563eb' }} />
                        <span>Téléversement du fichier en cours...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '1.2rem', color: '#18181b' }} />
                        <span>Choisir un fichier depuis cet appareil (Photo, PDF, Facture)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-paperclip" style={{ color: '#16a34a', fontSize: '1.1rem' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d' }}>
                          Fichier justificatif joint avec succès
                        </div>
                        <a
                          href={formData.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.78rem', color: '#0284c7', textDecoration: 'underline' }}
                        >
                          Visualiser le fichier joint
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, attachment_url: '' })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '0.9rem'
                      }}
                      title="Supprimer la pièce jointe"
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '1rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #f0f0f0'
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#f4f4f5',
                    color: '#18181b',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {submitting && <i className="fas fa-spinner fa-spin" />}
                  <span>Enregistrer Écriture</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
