// frontend/src/admin/pages/AdminCustomers.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import AdminPagination from '../components/AdminPagination';
import { ALGERIA_CITIES } from '../../data/algeriaCities';

export default function AdminCustomers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    wilaya: '',
    commune: '',
    detailedAddress: ''
  });
  const [availableCommunes, setAvailableCommunes] = useState([]);
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal Historique d'achats du client
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleOpenHistory = async (customer) => {
    setHistoryCustomer(customer);
    setLoadingHistory(true);
    setCustomerOrders([]);
    try {
      const orders = await adminApi.getCustomerOrders(customer);
      setCustomerOrders(orders);
    } catch (err) {
      console.error('Erreur chargement historique client:', err);
      setCustomerOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setHistoryCustomer(null);
    setCustomerOrders([]);
  };

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

  // Synchronisation avec l'URL param ?edit=:id si présent
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && customers.length > 0 && (!editingCustomer || String(editingCustomer.id) !== String(editId))) {
      const target = customers.find((c) => String(c.id) === String(editId));
      if (target) {
        handleStartEdit(target, false);
      }
    }
  }, [searchParams, customers]);

  // Extraction de la Wilaya et Commune existante
  const parseLocation = (c) => {
    let matchedCity = null;
    let commune = c.commune || '';

    if (c.wilaya) {
      matchedCity = ALGERIA_CITIES.find(
        (city) =>
          city.name.toLowerCase() === c.wilaya.toLowerCase() ||
          city.wilaya.toLowerCase() === c.wilaya.toLowerCase() ||
          city.code === c.wilaya
      );
    }

    if (!matchedCity && c.address) {
      for (const city of ALGERIA_CITIES) {
        if (c.address.toLowerCase().includes(city.wilaya.toLowerCase())) {
          matchedCity = city;
          break;
        }
      }
    }

    if (matchedCity && !commune && c.address) {
      for (const com of matchedCity.communes) {
        if (c.address.toLowerCase().includes(com.toLowerCase())) {
          commune = com;
          break;
        }
      }
    }

    const defaultCity = ALGERIA_CITIES[15] || ALGERIA_CITIES[0]; // 16 - Alger par défaut
    const finalCity = matchedCity || defaultCity;

    return {
      wilaya: finalCity.name,
      commune: commune || (finalCity.communes[0] || ''),
      cityObj: finalCity
    };
  };

  const handleStartEdit = (c, updateUrl = true) => {
    setEditingCustomer(c);
    const { wilaya, commune, cityObj } = parseLocation(c);

    setAvailableCommunes(cityObj ? cityObj.communes : []);

    setEditForm({
      fullName: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      password: c.password || '',
      wilaya: wilaya,
      commune: commune,
      detailedAddress: c.address || ''
    });

    setShowPassword(true);
    setFeedback(null);

    if (updateUrl) {
      setSearchParams({ edit: c.id });
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
    setFeedback(null);
    setSearchParams({});
  };

  const handleWilayaChange = (selectedWilayaName) => {
    const city = ALGERIA_CITIES.find((item) => item.name === selectedWilayaName);
    const communes = city ? city.communes : [];
    setAvailableCommunes(communes);
    setEditForm((prev) => ({
      ...prev,
      wilaya: selectedWilayaName,
      commune: communes[0] || ''
    }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Veuillez renseigner le nom complet du client.' });
      return;
    }
    if (!editForm.phone.trim()) {
      setFeedback({ type: 'error', message: 'Le numéro de téléphone est obligatoire.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        id: editingCustomer.id,
        name: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        password: editForm.password ? editForm.password.trim() : '',
        wilaya: editForm.wilaya,
        commune: editForm.commune,
        address: editForm.detailedAddress.trim() || `${editForm.wilaya} - ${editForm.commune}`
      };

      const res = await adminApi.updateCustomer(payload);
      if (res && res.success) {
        setFeedback({ type: 'success', message: 'Informations du client modifiées avec succès.' });
        await loadCustomers();
        setEditingCustomer(null);
        setSearchParams({});
        setTimeout(() => setFeedback(null), 3500);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Erreur lors de la modification.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur de connexion au serveur.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }
    try {
      const res = await adminApi.deleteCustomer(id);
      if (res && res.success) {
        setFeedback({ type: 'success', message: 'Client supprimé avec succès.' });
        await loadCustomers();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Erreur lors de la suppression.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur de connexion au serveur.' });
    }
  };

  const filtered = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedCustomers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Modal Historique d'achats du client (Design épuré sans badges ni jaune)
  const renderHistoryModal = () => {
    if (!historyCustomer) return null;

    const totalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseHistory();
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #e4e4e7'
          }}
        >
          {/* Header simple */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#18181b' }}>
                Historique des achats — {historyCustomer.name}
              </h4>
              <div style={{ fontSize: '0.82rem', color: '#71717a', marginTop: '3px' }}>
                Client #{historyCustomer.id}
                {historyCustomer.phone ? ` • ${historyCustomer.phone}` : ''}
                {historyCustomer.wilaya ? ` • ${historyCustomer.wilaya}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseHistory}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                color: '#71717a',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '4px 8px'
              }}
              title="Fermer"
            >
              &times;
            </button>
          </div>

          {/* Récapitulatif simple (sans badges) */}
          <div
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #e4e4e7',
              fontSize: '0.85rem',
              color: '#3f3f46',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div>
              <strong>{customerOrders.length}</strong> achat{customerOrders.length > 1 ? 's' : ''} enregistré{customerOrders.length > 1 ? 's' : ''}
            </div>
            <div>
              Total dépensé : <strong>{totalSpent.toLocaleString('fr-FR')} DA</strong>
            </div>
          </div>

          {/* Liste sous forme de tableau sobre et simple */}
          <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#71717a' }}>
                <i className="flaticon-381-reload font-24 mb-2 d-block" />
                Chargement de l'historique...
              </div>
            ) : customerOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#71717a' }}>
                Aucun achat enregistré pour ce client.
              </div>
            ) : (
              <div className="table-responsive-custom">
                <table className="table-custom" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e4e4e7', textAlign: 'left', fontSize: '0.78rem', color: '#71717a' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Commande</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Canal</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Articles</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Montant</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Statut</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((ord) => {
                      const isPos = ord.delivery_type === 'boutique' || String(ord.order_number || '').startsWith('#POS');
                      return (
                        <tr key={ord.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                          <td style={{ padding: '10px 10px', fontWeight: 700, color: '#18181b', whiteSpace: 'nowrap' }}>
                            {ord.order_number}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.82rem', color: '#71717a', whiteSpace: 'nowrap' }}>
                            {ord.created_at}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.82rem', color: '#3f3f46', whiteSpace: 'nowrap' }}>
                            {isPos ? 'Boutique (POS)' : 'En ligne'}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.85rem', color: '#18181b' }}>
                            <div>{ord.items_summary || 'Articles divers'}</div>
                            {ord.notes && (
                              <div style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '2px' }}>
                                {ord.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 10px', fontWeight: 700, color: '#18181b', whiteSpace: 'nowrap' }}>
                            {Number(ord.total_amount || 0).toLocaleString('fr-FR')} DA
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.82rem', color: '#3f3f46', whiteSpace: 'nowrap' }}>
                            {ord.status || 'Livrée'}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Link
                              to={`/admin/orders?search=${encodeURIComponent(ord.order_number)}`}
                              className="btn-light-custom"
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                display: 'inline-block'
                              }}
                            >
                              Voir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer simple */}
          <div
            style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa'
            }}
          >
            <Link
              to="/admin/pos"
              className="btn-light-custom"
              style={{
                fontSize: '0.85rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Caisse POS
            </Link>
            <button
              type="button"
              className="btn-light-custom"
              onClick={handleCloseHistory}
              style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VUE 2 : PAGE COMPLÈTE D'ÉDITION DU CLIENT
  // =========================================================================
  if (editingCustomer) {
    return (
      <AdminLayout>
        {/* En-tête de la page d'édition */}
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-light-custom"
              onClick={handleCancelEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-arrow-left" /> Retour aux clients
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                Modifier le Client #{editingCustomer.id} : {editingCustomer.name}
              </h1>
              <p className="breadcrumb-sub" style={{ margin: 0 }}>
                Mise à jour complète du profil, coordonnées et informations de localisation
              </p>
            </div>
          </div>

          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="badge-custom bg-soft-info"
              onClick={() => handleOpenHistory(editingCustomer)}
              title="Cliquer pour afficher l'historique d'achats"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            >
              <i className="fas fa-history me-1" /> {editingCustomer.total_orders || 0} commande(s)
            </button>
            <span className="badge-custom bg-soft-success" style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}>
              <i className="flaticon-381-diamond me-1" /> {Number(editingCustomer.total_spent || 0).toLocaleString()} DA
            </span>
          </div>
        </div>

        {/* Message de notification inline */}
        {feedback && (
          <div 
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
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

        {/* Formulaire de modification */}
        <form onSubmit={handleSaveCustomer}>
          {/* CARTE 1 : IDENTITÉ & CONTACT */}
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header-custom" style={{ borderBottom: '1px solid #f1f5f9', padding: '1.25rem 1.75rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
                <i className="flaticon-381-user-7 text-primary" /> Informations Personnelles & Contact
              </h4>
            </div>
            <div className="card-body-custom" style={{ padding: '1.75rem' }}>
              <div className="row g-3">
                {/* Nom complet */}
                <div className="col-12 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    placeholder="Ex: Mohamed Guedaoui"
                    required
                    style={{ width: '100%', padding: '0.65rem 0.9rem' }}
                  />
                </div>

                {/* Numéro de téléphone */}
                <div className="col-md-6 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Numéro de téléphone *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-phone-alt" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="tel"
                      className="form-control-custom"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Ex: 0550123456"
                      required
                      style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '0.9rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="col-md-6 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Adresse Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-envelope" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="email"
                      className="form-control-custom"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Ex: client@email.com"
                      style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '0.9rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
                    />
                  </div>
                </div>

                {/* Mot de passe du client */}
                <div className="col-12 mb-2">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Mot de passe du client
                  </label>
                  <div style={{ position: 'relative', maxWidth: '420px' }}>
                    <i className="fas fa-lock" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-custom"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Mot de passe du client"
                      style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '2.6rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b'
                      }}
                      title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                    </button>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                    Mot de passe défini par le client. Vous pouvez le visualiser ou le modifier directement.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE 2 : WILAYA & COMMUNE */}
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header-custom" style={{ borderBottom: '1px solid #f1f5f9', padding: '1.25rem 1.75rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
                <i className="flaticon-381-location text-success" /> Wilaya & Commune de Livraison
              </h4>
            </div>
            <div className="card-body-custom" style={{ padding: '1.75rem' }}>
              <div className="row g-3">
                {/* Wilaya */}
                <div className="col-md-6 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Wilaya *
                  </label>
                  <select
                    className="form-control-custom"
                    value={editForm.wilaya}
                    onChange={(e) => handleWilayaChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.65rem 0.9rem', cursor: 'pointer', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Sélectionnez une Wilaya --</option>
                    {ALGERIA_CITIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Commune */}
                <div className="col-md-6 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Commune *
                  </label>
                  <select
                    className="form-control-custom"
                    value={editForm.commune}
                    onChange={(e) => setEditForm({ ...editForm, commune: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem 0.9rem', cursor: 'pointer', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Sélectionnez la Commune --</option>
                    {availableCommunes.map((comm) => (
                      <option key={comm} value={comm}>
                        {comm}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adresse détaillée */}
                <div className="col-12 mb-3">
                  <label className="form-label-custom" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>
                    Adresse détaillée / Rue
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={editForm.detailedAddress}
                    onChange={(e) => setEditForm({ ...editForm, detailedAddress: e.target.value })}
                    placeholder="Ex: Rue 1er Novembre, Bâtiment C, Appartement 12"
                    style={{ width: '100%', padding: '0.65rem 0.9rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <button
              type="submit"
              className="btn-primary-custom"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="flaticon-381-save" />}
              <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer les Modifications'}</span>
            </button>

            <button
              type="button"
              className="btn-light-custom"
              onClick={handleCancelEdit}
              disabled={saving}
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </form>

        
        {renderHistoryModal()}

      </AdminLayout>
    );
  }

  // =========================================================================
  // VUE 1 : LISTE DES CLIENTS
  // =========================================================================
  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Clients & Acheteurs</h1>
          <p className="breadcrumb-sub">Répertoire des clients, volume des commandes et dépenses cumulées en DA</p>
        </div>
        <div className="page-actions">
          <button className="btn-light-custom" onClick={loadCustomers} style={{ cursor: 'pointer' }}>
            <i className="flaticon-381-refresh" /> Actualiser
          </button>
        </div>
      </div>

      {/* Message de notification inline */}
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
                <th style={{ color: '#dc2626' }}>Dette (DA)</th>
                <th style={{ minWidth: '200px' }}>Progression Règlement</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                    {loading ? 'Chargement des clients...' : 'Aucun client trouvé.'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id}>
                    <td><strong style={{ color: '#111111' }}>#{c.id}</strong></td>
                    <td>
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
                          <small style={{ color: '#888' }}>Client Pitchou</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`tel:${c.phone}`} style={{ color: '#209f84', fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-phone-alt me-1" /> {c.phone}
                      </a>
                    </td>
                    <td>
                      {c.email || 'Non renseigné'}
                    </td>
                    <td>
                      <span className="badge-custom bg-soft-primary">
                        {c.wilaya ? `${c.wilaya}${c.commune ? ' - ' + c.commune : ''}` : (c.address || 'Alger')}
                      </span>
                    </td>
                    <td>
                      <strong>{c.total_orders ?? 0}</strong>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.92rem', color: (c.balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        {Number(c.balance || 0).toLocaleString()} DA
                      </strong>
                    </td>
                    <td style={{ verticalAlign: 'middle', minWidth: '200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.74rem' }}>
                        <span style={{ fontWeight: 700, color: (c.progress ?? 100) >= 100 ? '#16a34a' : '#d97706' }}>
                          {c.progress !== undefined ? c.progress : 100}%
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: (c.progress ?? 100) >= 100 ? '#ecfdf5' : '#fffbeb',
                            color: (c.progress ?? 100) >= 100 ? '#16a34a' : '#d97706',
                            border: `1px solid ${(c.progress ?? 100) >= 100 ? '#bbf7d0' : '#fde68a'}`
                          }}
                        >
                          {(c.progress ?? 100) >= 100 ? 'Réglé' : `Reste: ${Math.round(c.balance || 0).toLocaleString()} DA`}
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${c.progress !== undefined ? c.progress : 100}%`,
                            backgroundColor: (c.progress ?? 100) >= 100 ? '#16a34a' : ((c.progress ?? 0) < 50 ? '#dc2626' : '#d97706'),
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '3px' }}>
                        Total: {Number(c.total_spent || c.total_invoiced || 0).toLocaleString()} DA
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn-icon-custom"
                          title="Historique des achats"
                          onClick={() => handleOpenHistory(c)}
                          style={{
                            border: '1px solid #e4e4e7',
                            backgroundColor: '#f4f4f5',
                            color: '#18181b',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fas fa-history" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-custom bg-soft-info"
                          title="Modifier toutes les informations"
                          onClick={() => handleStartEdit(c)}
                          style={{ border: 'none', cursor: 'pointer' }}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <Link
                          to={`/admin/chat?customer_id=${c.id}`}
                          state={{ customer: c }}
                          className="btn-icon-custom bg-soft-primary"
                          title={`Discuter avec ${c.name || 'le client'}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <i className="flaticon-381-send-2" />
                        </Link>
                        <a
                          href={`https://wa.me/213${(c.phone || '').replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon-custom bg-soft-success"
                          title="Contacter sur WhatsApp"
                          style={{ textDecoration: 'none' }}
                        >
                          <i className="fab fa-whatsapp" />
                        </a>
                        <button
                          type="button"
                          className="btn-icon-custom bg-soft-danger"
                          title="Supprimer ce client"
                          onClick={() => handleDeleteCustomer(c.id)}
                          style={{ border: 'none', cursor: 'pointer' }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          itemLabel="clients"
        />
      </div>

      
      {renderHistoryModal()}

    </AdminLayout>
  );
}
