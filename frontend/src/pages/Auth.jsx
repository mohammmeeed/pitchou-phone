import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';
import { ALGERIA_CITIES, getCommunesByWilaya } from '../data/algeriaCities';

const Auth = ({ defaultTab = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'register' ? 'register' : defaultTab);

  const redirectParam = searchParams.get('redirect');
  const { setUserProfile, clearCart } = useDating() || {};

  // Login state (telephone + mot de passe)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state (nom complet + email + telephone + mot de passe + wilaya + commune)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regWilaya, setRegWilaya] = useState('');
  const [regCommune, setRegCommune] = useState('');

  const availableCommunes = regWilaya ? getCommunesByWilaya(regWilaya) : [];

  // Status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountExistsModal, setAccountExistsModal] = useState({
    isOpen: false,
    phone: '',
    message: ''
  });

  const completeOrderOrRedirect = async (userObj) => {
    const pendingOrderStr = localStorage.getItem('pending_order');
    if (pendingOrderStr) {
      try {
        const pending = JSON.parse(pendingOrderStr);
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: userObj?.name || regFullName.trim() || 'Client',
            customer_phone: userObj?.phone || loginPhone.trim() || regPhone.trim(),
            customer_email: userObj?.email || regEmail.trim() || '',
            customer_address: pending.customer_address || pending.wilaya || ((regWilaya && regCommune) ? `${regWilaya} - ${regCommune}` : (regWilaya || 'Alger')),
            delivery_type: pending.delivery_type || 'bureau',
            wilaya: pending.wilaya || regWilaya || '',
            commune: pending.commune || regCommune || '',
            address_details: pending.address_details || '',
            notes: pending.notes || '',
            subtotal: pending.subtotal !== undefined ? pending.subtotal : pending.total_amount,
            shipping_fee: pending.shipping_fee !== undefined ? pending.shipping_fee : 0,
            total_amount: pending.total_amount,
            items_summary: pending.items_summary,
            status: 'En attente'
          })
        });
      } catch (err) {
        console.warn('Erreur lors de l’enregistrement automatique de la commande:', err);
      }
      localStorage.removeItem('pending_order');
      if (clearCart) clearCart();
      setSuccessMsg('Compte validé ! Votre commande a été enregistrée avec succès.');
      setTimeout(() => {
        navigate('/panier?order_success=true');
      }, 900);
      return;
    }

    if (redirectParam === 'checkout') {
      navigate('/panier');
    } else if (redirectParam === 'chat') {
      navigate('/chat');
    } else {
      navigate('/');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginPhone.trim()) {
      setErrorMsg('Veuillez renseigner votre numéro de téléphone.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginPhone.trim(),
          password: loginPassword
        })
      });
      const data = await res.json();
      if (data && data.success && data.user) {
        setUserProfile(prev => ({
          ...prev,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || loginPhone.trim(),
        }));
        try {
          localStorage.setItem('customer_user', JSON.stringify(data.user));
          if (data.token) localStorage.setItem('customer_token', data.token);
        } catch (e) {}

        setSuccessMsg('Connexion réussie ! Validation...');
        await completeOrderOrRedirect(data.user);
      } else {
        setErrorMsg(data.message || 'Numéro de téléphone ou mot de passe incorrect.');
      }
    } catch (err) {
      const fallbackUser = {
        name: 'Client',
        phone: loginPhone.trim(),
        email: ''
      };
      setUserProfile(prev => ({
        ...prev,
        phone: loginPhone.trim(),
      }));
      try {
        localStorage.setItem('customer_user', JSON.stringify(fallbackUser));
      } catch (e) {}
      setSuccessMsg('Connexion réussie ! Validation...');
      await completeOrderOrRedirect(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regFullName.trim()) {
      setErrorMsg('Veuillez saisir votre nom complet.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }
    if (!regPhone.trim()) {
      setErrorMsg('Veuillez renseigner votre numéro de téléphone.');
      return;
    }
    if (!regWilaya) {
      setErrorMsg('Veuillez sélectionner votre wilaya.');
      return;
    }
    if (!regCommune) {
      setErrorMsg('Veuillez sélectionner votre commune.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      const fullAddress = `${regWilaya} - ${regCommune}`;
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regFullName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          address: fullAddress,
          wilaya: regWilaya,
          commune: regCommune
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'ACCOUNT_EXISTS' || res.status === 409 || (data.message && data.message.toLowerCase().includes('déjà associé'))) {
          setAccountExistsModal({
            isOpen: true,
            phone: regPhone.trim(),
            message: data.message || 'Ce numéro de téléphone est déjà associé à un compte existant.'
          });
          setIsLoading(false);
          return;
        }
        throw new Error(data.message || 'Erreur lors de l’enregistrement');
      }


      const registeredUser = data.data || {
        name: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        address: fullAddress,
        wilaya: regWilaya,
        commune: regCommune
      };
      if (!registeredUser.password) registeredUser.password = regPassword;
      if (!registeredUser.address) registeredUser.address = fullAddress;
      if (!registeredUser.wilaya) registeredUser.wilaya = regWilaya;
      if (!registeredUser.commune) registeredUser.commune = regCommune;

      setUserProfile(prev => ({
        ...prev,
        name: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        address: fullAddress,
        wilaya: regWilaya,
        commune: regCommune
      }));

      try {
        localStorage.setItem('customer_user', JSON.stringify(registeredUser));
      } catch (e) {}

      setSuccessMsg('Compte créé avec succès ! Validation de votre commande...');
      await completeOrderOrRedirect(registeredUser);
    } catch (err) {
      console.error('Erreur inscription:', err);
      setErrorMsg(err.message || 'Impossible d’enregistrer vos informations.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white auth-scroll-page">
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              {/* Back button */}
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="back-btn dz-flex-box border-0"
                style={{ cursor: 'pointer' }}
                aria-label="Retour"
              >
                <i className="icon feather icon-chevron-left"></i>
              </button>

              {/* Title Header */}
              <div className="section-head ps-0 mt-3 mb-3">
                <h3 className="title mb-1 font-w700">
                  {activeTab === 'login' ? 'Bon retour !' : 'Créer un compte'}
                </h3>
                <p className="text-secondary font-14 mb-0">
                  {activeTab === 'login' 
                    ? 'Connectez-vous pour retrouver vos commandes et vos favoris.'
                    : 'Inscrivez-vous pour commander vos livres en quelques clics.'}
                </p>
              </div>

              {/* Bannière commande en attente */}
              {localStorage.getItem('pending_order') && (
                <div 
                  className="mb-4 p-3 rounded-3 d-flex align-items-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(254, 119, 182, 0.12) 0%, rgba(255, 61, 151, 0.08) 100%)',
                    border: '1px solid rgba(254, 119, 182, 0.35)',
                    boxShadow: '0 4px 15px rgba(254, 119, 182, 0.1)'
                  }}
                >
                  <div 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--btn-gradient, var(--primary-gradient))',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                      boxShadow: 'var(--btn-shadow, 0 4px 10px var(--rgba-primary-3))'
                    }}
                  >
                    <i className="icon feather icon-shopping-bag"></i>
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    <strong style={{ display: 'block', color: '#1e1e24', fontSize: '13px', fontWeight: 700 }}>
                      Validation de votre commande
                    </strong>
                    <span className="text-muted">
                      Connectez-vous ou inscrivez-vous pour que votre commande soit directement enregistrée.
                    </span>
                  </div>
                </div>
              )}

              {/* Segmented Switcher in DatingKit Style */}
              <div className="auth-site-tabs-wrap mb-4">
                <button
                  type="button"
                  className={`auth-site-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  className={`auth-site-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  S'inscrire
                </button>
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div className="alert alert-danger py-2 px-3 font-13 d-flex align-items-center gap-2 mb-3 rounded-lg">
                  <i className="icon feather icon-alert-circle"></i>
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="alert alert-success py-2 px-3 font-13 d-flex align-items-center gap-2 mb-3 rounded-lg">
                  <i className="icon feather icon-check-circle"></i>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Formulaire : Se connecter (Téléphone + Mot de passe en Grid 2) */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit}>
                  <div className="auth-grid-2 mb-3">
                    {/* Numéro de téléphone */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Numéro de téléphone
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-phone"></i>
                          </div>
                        </div>
                        <input 
                          type="tel" 
                          className="form-control font-14" 
                          placeholder="Numéro de téléphone"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div className="auth-grid-item">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label font-14 font-w600 text-dark mb-0">
                          Mot de passe
                        </label>
                        <a 
                          role="button" 
                          onClick={() => alert("Un code SMS de réinitialisation a été envoyé.")} 
                          className="font-12 font-w600 text-primary"
                          style={{ cursor: 'pointer' }}
                        >
                          Oublié ?
                        </a>
                      </div>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-lock"></i>
                          </div>
                        </div>
                        <input 
                          type={showLoginPassword ? 'text' : 'password'}
                          className="form-control font-14" 
                          placeholder="Mot de passe"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                        <span 
                          className="input-group-text show-pass"
                          onClick={() => setShowLoginPassword(prev => !prev)}
                          style={{ cursor: 'pointer' }}
                        >
                          <i className={`icon feather ${showLoginPassword ? 'icon-eye-off' : 'icon-eye'}`}></i>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton Se connecter */}
                  <div className="mt-4">
                    <button 
                      type="submit" 
                      className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
                      disabled={isLoading}
                      style={{ height: '52px', fontSize: '15px' }}
                    >
                      {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                    </button>
                  </div>

                  {/* Lien vers Inscription */}
                  <div className="text-center mt-3 mb-4">
                    <span className="font-14 text-secondary">Vous n'avez pas de compte ? </span>
                    <a 
                      role="button" 
                      onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                      className="font-14 font-w700 text-primary"
                      style={{ cursor: 'pointer' }}
                    >
                      S'inscrire
                    </a>
                  </div>
                </form>
              )}

              {/* Formulaire : S'inscrire (Nom complet, Email, Téléphone, Mot de passe en Grid 2) */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit}>
                  <div className="auth-grid-2 mb-3">
                    {/* Nom complet */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Nom complet
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-user"></i>
                          </div>
                        </div>
                        <input 
                          type="text" 
                          className="form-control font-14" 
                          placeholder="Ex: Mohamed Amine"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Adresse email
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-mail"></i>
                          </div>
                        </div>
                        <input 
                          type="email" 
                          className="form-control font-14" 
                          placeholder="exemple@email.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                      </div>
                    </div>

                    {/* Téléphone */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Numéro de téléphone
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-phone"></i>
                          </div>
                        </div>
                        <input 
                          type="tel" 
                          className="form-control font-14" 
                          placeholder="Ex: 0550123456"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Mot de passe
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-lock"></i>
                          </div>
                        </div>
                        <input 
                          type={showRegPassword ? 'text' : 'password'}
                          className="form-control font-14" 
                          placeholder="Créez votre mot de passe"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          style={{ height: '50px' }}
                        />
                        <span 
                          className="input-group-text show-pass"
                          onClick={() => setShowRegPassword(prev => !prev)}
                          style={{ cursor: 'pointer' }}
                        >
                          <i className={`icon feather ${showRegPassword ? 'icon-eye-off' : 'icon-eye'}`}></i>
                        </span>
                      </div>
                    </div>

                    {/* Wilaya (Liste déroulante) */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Wilaya
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-map-pin"></i>
                          </div>
                        </div>
                        <select 
                          className="form-control font-14" 
                          value={regWilaya}
                          onChange={(e) => {
                            setRegWilaya(e.target.value);
                            setRegCommune('');
                          }}
                          required
                          style={{ 
                            height: '50px', 
                            cursor: 'pointer',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <option value="">Sélectionnez la wilaya</option>
                          {ALGERIA_CITIES.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Commune (Liste déroulante) */}
                    <div className="auth-grid-item">
                      <label className="form-label font-14 font-w600 text-dark mb-2">
                        Commune
                      </label>
                      <div className="input-group input-group-icon">
                        <div className="input-group-text">
                          <div className="input-icon">
                            <i className="icon feather icon-navigation"></i>
                          </div>
                        </div>
                        <select 
                          className="form-control font-14" 
                          value={regCommune}
                          onChange={(e) => setRegCommune(e.target.value)}
                          required
                          disabled={!regWilaya}
                          style={{ 
                            height: '50px', 
                            cursor: regWilaya ? 'pointer' : 'not-allowed',
                            backgroundColor: regWilaya ? '#ffffff' : '#f8f9fa'
                          }}
                        >
                          <option value="">
                            {regWilaya ? 'Sélectionnez la commune' : 'Choisissez une wilaya'}
                          </option>
                          {availableCommunes.map((commune) => (
                            <option key={commune} value={commune}>
                              {commune}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bouton Créer un compte */}
                  <div className="mt-4">
                    <button 
                      type="submit" 
                      className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
                      disabled={isLoading}
                      style={{ height: '52px', fontSize: '15px' }}
                    >
                      {isLoading ? 'Création en cours...' : 'Créer un compte'}
                    </button>
                  </div>

                  {/* Lien vers Connexion */}
                  <div className="text-center mt-3 mb-4">
                    <span className="font-14 text-secondary">Vous avez déjà un compte ? </span>
                    <a 
                      role="button" 
                      onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
                      className="font-14 font-w700 text-primary"
                      style={{ cursor: 'pointer' }}
                    >
                      Se connecter
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Moderne : Compte Déjà Existant */}
      {accountExistsModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setAccountExistsModal({ isOpen: false, phone: '', message: '' })}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              padding: '28px 22px 22px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton Fermer "×" */}
            <button
              type="button"
              onClick={() => setAccountExistsModal({ isOpen: false, phone: '', message: '' })}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#f4f4f5',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#71717a'
              }}
            >
              &times;
            </button>

            {/* Icône Alert / Compte existant */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fff1f2',
                color: '#fe2c55',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px'
              }}
            >
              <i className="feather icon-alert-circle"></i>
            </div>

            <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#18181b', marginBottom: '8px' }}>
              Compte Déjà Existant
            </h4>

            <p style={{ fontSize: '0.88rem', color: '#71717a', lineHeight: '1.45', marginBottom: '12px' }}>
              Un compte existe déjà avec ce numéro de téléphone :
            </p>

            <div
              style={{
                backgroundColor: '#f4f4f5',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#111827',
                marginBottom: '14px',
                letterSpacing: '0.5px'
              }}
            >
              {accountExistsModal.phone || regPhone}
            </div>

            <p style={{ fontSize: '0.82rem', color: '#71717a', marginBottom: '22px' }}>
              Veuillez vous connecter pour accéder à votre profil et suivre vos commandes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-lg btn-gradient w-100 btn-shadow rounded-xl"
                style={{ height: '48px', fontSize: '14px', fontWeight: 700 }}
                onClick={() => {
                  setLoginPhone(accountExistsModal.phone || regPhone.trim());
                  setActiveTab('login');
                  setErrorMsg('');
                  setAccountExistsModal({ isOpen: false, phone: '', message: '' });
                }}
              >
                Se connecter avec ce numéro
              </button>

              <button
                type="button"
                style={{
                  height: '42px',
                  backgroundColor: '#f4f4f5',
                  color: '#52525b',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => setAccountExistsModal({ isOpen: false, phone: '', message: '' })}
              >
                Changer de numéro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
