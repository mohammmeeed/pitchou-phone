// frontend/src/admin/pages/AdminCustomers.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import { ALGERIA_CITIES } from '../../data/algeriaCities';

export default function AdminCustomers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
            <span className="badge-custom bg-soft-info" style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}>
              <i className="flaticon-381-box-1 me-1" /> {editingCustomer.total_orders || 0} commande(s)
            </span>
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
                <th>Total Dépensé (DA)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    {loading ? 'Chargement des clients...' : 'Aucun client trouvé.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
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
                          <small style={{ color: '#888' }}>Client LeerBook</small>
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
                      <strong style={{ color: '#111111', fontSize: '0.95rem' }}>
                        {Number(c.total_spent || 0).toLocaleString()} DA
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
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
      </div>
    </AdminLayout>
  );
}
