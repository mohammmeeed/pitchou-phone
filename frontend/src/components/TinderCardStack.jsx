import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const TinderCardStack = ({ profiles = [], onOpenDetail }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
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

  if (!profiles || profiles.length === 0) return null;

  const activeCard = profiles[currentIndex];
  const nextIndex = (currentIndex + 1) % profiles.length;
  const prevIndex = (currentIndex - 1 + profiles.length) % profiles.length;
  const nextCard = profiles[nextIndex];
  const prevCard = profiles[prevIndex];

  // Mouse wheel navigation (scroll down = next card from below, scroll up = prev card from above)
  const handleWheel = (e) => {
    if (animating || dragState.active || wheelLock.current) return;
    if (Math.abs(e.deltaY) > 25) {
      wheelLock.current = true;
      if (e.deltaY > 0) {
        startSlide('slide-up');
      } else {
        startSlide('slide-down');
      }
      setTimeout(() => {
        wheelLock.current = false;
      }, 380);
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

    setDragState(prev => ({
      ...prev,
      dx,
      dy,
    }));
  };

  const handleTouchEnd = () => {
    if (!dragState.active || animating) return;
    const { dx, dy } = dragState;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    const cardWidth = containerRef.current?.offsetWidth || 380;
    const threshold = cardWidth * 0.28;

    if (isHorizontal) {
      if (dx > threshold) {
        startSlide('to-right');
      } else if (dx < -threshold) {
        startSlide('to-left');
      } else {
        startSlide('reset');
      }
    } else {
      if (dy < -50) {
        // Swiped UP -> Next card slides in from below (comme TikTok)
        startSlide('slide-up');
      } else if (dy > 50) {
        // Swiped DOWN -> Previous card slides in from above
        startSlide('slide-down');
      } else {
        startSlide('reset');
      }
    }
  };

  const startSlide = (direction) => {
    setAnimating(true);
    setAnimatingDir(direction);
    setDragState({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });

    if (direction === 'reset') {
      setTimeout(() => {
        setAnimating(false);
        setAnimatingDir('');
      }, 250);
      return;
    }

    setTimeout(() => {
      if (direction === 'slide-down') {
        setCurrentIndex(prevIndex);
      } else {
        setCurrentIndex(nextIndex);
      }
      setAnimating(false);
      setAnimatingDir('');
    }, 300);
  };

  // Determine dynamic positions
  const { active, dx, dy } = dragState;
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  const cardWidth = containerRef.current?.offsetWidth || 380;

  // Progression exacte 1:1 à mesure que la carte se rapproche du bord latéral
  const lateralProgress = Math.min(Math.max(Math.abs(dx) / cardWidth, 0), 1);

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

  if (active) {
    if (isHorizontal) {
      // Reste strictement horizontale sans s'incliner (ne s'incline pas)
      activeStyle.transform = `translateX(${dx}px)`;
      activeStyle.transition = 'none';

      // À mesure que la carte se rapproche du bord latéral, la carte suivante remonte dans la même proportion
      nextStyle.transform = `translateY(${(1 - lateralProgress) * 100}%)`;
      nextStyle.transition = 'none';
      nextStyle.display = 'block';
      prevStyle.display = 'none';
    } else {
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
    }
  } else if (animating) {
    const ease = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    if (animatingDir === 'slide-up') {
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
    } else if (animatingDir === 'to-right') {
      activeStyle.transform = 'translateX(110%)';
      activeStyle.opacity = 0;
      activeStyle.transition = 'all 0.3s ease-out';
      nextStyle.transform = 'translateY(0)';
      nextStyle.transition = ease;
    } else if (animatingDir === 'to-left') {
      activeStyle.transform = 'translateX(-110%)';
      activeStyle.opacity = 0;
      activeStyle.transition = 'all 0.3s ease-out';
      nextStyle.transform = 'translateY(0)';
      nextStyle.transition = ease;
    } else if (animatingDir === 'reset') {
      activeStyle.transform = 'translate(0, 0)';
      activeStyle.transition = 'transform 0.25s ease-out';
      nextStyle.transform = 'translateY(100%)';
      nextStyle.transition = 'transform 0.25s ease-out';
      prevStyle.transform = 'translateY(-100%)';
      prevStyle.transition = 'transform 0.25s ease-out';
    }
  } else {
    activeStyle.transform = 'translateY(0)';
  }

  const likeOpacity = active && isHorizontal && dx > 0 ? Math.min(dx / 80, 1) : animatingDir === 'to-right' ? 1 : 0;
  const rejectOpacity = active && isHorizontal && dx < 0 ? Math.min(Math.abs(dx) / 80, 1) : animatingDir === 'to-left' ? 1 : 0;
  const greenBorderOpacity = active && isHorizontal && dx > 0 ? Math.min(dx / 50, 1) : animatingDir === 'to-right' ? 1 : 0;

  // Render card helper
  const renderCardContent = (card, isCurrent = false) => {
    return (
      <>
        <div className="dz-media">
          {card.video ? (
            <video 
              src={card.video} 
              poster={card.image}
              autoPlay 
              loop 
              muted 
              playsInline 
            />
          ) : (
            <img src={card.image} alt={card.name} />
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
                {card.author && (
                  <span style={{ fontSize: '0.78em', opacity: 0.85, fontWeight: 400, marginLeft: '6px' }}>
                    • {card.author}
                  </span>
                )}
              </span>
            </h4>
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
          className="dzSwipe_card card-prev"
          style={prevStyle}
        >
          {renderCardContent(prevCard, false)}
        </div>
      )}

      {/* Next Card (Positioned Below vertically like TikTok) */}
      {nextCard && (
        <div 
          className="dzSwipe_card card-next"
          style={nextStyle}
        >
          {renderCardContent(nextCard, false)}
        </div>
      )}

      {/* Active Card (Current) */}
      {activeCard && (
        <div 
          className={`dzSwipe_card card-active ${animatingDir}`}
          style={activeStyle}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderCardContent(activeCard, true)}

          {/* Dynamic Green Border when Swiping Right */}
          <div 
            className="dz-swipe-border-green" 
            style={{ opacity: greenBorderOpacity }}
          />

          {/* Dynamic Action Badges for Horizontal Swipes */}
          <div 
            className="dzSwipe_card__option dzReject"
            style={{ opacity: rejectOpacity }}
          >
            <i className="fa-solid fa-xmark"></i>
          </div>
          <div 
            className="dzSwipe_card__option dzLike"
            style={{ opacity: likeOpacity }}
          >
            <i className="fa-solid fa-check"></i>
          </div>

          <div className="dzSwipe_card__drag"></div>
        </div>
      )}
    </div>
  );
};

export default TinderCardStack;
