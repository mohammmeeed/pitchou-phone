import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const API_BASE_URL = 'http://localhost:8000/api';

const BookDetailBottomSheet = ({ card, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useDating();
  const [isClosing, setIsClosing] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [dbProduct, setDbProduct] = useState(null);

  // Récupération des informations fraîches du livre depuis la BDD à l'ouverture
  useEffect(() => {
    if (isOpen && card?.id) {
      let isMounted = true;
      const fetchDetail = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/products?id=${encodeURIComponent(card.id)}`);
          if (!res.ok) return;
          const json = await res.json();
          if (isMounted && json && json.success && json.data) {
            setDbProduct(json.data);
          }
        } catch (e) {
          console.warn('Fallback card data:', e);
        }
      };
      fetchDetail();
      return () => {
        isMounted = false;
      };
    } else {
      setDbProduct(null);
    }
  }, [isOpen, card?.id]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setAddedToCart(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const parseLangs = (val) => {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim() !== '') {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Si dbProduct est chargé, on privilégie ses valeurs réelles sans injecter d'infos par défaut
  const activeName = (dbProduct?.name || card?.name || 'Produit').trim();
  const rawAuthor = (dbProduct && dbProduct.author !== undefined)
    ? String(dbProduct.author || '').trim()
    : (card?.author ? String(card.author).trim() : '');
  const rawCategory = (dbProduct && dbProduct.category !== undefined)
    ? String(dbProduct.category || '').trim()
    : (card?.category ? String(card.category).trim() : '');
  const rawFormat = (dbProduct && dbProduct.format !== undefined)
    ? String(dbProduct.format || '').trim()
    : (card?.format ? String(card.format).trim() : '');
  const rawBio = (dbProduct && dbProduct.bio !== undefined)
    ? String(dbProduct.bio || '').trim()
    : (card?.bio ? String(card.bio).trim() : '');
  const bookLanguages = (dbProduct && dbProduct.languages !== undefined)
    ? parseLangs(dbProduct.languages)
    : parseLangs(card?.languages);

  // Filtre strict : ne pas afficher si le champ est vide ou s'il contient des libellés temporaires
  const hasAuthor = rawAuthor !== '' && rawAuthor.toLowerCase() !== 'auteur';
  const hasCategory = rawCategory !== '' && rawCategory !== '-- Aucune catégorie --';
  const hasFormat = rawFormat !== '' && rawFormat.toLowerCase() !== 'format';
  const hasBio = rawBio !== '';

  const activeBook = {
    ...card,
    ...(dbProduct || {}),
    name: activeName,
    author: hasAuthor ? rawAuthor : '',
    price: dbProduct?.price ?? card?.price,
    category: hasCategory ? rawCategory : '',
    format: hasFormat ? rawFormat : '',
    bio: hasBio ? rawBio : '',
    languages: bookLanguages
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 380);
  };

  const handleAddToCart = () => {
    addToCart(activeBook);
    setAddedToCart(true);
    setTimeout(() => {
      handleClose();
      navigate('/explore');
    }, 800);
  };

  // Pricing dynamique basé sur le produit
  const price = (activeBook.price !== undefined && activeBook.price !== null && activeBook.price !== '')
    ? `${Number(activeBook.price).toLocaleString('fr-FR')} DA` 
    : (activeBook.priceFormatted || '');

  return (
    <div 
      className={`book-sheet-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div 
        className={`book-sheet-container ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div className="book-sheet-drag-handle-wrap" onClick={handleClose}>
          <div className="book-sheet-drag-handle"></div>
        </div>

        {/* Sheet Top Bar */}
        <div className="book-sheet-header justify-content-end">
          <button 
            type="button" 
            className="book-sheet-close-btn" 
            onClick={handleClose}
            aria-label="Fermer"
          >
            <i className="icon feather icon-x"></i>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="book-sheet-content">
          {/* Animated Hero Media Card */}
          <div className="book-sheet-media-card">
            {activeBook.video ? (
              <video 
                src={activeBook.video} 
                poster={activeBook.image} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="book-sheet-media"
              />
            ) : (
              <img 
                src={activeBook.image} 
                alt={activeBook.name} 
                className="book-sheet-media"
                onError={(e) => {
                  e.target.src = '/assets/images/books/book1.jpg';
                }}
              />
            )}
          </div>

          {/* Book Info */}
          <div className="book-sheet-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h3 className="book-sheet-title mb-0">{activeName}</h3>
                {hasAuthor ? (
                  <span className="text-muted d-block" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Par {rawAuthor}
                  </span>
                ) : null}
              </div>
              <div className="book-sheet-price">
                {price}
              </div>
            </div>

            {/* Badges Catégorie & Format récupérés depuis la BDD (uniquement si renseignés) */}
            {(hasCategory || hasFormat) ? (
              <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                {hasCategory ? (
                  <span 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#f3f4f6', 
                      color: '#111827', 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <i className="feather icon-bookmark text-primary" style={{ fontSize: '12px' }}></i>
                    {rawCategory}
                  </span>
                ) : null}
                {hasFormat ? (
                  <span 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#f9fafb', 
                      color: '#4b5563', 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 500,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <i className="feather icon-book-open" style={{ fontSize: '12px' }}></i>
                    {rawFormat}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Synopsis / Description (uniquement si renseigné dans la BDD) */}
            {activeBook.bio && activeBook.bio.trim() !== '' ? (
              <div className="book-sheet-section mb-3">
                <h6 className="book-sheet-section-title">À propos de ce livre</h6>
                <p className="book-sheet-desc">
                  {activeBook.bio}
                </p>
              </div>
            ) : null}

            {/* Langue(s) récupérées depuis la base de données (uniquement si sélectionnées) */}
            {bookLanguages.length > 0 ? (
              <div className="book-sheet-section mb-3">
                <h6 className="book-sheet-section-title" style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                  Langue{bookLanguages.length > 1 ? 's' : ''}
                </h6>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {bookLanguages.map((lang) => (
                    <span
                      key={lang}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 12px',
                        backgroundColor: '#fdf2f8',
                        color: '#be185d',
                        border: '1px solid #fbcfe8',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      <i className="feather icon-globe" style={{ fontSize: '11px' }}></i>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="book-sheet-footer">
          <div className="book-sheet-footer-price">
            <span className="label">Total</span>
            <span className="amount">{price}</span>
          </div>
          <button 
            type="button" 
            className={`btn btn-lg btn-gradient rounded-xl book-sheet-buy-btn ${addedToCart ? 'added' : ''}`}
            onClick={handleAddToCart}
          >
            {addedToCart ? (
              <>
                <i className="icon feather icon-check me-2"></i>
                Ajouté au panier !
              </>
            ) : (
              <>
                <i className="icon feather icon-shopping-bag me-2"></i>
                Ajouter au Panier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDetailBottomSheet;
