import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const API_BASE_URL = '/api';

const BookDetailBottomSheet = ({ card, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useDating() || {};
  const [isClosing, setIsClosing] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [dbProduct, setDbProduct] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showArModal, setShowArModal] = useState(false);
  const galleryTrackRef = useRef(null);

  useEffect(() => {
    if (!galleryTrackRef.current) return;
    const mediaNodes = galleryTrackRef.current.children;
    Array.from(mediaNodes).forEach((node, idx) => {
      const vid = node.querySelector('video');
      if (vid) {
        if (idx === activeMediaIndex) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [activeMediaIndex]);

  // Reset de l'index de média à chaque changement de produit ou ouverture
  useEffect(() => {
    setActiveMediaIndex(0);
    setDragOffset(0);
    setIsDragging(false);
  }, [card?.id, isOpen]);

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

  // Catégories multiples
  const bookCategories = React.useMemo(() => {
    const raw = dbProduct?.categories || card?.categories;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter(Boolean);
    }
    if (rawCategory && rawCategory !== '-- Aucune catégorie --') {
      return rawCategory.split(',').map((s) => s.trim()).filter((s) => s && s !== '-- Aucune catégorie --');
    }
    return [];
  }, [dbProduct, card, rawCategory]);

  // Filtre strict : ne pas afficher si le champ est vide ou s'il contient des libellés temporaires
  const hasAuthor = rawAuthor !== '' && rawAuthor.toLowerCase() !== 'auteur';
  const hasCategory = bookCategories.length > 0;
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
    languages: bookLanguages,
    model_glb: (dbProduct?.model_glb ?? card?.model_glb ?? '') || (dbProduct?.model_3d_glb ?? card?.model_3d_glb ?? ''),
    model_usdz: (dbProduct?.model_usdz ?? card?.model_usdz ?? '') || (dbProduct?.model_3d_usdz ?? card?.model_3d_usdz ?? '')
  };

  const glbModel = String(activeBook.model_glb || '').trim();
  const usdzModel = String(activeBook.model_usdz || '').trim();
  const hasAr = Boolean(glbModel || usdzModel);

  // Construction dynamique de la galerie multi-photos et vidéos
  const galleryItems = React.useMemo(() => {
    const items = [];

    // Récupérer la liste des images
    const rawImages = dbProduct?.images || card?.images;
    let parsedImages = [];
    if (Array.isArray(rawImages)) {
      parsedImages = rawImages;
    } else if (typeof rawImages === 'string' && rawImages.trim() !== '') {
      try {
        const decoded = JSON.parse(rawImages);
        parsedImages = Array.isArray(decoded) ? decoded : [rawImages];
      } catch (e) {
        parsedImages = [rawImages];
      }
    } else if (activeBook.image) {
      parsedImages = [activeBook.image];
    }

    // Récupérer la liste des vidéos
    const rawVideos = dbProduct?.videos || card?.videos;
    let parsedVideos = [];
    if (Array.isArray(rawVideos)) {
      parsedVideos = rawVideos;
    } else if (typeof rawVideos === 'string' && rawVideos.trim() !== '') {
      try {
        const decoded = JSON.parse(rawVideos);
        parsedVideos = Array.isArray(decoded) ? decoded : [rawVideos];
      } catch (e) {
        parsedVideos = [rawVideos];
      }
    } else if (activeBook.video) {
      parsedVideos = [activeBook.video];
    }

    // Prioriser les vidéos en premier (pour correspondre au feed plein écran)
    parsedVideos.forEach((vid) => {
      if (vid && typeof vid === 'string' && vid.trim() !== '') {
        items.push({ type: 'video', url: vid.trim() });
      }
    });

    // Ajouter les photos ensuite
    parsedImages.forEach((img) => {
      if (img && typeof img === 'string' && img.trim() !== '') {
        items.push({ type: 'image', url: img.trim() });
      }
    });

    return items.length > 0 
      ? items 
      : [{ type: 'image', url: (activeBook.image && activeBook.image !== '/assets/images/books/book1.jpg') ? activeBook.image : '/assets/images/categories/telephones.svg' }];
  }, [dbProduct, card, activeBook.image, activeBook.video]);

  const totalItems = galleryItems.length;

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (totalItems <= 1) return;
    setActiveMediaIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (totalItems <= 1) return;
    setActiveMediaIndex((prev) => (prev + 1) % totalItems);
  };

  // Gestion Swipe Touch (Mobile)
  const handleTouchStart = (e) => {
    if (totalItems <= 1) return;
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || totalItems <= 1) return;
    const diff = e.touches[0].clientX - touchStartX;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || totalItems <= 1) return;
    setIsDragging(false);
    if (dragOffset < -35) {
      handleNext();
    } else if (dragOffset > 35) {
      handlePrev();
    }
    setDragOffset(0);
  };

  // Gestion Swipe Souris (Desktop)
  const handleMouseDown = (e) => {
    if (totalItems <= 1) return;
    setTouchStartX(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || totalItems <= 1) return;
    const diff = e.clientX - touchStartX;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging || totalItems <= 1) return;
    setIsDragging(false);
    if (dragOffset < -35) {
      handleNext();
    } else if (dragOffset > 35) {
      handlePrev();
    }
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 380);
  };

  const isOutOfStock = activeBook.stock !== undefined && Number(activeBook.stock) <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(activeBook);
    setAddedToCart(true);
    setTimeout(() => {
      handleClose();
      navigate('/panier');
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
          {/* Animated Hero Media Card with Touch/Mouse Swipe Gallery */}
          <div 
            className="book-sheet-media-card"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ 
              userSelect: 'none', 
              touchAction: 'pan-y',
              cursor: totalItems > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            {/* Badge Out of stock */}
            {isOutOfStock && (
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  zIndex: 20,
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.8)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
              >
                Out of stock
              </div>
            )}

            {/* Slider Track */}
            <div 
              ref={galleryTrackRef}
              className="book-sheet-gallery-track"
              style={{
                display: 'flex',
                width: `${totalItems * 100}%`,
                height: '100%',
                transform: `translateX(calc(-${activeMediaIndex * (100 / totalItems)}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {galleryItems.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: `${100 / totalItems}%`,
                    height: '100%',
                    flexShrink: 0,
                    position: 'relative',
                    background: '#111827'
                  }}
                >
                  {item.type === 'video' ? (
                    <video 
                      src={item.url} 
                      preload="metadata"
                      autoPlay={idx === activeMediaIndex} 
                      loop 
                      muted 
                      controls
                      playsInline 
                      className="book-sheet-media"
                    />
                  ) : (
                    <img 
                      src={item.url} 
                      alt={`${activeName} - photo ${idx + 1}`} 
                      className="book-sheet-media"
                      onError={(e) => {
                        e.target.src = '/assets/images/categories/telephones.svg';
                      }}
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Badges & Navigation Buttons if multiple media */}
            {totalItems > 1 && (
              <>
                {/* Bouton Précédent (<) */}
                <button
                  type="button"
                  className="book-sheet-gallery-nav prev"
                  onClick={handlePrev}
                  aria-label="Photo précédente"
                >
                  <i className="feather icon-chevron-left"></i>
                </button>

                {/* Bouton Suivant (>) */}
                <button
                  type="button"
                  className="book-sheet-gallery-nav next"
                  onClick={handleNext}
                  aria-label="Photo suivante"
                >
                  <i className="feather icon-chevron-right"></i>
                </button>

                {/* Dots de pagination */}
                <div className="book-sheet-gallery-dots">
                  {galleryItems.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      className={`book-sheet-dot ${dotIdx === activeMediaIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(dotIdx);
                      }}
                      aria-label={`Aller au média ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Miniatures cliquables sous le grand média */}
          {totalItems > 1 && (
            <div className="book-sheet-thumbnails-row">
              {galleryItems.map((item, thumbIdx) => {
                const isActive = thumbIdx === activeMediaIndex;
                return (
                  <button
                    key={thumbIdx}
                    type="button"
                    onClick={() => setActiveMediaIndex(thumbIdx)}
                    className={`book-sheet-thumb-btn ${isActive ? 'active' : ''}`}
                    aria-label={`Afficher média ${thumbIdx + 1}`}
                  >
                    {item.type === 'video' ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000000', overflow: 'hidden' }}>
                        <video
                          src={`${item.url}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            pointerEvents: 'none'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            pointerEvents: 'none'
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 0, 0, 0.65)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '9px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                          >
                            <i className="feather icon-play" style={{ marginLeft: '1px' }}></i>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={`Miniature ${thumbIdx + 1}`} 
                        className="book-sheet-thumb-img" 
                        onError={(e) => { e.target.src = '/assets/images/categories/telephones.svg'; }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Bouton miniature AR / 3D */}
              {hasAr && (
                <button
                  type="button"
                  onClick={() => setShowArModal(true)}
                  className="book-sheet-thumb-btn"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    border: '1.5px solid #38bdf8',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    minWidth: '50px'
                  }}
                  title="Voir en 3D et Réalité Augmentée"
                >
                  <i className="fas fa-cube" style={{ fontSize: '15px', color: '#38bdf8' }} />
                  <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '2px', color: '#38bdf8' }}>AR 3D</span>
                </button>
              )}
            </div>
          )}

          {/* Book Info */}
          <div className="book-sheet-body">
            <div className="d-flex align-items-center justify-content-between mb-2" style={{ gap: '12px' }}>
              <div>
                <h3 className="book-sheet-title mb-0">{activeName}</h3>
                {hasAuthor ? (
                  <span className="text-muted d-block" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Marque : <strong style={{ color: '#111827' }}>{rawAuthor}</strong>
                  </span>
                ) : null}
              </div>

              {/* Bouton Voir en AR */}
              {hasAr && (
                <button
                  type="button"
                  onClick={() => setShowArModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '9999px',
                    padding: '7px 15px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(8px)',
                    transition: 'transform 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <i className="fas fa-vr-cardboard" style={{ fontSize: '13px', color: '#38bdf8' }} />
                  <span>Voir en AR</span>
                </button>
              )}
            </div>

            {/* Badges Catégorie & Format récupérés depuis la BDD (uniquement si renseignés) */}
            {(hasCategory || hasFormat) ? (
              <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                {bookCategories.map((cat) => (
                  <span 
                    key={cat}
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
                    {cat}
                  </span>
                ))}
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
                    <i className="feather icon-check-circle" style={{ fontSize: '12px' }}></i>
                    {rawFormat}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Synopsis / Description (uniquement si renseigné dans la BDD) */}
            {activeBook.bio && activeBook.bio.trim() !== '' ? (
              <div className="book-sheet-section mb-3">
                <h6 className="book-sheet-section-title">Description du produit</h6>
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
            disabled={isOutOfStock}
            className={`btn btn-lg rounded-xl book-sheet-buy-btn ${isOutOfStock ? 'disabled' : (addedToCart ? 'added' : 'btn-gradient')}`}
            onClick={isOutOfStock ? undefined : handleAddToCart}
            style={isOutOfStock ? {
              backgroundColor: '#6b7280',
              backgroundImage: 'none',
              borderColor: '#6b7280',
              color: '#ffffff',
              cursor: 'not-allowed',
              opacity: 0.9,
              boxShadow: 'none'
            } : undefined}
          >
            {isOutOfStock ? (
              <>
                <i className="icon feather icon-slash me-2"></i>
                Out of stock
              </>
            ) : addedToCart ? (
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

      {/* Modal Plein Écran : Vue 3D Interactive & Réalité Augmentée (model-viewer) */}
      {showArModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => setShowArModal(false)}
        >
          {/* En-tête de la modale */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#18181b',
                  border: '1.5px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-cube" style={{ fontSize: '16px', color: '#38bdf8' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  {activeName}
                </h4>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  Vue 3D & Réalité Augmentée (AR)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowArModal(false)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#ffffff',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Visualiseur 3D Google model-viewer */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <model-viewer
              src={glbModel || undefined}
              ios-src={usdzModel || undefined}
              alt={activeName}
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate
              shadow-intensity="1.2"
              exposure="1.0"
              interaction-prompt="auto"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent'
              }}
            >
              {/* Bouton personnalisé AR (activé sur Android et iOS) */}
              <button
                slot="ar-button"
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  border: 'none',
                  padding: '12px 26px',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.45)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10,
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-vr-cardboard" style={{ fontSize: '16px' }} />
                <span>Voir dans votre pièce (RA)</span>
              </button>
            </model-viewer>

            {/* Bulle d'indication tactile / souris */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                borderRadius: '9999px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'none',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <i className="fas fa-hand-pointer" style={{ color: '#38bdf8' }} />
              <span>Glissez pour pivoter à 360° • Pincez pour zoomer</span>
            </div>
          </div>

          {/* Lien direct Apple AR Quick Look pour Safari iOS */}
          {usdzModel && (
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <a
                rel="ar"
                href={usdzModel}
                style={{
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fab fa-apple" />
                Lancer directement Apple AR Quick Look (iPhone / iPad)
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookDetailBottomSheet;
