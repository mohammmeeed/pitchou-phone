import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import TinderCardStack from '../components/TinderCardStack';
import BookDetailBottomSheet from '../components/BookDetailBottomSheet';
import { useDating } from '../context/DatingContext';

const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailCard, setDetailCard] = useState(null);
  const [favoriteToast, setFavoriteToast] = useState(null);
  const datingCtx = useDating();
  const profiles = Array.isArray(datingCtx?.profiles) ? datingCtx.profiles : [];
  const addToLiked = datingCtx?.addToLiked;

  const handleSwipeRight = (card) => {
    if (addToLiked) addToLiked(card);
    setFavoriteToast(card.name || 'Produit');
    setTimeout(() => {
      setFavoriteToast(null);
    }, 1800);
  };

  return (
    <div className="page-wrapper overflow-hidden header-large">
      {/* Toast Notification Favoris (Zéro pop-up) */}
      {favoriteToast && (
        <div 
          style={{
            position: 'fixed',
            top: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 20, 0.92)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.35)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '15px' }}>❤️</span>
          <span>Ajouté aux favoris !</span>
        </div>
      )}

      {/* Header */}
      <Header 
        showMenu={true}
        onMenuClick={() => setSidebarOpen(true)}
        showFilter={true}
        filterUrl="/filter"
        borderZero={true}
      />

      {/* Sidebar Drawer */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Page Content */}
      <div className="home-card-wrapper">
        <div className="home-card-container">
          <TinderCardStack 
            profiles={profiles} 
            onOpenDetail={(card) => setDetailCard(card)}
            onSwipeRight={handleSwipeRight}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Seamless TikTok-Style Book Detail Bottom Sheet */}
      {detailCard && (
        <BookDetailBottomSheet 
          card={detailCard}
          isOpen={Boolean(detailCard)}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
};

export default Home;
