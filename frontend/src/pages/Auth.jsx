import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const countryCodes = [
  { code: '+213', flag: '🇩🇿' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+212', flag: '🇲🇦' },
  { code: '+216', flag: '🇹🇳' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+971', flag: '🇦🇪' },
];

const Auth = ({ defaultTab = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'register' ? 'register' : defaultTab);

  const { setUserProfile } = useDating();

  // Login state (telephone + mot de passe)
  const [loginCountryCode, setLoginCountryCode] = useState('+213');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state (nom complet + email + telephone facultatif + mot de passe)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+213');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e) => {
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
    setTimeout(() => {
      setUserProfile(prev => ({
        ...prev,
        phone: `${loginCountryCode} ${loginPhone}`,
      }));
      setSuccessMsg('Connexion réussie ! Redirection...');
      setTimeout(() => {
        navigate('/home');
      }, 600);
    }, 500);
  };

  const handleRegisterSubmit = (e) => {
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
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setUserProfile(prev => ({
        ...prev,
        name: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() ? `${regCountryCode} ${regPhone}` : prev.phone,
      }));
      setSuccessMsg('Compte créé avec succès ! Bienvenue.');
      setTimeout(() => {
        navigate('/home');
      }, 600);
    }, 500);
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
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

              {/* Formulaire : Se connecter (Téléphone + Mot de passe) */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit}>
                  {/* Numéro de téléphone */}
                  <div className="mb-3">
                    <label className="form-label font-14 font-w600 text-dark mb-2">
                      Numéro de téléphone
                    </label>
                    <div className="input-group dz-select">
                      <div className="input-group-text p-0"> 
                        <select 
                          className="form-control border-0 bg-transparent ps-3 pe-2 font-14 font-w600 text-dark"
                          value={loginCountryCode}
                          onChange={(e) => setLoginCountryCode(e.target.value)}
                          style={{ width: '90px', cursor: 'pointer', height: '50px' }}
                        >
                          {countryCodes.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
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
                  <div className="mb-3">
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
                        Mot de passe oublié ?
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
                        placeholder="Entrez votre mot de passe"
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

              {/* Formulaire : S'inscrire (Nom complet + Email + Téléphone pas obligatoire + Mot de passe) */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit}>
                  {/* Nom complet */}
                  <div className="mb-3">
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
                  <div className="mb-3">
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

                  {/* Téléphone (facultatif / pas obligatoire) */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label font-14 font-w600 text-dark mb-0">
                        Numéro de téléphone
                      </label>
                      <span className="badge bg-light text-secondary font-11 px-2 py-1 rounded-pill">
                        Facultatif
                      </span>
                    </div>
                    <div className="input-group dz-select">
                      <div className="input-group-text p-0"> 
                        <select 
                          className="form-control border-0 bg-transparent ps-3 pe-2 font-14 font-w600 text-dark"
                          value={regCountryCode}
                          onChange={(e) => setRegCountryCode(e.target.value)}
                          style={{ width: '90px', cursor: 'pointer', height: '50px' }}
                        >
                          {countryCodes.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input 
                        type="tel" 
                        className="form-control font-14" 
                        placeholder="Numéro (pas obligatoire)"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        style={{ height: '50px' }}
                      />
                    </div>
                  </div>

                  {/* Mot de passe */}
                  <div className="mb-3">
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
    </div>
  );
};

export default Auth;
