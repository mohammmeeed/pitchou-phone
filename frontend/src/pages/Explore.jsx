import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const ALGERIA_WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
  "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt",
  "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
];

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems = [], updateQuantity, removeItem, clearCart, userProfile } = useDating();
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(() => searchParams.get('order_success') === 'true');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState('16 - Alger');

  const getLoggedInUser = () => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.phone || u.email || u.id)) {
          return u;
        }
      }
    } catch (e) {}
    return null;
  };

  const loggedInUser = getLoggedInUser();

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const loggedUser = getLoggedInUser();
    // Si l'utilisateur n'est pas connecté, enregistrer la commande en attente et rediriger vers la page login
    if (!loggedUser) {
      const summary = cartItems.map(item => `${item.quantity}x ${item.title}`).join(', ');
      localStorage.setItem('pending_order', JSON.stringify({
        wilaya: selectedWilaya,
        subtotal: subtotal,
        shipping_fee: shipping,
        total_amount: total,
        items_summary: summary
      }));
      navigate('/login?redirect=checkout');
      return;
    }

    // Si le client est connecté, enregistrer directement la commande
    setSubmittingOrder(true);
    try {
      const summary = cartItems.map(item => `${item.quantity}x ${item.title}`).join(', ');
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: loggedUser.name || userProfile?.name || 'Client',
          customer_phone: loggedUser.phone || userProfile?.phone || '',
          customer_email: loggedUser.email || userProfile?.email || '',
          customer_address: selectedWilaya,
          subtotal: subtotal,
          shipping_fee: shipping,
          total_amount: total,
          items_summary: summary,
          status: 'En attente'
        })
      });
      clearCart();
      localStorage.removeItem('pending_order');
      setOrderSuccess(true);
    } catch (err) {
      console.warn('Erreur commande:', err);
      clearCart();
      setOrderSuccess(true);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const applyPromo = (e) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'TIKTOK10') {
      setDiscountPercent(10);
      setPromoMessage('Code promo appliqué : -10%');
    } else if (promoCode.trim().toUpperCase() === 'LIVRE20') {
      setDiscountPercent(20);
      setPromoMessage('Code VIP appliqué : -20%');
    } else {
      setDiscountPercent(0);
      setPromoMessage('Code promo invalide');
    }
  };

  const freeShippingThreshold = 5000;
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 500;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discountAmount + shipping);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-wrapper cart-page-wrapper">
      <Header 
        title={`Mon Panier ${totalItemsCount > 0 ? `(${totalItemsCount})` : ''}`} 
        showBack={true} 
        backUrl="/home" 
      />

      <div className="page-content space-top p-b100">
        <div className="container">
          {orderSuccess ? (
            <div className="cart-empty-state text-center py-5">
              <div className="cart-success-icon mb-3">
                <i className="icon feather icon-check-circle text-success" style={{ fontSize: '64px' }}></i>
              </div>
              <h4 className="fw-bold mb-2">Commande confirmée !</h4>
              <p className="text-muted mb-4">
                Merci pour votre achat sur LeerBook. Vos livres sont en cours de préparation.
              </p>
              <Link to="/home" className="btn btn-primary rounded-xl px-4 py-2">
                Retour à l'accueil
              </Link>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="cart-empty-state text-center py-5">
              <div className="cart-empty-icon mb-3">
                <i className="icon feather icon-shopping-bag text-muted" style={{ fontSize: '64px', opacity: 0.4 }}></i>
              </div>
              <h5 className="fw-bold mb-2">Votre panier est vide</h5>
              <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                Parcourez nos vidéos pour découvrir et ajouter des livres coups de cœur !
              </p>
              <Link to="/home" className="btn btn-primary rounded-xl px-4 py-2">
                Explorer les livres
              </Link>
            </div>
          ) : (
            <>

              {/* Items List */}
              <div className="cart-items-list mb-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <img src={item.image} alt={item.title} className="cart-thumb" />
                    
                    <div className="cart-details">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="cart-item-title mb-0">{item.title}</h6>
                          <span className="cart-item-format">{item.format}</span>
                        </div>
                        <button 
                          type="button"
                          className="cart-trash-btn" 
                          onClick={() => removeItem(item.id)}
                          title="Supprimer"
                        >
                          <i className="icon feather icon-trash-2"></i>
                        </button>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="cart-item-price">
                          {(item.price * item.quantity).toLocaleString()} DA
                        </span>

                        <div className="cart-qty-ctrl">
                          <button 
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button 
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statut Compte Client */}
              {loggedInUser ? (
                <div 
                  className="d-flex align-items-center justify-content-between mb-3 px-3 py-2 rounded-3"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12px' }}
                >
                  <div className="d-flex align-items-center gap-2 text-success">
                    <i className="icon feather icon-user-check"></i>
                    <span>Client : <strong>{loggedInUser.name}</strong> ({loggedInUser.phone})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      localStorage.removeItem('customer_user');
                      localStorage.removeItem('customer_token');
                      navigate('/login?redirect=checkout');
                    }}
                    className="btn btn-link p-0 text-muted"
                    style={{ fontSize: '11px', textDecoration: 'none' }}
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div 
                  className="d-flex align-items-center justify-content-between mb-3 px-3 py-2 rounded-3"
                  style={{ background: 'rgba(254, 119, 182, 0.08)', border: '1px solid rgba(254, 119, 182, 0.25)', fontSize: '12px' }}
                >
                  <div className="d-flex align-items-center gap-2" style={{ color: '#ff2d75' }}>
                    <i className="icon feather icon-user"></i>
                    <span>Non connecté (connexion requise à la validation)</span>
                  </div>
                  <Link 
                    to="/login?redirect=checkout"
                    className="btn btn-sm btn-outline-primary rounded-xl px-2 py-1"
                    style={{ fontSize: '11px', fontWeight: 600 }}
                  >
                    Se connecter
                  </Link>
                </div>
              )}

              {/* Wilaya de livraison */}
              <div className="cart-summary-box mb-3" style={{ padding: '14px 16px' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div 
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--primary-light, rgba(254, 119, 182, 0.12))',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      flexShrink: 0
                    }}
                  >
                    <i className="icon feather icon-map-pin"></i>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ fontSize: '13px', color: '#1e1e24' }}>Wilaya de livraison</h6>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Choisissez votre wilaya de destination</span>
                  </div>
                </div>

                <div className="position-relative">
                  <select 
                    id="wilaya-select"
                    className="form-select"
                    value={selectedWilaya}
                    onChange={(e) => setSelectedWilaya(e.target.value)}
                    style={{ 
                      fontSize: '13px', 
                      borderRadius: '12px',
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      padding: '10px 14px',
                      fontWeight: 600,
                      color: '#1e1e24',
                      backgroundColor: '#f8f9fc',
                      cursor: 'pointer'
                    }}
                  >
                    {ALGERIA_WILAYAS.map((wilaya) => (
                      <option key={wilaya} value={wilaya}>
                        {wilaya}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              {/* Summary Box */}
              <div className="cart-summary-box mb-4">
                <h6 className="fw-bold mb-3" style={{ fontSize: '14px' }}>Récapitulatif</h6>
                
                <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: '13px' }}>
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString()} DA</span>
                </div>

                {discountPercent > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success" style={{ fontSize: '13px', fontWeight: 600 }}>
                    <span>Réduction ({discountPercent}%)</span>
                    <span>-{discountAmount.toLocaleString()} DA</span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: '13px' }}>
                  <span>Livraison ({selectedWilaya.split(' - ')[1] || selectedWilaya})</span>
                  <span>{shipping === 0 ? 'Gratuite' : `${shipping.toLocaleString()} DA`}</span>
                </div>

                <hr className="my-2" style={{ opacity: 0.1 }} />

                <div className="d-flex justify-content-between align-items-center pt-1">
                  <span className="fw-bold" style={{ fontSize: '15px' }}>Total TTC</span>
                  <span className="fw-bolder" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                    {total.toLocaleString()} DA
                  </span>
                </div>
              </div>

              {/* Sticky Checkout Bar */}
              <div className="cart-checkout-sticky">
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>Total à payer</span>
                  <span className="fw-bold" style={{ fontSize: '17px', color: '#1e1e24' }}>
                    {total.toLocaleString()} DA
                  </span>
                </div>
                <button 
                  type="button"
                  className="btn btn-primary rounded-xl px-4 py-2"
                  disabled={submittingOrder}
                  style={{ 
                    background: 'var(--btn-gradient, var(--primary-gradient))',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: 'var(--btn-shadow, 0 8px 20px var(--rgba-primary-4, rgba(255, 61, 151, 0.35)))',
                    opacity: submittingOrder ? 0.7 : 1
                  }}
                  onClick={handleCheckout}
                >
                  {submittingOrder ? 'Validation...' : 'Passer la commande'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;

