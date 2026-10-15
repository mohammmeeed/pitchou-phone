import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const Profile = () => {
  const { userProfile } = useDating();

  // Données du compte client (depuis le stockage local ou le contexte)
  const [loggedUser] = useState(() => {
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
  const customerLocation = isLoggedIn ? (loggedUser?.address || userProfile?.location || "Non renseignée") : "Non renseignée";

  // Gestion du suivi de commande
  const [showTracking, setShowTracking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Charger les commandes lors de l'ouverture du suivi
  useEffect(() => {
    if (showTracking && customerPhone && customerPhone !== 'Non connecté') {
      fetchOrders(customerPhone);
    }
  }, [showTracking, customerPhone]);

  const fetchOrders = async (query) => {
    setLoadingOrders(true);
    try {
      const q = query ? encodeURIComponent(query.trim()) : (customerPhone && customerPhone !== 'Non connecté' ? encodeURIComponent(customerPhone) : '');
      const res = await fetch(`http://localhost:8000/api/orders?search=${q}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || []);
      }
    } catch (err) {
      console.warn('Erreur chargement commandes:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchOrders(searchQuery.trim());
    } else if (customerPhone && customerPhone !== 'Non connecté') {
      fetchOrders(customerPhone);
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
        title="Profile" 
        showBack={true} 
        backUrl="/home"
        showFilter={true}
        filterUrl="/filter"
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

            {/* Edit Profile */}
            <div className="card style-3 mb-2">
              <div className="card-body" style={{ width: '100%' }}>
                <Link to="/edit-profile" className="d-flex align-items-center justify-content-between text-dark text-decoration-none" style={{ width: '100%' }}>
                  <div className="d-flex align-items-center gap-3">
                    <i className="flaticon flaticon-pencil-2 text-primary font-20"></i>
                    <div>
                      <h6 className="mb-0 font-14">Edit Profile</h6>
                      <span className="font-12 text-muted">Update bio, pictures and interests</span>
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
              {/* Formulaire de recherche de commande */}
              <form onSubmit={handleSearchSubmit} className="mb-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="N° de commande (#CMD-...) ou tél"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ fontSize: '13px', borderRadius: '10px 0 0 10px' }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ borderRadius: '0 10px 10px 0', fontSize: '13px', fontWeight: 600 }}
                  >
                    Chercher
                  </button>
                </div>
              </form>

              {/* État de chargement */}
              {loadingOrders ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="font-12 text-muted mt-2">Recherche de vos commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-4">
                  <i className="icon feather icon-package text-muted" style={{ fontSize: '40px', opacity: 0.4 }}></i>
                  <h6 className="mt-2 mb-1 font-14">Aucune commande trouvée</h6>
                  <p className="font-12 text-muted">
                    Vérifiez le numéro de commande ou passez votre premier achat !
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
