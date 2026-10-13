import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const countryCodes = [
  { code: '+213', flag: '🇩🇿', label: 'Algérie (+213)' },
  { code: '+33', flag: '🇫🇷', label: 'France (+33)' },
  { code: '+212', flag: '🇲🇦', label: 'Maroc (+212)' },
  { code: '+216', flag: '🇹🇳', label: 'Tunisie (+216)' },
  { code: '+1', flag: '🇨🇦', label: 'Canada / USA (+1)' },
  { code: '+44', flag: '🇬🇧', label: 'Royaume-Uni (+44)' },
  { code: '+971', flag: '🇦🇪', label: 'Émirats (+971)' },
];

const Auth = ({ defaultTab = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'register' ? 'register' : defaultTab);

  const { setUserProfile } = useDating();

  // Login form state (numéro de téléphone + mot de passe)
  const [loginCountryCode, setLoginCountryCode] = useState('+213');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state (nom complet + email + mot de passe + téléphone facultatif)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+213');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginPhone.trim()) {
      setErrorMsg('Veuillez saisir votre numéro de téléphone.');
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
      setSuccessMsg('Connexion réussie ! Redirection en cours...');
      setTimeout(() => {
        navigate('/home');
      }, 700);
    }, 600);
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
      }, 700);
    }, 600);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Top Navigation */}
        <div className="auth-top-bar">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="auth-back-btn"
            aria-label="Retour"
          >
            <i className="icon feather icon-chevron-left"></i>
          </button>
          <div className="auth-brand-badge">
            <span className="auth-heart-icon">💖</span>
            <span className="auth-brand-name">TikTok Shop</span>
          </div>
          <div style={{ width: 40 }}></div>
        </div>

        {/* Head Title */}
        <div className="auth-header-section">
          <h2 className="auth-main-title">
            {activeTab === 'login' ? 'Bon retour !' : 'Créer un compte'}
          </h2>
          <p className="auth-sub-title">
            {activeTab === 'login' 
              ? 'Connectez-vous pour retrouver vos coups de cœur et vos commandes.'
              : 'Rejoignez-nous pour découvrir nos livres et offres exclusives.'}
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="auth-tabs-switcher">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
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
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            S'inscrire
          </button>
        </div>

        {/* Feedback Alert Messages */}
        {errorMsg && (
          <div className="auth-alert-box error">
            <i className="icon feather icon-alert-circle"></i>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert-box success">
            <i className="icon feather icon-check-circle"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1 : SE CONNECTER (Numéro de téléphone + Mot de passe) */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form-body">
            {/* Phone Number Field */}
            <div className="auth-field-group">
              <label className="auth-field-label">Numéro de téléphone</label>
              <div className="auth-input-phone-wrap">
                <select 
                  className="auth-country-select"
                  value={loginCountryCode}
                  onChange={(e) => setLoginCountryCode(e.target.value)}
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="auth-input-with-icon">
                  <i className="icon feather icon-phone auth-input-icon"></i>
                  <input 
                    type="tel"
                    className="auth-text-input"
                    placeholder="05 50 12 34 56"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <div className="auth-label-row">
                <label className="auth-field-label">Mot de passe</label>
                <button 
                  type="button" 
                  className="auth-forgot-link"
                  onClick={() => alert("Lien de réinitialisation par SMS envoyé.")}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="auth-input-with-icon">
                <i className="icon feather icon-lock auth-input-icon"></i>
                <input 
                  type={showLoginPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="Entrez votre mot de passe"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-password-btn"
                  onClick={() => setShowLoginPassword(prev => !prev)}
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  <i className={`icon feather ${showLoginPassword ? 'icon-eye-off' : 'icon-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="auth-submit-btn" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-loading-spinner"></span>
              ) : (
                <>
                  <span>Se connecter</span>
                  <i className="icon feather icon-arrow-right"></i>
                </>
              )}
            </button>

            {/* Bottom Toggle Note */}
            <div className="auth-footer-prompt">
              <span>Vous n'avez pas de compte ? </span>
              <button 
                type="button" 
                className="auth-switch-link"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                }}
              >
                S'inscrire
              </button>
            </div>
          </form>
        )}

        {/* TAB 2 : S'INSCRIRE (Nom complet + Email + Mot de passe + Téléphone facultatif) */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form-body">
            {/* Nom complet */}
            <div className="auth-field-group">
              <label className="auth-field-label">Nom complet</label>
              <div className="auth-input-with-icon">
                <i className="icon feather icon-user auth-input-icon"></i>
                <input 
                  type="text"
                  className="auth-text-input"
                  placeholder="Ex: Mohamed Amine"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-field-group">
              <label className="auth-field-label">Adresse email</label>
              <div className="auth-input-with-icon">
                <i className="icon feather icon-mail auth-input-icon"></i>
                <input 
                  type="email"
                  className="auth-text-input"
                  placeholder="exemple@domaine.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Téléphone (Facultatif / Pas obligé) */}
            <div className="auth-field-group">
              <div className="auth-label-row">
                <label className="auth-field-label">Numéro de téléphone</label>
                <span className="auth-optional-badge">Optionnel</span>
              </div>
              <div className="auth-input-phone-wrap">
                <select 
                  className="auth-country-select"
                  value={regCountryCode}
                  onChange={(e) => setRegCountryCode(e.target.value)}
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="auth-input-with-icon">
                  <i className="icon feather icon-phone auth-input-icon"></i>
                  <input 
                    type="tel"
                    className="auth-text-input"
                    placeholder="Numéro (facultatif)"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="auth-field-group">
              <label className="auth-field-label">Mot de passe</label>
              <div className="auth-input-with-icon">
                <i className="icon feather icon-lock auth-input-icon"></i>
                <input 
                  type={showRegPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="Choisissez un mot de passe sécurisé"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-password-btn"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  <i className={`icon feather ${showRegPassword ? 'icon-eye-off' : 'icon-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="auth-submit-btn" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-loading-spinner"></span>
              ) : (
                <>
                  <span>Créer mon compte</span>
                  <i className="icon feather icon-arrow-right"></i>
                </>
              )}
            </button>

            {/* Bottom Toggle Note */}
            <div className="auth-footer-prompt">
              <span>Vous avez déjà un compte ? </span>
              <button 
                type="button" 
                className="auth-switch-link"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                }}
              >
                Se connecter
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
