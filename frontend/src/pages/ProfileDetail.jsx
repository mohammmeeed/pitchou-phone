import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useDating, initialProfiles } from '../context/DatingContext';

const API_BASE_URL = 'http://localhost:8000/api';

const ProfileDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [addedToCart, setAddedToCart] = useState(false);
  const datingCtx = useDating();
  const profiles = Array.isArray(datingCtx?.profiles) ? datingCtx.profiles : [];
  const addToCart = datingCtx?.addToCart || (() => {});

  // Trouver d'abord dans le contexte si déjà en mémoire
  const initialBook = profiles.find(p => String(p.id) === String(id)) 
    || (Array.isArray(initialProfiles) ? initialProfiles.find(p => String(p.id) === String(id)) : null)
    || (id ? null : (profiles[0] || (Array.isArray(initialProfiles) ? initialProfiles[0] : null)));

  const [dbProduct, setDbProduct] = useState(initialBook || null);

  // Récupération directe des informations du livre depuis la BDD (MySQL via PHP API)
  useEffect(() => {
    let isMounted = true;

    const fetchFromDatabase = async () => {
      try {
        const targetUrl = id 
          ? `${API_BASE_URL}/products?id=${encodeURIComponent(id)}` 
          : `${API_BASE_URL}/products`;

        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error('Erreur réseau BDD');
        const json = await res.json();

        if (isMounted && json && json.success) {
          const raw = id ? json.data : (Array.isArray(json.data) ? json.data[0] : null);
          if (raw) {
            setDbProduct({
              id: raw.id,
              name: raw.name,
              title: raw.name,
              author: raw.author || '',
              format: raw.format || '',
              price: Number(raw.price) || 0,
              stock: raw.stock || 10,
              category: raw.category || '',
              rating: raw.rating || 4.8,
              image: raw.image || '/assets/images/books/book1.jpg',
              video: raw.video || null,
              bio: raw.bio || '',
              languages: Array.isArray(raw.languages)
                ? raw.languages
                : (typeof raw.languages === 'string' && raw.languages.trim() !== ''
                    ? raw.languages.split(',').map((s) => s.trim()).filter(Boolean)
                    : [])
            });
          }
        }
      } catch (err) {
        console.warn('Utilisation des données en cache/fallback:', err);
      }
    };

    fetchFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const profile = dbProduct 
    || initialBook 
    || {
      id: id || 1,
      name: "Livre",
      author: "",
      format: "",
      price: 0,
      bio: "",
      image: "/assets/images/books/book1.jpg",
      languages: []
    };

  const handleAddToCart = () => {
    addToCart(profile);
    setAddedToCart(true);
    setTimeout(() => {
      navigate('/explore');
    }, 700);
  };

  return (
    <div className="page-wrapper">
      <Header title="Détails du produit" showBack={true} bgWhite={true} />

      <div className="page-content space-top p-b80">
        <div className="container">
          <div className="detail-area">
            <div className="dz-media-card style-2 recommendation-media-animate">
              <div className="dz-media">
                {profile.video ? (
                  <video src={profile.video} poster={profile.image} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={profile.image} alt={profile.name} />
                )}
              </div>
              <div className="dz-content">
                <div className="left-content">
                  <h4 className="title">
                    {profile.name}
                    {profile.author && profile.author.trim() !== '' && profile.author.trim().toLowerCase() !== 'auteur'
                      ? ` • ${profile.author.trim()}`
                      : ''}
                  </h4>
                  {profile.format && profile.format.trim() !== '' && profile.format.trim().toLowerCase() !== 'format' ? (
                    <p className="mb-0"><i className="icon feather icon-book-open"></i> {profile.format.trim()}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="detail-bottom-area recommendation-details-animate">
              {profile.bio && profile.bio.trim() !== '' ? (
                <div className="about">
                  <h6 className="title">À propos</h6>
                  <p className="para-text">{profile.bio.trim()}</p>					
                </div>
              ) : null}

              {Array.isArray(profile.languages) && profile.languages.filter(Boolean).length > 0 ? (
                <div className="languages mb-3">
                  <h6 className="title">Langues</h6>
                  <ul className="dz-tag-list">
                    {profile.languages.filter(Boolean).map((lang) => (
                      <li key={lang}> 
                        <div className="dz-tag">
                          <span>{lang}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bouton Ajouter au Panier & Prix */}
      <div className="footer fixed bg-white py-2" style={{ borderTop: '1px solid #f3f4f6', zIndex: 100 }}>
        <div className="container">
          <div className="d-flex align-items-center justify-content-between gap-3">
            {/* Prix à côté du bouton */}
            <div className="product-price-box" style={{ flexShrink: 0 }}>
              <span className="d-block font-11 text-muted font-w600" style={{ textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                Prix
              </span>
              <div className="d-flex align-items-baseline gap-1" style={{ marginTop: '2px' }}>
                <span className="font-20 font-w800 text-dark" style={{ lineHeight: 1 }}>
                  {Number(profile.price || 0).toLocaleString('fr-FR')}
                </span>
                <span className="font-13 font-w700 text-primary">DA</span>
              </div>
            </div>

            {/* Bouton Ajouter au panier */}
            <button 
              type="button" 
              onClick={handleAddToCart}
              className={`btn btn-lg dz-flex-box btn-shadow rounded-xl flex-grow-1 ${addedToCart ? 'btn-success' : 'btn-gradient'}`}
              style={{ height: '52px', fontSize: '14px', fontWeight: 700, gap: '8px', flex: 1 }}
            >
              {addedToCart ? (
                <>
                  <i className="icon feather icon-check font-18"></i>
                  <span>Ajouté au panier !</span>
                </>
              ) : (
                <>
                  <i className="icon feather icon-shopping-cart font-18"></i>
                  <span>AJOUTER AU PANIER</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
