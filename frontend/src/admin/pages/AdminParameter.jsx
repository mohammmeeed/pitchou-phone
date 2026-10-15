// frontend/src/admin/pages/AdminParameter.jsx
// Safe Route per design.md: never /admin/settings, always /admin/parameter
// Paramètres du Système : Boutique, Apparence & Configuration SMTP

import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import { applyThemeColor } from '../../context/ThemeContext';

export default function AdminParameter() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'store' | 'appearance' | 'smtp' | 'system'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Tests SMTP
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null); // { success: boolean, message: string }
  const [showPassword, setShowPassword] = useState(false);

  // État global des paramètres
  const [settings, setSettings] = useState({
    // Boutique & Devise
    store_name: 'LeerBook',
    currency: 'DA (Dinar Algérien)',
    delivery_cost: '500',
    admin_phone: '0550 12 34 56',
    admin_email: 'admin@tiktokshop.dz',

    // Apparence
    theme_mode: 'light', // light | dark | auto
    accent_color: '#fe2c55', // Rouge TikTok
    logo_image: '', // URL du logo de la boutique
    logo_text: 'LeerBook',
    top_banner_enabled: '1',
    top_banner_text: '🔥 Livraison Express 58 Wilayas | Paiement sécurisé à la réception !',
    catalog_layout: 'grid-3',
    products_per_page: '12',

    // Configuration SMTP
    smtp_enabled: '1',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_encryption: 'tls', // tls | ssl | none
    smtp_username: 'contact@tiktokshop.dz',
    smtp_password: '',
    smtp_from_name: 'LeerBook',
    smtp_reply_to: 'support@tiktokshop.dz',
    smtp_notify_customer: '1',
    smtp_notify_admin: '1'
  });

  const logoFileInputRef = React.useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Charger les paramètres depuis le backend PHP / MySQL
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getParameters();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
        if (data.accent_color) {
          applyThemeColor(data.accent_color);
        }
        if (data.logo_image) {
          try {
            localStorage.setItem('shop_logo_image', data.logo_image);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Erreur chargement paramètres:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (newColor) => {
    setSettings((prev) => ({ ...prev, accent_color: newColor }));
    applyThemeColor(newColor);
  };

  // Téléversement du logo depuis l'appareil
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadLogoFile(file);
    if (e.target) e.target.value = '';
  };

  const handleDropLogo = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await uploadLogoFile(file);
    }
  };

  const uploadLogoFile = async (file) => {
    setUploadingLogo(true);
    try {
      const res = await adminApi.uploadImage(file);
      if (res && res.url) {
        setSettings((prev) => ({ ...prev, logo_image: res.url }));
        try {
          localStorage.setItem('shop_logo_image', res.url);
        } catch (err) {}
        window.dispatchEvent(new CustomEvent('shop_logo_changed', { detail: { logo: res.url, text: settings.logo_text } }));
        setToastMessage({
          type: 'success',
          text: 'Logo importé depuis votre appareil avec succès !'
        });
      } else {
        throw new Error(res?.error || 'Erreur lors du téléversement');
      }
    } catch (err) {
      console.warn('Erreur téléversement logo API, fallback base64 local:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setSettings((prev) => ({ ...prev, logo_image: dataUrl }));
        try {
          localStorage.setItem('shop_logo_image', dataUrl);
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('shop_logo_changed', { detail: { logo: dataUrl, text: settings.logo_text } }));
        setToastMessage({
          type: 'success',
          text: 'Logo chargé depuis l’appareil !'
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    try {
      const res = await adminApi.saveParameters(settings);
      if (res && res.success) {
        setToastMessage({
          type: 'success',
          text: 'Paramètres du système enregistrés avec succès dans MySQL !'
        });
        if (res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings }));
        }
        if (settings.accent_color) {
          applyThemeColor(settings.accent_color);
        }
        try {
          localStorage.setItem('shop_logo_image', settings.logo_image || '');
          localStorage.setItem('shop_logo_text', settings.logo_text || '');
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('shop_logo_changed', { detail: { logo: settings.logo_image, text: settings.logo_text } }));
      } else {
        setToastMessage({
          type: 'error',
          text: res?.error || 'Erreur lors de l’enregistrement des paramètres.'
        });
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: 'Une erreur inattendue est survenue.'
      });
    } finally {
      setSaving(false);
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);

    try {
      const res = await adminApi.testSmtp({
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_username: settings.smtp_username
      });

      if (res && res.success) {
        setSmtpTestResult({
          success: true,
          message: res.message || 'Connexion au serveur SMTP établie avec succès !'
        });
      } else {
        setSmtpTestResult({
          success: false,
          message: res?.message || 'Échec de la connexion au serveur SMTP.'
        });
      }
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: 'Impossible de joindre le serveur SMTP. Vérifiez l’hôte et le port.'
      });
    } finally {
      setSmtpTesting(false);
    }
  };

  const colorPresets = [
    { label: 'TikTok Rouge', value: '#fe2c55' },
    { label: 'Vert Émeraude', value: '#209f84' },
    { label: 'Bleu Roi', value: '#2563eb' },
    { label: 'Violet Royal', value: '#7c3aed' },
    { label: 'Noir & Titane', value: '#111111' },
    { label: 'Orange Ambré', value: '#f97316' }
  ];

  return (
    <AdminLayout>
      {/* Toast de notification flottant ou inline */}
      {toastMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: toastMessage.type === 'success' ? '#ecfdf5' : '#fff1f2',
            border: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
            color: toastMessage.type === 'success' ? '#065f46' : '#9f1239'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i
              className={toastMessage.type === 'success' ? 'fas fa-check-circle' : 'flaticon-381-warning-1'}
              style={{ fontSize: '1.1rem' }}
            />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
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

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-wrap">
          <h1>Paramètres du Système E-Commerce</h1>
          <p className="breadcrumb-sub">
            Configuration générale de la boutique, personnalisation de l'apparence et passerelle SMTP
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary-custom"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: '0.65rem 1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            <i className="flaticon-381-save" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer Tout'}</span>
          </button>
        </div>
      </div>

      {/* Onglets de filtrage rapide (Navigation En-Page) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid #e4e4e7',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'all', label: 'Tous les Paramètres', icon: 'flaticon-381-controls-3' },
          { id: 'store', label: 'Boutique & Devise', icon: 'flaticon-381-box' },
          { id: 'appearance', label: 'Apparence & Design', icon: 'flaticon-381-layer-1' },
          { id: 'smtp', label: 'Configuration SMTP', icon: 'flaticon-381-send' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: activeTab === tab.id ? '#111111' : '#f4f4f5',
              color: activeTab === tab.id ? '#ffffff' : '#52525b',
              transition: 'all 0.15s ease'
            }}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grille Principale des Cartes de Configuration */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* CARTE 1 : BOUTIQUE & DEVISE */}
        {(activeTab === 'all' || activeTab === 'store') && (
          <div className="admin-card">
            <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <i className="flaticon-381-box" style={{ color: '#111111' }} />
                Boutique & Devise
              </h4>
              <span className="badge-custom bg-soft-primary" style={{ fontWeight: 700 }}>
                GÉNÉRAL
              </span>
            </div>

            <div className="card-body-custom" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSave}>
                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Nom de la Boutique
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    placeholder="Ex: LeerBook"
                  />
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Devise par Défaut
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={settings.currency}
                    disabled
                    style={{ backgroundColor: '#f4f4f5', color: '#71717a', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem' }}>
                    Fixée sur le Dinar Algérien (DA) pour les paiements locaux.
                  </small>
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Frais de Livraison Standard (DA)
                  </label>
                  <input
                    type="number"
                    className="form-control-custom"
                    value={settings.delivery_cost}
                    onChange={(e) => setSettings({ ...settings, delivery_cost: e.target.value })}
                    placeholder="500"
                  />
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Téléphone Support / WhatsApp
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={settings.admin_phone}
                    onChange={(e) => setSettings({ ...settings, admin_phone: e.target.value })}
                    placeholder="0550 12 34 56"
                  />
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Email de Contact Général
                  </label>
                  <input
                    type="email"
                    className="form-control-custom"
                    value={settings.admin_email}
                    onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                    placeholder="admin@tiktokshop.dz"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-custom"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <i className="flaticon-381-save" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CARTE 2 : APPARENCE & DESIGN */}
        {(activeTab === 'all' || activeTab === 'appearance') && (
          <div className="admin-card">
            <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <i className="flaticon-381-layer-1" style={{ color: '#111111' }} />
                Apparence de la Boutique
              </h4>
            </div>

            <div className="card-body-custom" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSave}>
                {/* Mode Thème (Clair / Sombre / Auto) */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.5rem', display: 'block', fontSize: '0.88rem' }}>
                    Mode du Thème
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {[
                      { id: 'light', label: 'Clair', icon: 'fas fa-sun' },
                      { id: 'dark', label: 'Sombre', icon: 'fas fa-moon' },
                      { id: 'auto', label: 'Auto (Système)', icon: 'fas fa-adjust' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, theme_mode: mode.id })}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          border: `2px solid ${settings.theme_mode === mode.id ? '#111111' : '#e4e4e7'}`,
                          backgroundColor: settings.theme_mode === mode.id ? '#f4f4f5' : '#ffffff',
                          color: '#111111',
                          fontWeight: settings.theme_mode === mode.id ? 700 : 500,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className={mode.icon} />
                        <span>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Couleur Principale / Brand Color */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span>Couleur d'Accentuation de la Marque</span>
                    <span style={{ fontSize: '0.78rem', color: '#71717a', fontFamily: 'monospace' }}>
                      {settings.accent_color}
                    </span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        title={preset.label}
                        onClick={() => handleColorChange(preset.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: preset.value,
                          border: settings.accent_color === preset.value ? '3px solid #111111' : '2px solid transparent',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                          transition: 'transform 0.1s ease',
                          transform: settings.accent_color === preset.value ? 'scale(1.15)' : 'scale(1)'
                        }}
                      />
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                      <input
                        type="color"
                        value={settings.accent_color || '#fe2c55'}
                        onChange={(e) => handleColorChange(e.target.value)}
                        style={{ width: '34px', height: '34px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Personnalisé</span>
                    </div>
                  </div>
                </div>

                {/* Logo de la Boutique (Téléverser depuis l'appareil) & Titre Header */}
                <div style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <i className="flaticon-381-photo" style={{ color: '#111111' }} />
                      Logo Officiel de la Boutique (Depuis l'appareil)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>
                      PNG transparent, SVG, JPG, WEBP (Max 5 Mo)
                    </span>
                  </label>

                  {/* Input fichier masqué */}
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    style={{ display: 'none' }}
                  />

                  {/* Aperçu du logo OU zone de glisser-déposer */}
                  {settings.logo_image ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.85rem 1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ width: '90px', height: '54px', backgroundColor: '#f4f4f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', border: '1px solid #eaeaea' }}>
                        <img src={settings.logo_image} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111111', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <i className="fas fa-check-circle" style={{ color: '#209f84' }} /> Logo Actif
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '0.15rem' }}>
                          Affiché sur l'entête mobile et toutes les pages du catalogue public
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="btn-light-custom"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <i className="fas fa-sync-alt" /> {uploadingLogo ? 'Chargement...' : 'Remplacer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettings({ ...settings, logo_image: '' });
                            try { localStorage.removeItem('shop_logo_image'); } catch (e) {}
                            window.dispatchEvent(new CustomEvent('shop_logo_changed', { detail: { logo: '', text: settings.logo_text } }));
                          }}
                          className="btn-light-custom"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <i className="fas fa-trash" /> Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDropLogo}
                      onClick={() => logoFileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #d4d4d8',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        textAlign: 'center',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: '#111111',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      >
                        {uploadingLogo ? (
                          <i className="flaticon-381-refresh" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <i className="flaticon-381-photo" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111111' }}>
                          {uploadingLogo ? 'Téléversement en cours...' : 'Ajouter un logo depuis votre appareil'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '0.15rem' }}>
                          Cliquez pour choisir un fichier image ou glissez-déposez ici (PNG, SVG, JPG)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo Texte / Titre Header */}
                  <div>
                    <label className="form-label-custom" style={{ fontWeight: 600, color: '#3f3f46', marginBottom: '0.35rem', display: 'block', fontSize: '0.84rem' }}>
                      Logo Texte / Nom de la Marque (affiché comme texte de secours)
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      value={settings.logo_text}
                      onChange={(e) => setSettings({ ...settings, logo_text: e.target.value })}
                      placeholder="Ex: LeerBook"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary-custom"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <i className="flaticon-381-save" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer l’Apparence'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CARTE 3 : CONFIGURATION SMTP */}
        {(activeTab === 'all' || activeTab === 'smtp') && (
          <div className="admin-card">
            <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <i className="flaticon-381-send" style={{ color: '#111111' }} />
                Configuration SMTP (Serveur Email)
              </h4>
              <span className={`badge-custom ${String(settings.smtp_enabled) === '1' ? 'bg-soft-success' : 'bg-soft-danger'}`} style={{ fontWeight: 700 }}>
                {String(settings.smtp_enabled) === '1' ? 'ACTIF' : 'DÉSACTIVÉ'}
              </span>
            </div>

            <div className="card-body-custom" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSave}>
                {/* Switch Activation SMTP */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111111' }}>
                      Activer le Service SMTP
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#71717a' }}>
                      Envoie automatique des confirmations de commande et notifications
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="smtp_enabled_toggle"
                    checked={String(settings.smtp_enabled) === '1'}
                    onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked ? '1' : '0' })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Hôte & Port SMTP */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group-custom">
                    <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                      Serveur Hôte SMTP *
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      value={settings.smtp_host}
                      onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                      Port SMTP *
                    </label>
                    <input
                      type="number"
                      className="form-control-custom"
                      value={settings.smtp_port}
                      onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                      placeholder="587"
                      required
                    />
                  </div>
                </div>

                {/* Protocole de Chiffrement */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block', fontSize: '0.88rem' }}>
                    Chiffrement & Sécurité
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {[
                      { id: 'tls', label: 'TLS (Port 587)', desc: 'Recommandé' },
                      { id: 'ssl', label: 'SSL (Port 465)', desc: 'Sécurisé' },
                      { id: 'none', label: 'Aucun (Port 25)', desc: 'Non chiffré' }
                    ].map((enc) => (
                      <button
                        key={enc.id}
                        type="button"
                        onClick={() => {
                          const newPort = enc.id === 'ssl' ? '465' : enc.id === 'none' ? '25' : '587';
                          setSettings({ ...settings, smtp_encryption: enc.id, smtp_port: newPort });
                        }}
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          border: `1px solid ${settings.smtp_encryption === enc.id ? '#111111' : '#e4e4e7'}`,
                          backgroundColor: settings.smtp_encryption === enc.id ? '#f4f4f5' : '#ffffff',
                          color: '#111111',
                          fontWeight: settings.smtp_encryption === enc.id ? 700 : 500,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div>{enc.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nom d'utilisateur & Mot de passe SMTP */}
                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Identifiant / Email SMTP d'Envoi
                  </label>
                  <input
                    type="text"
                    className="form-control-custom"
                    value={settings.smtp_username}
                    onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                    placeholder="contact@tiktokshop.dz"
                  />
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                    Mot de Passe SMTP / Clé d'Application
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-custom"
                      value={settings.smtp_password}
                      onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                      placeholder="••••••••••••"
                      style={{ paddingRight: '2.5rem' }}
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
                        color: '#71717a',
                        fontSize: '0.9rem'
                      }}
                    >
                      <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                    </button>
                  </div>
                  <small style={{ color: '#71717a', display: 'block', marginTop: '0.3rem', fontSize: '0.78rem' }}>
                    Pour Gmail, utilisez un "Mot de passe d'application" généré depuis votre compte Google.
                  </small>
                </div>

                {/* Expéditeur & Reply-To */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group-custom">
                    <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                      Nom d'Expéditeur ("From")
                    </label>
                    <input
                      type="text"
                      className="form-control-custom"
                      value={settings.smtp_from_name}
                      onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                      placeholder="TikTok Shop Algérie"
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom" style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.4rem', display: 'block' }}>
                      Email de Réponse ("Reply-To")
                    </label>
                    <input
                      type="email"
                      className="form-control-custom"
                      value={settings.smtp_reply_to}
                      onChange={(e) => setSettings({ ...settings, smtp_reply_to: e.target.value })}
                      placeholder="support@tiktokshop.dz"
                    />
                  </div>
                </div>

                {/* Notifications par email */}
                <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 700, color: '#27272a', marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>
                    Déclencheurs d'Emails Automatiques
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={String(settings.smtp_notify_customer) === '1'}
                        onChange={(e) => setSettings({ ...settings, smtp_notify_customer: e.target.checked ? '1' : '0' })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Envoyer un email de confirmation au client lors de sa commande</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={String(settings.smtp_notify_admin) === '1'}
                        onChange={(e) => setSettings({ ...settings, smtp_notify_admin: e.target.checked ? '1' : '0' })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Alerter l'administrateur par email lors de chaque nouvelle commande</span>
                    </label>
                  </div>
                </div>

                {/* Résultat du test SMTP */}
                {smtpTestResult && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      backgroundColor: smtpTestResult.success ? '#ecfdf5' : '#fff1f2',
                      border: `1px solid ${smtpTestResult.success ? '#a7f3d0' : '#fecdd3'}`,
                      color: smtpTestResult.success ? '#065f46' : '#9f1239',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <i className={smtpTestResult.success ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'} />
                    <span>{smtpTestResult.message}</span>
                  </div>
                )}

                {/* Boutons d'Action */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    disabled={saving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                  >
                    <i className="flaticon-381-save" />
                    <span>{saving ? 'Enregistrement...' : 'Enregistrer SMTP'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-light-custom"
                    onClick={handleTestSmtp}
                    disabled={smtpTesting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                  >
                    <i className={smtpTesting ? 'fas fa-spinner fa-spin' : 'flaticon-381-send-1'} />
                    <span>{smtpTesting ? 'Test en cours...' : 'Tester la Connexion SMTP'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>
    </AdminLayout>
  );
}
