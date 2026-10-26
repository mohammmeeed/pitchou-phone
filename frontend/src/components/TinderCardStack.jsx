import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const TinderCardStack = ({ 
  profiles = [], 
  onOpenDetail, 
  onSwipeRight, 
  onResetFilters,
  onIndexChange,
  initialIndex = 0
}) => {
  const datingCtx = useDating();
  const addToLiked = datingCtx?.addToLiked;
  const isLiked = datingCtx?.isLiked;
  const removeFromLiked = datingCtx?.removeFromLiked;

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    } else if (datingCtx?.setActiveFilters) {
      datingCtx.setActiveFilters({
        search: '',
        categories: [],
        languages: [],
        maxPrice: 6000
      });
    }
  };

  const [currentIndex, setCurrentIndex] = useState(() => {
    return initialIndex < profiles.length ? initialIndex : 0;
  });
  const [dragState, setDragState] = useState({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
  });
  const [animating, setAnimating] = useState(false);
  const [animatingDir, setAnimatingDir] = useState(''); // 'to-left' | 'to-right' | 'slide-up' | 'slide-down' | 'reset'

  const wheelLock = useRef(false);
  const containerRef = useRef(null);

  const safeIndex = profiles.length > 0 ? (currentIndex < profiles.length ? currentIndex : 0) : 0;
  const activeCard = profiles.length > 0 ? profiles[safeIndex] : null;
  const nextIndex = profiles.length > 0 ? (safeIndex + 1) % profiles.length : 0;
  const prevIndex = profiles.length > 0 ? (safeIndex - 1 + profiles.length) % profiles.length : 0;
  const nextCard = profiles.length > 0 ? profiles[nextIndex] : null;
  const prevCard = profiles.length > 0 ? profiles[prevIndex] : null;

  // Reset index if profiles length changed
  useEffect(() => {
    if (currentIndex >= profiles.length) {
      setCurrentIndex(0);
    }
  }, [profiles.length, currentIndex]);

  // Notifier le parent (Home) de l'index du livre actuellement affiché
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(safeIndex);
    }
  }, [safeIndex, onIndexChange]);

  // Préchargement intelligent de l'image suivante (avec debounce de 100ms pour le scroll rapide)
  useEffect(() => {
    if (!nextCard || !nextCard.image) return;
    const timer = setTimeout(() => {
      const img = new Image();
      img.src = nextCard.image;
    }, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, nextCard?.image]);

  const loadingProducts = datingCtx?.loadingProducts;

  if (loadingProducts) {
    return null;
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '26px',
            color: '#9ca3af'
          }}
        >
          <i className="icon feather icon-search"></i>
        </div>
        <h5 style={{ fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Aucun livre trouvé</h5>
        <p style={{ fontSize: '13px', maxWidth: '260px', margin: '0 auto 18px', color: '#6b7280' }}>
          Aucun livre ne correspond à votre recherche ou à vos filtres.
        </p>
        <button 
          type="button"
          onClick={handleResetFilters}
          className="btn btn-primary btn-sm rounded-pill"
          style={{ padding: '9px 24px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Réinitialiser la recherche
        </button>
      </div>
    );
  }

  // Mouse wheel navigation (scroll down = next card from below, scroll up = prev card from above)
  const handleWheel = (e) => {
    if (animating || dragState.active || wheelLock.current) return;
    if (Math.abs(e.deltaY) > 35) {
      wheelLock.current = true;
      if (e.deltaY > 0) {
        startSlide('slide-up');
      } else {
        startSlide('slide-down');
      }
      setTimeout(() => {
        wheelLock.current = false;
      }, 420);
    }
  };

  const handleTouchStart = (e) => {
    if (animating || !activeCard) return;
    const touch = e.touches ? e.touches[0] : e;
    setDragState({
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      dx: 0,
      dy: 0,
    });
  };

  const handleTouchMove = (e) => {
    if (!dragState.active || animating) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - dragState.startX;
    const dy = touch.clientY - dragState.startY;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    setDragState(prev => ({
      ...prev,
      dx,
      dy,
      isHorizontal,
    }));
  };

  const handleTouchEnd = () => {
    if (!dragState.active || animating) return;
    const { dx, dy, isHorizontal } = dragState;

    // Geste Horizontal vers la Droite -> Swipe to Cart (+ Panier)
    if (isHorizontal && dx > 60) {
      startSlide('to-right');
      return;
    }

    // Geste Vertical (TikTok Feed)
    if (!isHorizontal) {
      if (dy < -50) {
        // Swiped UP -> Carte suivante venant du bas (style TikTok)
        startSlide('slide-up');
        return;
      } else if (dy > 50) {
        // Swiped DOWN -> Carte précédente venant du haut
        startSlide('slide-down');
        return;
      }
    }

    // Si pas de seuil atteint -> Réinitialisation fluide
    startSlide('reset');
  };

  const startSlide = (direction) => {
    setAnimating(true);
    setAnimatingDir(direction);
    setDragState({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, isHorizontal: false });

    if (direction === 'reset') {
      setTimeout(() => {
        setAnimating(false);
        setAnimatingDir('');
      }, 250);
      return;
    }

    // Si Swipe à droite -> Ajouter au panier
    if (direction === 'to-right' && activeCard) {
      if (onSwipeRight) {
        onSwipeRight(activeCard);
      }
    }

    setTimeout(() => {
      if (direction === 'slide-down') {
        setCurrentIndex(prevIndex);
      } else {
        // slide-up et to-right passent tous deux à la carte suivante
        setCurrentIndex(nextIndex);
      }
      setAnimating(false);
      setAnimatingDir('');
    }, 300);
  };

  // Determine dynamic positions (Vertical TikTok + Horizontal Swipe Right)
  const { active, dx, dy, isHorizontal } = dragState;

  let activeStyle = {
    touchAction: 'none',
  };
  let nextStyle = {
    transform: 'translateY(100%)',
    display: 'block',
  };
  let prevStyle = {
    transform: 'translateY(-100%)',
    display: 'block',
  };

  const isSwipingRight = active && isHorizontal && dx > 0;
  const greenBorderOpacity = isSwipingRight ? Math.min(dx / 70, 1) : 0;
  const cartBadgeOpacity = isSwipingRight ? Math.min(dx / 50, 1) : 0;

  if (active) {
    if (isHorizontal && dx > 0) {
      // Glissement vers la droite (Swipe to cart)
      const rot = Math.min(dx * 0.04, 12);
      activeStyle.transform = `translate(${dx}px, ${dy * 0.15}px) rotate(${rot}deg)`;
      activeStyle.transition = 'none';
      activeStyle.zIndex = 10;
      
      // La carte suivante se prépare dessous
      nextStyle.transform = `translateY(0) scale(${0.94 + Math.min(dx / 500, 0.06)})`;
      nextStyle.opacity = 0.4 + Math.min(dx / 120, 0.6);
      nextStyle.transition = 'none';
      prevStyle.display = 'none';
    } else if (!isHorizontal) {
      activeStyle.transform = `translateY(${dy}px)`;
      activeStyle.transition = 'none';
      if (dy < 0) {
        // Dragging UP -> Next card enters from below
        nextStyle.transform = `translateY(calc(100% + ${dy}px))`;
        nextStyle.transition = 'none';
        prevStyle.display = 'none';
      } else {
        // Dragging DOWN -> Prev card enters from above
        prevStyle.transform = `translateY(calc(-100% + ${dy}px))`;
        prevStyle.transition = 'none';
        nextStyle.display = 'none';
      }
    } else {
      // Glissement gauche (résistance)
      activeStyle.transform = `translateX(${dx * 0.25}px)`;
      activeStyle.transition = 'none';
    }
  } else if (animating) {
    const ease = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    if (animatingDir === 'to-right') {
      activeStyle.transform = 'translate(130%, 0) rotate(16deg)';
      activeStyle.opacity = 0;
      activeStyle.transition = 'transform 0.3s ease-out, opacity 0.25s ease-out';
      activeStyle.zIndex = 10;
      nextStyle.transform = 'translateY(0) scale(1)';
      nextStyle.opacity = 1;
      nextStyle.transition = ease;
      prevStyle.display = 'none';
    } else if (animatingDir === 'slide-up') {
      activeStyle.transform = 'translateY(-100%)';
      activeStyle.transition = ease;
      nextStyle.transform = 'translateY(0)';
      nextStyle.transition = ease;
      prevStyle.display = 'none';
    } else if (animatingDir === 'slide-down') {
      activeStyle.transform = 'translateY(100%)';
      activeStyle.transition = ease;
      prevStyle.transform = 'translateY(0)';
      prevStyle.transition = ease;
      nextStyle.display = 'none';
    } else if (animatingDir === 'reset') {
      activeStyle.transform = 'translate(0, 0) rotate(0deg)';
      activeStyle.transition = 'transform 0.25s ease-out';
      nextStyle.transform = 'translateY(100%)';
      nextStyle.transition = 'transform 0.25s ease-out';
      prevStyle.transform = 'translateY(-100%)';
      prevStyle.transition = 'transform 0.25s ease-out';
    }
  } else {
    activeStyle.transform = 'translateY(0)';
  }
  // Render card helper
  const renderCardContent = (card, isCurrent = false) => {
    const isCardFavorited = isLiked ? isLiked(card.id) : false;

    return (
      <>
        <div className="dz-media">
          {card.video ? (
            <video 
              key={`vid-${card.id}`}
              src={card.video} 
              poster={card.image}
              autoPlay 
              loop 
              muted 
              playsInline 
            />
          ) : (
            <img 
              key={`img-${card.id}`}
              src={card.image} 
              alt={card.name} 
              loading="eager"
              decoding="async"
            />
          )}
        </div>
        <div className="dz-content">
          <div className="left-content">
            <h4 className="title">
              <span 
                className="book-title-clickable"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onOpenDetail) {
                    onOpenDetail(card);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {card.name}
                {card.author && card.author.trim() !== '' && card.author.trim().toLowerCase() !== 'auteur' && (
                  <span style={{ fontSize: '0.78em', opacity: 0.85, fontWeight: 400, marginLeft: '6px' }}>
                    • {card.author.trim()}
                  </span>
                )}
              </span>
            </h4>
          </div>

          <div className="card-bottom-row d-flex align-items-center justify-content-between w-100">
            <div className="card-price-wrap" style={{ width: 'auto', margin: 0 }}>
              <span className="card-price-value">
                {card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : (card.priceFormatted || '')}
              </span>
            </div>

            <button
              type="button"
              className="card-view-more-btn"
              style={{
                width: 'auto',
                maxWidth: 'fit-content',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                lineHeight: 1,
                flexShrink: 0
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onOpenDetail) {
                  onOpenDetail(card);
                }
              }}
            >
              <span>Voir plus</span>
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#000000" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="dzSwipe_card-cont dz-gallery-slider tiktok-feed-container"
      onWheel={handleWheel}
    >
      {/* Previous Card (Positioned Above vertically) */}
      {prevCard && (
        <div 
          key={`prev-${prevCard.id}`}
          className="dzSwipe_card card-prev"
          style={prevStyle}
        >
          {renderCardContent(prevCard, false)}
        </div>
      )}

      {/* Next Card (Positioned Below vertically like TikTok) */}
      {nextCard && (
        <div 
          key={`next-${nextCard.id}`}
          className="dzSwipe_card card-next"
          style={nextStyle}
        >
          {renderCardContent(nextCard, false)}
        </div>
      )}

      {/* Active Card (Current) */}
      {activeCard && (
        <div 
          key={`active-${activeCard.id}`}
          data-product-id={activeCard.id}
          className={`dzSwipe_card card-active ${animatingDir}`}
          style={activeStyle}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderCardContent(activeCard, true)}

          {/* Bordure verte lumineuse lors du swipe à droite */}
          <div 
            className="dz-swipe-border-green" 
            style={{ 
              opacity: greenBorderOpacity,
              borderColor: '#209f84',
              boxShadow: 'inset 0 0 20px rgba(32, 159, 132, 0.45), 0 0 15px rgba(32, 159, 132, 0.3)'
            }}
          />

          {/* Badge dynamique AJOUTER AU PANIER */}
          <div 
            style={{ 
              position: 'absolute',
              top: '40px',
              left: '25px',
              opacity: cartBadgeOpacity,
              background: '#209f84',
              color: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '13.5px',
              letterSpacing: '0.5px',
              boxShadow: '0 8px 24px rgba(32, 159, 132, 0.5)',
              transform: `scale(${0.85 + Math.min(cartBadgeOpacity * 0.2, 0.2)}) rotate(-8deg)`,
              pointerEvents: 'none',
              zIndex: 20,
              transition: 'transform 0.1s ease'
            }}
          >
            <i className="icon feather icon-shopping-cart" style={{ fontSize: '18px' }}></i>
            <span>+ PANIER</span>
          </div>

          <div className="dzSwipe_card__drag"></div>
        </div>
      )}
    </div>
  );
};

export default TinderCardStack;
