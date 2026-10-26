import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

const STATUS_OPTIONS = ['Tous', 'En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');
  const initialStatus = urlStatus && STATUS_OPTIONS.includes(urlStatus) ? urlStatus : 'Tous';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Logo et informations de la boutique (sélectionnés dans le panneau d'administration)
  const [shopLogo, setShopLogo] = useState(() => localStorage.getItem('shop_logo_image') || '');
  const [storeInfo, setStoreInfo] = useState({
    name: localStorage.getItem('shop_logo_text') || 'LeerBook',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const handleLogoChange = (e) => {
      if (e?.detail?.logo !== undefined) setShopLogo(e.detail.logo);
      if (e?.detail?.text !== undefined) setStoreInfo((prev) => ({ ...prev, name: e.detail.text }));
    };
    window.addEventListener('shop_logo_changed', handleLogoChange);

    fetch('/api/parameters')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          const s = data.settings;
          if (s.logo_image !== undefined) {
            setShopLogo(s.logo_image);
            localStorage.setItem('shop_logo_image', s.logo_image || '');
          }
          if (s.logo_text || s.store_name) {
            const name = s.store_name || s.logo_text || 'LeerBook';
            setStoreInfo((prev) => ({
              ...prev,
              name,
              phone: s.admin_phone || prev.phone,
              email: s.admin_email || prev.email
            }));
            localStorage.setItem('shop_logo_text', name);
          }
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('shop_logo_changed', handleLogoChange);
  }, []);

  // Synchroniser quand les query params changent (ex: clic depuis le Dashboard)
  useEffect(() => {
    const currentUrlStatus = searchParams.get('status');
    if (currentUrlStatus && STATUS_OPTIONS.includes(currentUrlStatus)) {
      setSelectedStatus(currentUrlStatus);
    } else if (!currentUrlStatus) {
      setSelectedStatus('Tous');
    }
  }, [searchParams]);

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const handleSelectStatus = (status) => {
    setSelectedStatus(status);
    const nextParams = new URLSearchParams(searchParams);
    if (status === 'Tous') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', status);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus === 'Tous' ? '' : selectedStatus;
      const data = await adminApi.getOrders(statusParam);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      if (newStatus === 'Livrée') {
        showToast(`Statut mis à jour : Livrée (ajoutée automatiquement au Journal de Caisse)`);
      } else {
        showToast(`Statut mis à jour : ${newStatus}`);
      }
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la mise à jour du statut.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      return;
    }
    try {
      const res = await adminApi.deleteOrder(orderId);
      if (res && res.success) {
        showToast('Commande supprimée avec succès.');
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
        await loadOrders();
      } else {
        showToast(res?.message || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression de la commande.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Livrée':
        return <span className="badge-custom bg-soft-success"><i className="fas fa-check-circle" /> Livrée</span>;
      case 'Confirmée':
        return <span className="badge-custom bg-soft-info"><i className="fas fa-thumbs-up" /> Confirmée</span>;
      case 'Expédiée':
        return <span className="badge-custom bg-soft-primary"><i className="fas fa-shipping-fast" /> Expédiée</span>;
      case 'Annulée':
        return <span className="badge-custom bg-soft-danger"><i className="fas fa-times-circle" /> Annulée</span>;
      case 'En attente':
      default:
        return <span className="badge-custom bg-soft-warning"><i className="fas fa-clock" /> En attente</span>;
    }
  };

  const statusOptions = ['Tous', 'En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];

  const getOrderBreakdown = (order) => {
    if (!order) return { subtotal: 0, shipping: 0, total: 0 };
    const total = Number(order.total_amount) || 0;
    const shipping = order.shipping_fee !== undefined && order.shipping_fee !== null
      ? Number(order.shipping_fee)
      : (total >= 5000 || total < 500 ? 0 : 500);
    const subtotal = order.subtotal !== undefined && order.subtotal !== null && Number(order.subtotal) > 0
      ? Number(order.subtotal)
      : Math.max(0, total - shipping);
    return { subtotal, shipping, total };
  };

  const { subtotal: orderSubtotal, shipping: orderShipping, total: orderTotal } = getOrderBreakdown(selectedOrder);

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast" style={{ backgroundColor: '#111111' }}>
          <i className="fas fa-check-circle" /> {toastMessage}
        </div>
      )}

      {/* =========================================================================
          VIEW 1: DÉTAILS DE LA COMMANDE EN PLEINE PAGE (PAS DE POP-UP)
          ========================================================================= */}
      {selectedOrder ? (
        <div style={{ width: '100%' }}>
          {/* VUE ÉCRAN (MASQUÉE AUTOMATIQUEMENT À L'IMPRESSION) */}
          <div className="no-print">
            {/* Header de la commande */}
            <div className="page-header" style={{ width: '100%' }}>
              <div className="page-title-wrap">
                <h1>Commande {selectedOrder.order_number.startsWith('#') ? selectedOrder.order_number : `#${selectedOrder.order_number}`}</h1>
                <p className="breadcrumb-sub">
                  Enregistrée le {selectedOrder.created_at} &bull; Mode : {selectedOrder.payment_method || 'Paiement à la livraison'}
                </p>
              </div>
              <div className="page-actions">
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => setSelectedOrder(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <i className="fas fa-arrow-left" /> Retour aux Commandes
                </button>
                <button
                  type="button"
                  className="btn-primary-custom"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <i className="fas fa-print" /> Imprimer le Bon de Livraison
                </button>
                <button
                  type="button"
                  className="btn-light-custom"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#f72b50',
                    borderColor: 'rgba(247, 43, 80, 0.3)'
                  }}
                >
                  <i className="fas fa-trash" /> Supprimer
                </button>
              </div>
            </div>

            {/* Grille principale des détails de la commande (Full Width) */}
            <div className="order-details-layout">
              {/* Colonne gauche : Infos Client et Articles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                {/* Carte Client */}
                <div className="admin-card">
                  <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <h4>
                      <i className="flaticon-381-user-7" style={{ color: '#111111', marginRight: '0.5rem' }} />
                      Informations du Client
                    </h4>
                    <span className="badge-custom bg-soft-primary">Acheteur</span>
                  </div>
                  <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Nom & Prénom</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#333', marginTop: '0.2rem' }}>
                          {selectedOrder.customer_name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Téléphone</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#209f84', marginTop: '0.2rem' }}>
                          <a href={`tel:${selectedOrder.customer_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            <i className="fas fa-phone-alt" style={{ marginRight: '0.35rem', fontSize: '0.85rem' }} />
                            {selectedOrder.customer_phone}
                          </a>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Adresse Email</div>
                        <div style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.2rem' }}>
                          {selectedOrder.customer_email || 'Non renseigné'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Wilaya / Adresse de Livraison</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#333', marginTop: '0.2rem' }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#ff5c00', marginRight: '0.35rem' }} />
                          {selectedOrder.customer_address}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Carte Articles commandés */}
                <div className="admin-card">
                  <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <h4>
                      <i className="flaticon-381-box" style={{ color: '#111111', marginRight: '0.5rem' }} />
                      Articles Commandés
                    </h4>
                    <span className="badge-custom bg-soft-success">Colis Certifié</span>
                  </div>
                  <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                    {/* Prix des articles / Commande */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem',
                        backgroundColor: '#fbfbfd',
                        borderRadius: '8px',
                        border: '1px solid #eaeaea',
                        marginBottom: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#333' }}>
                          {selectedOrder.items_summary}
                        </div>
                        <small style={{ color: '#888' }}>Édition authentique &bull; Emballage soigné</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.25rem', color: '#111111' }}>
                          {orderSubtotal.toLocaleString()} DA
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600 }}>
                          Prix de la commande
                        </div>
                      </div>
                    </div>

                    {/* Prix de livraison séparé */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(32, 159, 132, 0.12)',
                            color: '#209f84',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                          }}
                        >
                          <i className="fas fa-truck" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#333' }}>
                            Frais de Livraison ({selectedOrder.customer_address || 'Wilaya'})
                          </div>
                          <small style={{ color: '#64748b' }}>Livraison à domicile</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.15rem', color: orderShipping === 0 ? '#209f84' : '#111111' }}>
                          {orderShipping === 0 ? 'Gratuit (0 DA)' : `${orderShipping.toLocaleString()} DA`}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600 }}>
                          Prix de livraison
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite : Statut et Action */}
              <div className="admin-card order-sidebar-card">
                <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <h4>Gestion du Statut</h4>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label-custom">Modifier le Statut</label>
                    <select
                      className="form-control-custom"
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      style={{ fontWeight: 600, color: '#111111' }}
                    >
                      <option value="En attente">En attente</option>
                      <option value="Confirmée">Confirmée</option>
                      <option value="Expédiée">Expédiée</option>
                      <option value="Livrée">Livrée</option>
                      <option value="Annulée">Annulée</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label-custom">Mode de Règlement</label>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#f4f5f9',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#444'
                      }}
                    >
                      <i className="fas fa-money-bill-wave" style={{ color: '#209f84', marginRight: '0.5rem' }} />
                      {selectedOrder.payment_method || 'Paiement à la livraison (Cash on Delivery)'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '1.2rem',
                      backgroundColor: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #eee',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#555' }}>
                      <span>Prix des articles</span>
                      <strong style={{ color: '#222' }}>{orderSubtotal.toLocaleString()} DA</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#555' }}>
                      <span>Prix livraison ({selectedOrder.customer_address || 'Wilaya'})</span>
                      <strong style={{ color: orderShipping === 0 ? '#209f84' : '#222' }}>
                        {orderShipping === 0 ? 'Gratuit (0 DA)' : `${orderShipping.toLocaleString()} DA`}
                      </strong>
                    </div>
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.65rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', color: '#111' }}>
                      <span>Total à payer</span>
                      <span style={{ color: '#fe2c55', fontWeight: 800 }}>{orderTotal.toLocaleString()} DA</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-light-custom"
                    onClick={() => setSelectedOrder(null)}
                    style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
                  >
                    <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }} />
                    Retour à la liste des commandes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              BON DE LIVRAISON IMPRIMABLE (AFFICHÉ UNIQUEMENT À L'IMPRESSION)
              ========================================================================= */}
          <div className="printable-delivery-slip">
            {/* En-tête : Logo sélectionné dans l'admin & Titre du document */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {shopLogo ? (
                  <img
                    src={shopLogo}
                    alt={storeInfo.name}
                    style={{ maxHeight: '60px', maxWidth: '170px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                    {storeInfo.name || 'LeerBook'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Boutique en ligne &bull; Vente & Livraison Express</div>
                  {storeInfo.phone && <div style={{ fontSize: '11px', color: '#475569' }}>Tél : {storeInfo.phone}</div>}
                  {storeInfo.email && <div style={{ fontSize: '11px', color: '#475569' }}>Email : {storeInfo.email}</div>}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  BON DE LIVRAISON
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fe2c55', marginTop: '3px' }}>
                  Commande {selectedOrder.order_number.startsWith('#') ? selectedOrder.order_number : `#${selectedOrder.order_number}`}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  Date : {selectedOrder.created_at || new Date().toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Cadres Expéditeur & Destinataire (Client) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
              {/* Expéditeur */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  Expéditeur / Boutique
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{storeInfo.name || 'LeerBook'}</div>
                {storeInfo.phone && <div style={{ fontSize: '12px', color: '#334155', marginTop: '3px' }}>Tél : {storeInfo.phone}</div>}
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>Service : Expédition & Livraison à domicile</div>
              </div>

              {/* Destinataire */}
              <div style={{ border: '2px solid #0f172a', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#fe2c55', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  Destinataire / Client
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedOrder.customer_name}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                  Tél : <span style={{ color: '#0284c7' }}>{selectedOrder.customer_phone}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '3px' }}>
                  Adresse / Wilaya : <strong>{selectedOrder.customer_address || 'Non spécifiée'}</strong>
                </div>
                {selectedOrder.customer_email && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Email : {selectedOrder.customer_email}
                  </div>
                )}
              </div>
            </div>

            {/* Tableau des Articles Commandés */}
            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#0f172a', width: '40px' }}>N°</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Désignation des Articles</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#0f172a', width: '80px' }}>Qté</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: '#0f172a', width: '130px' }}>Montant (DA)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>1</td>
                    <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {selectedOrder.items_summary || 'Articles commandés'}
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                        Édition authentique &bull; Emballage soigné
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>1</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {orderSubtotal.toLocaleString()} DA
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>2</td>
                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Frais de Livraison ({selectedOrder.customer_address || 'Wilaya'})
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#334155' }}>1</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      {orderShipping === 0 ? 'Gratuit (0 DA)' : `${orderShipping.toLocaleString()} DA`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mode de Règlement & Cadre Total Net à Encaisser */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div style={{ maxWidth: '340px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Mode de Règlement
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    💵 {selectedOrder.payment_method || 'Paiement à la livraison (Cash on Delivery)'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Montant à encaisser en espèces par le livreur lors de la remise du colis.
                  </div>
                </div>
              </div>

              {/* Total à Encaisser */}
              <div style={{ width: '280px', border: '2px solid #0f172a', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#475569' }}>Sous-total articles :</span>
                  <strong style={{ color: '#0f172a' }}>{orderSubtotal.toLocaleString()} DA</strong>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#475569' }}>Frais de livraison :</span>
                  <strong style={{ color: '#0f172a' }}>{orderShipping.toLocaleString()} DA</strong>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total à Encaisser :</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>{orderTotal.toLocaleString()} DA</span>
                </div>
              </div>
            </div>

            {/* Signatures & Reçu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '10px 12px', height: '75px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Visa / Cachet du Transporteur :
                </div>
              </div>

              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '10px 12px', height: '75px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Signature & Réception du Client :
                </div>
              </div>
            </div>

            {/* Pied de page du bon de livraison */}
            <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '11px', color: '#94a3b8' }}>
              Merci pour votre commande ! &bull; {storeInfo.name || 'LeerBook'} &bull; Document officiel tenant lieu de bon de livraison
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: LISTE TABULAIRE DES COMMANDES
            ========================================================================= */
        <div>
          {/* Page Header */}
          <div className="page-header">
            <div className="page-title-wrap">
              <h1>Gestion des Commandes</h1>
              <p className="breadcrumb-sub">Suivi des livraisons, confirmations d'achats et facturation en DA</p>
            </div>
            <div className="page-actions">
              <button className="btn-light-custom" onClick={loadOrders}>
                <i className="flaticon-381-refresh" /> Actualiser
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body-custom" style={{ padding: '0.8rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  style={{
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    borderRadius: '50px',
                    border: '1px solid',
                    borderColor: selectedStatus === status ? '#111111' : '#eaeaea',
                    backgroundColor: selectedStatus === status ? '#111111' : '#ffffff',
                    color: selectedStatus === status ? '#ffffff' : '#555',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="admin-card">
            <div className="card-header-custom">
              <h4>Commandes Récentes ({orders.length})</h4>
              <span className="badge-custom bg-soft-primary">Devise: DA</span>
            </div>
            <div className="table-responsive-custom">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Wilaya / Adresse</th>
                    <th>Articles</th>
                    <th>Montant Total</th>
                    <th>Statut Actuel</th>
                    <th style={{ textAlign: 'center' }}>Modifier Statut</th>
                    <th style={{ textAlign: 'right' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                        <i className="flaticon-381-file" style={{ fontSize: '2.5rem', color: '#ccc', display: 'block', marginBottom: '0.5rem' }} />
                        Aucune commande trouvée pour le filtre sélectionné.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#111111',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {ord.order_number}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#888' }}>
                            {ord.created_at ? ord.created_at.split(' ')[0] : ''}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: '#333' }}>{ord.customer_name}</strong>
                            <a
                              href={`tel:${ord.customer_phone}`}
                              style={{ display: 'block', fontSize: '0.78rem', color: '#209f84', textDecoration: 'none' }}
                            >
                              <i className="fas fa-phone-alt me-1" /> {ord.customer_phone}
                            </a>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{ord.customer_address}</span>
                        </td>
                        <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ord.items_summary}
                        </td>
                        <td>
                          {(() => {
                            const { subtotal, shipping, total } = getOrderBreakdown(ord);
                            return (
                              <div>
                                <strong style={{ fontSize: '1rem', color: '#111111', display: 'block' }}>
                                  {total.toLocaleString()} DA
                                </strong>
                                <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '0.2rem' }}>
                                  Articles : {subtotal.toLocaleString()} DA
                                  {shipping > 0 ? (
                                    <span style={{ color: '#ff5c00', marginLeft: '0.3rem', fontWeight: 600 }}>
                                      + {shipping.toLocaleString()} DA livr.
                                    </span>
                                  ) : (
                                    <span style={{ color: '#209f84', marginLeft: '0.3rem', fontWeight: 600 }}>
                                      (Livr. gratuite)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td>{getStatusBadge(ord.status)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            className="form-control-custom"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', width: 'auto', display: 'inline-block' }}
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                          >
                            <option value="En attente">En attente</option>
                            <option value="Confirmée">Confirmée</option>
                            <option value="Expédiée">Expédiée</option>
                            <option value="Livrée">Livrée</option>
                            <option value="Annulée">Annulée</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-icon-custom bg-soft-primary"
                              onClick={() => setSelectedOrder(ord)}
                              title="Voir les détails de la commande"
                            >
                              <i className="fas fa-file-invoice" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-custom bg-soft-danger"
                              onClick={() => handleDeleteOrder(ord.id)}
                              title="Supprimer la commande"
                              style={{ border: 'none', cursor: 'pointer' }}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
