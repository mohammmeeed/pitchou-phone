import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const Wishlist = () => {
  const datingCtx = useDating();
  const likedList = Array.isArray(datingCtx?.likedList) ? datingCtx.likedList : [];
  const removeFromLiked = datingCtx?.removeFromLiked || (() => {});

  return (
    <div className="page-wrapper">
      <Header 
        title="Favoris" 
        showBack={true} 
        backUrl="/home"
        showFilter={true}
        filterUrl="/filter"
      />

      <div className="page-content space-top p-b65">
        <div className="container">
          {likedList.length === 0 ? (
            <div className="text-center py-5">
              <div 
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: '68px', height: '68px', background: 'rgba(255, 68, 88, 0.1)' }}
              >
                <i className="feather icon-heart text-danger font-32"></i>
              </div>
              <h5 className="font-w600 mb-2">Aucun favori pour le moment</h5>
              <p className="text-muted font-13 px-3 mb-4">
                Glissez une carte vers la droite sur la page d'accueil pour l'ajouter instantanément à vos favoris.
              </p>
              <Link to="/home" className="btn btn-primary rounded-xl px-4 py-2 font-14">
                Découvrir les produits
              </Link>
            </div>
          ) : (
            <div className="row g-2">
              {likedList.map((item) => (
                <div key={item.id} className="col-6">
                  <div className="dz-media-card" style={{ position: 'relative' }}>
                    <Link to={`/profile-detail?id=${item.id}`}>
                      <div className="dz-media">
                        <img 
                          src={item.image || '/assets/images/books/book1.jpg'} 
                          alt={item.name} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/books/book1.jpg';
                          }}
                        />
                      </div>
                      <div className="dz-content">
                        <h6 className="title text-truncate">{item.name}</h6>	
                        <span className="about text-truncate d-block">
                          {item.school || item.author || (item.price ? `${Number(item.price).toLocaleString('fr-FR')} DA` : '')}
                        </span>	
                      </div>
                    </Link>

                    {/* Bouton pour retirer des favoris */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromLiked(item.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.45)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                        cursor: 'pointer'
                      }}
                      title="Retirer des favoris"
                    >
                      <i className="feather icon-heart font-14" style={{ color: '#ff4458', fill: '#ff4458' }}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Wishlist;
