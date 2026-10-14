// frontend/src/admin/pages/AdminAccount.jsx
// Gestion du compte et identifiants administrateur (Hospital React / Mediqu Design System)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminAccount() {
  const [profile, setProfile] = useState({
    id: 1,
    name: 'Super Admin',
    email: 'admin@tiktokshop.dz',
    phone: '0550123456',
    role: 'admin'
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const navigate = useNavigate();

  // Liste des administrateurs et création en-page (PAS DE POP-UP)
  const [adminList, setAdminList] = useState([]);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'create' | 'list'
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });

  useEffect(() => {
    loadProfile();
    loadAdminList();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAdminProfile();
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminList = async () => {
    try {
      const list = await adminApi.getAllAdmins();
      setAdminList(list || []);
    } catch (err) {
      console.warn('Erreur chargement admins:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!profile.name.trim() || !profile.email.trim()) {
      setFeedback({ type: 'error', message: 'Le nom et l’adresse email sont obligatoires.' });
      return;
    }

    if (password && password.length < 6) {
      setFeedback({ type: 'error', message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    if (password && password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: profile.id,
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone ? profile.phone.trim() : '',
        ...(password ? { password: password.trim() } : {})
      };

      const res = await adminApi.updateAdminProfile(payload);
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: 'Votre compte administrateur a été mis à jour avec succès dans la base de données !'
        });
        setPassword('');
        setConfirmPassword('');
        if (res.admin) setProfile(res.admin);
        await loadAdminList();
      } else {
        setFeedback({
          type: 'error',
          message: res?.error || 'Erreur lors de la mise à jour du compte.'
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Une erreur inattendue est survenue.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setCreateFeedback(null);

    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) {
      setCreateFeedback({ type: 'error', message: "Veuillez renseigner le nom, l'email et le mot de passe." });
      return;
    }

    if (newAdmin.password.length < 6) {
      setCreateFeedback({ type: 'error', message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    if (newAdmin.password !== newAdmin.confirmPassword) {
      setCreateFeedback({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setCreating(true);
    try {
      const res = await adminApi.createAdminAccount({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        phone: newAdmin.phone.trim(),
        password: newAdmin.password.trim(),
        role: newAdmin.role || 'admin'
      });

      if (res && res.success) {
        const createdName = newAdmin.name.trim();
        const createdEmail = newAdmin.email.trim();
        setFeedback({
          type: 'success',
          message: `Nouveau compte administrateur créé avec succès pour ${createdName} (${createdEmail}) !`
        });
        setNewAdmin({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          role: 'admin'
        });
        setActiveTab('profile');
        await loadAdminList();
      } else {
        setCreateFeedback({
          type: 'error',
          message: res?.error || 'Erreur lors de la création du compte administrateur.'
        });
      }
    } catch (err) {
      setCreateFeedback({ type: 'error', message: 'Une erreur inattendue est survenue.' });
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    adminApi.logout();
    navigate('/admin/login');
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-wrap">
          <h1>
            {activeTab === 'create'
              ? 'Créer un Compte Administrateur'
              : 'Gestion du Compte Administrateur'}
          </h1>
          <p className="breadcrumb-sub">
            {activeTab === 'create'
              ? 'Ajoutez un nouvel administrateur avec accès complet au panneau de gestion'
              : 'Modifiez vos informations de connexion, votre adresse email et votre mot de passe'}
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeTab === 'create' ? (
            <button
              type="button"
              className="btn-light-custom"
              onClick={() => {
                setActiveTab('profile');
                setCreateFeedback(null);
              }}
              style={{ padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="flaticon-381-back-1" />
              <span>← Retour à Mon Profil</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary-custom"
              onClick={() => {
                setActiveTab('create');
                setCreateFeedback(null);
              }}
              style={{ padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="flaticon-381-user-8" />
              <span>+ Créer un Compte Admin</span>
            </button>
          )}

          <button
            type="button"
            className="btn-light-custom"
            onClick={handleLogout}
            style={{ color: '#f72b50', borderColor: '#fed7d7' }}
          >
            <i className="flaticon-381-exit" /> Se Déconnecter
          </button>
        </div>
      </div>

      {/* Navigation Onglets En-Page (SANS AUCUN POP-UP) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e4e4e7',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            setCreateFeedback(null);
          }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'profile' ? '#111111' : '#f4f4f5',
            color: activeTab === 'profile' ? '#ffffff' : '#52525b',
            transition: 'all 0.15s ease'
          }}
        >
          <i className="flaticon-381-user-7" />
          <span>Mon Profil</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('create');
            setCreateFeedback(null);
          }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: activeTab === 'create' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'create' ? '#111111' : '#f4f4f5',
            color: activeTab === 'create' ? '#ffffff' : '#52525b',
            transition: 'all 0.15s ease'
          }}
        >
          <i className="flaticon-381-user-8" />
          <span>+ Créer un Administrateur</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('list');
            setCreateFeedback(null);
          }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: activeTab === 'list' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'list' ? '#111111' : '#f4f4f5',
            color: activeTab === 'list' ? '#ffffff' : '#52525b',
            transition: 'all 0.15s ease'
          }}
        >
          <i className="flaticon-381-list" />
          <span>Tous les Administrateurs ({adminList.length})</span>
        </button>
      </div>

      {/* Message de notification globale inline */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fff1f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
            color: feedback.type === 'success' ? '#065f46' : '#9f1239'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i
              className={feedback.type === 'success' ? 'fas fa-check-circle' : 'flaticon-381-warning-1'}
              style={{ fontSize: '1.1rem' }}
            />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: '1rem'
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* VUE 1 : MON PROFIL */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Colonne 1 : Coordonnées de l'Administrateur */}
            <div className="admin-card">
              <div className="card-header-custom">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="flaticon-381-user-7" style={{ color: '#111111' }} />
                  Informations Personnelles
                </h4>
                <span className="badge-custom bg-soft-info" style={{ fontWeight: 700 }}>
                  {profile.role?.toUpperCase() || 'ADMIN'}
                </span>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Nom & Prénom de l’Administrateur *
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Ex: Administrateur Principal"
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Adresse Email d’Accès *
                  </label>
                  <input
                    type="email"
                    className="form-control-custom"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="admin@tiktokshop.dz"
                    required
                  />
                  <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem' }}>
                    Sera utilisé pour vous connecter au panneau d'administration.
                  </small>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Numéro de Téléphone
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="0550123456"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Rôle Système
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value="Administrateur Général (Accès complet MySQL)"
                    disabled
                    style={{ backgroundColor: '#f4f4f5', color: '#71717a', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Colonne 2 : Sécurité & Mot de Passe */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="admin-card">
                <div className="card-header-custom">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="flaticon-381-lock" style={{ color: '#111111' }} />
                    Sécurité & Mot de Passe
                  </h4>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                      Nouveau Mot de Passe
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Laisser vide pour ne pas modifier"
                      autoComplete="new-password"
                    />
                    <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem' }}>
                      Minimum 6 caractères si vous souhaitez le changer.
                    </small>
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                      Confirmer le Nouveau Mot de Passe
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {/* Boîte résumé & actions */}
              <div className="admin-card" style={{ padding: '1.5rem', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 700, color: '#111111' }}>Enregistrer vos coordonnées</h5>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#71717a' }}>
                      Les changements prennent effet immédiatement sur votre session.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    disabled={saving || loading}
                    style={{
                      padding: '0.75rem 1.75rem',
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <i className="flaticon-381-save" />
                    <span>{saving ? 'Enregistrement en cours...' : 'Mettre à jour le compte'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-light-custom"
                    onClick={loadProfile}
                    disabled={saving}
                  >
                    <i className="flaticon-381-refresh" /> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* VUE 2 : CRÉER UN ADMINISTRATEUR DIRECTEMENT DANS LA PAGE (PAS DE POP-UP) */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateAdminSubmit}>
          {createFeedback && (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: createFeedback.type === 'error' ? '#fff1f2' : '#ecfdf5',
                border: `1px solid ${createFeedback.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
                color: createFeedback.type === 'error' ? '#9f1239' : '#065f46'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <i
                  className={createFeedback.type === 'error' ? 'flaticon-381-warning-1' : 'fas fa-check-circle'}
                  style={{ fontSize: '1.1rem' }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{createFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateFeedback(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontSize: '1rem'
                }}
              >
                &times;
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Colonne 1 : Coordonnées du nouvel admin */}
            <div className="admin-card">
              <div className="card-header-custom">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="flaticon-381-user-8" style={{ color: '#111111' }} />
                  Coordonnées du Nouvel Administrateur
                </h4>
                <span className="badge-custom bg-soft-primary" style={{ fontWeight: 700 }}>
                  NOUVEAU COMPTE
                </span>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Nom & Prénom de l’Administrateur *
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Ex: Sarah Benali"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Adresse Email d’Accès *
                  </label>
                  <input
                    type="email"
                    className="form-control-custom"
                    placeholder="admin2@tiktokshop.dz"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    required
                  />
                  <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem' }}>
                    Sera utilisé comme identifiant pour se connecter au panneau d'administration.
                  </small>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Numéro de Téléphone (Optionnel)
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="0770123456"
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                    Rôle Attribué
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value="Administrateur (Accès complet au tableau de bord)"
                    disabled
                    style={{ backgroundColor: '#f4f4f5', color: '#71717a', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Colonne 2 : Sécurité & Validation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="admin-card">
                <div className="card-header-custom">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="flaticon-381-lock" style={{ color: '#111111' }} />
                    Identifiants de Sécurité
                  </h4>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                      Mot de Passe *
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      placeholder="Minimum 6 caractères"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      required
                      autoComplete="new-password"
                    />
                    <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem' }}>
                      Au moins 6 caractères requis pour sécuriser l'accès.
                    </small>
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                      Confirmer le Mot de Passe *
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      placeholder="Répétez le mot de passe"
                      value={newAdmin.confirmPassword}
                      onChange={(e) => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {/* Boîte résumé & actions */}
              <div className="admin-card" style={{ padding: '1.5rem', backgroundColor: '#fafafa' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h5 style={{ margin: '0 0 0.3rem 0', fontWeight: 700, color: '#111111' }}>
                    Valider la création du compte
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#71717a' }}>
                    Le nouvel administrateur pourra immédiatement se connecter avec cet email et ce mot de passe.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    disabled={creating}
                    style={{
                      padding: '0.75rem 1.75rem',
                      opacity: creating ? 0.7 : 1,
                      cursor: creating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <i className="flaticon-381-user-8" />
                    <span>{creating ? 'Création en cours...' : 'Créer le compte admin'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-light-custom"
                    onClick={() => {
                      setActiveTab('profile');
                      setCreateFeedback(null);
                    }}
                    disabled={creating}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* VUE 3 / TABLEAU : COMPTES ADMINISTRATEURS ENREGISTRÉS */}
      {adminList.length > 0 && (
        <div className="admin-card" style={{ marginTop: '2rem' }}>
          <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className="flaticon-381-user-7" style={{ color: '#111111' }} />
              Comptes Administrateurs Enregistrés ({adminList.length})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {activeTab !== 'create' && (
                <button
                  type="button"
                  className="btn-primary-custom"
                  onClick={() => {
                    setActiveTab('create');
                    setCreateFeedback(null);
                  }}
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <i className="flaticon-381-user-8" />
                  <span>Nouveau</span>
                </button>
              )}
              <button
                type="button"
                className="btn-light-custom"
                onClick={loadAdminList}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
              >
                <i className="flaticon-381-refresh" /> Actualiser
              </button>
            </div>
          </div>
          <div className="table-responsive-custom">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Nom de l'Administrateur</th>
                  <th>Adresse Email</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Date de Création</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {adminList.map((adm) => (
                  <tr key={adm.id}>
                    <td>
                      <strong style={{ color: '#111111' }}>{adm.name}</strong>
                      {Number(adm.id) === Number(profile.id) && (
                        <span className="badge-custom bg-soft-primary" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                          Vous
                        </span>
                      )}
                    </td>
                    <td>{adm.email}</td>
                    <td>{adm.phone || '—'}</td>
                    <td>
                      <span className="badge-custom bg-soft-info" style={{ fontWeight: 600 }}>
                        {adm.role?.toUpperCase() || 'ADMIN'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#71717a' }}>{adm.created_at || '—'}</td>
                    <td>
                      <span className="badge-custom bg-soft-success">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
