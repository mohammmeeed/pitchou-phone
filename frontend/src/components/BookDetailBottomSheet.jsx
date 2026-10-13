import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BookDetailBottomSheet = ({ card, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 380);
  };

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => {
      handleClose();
      navigate('/explore');
    }, 800);
  };

  // Pricing helper based on card id
  const price = card.id === 5 ? '2 500 DA' : card.id === 1 ? '2 500 DA' : card.id === 2 ? '1 850 DA' : '2 100 DA';

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
            {card.video ? (
              <video 
                src={card.video} 
                poster={card.image} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="book-sheet-media"
              />
            ) : (
              <img 
                src={card.image} 
                alt={card.name} 
                className="book-sheet-media"
              />
            )}
          </div>

          {/* Book Info */}
          <div className="book-sheet-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="book-sheet-title mb-0">{card.name}, {card.age} ans</h3>
              <div className="book-sheet-price">
                {price}
              </div>
            </div>

            {/* Synopsis */}
            <div className="book-sheet-section mb-4">
              <h6 className="book-sheet-section-title">À propos de ce livre</h6>
              <p className="book-sheet-desc">
                {card.bio}
              </p>
            </div>
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
