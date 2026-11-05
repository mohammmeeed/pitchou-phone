// frontend/src/admin/pages/AdminPos.jsx
// Point de Vente (POS / Caisse Boutique) pour Pitchou Phone
// Vente comptoir, sélection rapide, gestion des stocks, écriture en caisse et ticket imprimable

import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

const isVideoMedia = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video');
};

export default function AdminPos() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState({
    store_name: 'Pitchou Phone',
    admin_phone: '0550 12 34 56',
    address: 'Boutique Pitchou Phone',
    currency: 'DA'
  });

  // Panier en cours (Current Cart)
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');

  // Checkout Form State
  const [customerName, setCustomerName] = useState('Client Comptoir');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customersList, setCustomersList] = useState([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);
  const customerInputRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Ticket & Impression State
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Historique récent des ventes POS
  const [recentSales, setRecentSales] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const receiptPrintRef = useRef(null);

  // Fermer le menu déroulant client au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(e.target)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrage intelligent des clients (par nom ou numéro de téléphone)
  const filteredCustomers = useMemo(() => {
    const raw = (customerName || '').trim();
    if (!raw || raw.toLowerCase() === 'client comptoir') {
      return customersList.slice(0, 10);
    }
    const q = raw.toLowerCase();
    const cleanNum = q.replace(/[\s\-\.]/g, '');
    return customersList.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').replace(/[\s\-\.]/g, '');
      return name.includes(q) || (cleanNum.length >= 2 && phone.includes(cleanNum));
    }).slice(0, 10);
  }, [customersList, customerName]);

  const exactCustomerMatch = useMemo(() => {
    const q = (customerName || '').trim().toLowerCase();
    if (!q || q === 'client comptoir') return null;
    return customersList.find((c) => (c.name || '').trim().toLowerCase() === q);
  }, [customersList, customerName]);

  const handleSelectCustomer = (cust) => {
    setCustomerName(cust.name || '');
    if (cust.phone && cust.phone !== '0555000000') {
      setCustomerPhone(cust.phone);
    } else {
      setCustomerPhone('');
    }
    setIsCustomerDropdownOpen(false);
  };

  const handleSelectAnonymous = () => {
    setCustomerName('Client Comptoir');
    setCustomerPhone('');
    setIsCustomerDropdownOpen(false);
  };

  // Charger les produits et données POS au montage
  useEffect(() => {
    loadPosData();
  }, []);

  const loadPosData = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPosData();
      if (data && data.success) {
        setProducts(Array.isArray(data.products) ? data.products : []);
        if (data.shop) setShopSettings(data.shop);
        if (Array.isArray(data.recent_sales)) setRecentSales(data.recent_sales);
        if (Array.isArray(data.customers)) {
          setCustomersList(data.customers);
        } else {
          adminApi.getCustomers().then((custs) => {
            if (Array.isArray(custs)) setCustomersList(custs);
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Erreur chargement POS:', err);
      showToast('Impossible de charger le catalogue POS.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Liste unique des catégories et marques pour filtrage rapide
  const categoriesList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach((c) => c && set.add(c.trim()));
      } else if (p.category) {
        p.category.split(',').forEach((c) => c && set.add(c.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [products]);

  const brandsList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const b = p.brand || p.author;
      if (b && String(b).trim() !== '' && String(b).toLowerCase() !== 'auteur') {
        set.add(String(b).trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Produits filtrés par recherche, catégorie et marque
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      // Filtre texte
      if (q) {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const brandMatch = (p.brand || p.author || '').toLowerCase().includes(q);
        const subMatch = (p.subcategory || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const barcodeMatch = (p.barcode || '').toLowerCase().includes(q);
        if (!nameMatch && !brandMatch && !subMatch && !catMatch && !barcodeMatch) return false;
      }
      // Filtre Catégorie
      if (selectedCategory !== 'all') {
        const cats = Array.isArray(p.categories) ? p.categories : (p.category ? p.category.split(',').map((s) => s.trim()) : []);
        const matchesCat = cats.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());
        if (!matchesCat) return false;
      }
      // Filtre Marque
      if (selectedBrand !== 'all') {
        const b = (p.brand || p.author || '').toLowerCase();
        if (b !== selectedBrand.toLowerCase()) return false;
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand]);

  // Gestion du scanner code-barres et touche Entrée
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Chercher d'abord une correspondance exacte du code-barres
      const exactBarcode = products.find((p) => (p.barcode || '').trim().toLowerCase() === q);
      if (exactBarcode) {
        if (exactBarcode.stock <= 0) {
          showToast(`Le produit "${exactBarcode.name}" est en rupture de stock.`, 'warning');
        } else {
          addToCart(exactBarcode);
          setSearchQuery('');
          showToast(`"${exactBarcode.name}" scanné et ajouté au panier !`, 'success');
        }
        return;
      }

      // 2. Si un seul produit correspond à la recherche
      if (filteredProducts.length === 1) {
        if (filteredProducts[0].stock <= 0) {
          showToast(`Le produit "${filteredProducts[0].name}" est en rupture de stock.`, 'warning');
        } else {
          addToCart(filteredProducts[0]);
          setSearchQuery('');
          showToast(`"${filteredProducts[0].name}" ajouté au panier !`, 'success');
        }
      }
    }
  };

  // Ajouter un produit au panier
  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast(`Le produit "${product.name}" est en rupture de stock.`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Stock maximal atteint pour "${product.name}" (${product.stock} dispo).`, 'warning');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          brand: product.brand || product.author || '',
          price: Number(product.price) || 0,
          purchase_price: Number(product.purchase_price) || 0,
          quantity: 1,
          maxStock: product.stock,
          image: product.image,
          video: product.video || (Array.isArray(product.videos) && product.videos[0] ? product.videos[0] : null),
          subtotal: Number(product.price) || 0
        }
      ];
    });
  };

  // Modifier la quantité dans le panier
  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.maxStock) {
              showToast(`Stock maximal disponible : ${item.maxStock}`, 'warning');
              return item;
            }
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.price
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Supprimer un produit du panier
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Vider le panier
  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setAmountReceived('');
  };

  // Calculs financiers
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const discount = Number(discountAmount) || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  // Monnaie à rendre
  const receivedNum = Number(amountReceived) || 0;
  const changeToGive = receivedNum > 0 ? Math.max(0, receivedNum - totalAmount) : 0;
  const remainingDue = receivedNum > 0 && receivedNum < totalAmount ? totalAmount - receivedNum : 0;

  // Raccourcis espèces
  const handleQuickCash = (amount) => {
    setAmountReceived(String(amount));
  };

  // Valider la vente
  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0) {
      showToast('Veuillez ajouter au moins un produit au panier.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          brand: i.brand,
          price: i.price,
          purchase_price: i.purchase_price,
          quantity: i.quantity,
          subtotal: i.subtotal
        })),
        subtotal,
        discount,
        total_amount: totalAmount,
        amount_received: receivedNum > 0 ? receivedNum : totalAmount,
        change_given: changeToGive,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || 'Client Comptoir',
        customer_phone: customerPhone.trim(),
        notes: saleNotes.trim()
      };

      const res = await adminApi.createPosSale(payload);
      if (res && res.success) {
        setCompletedSale(res.receipt);
        setIsReceiptModalOpen(true);
        showToast('Vente boutique enregistrée avec succès !');

        // Mettre à jour localement les stocks des produits vendus
        setProducts((prev) =>
          prev.map((p) => {
            const soldItem = cart.find((i) => i.id === p.id);
            if (soldItem) {
              return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
            }
            return p;
          })
        );

        // Vider le panier pour la prochaine vente
        clearCart();
        setCustomerName('Client Comptoir');
        setCustomerPhone('');
        setSaleNotes('');

        // Recharger la liste des clients pour afficher immédiatement le nouveau client
        adminApi.getCustomers().then((custs) => {
          if (Array.isArray(custs)) setCustomersList(custs);
        }).catch(() => {});

        // Mettre à jour l'historique
        if (res.receipt) {
          setRecentSales((prev) => [
            {
              order_number: res.receipt.ticket_number,
              customer_name: res.receipt.customer_name,
              total_amount: res.receipt.total,
              items_summary: res.receipt.items.map((it) => `${it.quantity}x ${it.name}`).join(', '),
              created_at: `${res.receipt.date} ${res.receipt.time}`,
              status: 'Livrée'
            },
            ...prev
          ]);
        }
      } else {
        throw new Error(res?.message || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur validation vente POS:', err);
      showToast(err.message || 'Erreur lors de la validation de la vente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Déclencher l'impression du ticket de caisse en format thermique 80mm (au ras du bord supérieur, sans espace blanc inutile)
  // Impression directe ultra-propre sans popup bloquée, sans espace blanc et sans en-têtes
  const handlePrintReceipt = () => {
    const ticketElem = document.getElementById('pos-printable-ticket');
    if (!ticketElem) {
      window.print();
      return;
    }

    const ticketHtml = ticketElem.innerHTML;

    let iframe = document.getElementById('pos-print-hidden-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'pos-print-hidden-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '80mm';
      iframe.style.height = '100px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title> </title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 78mm !important;
      max-width: 78mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Consolas', 'Courier New', Courier, monospace, sans-serif !important;
      font-size: 11.5px !important;
      line-height: 1.35 !important;
    }
    .ticket-print-wrap {
      width: 78mm !important;
      max-width: 78mm !important;
      margin: 0 auto !important;
      padding: 1mm 2mm !important;
    }
  </style>
</head>
<body>
  <div class="ticket-print-wrap">
    ${ticketHtml}
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        window.print();
      }
    }, 200);
  };

  return (
    <AdminLayout>
      {/* Styles d'impression dédiés au Ticket de Caisse (Thermique 80mm / Standard) */}
      <style>{`
        @page {
          size: 80mm auto;
          margin: 0mm !important;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #ffffff !important;
            height: auto !important;
          }
          body > *:not(.pos-receipt-modal-backdrop) {
            display: none !important;
          }
          .mediqu-admin, .admin-shell, .admin-sidebar, header, nav, footer, .pos-no-print {
            display: none !important;
          }
          .pos-receipt-modal-backdrop {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 80mm !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: 9999999 !important;
          }
          .pos-receipt-modal-card {
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 80mm !important;
            width: 80mm !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
          }
          #pos-printable-ticket {
            position: static !important;
            display: block !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 999999,
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : toastMessage.type === 'warning' ? '#f59e0b' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <i className={`fas ${toastMessage.type === 'error' ? 'fa-exclamation-circle' : toastMessage.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="pos-container" style={{ padding: '0 4px', maxWidth: '100%' }}>
        {/* En-tête de la Caisse POS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            backgroundColor: '#ffffff',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#18181b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              <i className="fas fa-cash-register"></i>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#18181b', letterSpacing: '-0.3px' }}>
                POS — Caisse Boutique
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#71717a' }}>
                Vente au comptoir • Gestion des stocks en direct • Tickets de caisse
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#15803d',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '5px 12px',
                borderRadius: '9999px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
              Caisse Ouverte
            </span>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#3f3f46',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fas fa-history"></i>
              <span>Historique ({recentSales.length})</span>
            </button>

            <button
              type="button"
              onClick={loadPosData}
              title="Rafraîchir les produits et stocks"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: '#3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Layout en 2 Colonnes : Catalogue (Gauche) & Ticket / Caisse (Droite) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(360px, 1fr)', gap: '16px', alignItems: 'start' }}>
          
          {/* =========================================================================
              COLONNE GAUCHE : CATALOGUE DES PRODUITS & SÉLECTION
              ========================================================================= */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            
            {/* Barre de Recherche */}
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#a1a1aa',
                  fontSize: '14px'
                }}
              ></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Rechercher par nom, marque, ou scanner un code-barres..."
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: '#fafafa'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            {/* Filtres Marques & Catégories */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {/* Dropdown Marques */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  color: '#18181b',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Toutes les Marques</option>
                {brandsList.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Pastilles Catégories Scrollables */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, paddingBottom: '2px', scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: selectedCategory === 'all' ? '1px solid #18181b' : '1px solid #e4e4e7',
                    backgroundColor: selectedCategory === 'all' ? '#18181b' : '#f4f4f5',
                    color: selectedCategory === 'all' ? '#ffffff' : '#52525b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tous ({products.length})
                </button>
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.78rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        border: isActive ? '1px solid #18181b' : '1px solid #e4e4e7',
                        backgroundColor: isActive ? '#18181b' : '#f4f4f5',
                        color: isActive ? '#ffffff' : '#52525b',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grille des Produits */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#71717a' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: '12px' }}></i>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Chargement du catalogue...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#fcfcfc', borderRadius: '8px', border: '1px dashed #e4e4e7' }}>
                <i className="fas fa-box-open fa-2x" style={{ color: '#d4d4d8', marginBottom: '10px' }}></i>
                <p style={{ margin: 0, fontWeight: 600, color: '#3f3f46' }}>Aucun produit ne correspond aux filtres</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedBrand('all'); }}
                  style={{ marginTop: '10px', fontSize: '0.8rem', padding: '5px 12px', borderRadius: '6px', background: '#18181b', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: '2px' }}>
                {filteredProducts.map((p) => {
                  const inCartItem = cart.find((i) => i.id === p.id);
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      style={{
                        backgroundColor: isOutOfStock ? '#fafafa' : '#ffffff',
                        border: inCartItem ? '2px solid #18181b' : '1px solid #e4e4e7',
                        borderRadius: '10px',
                        padding: '10px',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        opacity: isOutOfStock ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative'
                      }}
                    >
                      {/* Badge quantité déjà dans le panier */}
                      {inCartItem && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: '#18181b',
                            color: '#ffffff',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          {inCartItem.quantity}
                        </span>
                      )}

                      <div>
                        {/* Image / Miniature / Vidéo */}
                        <div style={{ width: '100%', paddingTop: '80%', position: 'relative', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f4f4f5', marginBottom: '8px' }}>
                          {(() => {
                            const rawImg = p.image || (Array.isArray(p.images) && p.images[0] ? p.images[0] : null);
                            const hasImg = rawImg && typeof rawImg === 'string' && rawImg.trim() !== '' && rawImg !== '/assets/images/categories/telephones.svg' && !isVideoMedia(rawImg);
                            const vidUrl = (p.video && typeof p.video === 'string' && p.video.trim() !== '')
                              ? p.video.trim()
                              : (Array.isArray(p.videos) && p.videos[0] ? p.videos[0].trim() : (isVideoMedia(rawImg) ? rawImg : null));

                            if (hasImg) {
                              return (
                                <img
                                  src={rawImg}
                                  alt={p.name}
                                  onError={(e) => { e.target.src = '/assets/images/categories/telephones.svg'; }}
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    padding: '6px'
                                  }}
                                />
                              );
                            }

                            if (vidUrl) {
                              return (
                                <video
                                  src={`${vidUrl}#t=0.1`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onLoadedMetadata={(e) => {
                                    try { e.target.currentTime = 0.1; } catch (_) {}
                                  }}
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    backgroundColor: '#000000',
                                    pointerEvents: 'none'
                                  }}
                                />
                              );
                            }

                            return (
                              <img
                                src="/assets/images/categories/telephones.svg"
                                alt={p.name}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  padding: '6px'
                                }}
                              />
                            );
                          })()}
                        </div>

                        {/* Badges Marque & Sous-Catégorie */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          {p.brand && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#18181b', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '4px' }}>
                              {p.brand}
                            </span>
                          )}
                          {p.subcategory && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                              {p.subcategory}
                            </span>
                          )}
                        </div>

                        {/* Titre */}
                        <h6 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#18181b', margin: '0 0 4px', lineHeight: '1.25' }}>
                          {p.name}
                        </h6>
                        {p.barcode && (
                          <div style={{ fontSize: '0.68rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '4px' }}>
                            <i className="fas fa-barcode" style={{ fontSize: '0.65rem' }} />
                            <span>{p.barcode}</span>
                          </div>
                        )}
                      </div>

                      {/* Prix & Stock */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f4f4f5' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#09090b' }}>
                          {Number(p.price).toLocaleString('fr-FR')} DA
                        </span>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isOutOfStock ? '#fee2e2' : p.stock <= 2 ? '#fef3c7' : '#f0fdf4',
                            color: isOutOfStock ? '#ef4444' : p.stock <= 2 ? '#b45309' : '#15803d'
                          }}
                        >
                          {isOutOfStock ? 'Épuisé' : `${p.stock} en stock`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              COLONNE DROITE : TICKET DE VENTE / CAISSE / PAIEMENT
              ========================================================================= */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            
            {/* Header du Panier */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e4e4e7', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#18181b' }}>Ticket en Cours</span>
                <span style={{ backgroundColor: '#18181b', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} art.
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  <i className="fas fa-trash-alt" style={{ marginRight: '4px' }}></i>
                  Vider
                </button>
              )}
            </div>

            {/* Liste des Articles dans le Panier */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#a1a1aa' }}>
                <i className="fas fa-shopping-basket fa-3x" style={{ marginBottom: '12px', color: '#e4e4e7' }}></i>
                <p style={{ margin: 0, fontWeight: 600, color: '#71717a', fontSize: '0.9rem' }}>Panier de vente vide</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Cliquez sur un produit à gauche pour l'ajouter</p>
              </div>
            ) : (
              <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px dashed #f4f4f5',
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                        {Number(item.price).toLocaleString('fr-FR')} DA / u
                      </span>
                    </div>

                    {/* Quantités */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                    </div>

                    {/* Total de ligne & suppression */}
                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#09090b' }}>
                        {Number(item.subtotal).toLocaleString('fr-FR')} DA
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Infos Client & Règlement */}
            <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '12px', marginTop: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', position: 'relative' }}>
                {/* Champ Client avec Recherche Autocomplète & Wishlist BDD */}
                <div style={{ position: 'relative' }} ref={customerDropdownRef}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', margin: 0 }}>
                      Client
                    </label>
                    {customerName && customerName !== 'Client Comptoir' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('');
                          setCustomerPhone('');
                          setIsCustomerDropdownOpen(true);
                          customerInputRef.current?.focus();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#71717a',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        title="Effacer le client"
                      >
                        Effacer
                      </button>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      ref={customerInputRef}
                      type="text"
                      value={customerName}
                      onFocus={() => {
                        setIsCustomerDropdownOpen(true);
                        if (customerName === 'Client Comptoir') {
                          customerInputRef.current?.select();
                        }
                      }}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsCustomerDropdownOpen(false);
                        }
                      }}
                      placeholder="Nom du client"
                      style={{
                        width: '100%',
                        padding: '6px 24px 6px 8px',
                        borderRadius: '6px',
                        border: isCustomerDropdownOpen ? '1px solid #18181b' : '1px solid #d4d4d8',
                        fontSize: '0.8rem',
                        outline: 'none',
                        boxShadow: isCustomerDropdownOpen ? '0 0 0 2px rgba(24, 24, 27, 0.08)' : 'none',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.15s ease'
                      }}
                    />
                    <i
                      className={`fas fa-chevron-${isCustomerDropdownOpen ? 'up' : 'down'}`}
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '9px',
                        color: '#71717a',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Menu Déroulant / Wishlist des clients existants depuis la BDD */}
                  {isCustomerDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        width: 'calc(200% + 8px)',
                        maxWidth: '360px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '8px',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
                        zIndex: 1050,
                        overflow: 'hidden'
                      }}
                    >
                      {/* Entête wishlist clients */}
                      <div
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#fafafa',
                          borderBottom: '1px solid #f4f4f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          color: '#71717a',
                          fontWeight: 600
                        }}
                      >
                        <span>
                          <i className="fas fa-users" style={{ marginRight: '5px' }}></i>
                          Clients en base ({customersList.length})
                        </span>
                        {customerName && customerName !== 'Client Comptoir' && (
                          <span style={{ fontSize: '0.68rem', color: '#16a34a' }}>
                            {filteredCustomers.length} trouvé(s)
                          </span>
                        )}
                      </div>

                      {/* Liste scrollable des clients */}
                      <div style={{ maxHeight: '190px', overflowY: 'auto' }}>
                        {/* Option Rapide Client Comptoir */}
                        <div
                          onClick={handleSelectAnonymous}
                          style={{
                            padding: '7px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f4f4f5',
                            backgroundColor: customerName === 'Client Comptoir' ? '#f4f4f5' : '#ffffff',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (customerName !== 'Client Comptoir') e.currentTarget.style.backgroundColor = '#fafafa';
                          }}
                          onMouseLeave={(e) => {
                            if (customerName !== 'Client Comptoir') e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-store" style={{ color: '#71717a', fontSize: '11px' }}></i>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#18181b' }}>
                              Client Comptoir
                            </span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Vente standard</span>
                        </div>

                        {/* Clients filtrés */}
                        {filteredCustomers.map((cust) => {
                          const isSelected = cust.name && customerName.toLowerCase().trim() === cust.name.toLowerCase().trim();
                          return (
                            <div
                              key={cust.id}
                              onClick={() => handleSelectCustomer(cust)}
                              style={{
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f4f4f5',
                                backgroundColor: isSelected ? '#f4f4f5' : '#ffffff',
                                transition: 'background-color 0.12s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#18181b', lineHeight: 1.2 }}>
                                  {cust.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <i className="fas fa-phone-alt" style={{ fontSize: '9px' }}></i>
                                  <span>{cust.phone || 'Pas de numéro'}</span>
                                  {cust.address && cust.address !== 'Boutique' && (
                                    <>
                                      <span>•</span>
                                      <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {cust.address}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #bfdbfe'
                                  }}
                                >
                                  {cust.total_orders || 1} achat{(cust.total_orders || 1) > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Indication Nouveau Client si pas de correspondance exacte */}
                        {customerName &&
                          customerName.trim() !== '' &&
                          customerName.toLowerCase().trim() !== 'client comptoir' &&
                          !exactCustomerMatch && (
                            <div
                              onClick={() => {
                                setIsCustomerDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: '#f0fdf4',
                                borderTop: '1px dashed #86efac',
                                color: '#166534',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-user-plus" style={{ color: '#16a34a' }}></i>
                                <span>Nouveau client : <strong>{customerName.trim()}</strong></span>
                              </div>
                              <span style={{ fontSize: '0.66rem', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px' }}>
                                Sera enregistré
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Champ Téléphone */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                    Téléphone (opt.)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="05 / 06 / 07..."
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Mode de Paiement */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Paiement
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {['Espèces', 'Carte CIB', 'Virement'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      style={{
                        padding: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: paymentMethod === mode ? '2px solid #18181b' : '1px solid #d4d4d8',
                        backgroundColor: paymentMethod === mode ? '#18181b' : '#ffffff',
                        color: paymentMethod === mode ? '#ffffff' : '#3f3f46',
                        cursor: 'pointer'
                      }}
                    >
                      {mode === 'Espèces' ? '💵 Espèces' : mode === 'Carte CIB' ? '💳 Carte' : '🏦 Virement'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remise & Montant Reçu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                    Remise (DA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    placeholder="0 DA"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                    Reçu Client (DA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={totalAmount ? `${totalAmount}` : '0'}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.8rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Raccourcis espèces rapides */}
              {totalAmount > 0 && paymentMethod === 'Espèces' && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(totalAmount)}
                    style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Exact ({totalAmount.toLocaleString('fr-FR')} DA)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(Math.ceil(totalAmount / 1000) * 1000)}
                    style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', cursor: 'pointer', fontWeight: 600 }}
                  >
                    +{(Math.ceil(totalAmount / 1000) * 1000).toLocaleString('fr-FR')} DA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(totalAmount + 1000)}
                    style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', cursor: 'pointer', fontWeight: 600 }}
                  >
                    +1 000 DA
                  </button>
                </div>
              )}

              {/* Récapitulatif Total & Monnaie */}
              <div style={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: discount > 0 ? '4px' : '0' }}>
                  <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 600 }}>Total à Payer</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                    {totalAmount.toLocaleString('fr-FR')} DA
                  </span>
                </div>

                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fca5a5' }}>
                    <span>Remise déduite</span>
                    <span>-{discount.toLocaleString('fr-FR')} DA</span>
                  </div>
                )}

                {receivedNum > 0 && (
                  <div style={{ borderTop: '1px solid #27272a', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                      {remainingDue > 0 ? 'Reste dû' : 'Monnaie à Rendre'}
                    </span>
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: remainingDue > 0 ? '#f87171' : '#4ade80'
                      }}
                    >
                      {remainingDue > 0 ? `${remainingDue.toLocaleString('fr-FR')} DA` : `${changeToGive.toLocaleString('fr-FR')} DA`}
                    </span>
                  </div>
                )}
              </div>

              {/* Bouton de validation */}
              <button
                type="button"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: cart.length === 0 ? '#e4e4e7' : '#16a34a',
                  color: cart.length === 0 ? '#a1a1aa' : '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: cart.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: cart.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    <span>Valider la Vente (F10)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL DU TICKET DE CAISSE IMPRIMABLE (POS RECEIPT)
          ========================================================================= */}
      {isReceiptModalOpen && completedSale && (
        <div
          className="pos-receipt-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setIsReceiptModalOpen(false)}
        >
          <div
            className="pos-receipt-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ticket Preview Formatté */}
            <div
              id="pos-printable-ticket"
              ref={receiptPrintRef}
              style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #d4d4d8',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: "'Consolas', 'Courier New', Courier, monospace, sans-serif",
                color: '#000000',
                fontSize: '12px',
                lineHeight: '1.35',
                width: '80mm',
                maxWidth: '100%',
                boxSizing: 'border-box',
                margin: '0 auto 16px'
              }}
            >
              {/* Entête du Ticket */}
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px' }}>
                  {completedSale.shop_name}
                </h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>
                  {completedSale.shop_address || 'Boutique & Vente au comptoir'}
                </p>
                {completedSale.shop_phone && (
                  <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>
                    Tél : {completedSale.shop_phone}
                  </p>
                )}
                <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>N° : {completedSale.ticket_number}</span>
                  <span>{completedSale.date} {completedSale.time}</span>
                </div>
                {completedSale.customer_name && completedSale.customer_name !== 'Client Comptoir' && (
                  <div style={{ textAlign: 'left', fontSize: '10px', marginTop: '2px' }}>
                    Client : {completedSale.customer_name} {completedSale.customer_phone ? `(${completedSale.customer_phone})` : ''}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', marginBottom: '8px' }}></div>

              {/* Lignes d'articles */}
              <div style={{ marginBottom: '8px' }}>
                {completedSale.items.map((it, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>
                      {it.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#333' }}>
                      <span>{it.quantity} x {Number(it.price).toLocaleString('fr-FR')} DA</span>
                      <span style={{ fontWeight: 700 }}>{Number(it.total).toLocaleString('fr-FR')} DA</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

              {/* Totaux & Rendu */}
              <div>
                {completedSale.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', color: '#c00' }}>
                    <span>Remise :</span>
                    <span>-{Number(completedSale.discount).toLocaleString('fr-FR')} DA</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, margin: '6px 0', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 0' }}>
                  <span>TOTAL :</span>
                  <span>{Number(completedSale.total).toLocaleString('fr-FR')} DA</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '4px' }}>
                  <span>Mode : {completedSale.payment_method}</span>
                  <span>Reçu : {Number(completedSale.amount_received).toLocaleString('fr-FR')} DA</span>
                </div>
                {completedSale.change_given > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    <span>Rendu monnaie :</span>
                    <span>{Number(completedSale.change_given).toLocaleString('fr-FR')} DA</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '10px 0 6px' }}></div>

              {/* Pied de page */}
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#444' }}>
                <p style={{ margin: '0 0 2px' }}>Merci pour votre achat !</p>
                <p style={{ margin: 0 }}>Les articles vendus ne sont ni repris ni échangés.</p>
              </div>
            </div>

            {/* Boutons d'Action du Modal */}
            <div className="pos-no-print" style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button
                type="button"
                onClick={handlePrintReceipt}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-print"></i>
                <span>Imprimer le Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => { setIsReceiptModalOpen(false); setCompletedSale(null); }}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#f4f4f5',
                  color: '#3f3f46',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Nouvelle Vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL HISTORIQUE DES VENTES POS RÉCENTES
          ========================================================================= */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              padding: '20px',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e4e4e7', paddingBottom: '10px' }}>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#18181b' }}>
                <i className="fas fa-history" style={{ marginRight: '8px' }}></i>
                Dernières Ventes Boutique (POS)
              </h5>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#71717a', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {recentSales.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#71717a', padding: '30px 0' }}>Aucune vente enregistrée récemment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentSales.map((sale, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#18181b' }}>{sale.order_number}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{sale.created_at}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#52525b' }}>
                        {sale.customer_name} • {sale.items_summary}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#16a34a', display: 'block' }}>
                        {Number(sale.total_amount).toLocaleString('fr-FR')} DA
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
                        Livrée / Réglé
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

