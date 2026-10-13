import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

const initialCart = [
  {
    id: 1,
    title: "The Chronicles of Autumn",
    format: "Édition Vidéo & Reliure Cuir",
    price: 2500,
    quantity: 1,
    image: "/assets/images/books/book1.jpg"
  },
  {
    id: 2,
    title: "The Art of Whispers",
    format: "Recueil Poétique & Dorures",
    price: 1850,
    quantity: 1,
    image: "/assets/images/books/book2.jpg"
  },
  {
    id: 3,
    title: "The Whispering Oak",
    format: "Roman Fantastique Broché",
    price: 2100,
    quantity: 1,
    image: "/assets/images/books/book3.jpg"
  }
];

const Explore = () => {
  const [cartItems, setCartItems] = useState(initialCart);
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  const updateQuantity = (id, delta) => {
    setCartItems(prev => 
      prev
        .map(item => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
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
                Merci pour votre achat sur TikTok Shop. Vos livres sont en cours de préparation.
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
              {/* Shipping Progress Banner */}
              <div className="cart-shipping-banner mb-3 p-3 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div 
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.15) 0%, rgba(255, 61, 151, 0.15) 100%)',
                        color: '#fe2c55',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <i className="icon feather icon-truck" style={{ fontSize: '14px', strokeWidth: 2 }}></i>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937' }}>
                      {subtotal >= freeShippingThreshold 
                        ? 'Félicitations ! Livraison gratuite offerte.' 
                        : `Ajoutez ${(freeShippingThreshold - subtotal).toLocaleString()} DA pour la livraison gratuite`}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#FE77B6', fontWeight: 700 }}>
                    {Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%
                  </span>
                </div>
                <div className="progress" style={{ height: '6px', borderRadius: '10px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ 
                      width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                      background: 'linear-gradient(90deg, #FE77B6 0%, #FF3D97 100%)' 
                    }}
                  ></div>
                </div>
              </div>

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

              {/* Promo Code Input */}
              <form onSubmit={applyPromo} className="cart-promo-box mb-3">
                <input 
                  type="text" 
                  className="form-control border-0" 
                  placeholder="Code promo (ex: TIKTOK10)" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  style={{ fontSize: '13px', background: 'transparent' }}
                />
                <button type="submit" className="btn btn-sm btn-dark rounded-xl px-3">
                  Appliquer
                </button>
              </form>
              {promoMessage && (
                <div 
                  className={`small mb-3 px-2 ${discountPercent > 0 ? 'text-success' : 'text-danger'}`}
                  style={{ fontSize: '12px', fontWeight: 600 }}
                >
                  {promoMessage}
                </div>
              )}

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
                  <span>Livraison</span>
                  <span>{shipping === 0 ? 'Gratuite' : `${shipping.toLocaleString()} DA`}</span>
                </div>

                <hr className="my-2" style={{ opacity: 0.1 }} />

                <div className="d-flex justify-content-between align-items-center pt-1">
                  <span className="fw-bold" style={{ fontSize: '15px' }}>Total TTC</span>
                  <span className="fw-bolder" style={{ fontSize: '18px', color: '#FE77B6' }}>
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
                  style={{ 
                    background: 'linear-gradient(180deg, #FE77B6 0%, #FF3D97 100%)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: '0 8px 20px rgba(255, 61, 151, 0.35)'
                  }}
                  onClick={() => setOrderSuccess(true)}
                >
                  Passer la commande
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

