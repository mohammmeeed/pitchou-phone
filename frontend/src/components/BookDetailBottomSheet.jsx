import React, { useState, useEffect } from 'react';
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
    languages: bookLanguages
  };

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

    // Ajouter les photos
    parsedImages.forEach((img) => {
      if (img && typeof img === 'string' && img.trim() !== '') {
        items.push({ type: 'image', url: img.trim() });
      }
    });

    // Ajouter les vidéos
    parsedVideos.forEach((vid) => {
      if (vid && typeof vid === 'string' && vid.trim() !== '') {
        items.push({ type: 'video', url: vid.trim() });
      }
    });

    return items.length > 0 
      ? items 
      : [{ type: 'image', url: activeBook.image || '/assets/images/books/book1.jpg' }];
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

  const handleAddToCart = () => {
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
            {/* Slider Track */}
            <div 
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
                      poster={activeBook.image} 
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
                        e.target.src = '/assets/images/books/book1.jpg';
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
                      <div className="book-sheet-thumb-video-icon">
                        <i className="feather icon-play"></i>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={`Miniature ${thumbIdx + 1}`} 
                        className="book-sheet-thumb-img" 
                        onError={(e) => { e.target.src = '/assets/images/books/book1.jpg'; }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Book Info */}
          <div className="book-sheet-body">
            <div className="mb-2">
              <h3 className="book-sheet-title mb-0">{activeName}</h3>
              {hasAuthor ? (
                <span className="text-muted d-block" style={{ fontSize: '13px', marginTop: '3px' }}>
                  Par {rawAuthor}
                </span>
              ) : null}
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
