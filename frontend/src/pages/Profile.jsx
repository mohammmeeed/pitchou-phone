import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

export const cleanAddress = (addr, wilaya = '', commune = '') => {
  if (!addr || typeof addr !== 'string') return "Non renseignée";
  let cleaned = addr.trim();

  // Détection des duplications de type "A - B - A - B"
  const parts = cleaned.split(' - ').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const half = parts.length / 2;
    const firstHalf = parts.slice(0, half).join(' - ');
    const secondHalf = parts.slice(half).join(' - ');
    if (firstHalf === secondHalf) {
      cleaned = firstHalf;
    }
  }

  // Détection si wilaya et commune sont déjà dans l'adresse
  if (wilaya && commune) {
    const pattern = `${wilaya} - ${commune}`;
    if (cleaned === `${pattern} - ${pattern}`) {
      cleaned = pattern;
    }
  }

  return cleaned || "Non renseignée";
};

const Profile = () => {
  const { userProfile, setUserProfile } = useDating();

  // Données du compte client (depuis le stockage local ou le contexte)
  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const isLoggedIn = !!(loggedUser && (loggedUser.name || loggedUser.phone));
  const customerName = isLoggedIn ? (loggedUser?.name || userProfile?.name || "Client") : "Invité";
  const customerPhone = isLoggedIn ? (loggedUser?.phone || userProfile?.phone || "Non renseigné") : "Non connecté";
  const customerEmail = isLoggedIn ? (loggedUser?.email || userProfile?.email || "Non renseigné") : "Non renseigné";
  
  const rawLocation = loggedUser?.address || userProfile?.location || (loggedUser?.wilaya && loggedUser?.commune ? `${loggedUser.wilaya} - ${loggedUser.commune}` : loggedUser?.wilaya) || "Non renseignée";
  const customerLocation = isLoggedIn ? cleanAddress(rawLocation, loggedUser?.wilaya, loggedUser?.commune) : "Non renseignée";

  // Auto-réparation de l'adresse du client en localStorage si elle était dupliquée
  useEffect(() => {
    if (loggedUser && loggedUser.address && customerLocation !== "Non renseignée" && loggedUser.address !== customerLocation) {
      const repaired = { ...loggedUser, address: customerLocation };
      try {
        localStorage.setItem('customer_user', JSON.stringify(repaired));
        setLoggedUser(repaired);
        if (setUserProfile) {
          setUserProfile(prev => prev ? { ...prev, address: customerLocation, location: customerLocation } : prev);
        }
      } catch (e) {}
    }
  }, [loggedUser, customerLocation, setUserProfile]);

  // Gestion du suivi de commande
  const [showTracking, setShowTracking] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Charger automatiquement uniquement les commandes de ce client lors de l'ouverture du suivi
  useEffect(() => {
    if (showTracking) {
      if (isLoggedIn) {
        fetchClientOrders();
      } else {
        setOrders([]);
      }
    }
  }, [showTracking, isLoggedIn, customerPhone, customerEmail, customerName]);

  const fetchClientOrders = async () => {
    setLoadingOrders(true);
    try {
      const phone = customerPhone && customerPhone !== 'Non renseigné' && customerPhone !== 'Non connecté' ? customerPhone.trim() : '';
      const email = customerEmail && customerEmail !== 'Non renseigné' && customerEmail !== 'Non connecté' ? customerEmail.trim() : '';
      const name = customerName && customerName !== 'Client' && customerName !== 'Invité' ? customerName.trim() : '';

      let queryParam = '';
      if (phone) {
        queryParam = `phone=${encodeURIComponent(phone)}`;
      } else if (email) {
        queryParam = `email=${encodeURIComponent(email)}`;
      } else if (name) {
        queryParam = `search=${encodeURIComponent(name)}`;
      }

      if (!queryParam) {
        setOrders([]);
        setLoadingOrders(false);
        return;
      }

      const res = await fetch(`/api/orders?${queryParam}`);
      if (res.ok) {
        const json = await res.json();
        const allFetched = json.data || [];

        // Filtrage strict côté client : afficher UNIQUEMENT les commandes de ce client
        const normalize = (num) => (num || '').replace(/[\s\-\.\(\)\+]/g, '').replace(/^213/, '0').replace(/^00213/, '0');
        const phoneNorm = normalize(phone);
        const emailNorm = email.toLowerCase();
        const nameNorm = name.toLowerCase();

        const clientOrders = allFetched.filter(ord => {
          const ordPhone = normalize(ord.customer_phone || '');
          const ordEmail = (ord.customer_email || '').trim().toLowerCase();
          const ordName = (ord.customer_name || '').trim().toLowerCase();

          if (phoneNorm && ordPhone) {
            if (ordPhone === phoneNorm || ordPhone.endsWith(phoneNorm) || phoneNorm.endsWith(ordPhone)) {
              return true;
            }
          }
          if (emailNorm && ordEmail) {
            if (ordEmail === emailNorm) return true;
          }
          if (nameNorm && ordName) {
            if (ordName === nameNorm) return true;
          }
          return false;
        });

        setOrders(clientOrders);
      }
    } catch (err) {
      console.warn('Erreur chargement commandes client:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmée':
        return <span className="badge badge-info">Confirmée</span>;
      case 'Expédiée':
        return <span className="badge badge-primary">Expédiée</span>;
      case 'Livrée':
        return <span className="badge badge-success">Livrée</span>;
      case 'Annulée':
        return <span className="badge badge-danger">Annulée</span>;
      default:
        return <span className="badge badge-warning">En attente</span>;
    }
  };

  return (
    <div className="page-wrapper">
      <Header 
        title="Profil" 
        showBack={true} 
        backUrl="/"
        showFilter={false}
        bgWhite={true}
        borderZero={true}
      />

      <div className="page-content space-top p-b60">
        <div className="container pt-0"> 
          <div className="profile-area">
            {/* Header Profil Moderne */}
            <div 
              className="main-profile" 
              style={{ 
                margin: '0 -15px 16px', 
                padding: '20px 18px', 
                backgroundColor: 'var(--bg-white)', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' 
              }}
            >
              <div className="d-flex align-items-center justify-content-between" style={{ width: '100%' }}>
                <h3 
                  className="name mb-0" 
                  style={{ 
                    fontSize: '22px', 
                    fontWeight: 700, 
                    color: '#111', 
                    letterSpacing: '-0.3px' 
                  }}
                >
                  {customerName}
                </h3>

                <Link 
                  to={isLoggedIn ? "/edit-profile" : "/login"} 
                  className="edit-profile dz-icon" 
                  title={isLoggedIn ? "Modifier le profil" : "Se connecter"}
                  style={{ flexShrink: 0 }}
                >
                  <i className={`flaticon ${isLoggedIn ? 'flaticon-pencil-2' : 'flaticon-user'}`}></i>
                </Link>
              </div>
            </div>

            {/* Bannière Mode Invité */}
            {!isLoggedIn && (
              <div 
                className="card style-3 mb-3 p-3 text-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(254,119,182,0.08))', 
                  border: '1px solid rgba(37,99,235,0.15)', 
                  borderRadius: '16px' 
                }}
              >
                <div className="mb-2" style={{ fontSize: '24px' }}>👤</div>
                <h5 className="font-w600 mb-1" style={{ fontSize: '15px' }}>Vous êtes en mode Invité</h5>
                <p className="text-muted font-12 mb-3">Connectez-vous ou créez un compte pour suivre vos commandes et gérer vos informations.</p>
                <Link to="/login" className="btn btn-primary btn-sm rounded-xl px-4 py-2 mx-auto" style={{ fontWeight: 600 }}>
                  Se connecter / S'inscrire
                </Link>
              </div>
            )}

            {/* Informations de Compte du Client */}
            <div className="card style-3 mb-2">
              <div className="card-header pb-1 pt-3 px-3 border-0 d-flex align-items-center justify-content-between" style={{ width: '100%' }}>
                <h6 className="title mb-0 font-14 font-w600 text-dark">Informations du Compte</h6>
                {isLoggedIn && (
                  <Link to="/edit-profile" className="text-primary font-12 font-w600 text-decoration-none d-flex align-items-center gap-1">
                    <i className="flaticon flaticon-pencil-2 font-12"></i>
                    <span>Modifier</span>
                  </Link>
                )}
              </div>
              <div 
                className="card-body pt-1 pb-3 px-3"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'stretch', 
                  width: '100%' 
                }}
              >
                <div 
                  className="d-flex align-items-center justify-content-between py-2 border-bottom border-light"
                  style={{ width: '100%' }}
                >
                  <span className="font-13 text-muted">Nom</span>
                  <span className="font-13 font-w600 text-dark text-end">{customerName}</span>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-between py-2 border-bottom border-light"
                  style={{ width: '100%' }}
                >
                  <span className="font-13 text-muted">Téléphone</span>
                  <span className="font-13 font-w600 text-dark text-end">{customerPhone}</span>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-between py-2 border-bottom border-light"
                  style={{ width: '100%' }}
                >
                  <span className="font-13 text-muted">Email</span>
                  <span className="font-13 font-w600 text-dark text-end" style={{ wordBreak: 'break-all', maxWidth: '65%' }}>
                    {customerEmail}
                  </span>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-between py-2"
                  style={{ width: '100%' }}
                >
                  <span className="font-13 text-muted">Adresse</span>
                  <span className="font-13 font-w600 text-dark text-end">{customerLocation}</span>
                </div>
              </div>
            </div>

            {/* Bouton Suivi de Commande */}
            <div className="card style-3 mb-2">
              <div className="card-body" style={{ width: '100%' }}>
                <div 
                  onClick={() => setShowTracking(true)} 
                  className="d-flex align-items-center justify-content-between text-dark text-decoration-none"
                  style={{ cursor: 'pointer', width: '100%' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <i className="icon feather icon-package text-primary font-20"></i>
                    <div>
                      <h6 className="mb-0 font-14">Suivre ma commande</h6>
                      <span className="font-12 text-muted">Suivi de livraison et statut du colis</span>
                    </div>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </div>
              </div>
            </div>

            {/* Modifier Profil */}
            <div className="card style-3 mb-2">
              <div className="card-body" style={{ width: '100%' }}>
                <Link to="/edit-profile" className="d-flex align-items-center justify-content-between text-dark text-decoration-none" style={{ width: '100%' }}>
                  <div className="d-flex align-items-center gap-3">
                    <i className="flaticon flaticon-pencil-2 text-primary font-20"></i>
                    <div>
                      <h6 className="mb-0 font-14">Modifier Profil</h6>
                      <span className="font-12 text-muted">Modifier vos informations personnelles</span>
                    </div>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </Link>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Modal / Tiroir de Suivi de Commande */}
      {showTracking && (
        <div 
          className="book-sheet-overlay" 
          onClick={() => setShowTracking(false)}
        >
          <div 
            className="book-sheet-container"
            onClick={(e) => e.stopPropagation()}
            style={{ height: '75vh', maxHeight: '80vh' }}
          >
            {/* Poignée supérieure */}
            <div className="book-sheet-drag-handle-wrap" onClick={() => setShowTracking(false)}>
              <div className="book-sheet-drag-handle"></div>
            </div>

            {/* En-tête du suivi */}
            <div className="d-flex align-items-center justify-content-between px-3 pb-2 pt-1 border-bottom">
              <div>
                <h5 className="mb-0 font-16 font-w700 text-dark">Suivi de Commande</h5>
                <span className="font-12 text-muted">Vos commandes en temps réel</span>
              </div>
              <button 
                type="button" 
                className="book-sheet-close-btn" 
                onClick={() => setShowTracking(false)}
                aria-label="Fermer"
              >
                <i className="icon feather icon-x"></i>
              </button>
            </div>

            {/* Contenu défilable */}
            <div className="p-3" style={{ overflowY: 'auto', flex: 1 }}>
              {/* État de connexion & chargement */}
              {!isLoggedIn ? (
                <div className="text-center py-4">
                  <i className="icon feather icon-user-x text-muted" style={{ fontSize: '40px', opacity: 0.4 }}></i>
                  <h6 className="mt-2 mb-1 font-14">Non connecté</h6>
                  <p className="font-12 text-muted mb-3">
                    Veuillez vous connecter pour consulter vos commandes.
                  </p>
                  <Link to="/login" className="btn btn-primary btn-sm px-4" style={{ borderRadius: '8px' }}>
                    Se connecter
                  </Link>
                </div>
              ) : loadingOrders ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="font-12 text-muted mt-2">Chargement de vos commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-4">
                  <i className="icon feather icon-package text-muted" style={{ fontSize: '40px', opacity: 0.4 }}></i>
                  <h6 className="mt-2 mb-1 font-14">Aucune commande trouvée</h6>
                  <p className="font-12 text-muted">
                    Vous n'avez pas encore passé de commande avec ce compte.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="card style-3 p-3 mb-0" style={{ border: '1px solid #f0f0f0' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="font-w700 text-dark font-14">{ord.order_number}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      
                      <div className="font-12 text-muted mb-2">
                        <div><strong>Articles :</strong> {ord.items_summary}</div>
                        <div><strong>Destination :</strong> {ord.customer_address}</div>
                        <div><strong>Date :</strong> {ord.created_at}</div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between pt-2 border-top border-light">
                        <span className="font-12 text-muted">Montant Total</span>
                        <span className="font-14 font-w800 text-primary">
                          {Number(ord.total_amount).toLocaleString('fr-FR')} DA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;
