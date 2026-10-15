// frontend/src/admin/pages/AdminLogin.jsx
// Page de Connexion Administrateur TikTok Shop & Mediqu

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import '../admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@tiktokshop.dz');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Si déjà connecté, rediriger vers le tableau de bord
    if (adminApi.isAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir votre identifiant et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login(email.trim(), password.trim());
      if (res.success) {
        navigate('/admin');
      } else {
        setError(res.message || 'Identifiants invalides. Veuillez réessayer.');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setEmail('admin@tiktokshop.dz');
    setPassword('admin123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header de la carte */}
        <div
          style={{
            padding: '2.5rem 2rem 1.75rem',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f2',
            background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: '#111111',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
              fontSize: '1.5rem'
            }}
          >
            <i className="flaticon-381-padlock-1" />
          </div>

          <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.45rem', fontWeight: 800, color: '#111111' }}>
            Espace Administration
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#71717a' }}>
            Connectez-vous pour gérer votre boutique LeerBook
          </p>
        </div>

        {/* Formulaire de connexion */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="flaticon-381-warning-1" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#27272a',
                  marginBottom: '0.45rem'
                }}
              >
                Identifiant ou Email Admin
              </label>
              <div style={{ position: 'relative' }}>
                <i
                  className="flaticon-381-user-7"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#a1a1aa',
                    fontSize: '0.95rem'
                  }}
                />
                <input
                  type="text"
                  className="form-control-custom"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="admin@tiktokshop.dz ou nom"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#27272a',
                  marginBottom: '0.45rem'
                }}
              >
                Mot de Passe
              </label>
              <div style={{ position: 'relative' }}>
                <i
                  className="flaticon-381-lock"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#a1a1aa',
                    fontSize: '0.95rem'
                  }}
                />
                <input
                  type="password"
                  className="form-control-custom"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-custom"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                justifyContent: 'center',
                fontSize: '0.95rem',
                borderRadius: '8px',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="flaticon-381-enter" />
              <span>{loading ? 'Connexion en cours...' : 'Se Connecter'}</span>
            </button>
          </form>

          {/* Raccourci Connexion Rapide */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f4f4f5',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#71717a', marginBottom: '0.5rem' }}>
              Accès démo prédéfini :
            </div>
            <button
              type="button"
              onClick={handleQuickLogin}
              style={{
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                color: '#18181b',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Remplir (admin@tiktokshop.dz / admin123)
            </button>
          </div>
        </div>

        {/* Footer retour à la boutique */}
        <div
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#fafafa',
            borderTop: '1px solid #f0f0f2',
            textAlign: 'center'
          }}
        >
          <Link
            to="/home"
            style={{
              color: '#71717a',
              textDecoration: 'none',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '0.75rem' }} />
            Retour à la boutique LeerBook
          </Link>
        </div>
      </div>
    </div>
  );
}
