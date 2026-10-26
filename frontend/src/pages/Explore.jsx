import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';
import { getCommunesByWilaya } from '../data/algeriaCities';

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems = [], updateQuantity, removeItem, clearCart, userProfile } = useDating();
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(() => searchParams.get('order_success') === 'true');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Helper pour matcher la wilaya du client connecté avec la liste
  const matchCustomerWilaya = (rawTarget, list) => {
    if (!rawTarget || !Array.isArray(list) || list.length === 0) return null;
    const clean = String(rawTarget).toLowerCase().trim();

    const exact = list.find((w) => {
      const name = typeof w === 'object' ? w.name : w;
      return name.toLowerCase() === clean;
    });
    if (exact) return typeof exact === 'object' ? exact.name : exact;

    const partial = list.find((w) => {
      const name = typeof w === 'object' ? w.name : w;
      const wilayaOnly = name.split(' - ')[1] || name;
      return (
        clean.includes(name.toLowerCase()) ||
        clean.includes(wilayaOnly.toLowerCase()) ||
        name.toLowerCase().includes(clean)
      );
    });
    if (partial) return typeof partial === 'object' ? partial.name : partial;

    return null;
  };

  const [deliveryType, setDeliveryType] = useState('bureau'); // 'bureau' | 'domicile'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedCommune, setSelectedCommune] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.commune) return u.commune;
      }
    } catch (e) {}
    return '';
  });

  const [wilayasList, setWilayasList] = useState(() => {
    try {
      const saved = localStorage.getItem('tiktok_shop_wilayas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [selectedWilaya, setSelectedWilaya] = useState(() => {
    try {
      const savedUser = localStorage.getItem('customer_user');
      const savedWilayas = localStorage.getItem('tiktok_shop_wilayas');
      const list = savedWilayas ? JSON.parse(savedWilayas) : [];
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const target = u?.wilaya || u?.address || '';
        const matched = matchCustomerWilaya(target, list);
        if (matched) return matched;
      }
      if (Array.isArray(list) && list.length > 0) {
        return typeof list[0] === 'object' ? list[0].name : list[0];
      }
    } catch (e) {}
    return '';
  });

  const availableCommunes = selectedWilaya ? getCommunesByWilaya(selectedWilaya) : [];

  useEffect(() => {
    fetch('/api/attributes')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.wilayas)) {
          setWilayasList(data.wilayas);
          try {
            localStorage.setItem('tiktok_shop_wilayas', JSON.stringify(data.wilayas));
          } catch (e) {}

          const logged = getLoggedInUser();
          const clientTarget = logged?.wilaya || logged?.address || '';
          const matched = matchCustomerWilaya(clientTarget, data.wilayas);

          if (matched) {
            setSelectedWilaya(matched);
          } else if (data.wilayas.length > 0) {
            setSelectedWilaya((prev) => prev || (data.wilayas[0].name || ''));
          }

          if (logged?.commune) {
            setSelectedCommune((prev) => prev || logged.commune);
          }
        }
      })
      .catch(() => {});
  }, []);

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
    const fullAddress = deliveryType === 'bureau'
      ? `Bureau (Stopdesk) : ${selectedWilaya}`
      : `Domicile : ${selectedWilaya}${selectedCommune ? ` - ${selectedCommune}` : ''}${deliveryAddress.trim() ? ` (${deliveryAddress.trim()})` : ''}`;

    const deliveryNotes = deliveryType === 'bureau'
      ? `Mode: En Bureau (Stopdesk) | Wilaya: ${selectedWilaya}`
      : `Mode: À Domicile | Wilaya: ${selectedWilaya} | Commune: ${selectedCommune || 'Non précisée'} | Adresse: ${deliveryAddress.trim() || 'Non précisée'}`;

    // Si l'utilisateur n'est pas connecté, enregistrer la commande en attente et rediriger vers la page login
    if (!loggedUser) {
      const summary = cartItems.map(item => `${item.quantity}x ${item.title}`).join(', ');
      localStorage.setItem('pending_order', JSON.stringify({
        customer_address: fullAddress,
        delivery_type: deliveryType,
        wilaya: selectedWilaya,
        commune: selectedCommune,
        address_details: deliveryAddress.trim(),
        notes: deliveryNotes,
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
          customer_address: fullAddress,
          delivery_type: deliveryType,
          wilaya: selectedWilaya,
          commune: selectedCommune,
          address_details: deliveryAddress.trim(),
          notes: deliveryNotes,
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
  const currentWilayaObj = wilayasList.find((w) => (typeof w === 'object' ? w.name : w) === selectedWilaya);
  const wilayaFee = (() => {
    if (!currentWilayaObj || typeof currentWilayaObj !== 'object') return 500;
    if (deliveryType === 'bureau') {
      return currentWilayaObj.price_bureau !== undefined
        ? Number(currentWilayaObj.price_bureau)
        : Math.max(250, Number(currentWilayaObj.price || 500) - 200);
    }
    return currentWilayaObj.price_domicile !== undefined
      ? Number(currentWilayaObj.price_domicile)
      : Number(currentWilayaObj.price || 500);
  })();
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : wilayaFee;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discountAmount + shipping);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-wrapper cart-page-wrapper">
      <Header 
        title={`Mon Panier ${totalItemsCount > 0 ? `(${totalItemsCount})` : ''}`} 
        showBack={true} 
        backUrl="/" 
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
              <Link to="/" className="btn btn-primary rounded-xl px-4 py-2">
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
              <Link to="/" className="btn btn-primary rounded-xl px-4 py-2">
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

              {/* Mode & Wilaya de livraison */}
              <div className="cart-summary-box mb-3" style={{ padding: '15px 16px' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
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
                    <h6 className="mb-0 fw-bold" style={{ fontSize: '13px', color: '#1e1e24' }}>Mode & Wilaya de livraison</h6>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Choisissez votre type et lieu de livraison</span>
                  </div>
                </div>

                {/* Sélecteur de type de livraison : Bureau ou Domicile */}
                <div className="d-flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('bureau')}
                    className="btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 px-3"
                    style={{
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: deliveryType === 'bureau' ? '1.5px solid var(--primary)' : '1px solid rgba(0,0,0,0.08)',
                      backgroundColor: deliveryType === 'bureau' ? 'rgba(254, 119, 182, 0.12)' : '#f8f9fc',
                      color: deliveryType === 'bureau' ? 'var(--primary)' : '#4b5563'
                    }}
                  >
                    <i className="icon feather icon-briefcase" style={{ fontSize: '14px' }}></i>
                    <span>Au Bureau</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('domicile')}
                    className="btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 px-3"
                    style={{
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: deliveryType === 'domicile' ? '1.5px solid var(--primary)' : '1px solid rgba(0,0,0,0.08)',
                      backgroundColor: deliveryType === 'domicile' ? 'rgba(254, 119, 182, 0.12)' : '#f8f9fc',
                      color: deliveryType === 'domicile' ? 'var(--primary)' : '#4b5563'
                    }}
                  >
                    <i className="icon feather icon-home" style={{ fontSize: '14px' }}></i>
                    <span>À Domicile</span>
                  </button>
                </div>

                {/* Wilaya de destination */}
                <div className="mb-2">
                  <label htmlFor="wilaya-select" className="form-label text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>
                    {deliveryType === 'bureau' ? 'Wilaya (Retrait au bureau)' : 'Wilaya de livraison'}
                  </label>
                  <select 
                    id="wilaya-select"
                    className="form-select"
                    value={selectedWilaya}
                    onChange={(e) => {
                      const newW = e.target.value;
                      setSelectedWilaya(newW);
                      const comms = getCommunesByWilaya(newW);
                      if (comms.length > 0 && !comms.includes(selectedCommune)) {
                        setSelectedCommune(comms[0]);
                      }
                    }}
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
                    {wilayasList.length === 0 ? (
                      <option value="">Aucune wilaya configurée</option>
                    ) : (
                      wilayasList.map((w) => {
                        const name = typeof w === 'object' ? w.name : w;
                        const bPrice = typeof w === 'object' && w.price_bureau !== undefined
                          ? w.price_bureau
                          : (typeof w === 'object' && w.price ? Math.max(250, w.price - 200) : 350);
                        const dPrice = typeof w === 'object' && w.price_domicile !== undefined
                          ? w.price_domicile
                          : (typeof w === 'object' && w.price !== undefined ? w.price : 500);
                        const displayPrice = deliveryType === 'bureau' ? bPrice : dPrice;
                        return (
                          <option key={name} value={name}>
                            {name} ({deliveryType === 'bureau' ? 'Bureau' : 'Domicile'}: {displayPrice} DA)
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* Si Bureau : affichage de la Wilaya seulement + note informative */}
                {deliveryType === 'bureau' ? (
                  <div 
                    className="d-flex align-items-center gap-2 mt-2 px-3 py-2 rounded-3"
                    style={{ background: '#f8f9fc', border: '1px dashed rgba(0,0,0,0.1)', fontSize: '11.5px', color: '#6b7280' }}
                  >
                    <i className="icon feather icon-info text-primary" style={{ fontSize: '13px' }}></i>
                    <span>Votre colis sera livré au bureau / agence de transport de votre wilaya.</span>
                  </div>
                ) : (
                  /* Si Domicile : affichage de la Wilaya + Commune + Champ Adresse */
                  <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    {/* Commune */}
                    <div className="mb-2">
                      <label htmlFor="commune-select" className="form-label text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Commune
                      </label>
                      <select
                        id="commune-select"
                        className="form-select"
                        value={selectedCommune}
                        onChange={(e) => setSelectedCommune(e.target.value)}
                        style={{
                          fontSize: '13px',
                          borderRadius: '12px',
                          borderColor: 'rgba(0, 0, 0, 0.08)',
                          padding: '10px 14px',
                          fontWeight: 500,
                          color: '#1e1e24',
                          backgroundColor: '#f8f9fc',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Sélectionnez votre commune</option>
                        {availableCommunes.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Champ Adresse */}
                    <div>
                      <label htmlFor="address-input" className="form-label text-muted mb-1" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Adresse exacte de votre domicile
                      </label>
                      <input
                        id="address-input"
                        type="text"
                        className="form-control"
                        placeholder="N° rue, quartier, bâtiment, appartement..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        style={{
                          fontSize: '13px',
                          borderRadius: '12px',
                          borderColor: 'rgba(0, 0, 0, 0.08)',
                          padding: '10px 14px',
                          backgroundColor: '#f8f9fc',
                          color: '#1e1e24'
                        }}
                      />
                    </div>
                  </div>
                )}
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
                  <span>Livraison ({deliveryType === 'bureau' ? 'Bureau' : 'Domicile'} - {selectedWilaya.split(' - ')[1] || selectedWilaya})</span>
                  <span>{shipping === 0 ? 'Gratuite' : `${shipping.toLocaleString()} DA`}</span>
                </div>

                <hr className="my-2" style={{ opacity: 0.1 }} />

                <div className="d-flex justify-content-between align-items-center pt-1">
                  <span className="fw-bold" style={{ fontSize: '15px' }}>Total</span>
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

