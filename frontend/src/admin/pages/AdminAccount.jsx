// frontend/src/admin/pages/AdminAccount.jsx
// Gestion des Utilisateurs Administrateurs (Hospital React / Mediqu Design System)

import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminAccount() {
  const [profile, setProfile] = useState(() => adminApi.getCurrentAdmin() || { id: 1, name: '', email: '' });
  const [adminList, setAdminList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Formulaire d'ajout / modification (Fermé par défaut)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = création, number = édition
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin',
    password: '',
    confirmPassword: ''
  });

  // Modal de confirmation de suppression
  const [deleteModal, setDeleteModal] = useState({ open: false, admin: null, deleting: false });

  useEffect(() => {
    loadProfile();
    loadAdminList();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await adminApi.getAdminProfile();
      if (data) setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdminList = async () => {
    setLoading(true);
    try {
      const list = await adminApi.getAllAdmins();
      setAdminList(list || []);
    } catch (err) {
      console.warn('Erreur chargement admins:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le formulaire pour un NOUVEL utilisateur
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'admin',
      password: '',
      confirmPassword: ''
    });
    setFeedback(null);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Ouvrir le formulaire pour MODIFIER un utilisateur existant
  const handleStartEdit = (adm) => {
    setEditingId(adm.id);
    setFormData({
      name: adm.name || '',
      email: adm.email || '',
      phone: adm.phone || '',
      role: adm.role || 'admin',
      password: '',
      confirmPassword: ''
    });
    setFeedback(null);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Fermer le formulaire
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'admin',
      password: '',
      confirmPassword: ''
    });
  };

  // Soumission du formulaire (Création ou Modification)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFeedback({ type: 'error', message: 'Le nom et l’adresse email sont obligatoires.' });
      return;
    }

    // Si création, mot de passe obligatoire
    if (!editingId && !formData.password.trim()) {
      setFeedback({ type: 'error', message: 'Le mot de passe est obligatoire pour un nouvel utilisateur.' });
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setFeedback({ type: 'error', message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setFeedback({ type: 'error', message: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Modification
        const payload = {
          id: editingId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role || 'admin',
          ...(formData.password ? { password: formData.password.trim() } : {})
        };

        const res = await adminApi.updateAdminProfile(payload);
        if (res && res.success) {
          setFeedback({
            type: 'success',
            message: `L'utilisateur "${formData.name.trim()}" a été mis à jour avec succès !`
          });
          handleCloseForm();
          await loadAdminList();
          if (Number(editingId) === Number(profile.id)) {
            await loadProfile();
          }
        } else {
          setFeedback({ type: 'error', message: res?.error || 'Erreur lors de la mise à jour.' });
        }
      } else {
        // Création
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password.trim(),
          role: formData.role || 'admin'
        };

        const res = await adminApi.createAdminAccount(payload);
        if (res && res.success) {
          setFeedback({
            type: 'success',
            message: `Nouvel utilisateur "${formData.name.trim()}" créé avec succès !`
          });
          handleCloseForm();
          await loadAdminList();
        } else {
          setFeedback({ type: 'error', message: res?.error || 'Erreur lors de la création de l’utilisateur.' });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Une erreur inattendue est survenue.' });
    } finally {
      setSaving(false);
    }
  };

  // Préparation de la suppression
  const handleOpenDelete = (adm) => {
    if (Number(adm.id) === Number(profile.id)) {
      setFeedback({
        type: 'error',
        message: 'Vous ne pouvez pas supprimer votre propre compte actuellement connecté.'
      });
      return;
    }
    setDeleteModal({ open: true, admin: adm, deleting: false });
  };

  // Confirmation de suppression
  const handleConfirmDelete = async () => {
    if (!deleteModal.admin) return;
    setDeleteModal((prev) => ({ ...prev, deleting: true }));

    try {
      const res = await adminApi.deleteAdminAccount(deleteModal.admin.id);
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: `L'utilisateur "${deleteModal.admin.name}" a été supprimé avec succès.`
        });
        setDeleteModal({ open: false, admin: null, deleting: false });
        await loadAdminList();
      } else {
        setFeedback({
          type: 'error',
          message: res?.error || 'Erreur lors de la suppression de l’utilisateur.'
        });
        setDeleteModal((prev) => ({ ...prev, deleting: false }));
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur réseau lors de la suppression.' });
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <AdminLayout>
      {/* En-tête de la page */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-wrap">
          <h1>Utilisateurs</h1>
          <p className="breadcrumb-sub">
            Gérez les comptes administrateurs et accès au panneau de gestion
          </p>
        </div>
      </div>

      {/* Message de notification globale */}
      {feedback && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
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
              fontSize: '1.2rem',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* FORMULAIRE AJOUT / ÉDITION (AFFICHÉ UNIQUEMENT LORS D'UN CLIC SUR "NOUVEAU" OU "MODIFIER") */}
      {isFormOpen && (
        <div ref={formRef} className="admin-card" style={{ marginBottom: '1.75rem', border: '1.5px solid #111111' }}>
          <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className={editingId ? 'feather icon-edit-2' : 'flaticon-381-user-8'} style={{ color: '#111111' }} />
              {editingId ? `Modifier l'Utilisateur : ${formData.name || ''}` : 'Ajouter un Nouvel Utilisateur'}
            </h4>
            <button
              type="button"
              className="btn-light-custom"
              onClick={handleCloseForm}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
            >
              <i className="feather icon-x" /> Fermer
            </button>
          </div>

          <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Ex: Mohamed Benali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  Adresse Email d’Accès *
                </label>
                <input
                  type="email"
                  className="form-control-custom"
                  placeholder="admin@pitchou.dz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  Numéro de Téléphone
                </label>
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="0550123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  Rôle
                </label>
                <select
                  className="form-control-custom"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">Administrateur (Accès Complet)</option>
                  <option value="manager">Gestionnaire (Commandes & Catalogue)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  {editingId ? 'Nouveau Mot de Passe' : 'Mot de Passe *'}
                </label>
                <input
                  type="password"
                  className="form-control-custom"
                  placeholder={editingId ? 'Laisser vide pour ne pas modifier' : 'Minimum 6 caractères'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  required={!editingId}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginBottom: '0.4rem' }}>
                  Confirmer le Mot de Passe {editingId ? '' : '*'}
                </label>
                <input
                  type="password"
                  className="form-control-custom"
                  placeholder="Répétez le mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  required={!editingId && Boolean(formData.password)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="submit"
                className="btn-primary-custom"
                disabled={saving}
                style={{ padding: '0.65rem 1.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <i className="flaticon-381-save" />
                <span>{saving ? 'Enregistrement...' : editingId ? 'Mettre à jour l’utilisateur' : 'Créer l’utilisateur'}</span>
              </button>
              <button
                type="button"
                className="btn-light-custom"
                onClick={handleCloseForm}
                disabled={saving}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLEAU PRINCIPAL : LISTE DES UTILISATEURS */}
      <div className="admin-card">
        <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <i className="flaticon-381-user-7" style={{ color: '#111111' }} />
            Comptes Utilisateurs Enregistrés ({adminList.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary-custom"
              onClick={handleOpenCreate}
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <i className="flaticon-381-user-8" />
              <span>Nouveau</span>
            </button>
            <button
              type="button"
              className="btn-light-custom"
              onClick={loadAdminList}
              disabled={loading}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              title="Rafraîchir la liste"
            >
              <i className="flaticon-381-refresh" /> Actualiser
            </button>
          </div>
        </div>

        <div className="table-responsive-custom">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Nom de l'Utilisateur</th>
                <th>Adresse Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Date de Création</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && adminList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#71717a' }}>
                    <i className="flaticon-381-reload font-24 mb-2 d-block" />
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : adminList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#71717a' }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                adminList.map((adm) => {
                  const isCurrent = Number(adm.id) === Number(profile.id);

                  return (
                    <tr key={adm.id}>
                      <td>
                        <strong style={{ color: '#111111', fontSize: '0.9rem' }}>{adm.name}</strong>
                        {isCurrent && (
                          <span
                            className="badge-custom bg-soft-primary"
                            style={{ marginLeft: '8px', fontSize: '0.68rem', fontWeight: 700 }}
                          >
                            Vous
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#52525b' }}>{adm.email}</td>
                      <td style={{ color: '#71717a' }}>{adm.phone || '—'}</td>
                      <td>
                        <span className="badge-custom bg-soft-info" style={{ fontWeight: 700, fontSize: '0.72rem' }}>
                          {adm.role?.toUpperCase() || 'ADMIN'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#71717a' }}>{adm.created_at || '—'}</td>
                      <td>
                        <span className="badge-custom bg-soft-success" style={{ fontWeight: 600 }}>Actif</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => handleStartEdit(adm)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              borderRadius: '6px'
                            }}
                            title="Modifier cet utilisateur"
                          >
                            <i className="feather icon-edit-2" style={{ fontSize: '0.8rem' }} />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(adm)}
                            disabled={isCurrent}
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.82rem',
                              border: '1px solid #fee2e2',
                              background: isCurrent ? '#f4f4f5' : '#fff1f2',
                              color: isCurrent ? '#a1a1aa' : '#ef4444',
                              borderRadius: '6px',
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title={isCurrent ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer cet utilisateur"}
                          >
                            <i className="feather icon-trash-2" style={{ fontSize: '0.85rem' }} />
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
      </div>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {deleteModal.open && deleteModal.admin && (
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
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                marginBottom: '1rem'
              }}
            >
              <i className="feather icon-trash-2" />
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: '#111111' }}>
              Supprimer cet utilisateur ?
            </h4>

            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#52525b', lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir supprimer définitivement le compte de{' '}
              <strong style={{ color: '#111111' }}>{deleteModal.admin.name}</strong> ({deleteModal.admin.email}) ?
              Cette action est irréversible.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setDeleteModal({ open: false, admin: null, deleting: false })}
                disabled={deleteModal.deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModal.deleting}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: deleteModal.deleting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteModal.deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
