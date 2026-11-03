import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import BookDetailBottomSheet from '../components/BookDetailBottomSheet';
import { useDating } from '../context/DatingContext';
import { useTheme } from '../context/ThemeContext';

// Helper pour créer un slug URL propre et lisible (gère le français, l'arabe, les accents et les émojis)
export const slugifyCategory = (name) => {
  if (!name) return '';
  if (name === '__favorites__') return 'favoris';
  let str = String(name).trim().toLowerCase();

  // Supprimer les marques diacritiques (accents latins é, è, etc.)
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Conserver TOUTES les lettres et chiffres de toutes les langues (\p{L} et \p{N} avec drapeau unicode u)
  // et remplacer les espaces, symboles et emojis par des tirets
  str = str.replace(/[^\p{L}\p{N}]+/gu, '-');

  // Supprimer les tirets au début et à la fin
  str = str.replace(/^-+|-+$/g, '');

  // Sécurité de secours si la catégorie ne contenait que des symboles ou émojis
  if (!str) {
    str = encodeURIComponent(String(name).trim());
  }

  return str;
};

const Wishlist = ({ defaultCategory = null }) => {
  const navigate = useNavigate();
  const routeParams = useParams();
  const [searchParams] = useSearchParams();

  // Accepte le paramètre d'URL propre /categories/:category, query param ?cat=, ou prop defaultCategory
  const rawParam = routeParams.category || searchParams.get('cat') || defaultCategory || null;

  const datingCtx = useDating();
  const { accentColor } = useTheme();
  const primaryColor = accentColor || 'var(--primary, #2563eb)';
  const allProfiles = Array.isArray(datingCtx?.allProfiles) ? datingCtx.allProfiles : [];
  const likedList = Array.isArray(datingCtx?.likedList) ? datingCtx.likedList : [];
  const removeFromLiked = datingCtx?.removeFromLiked || (() => {});
  const addToLiked = datingCtx?.addToLiked || (() => {});
  const isLiked = datingCtx?.isLiked || ((id) => likedList.some(item => String(item.id) === String(id)));
  const [searchQuery, setSearchQuery] = useState('');
  const [dbCategories, setDbCategories] = useState([]);
  const [dbSubcategories, setDbSubcategories] = useState({});
  const [dbCategoryImages, setDbCategoryImages] = useState({});
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [sortBy, setSortBy] = useState('count'); // 'count' | 'az' | 'za'
  const [detailCard, setDetailCard] = useState(null);

  // Alterner le tri : Populaire (nombre de livres) -> A-Z -> Z-A -> Populaire
  const handleToggleSort = () => {
    setSortBy(prev => {
      if (prev === 'count') return 'az';
      if (prev === 'az') return 'za';
      return 'count';
    });
  };

  const [cardStyle, setCardStyle] = useState(() => {
    try {
      return localStorage.getItem('category_card_style') || 'home_card';
    } catch (e) {
      return 'home_card';
    }
  });

  // Récupérer les catégories enregistrées et le style de carte depuis l'API backend
  useEffect(() => {
    fetch('/api/attributes')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (Array.isArray(data.categories)) {
            setDbCategories(data.categories);
          }
          if (data.subcategories && typeof data.subcategories === 'object') {
            setDbSubcategories(data.subcategories);
          }
          if (data.category_images && typeof data.category_images === 'object') {
            setDbCategoryImages(data.category_images);
          }
        }
      })
      .catch(() => {});

    fetch('/api/parameters')
      .then(res => res.json())
      .then(data => {
        if (data?.settings?.category_card_style) {
          setCardStyle(data.settings.category_card_style);
          try {
            localStorage.setItem('category_card_style', data.settings.category_card_style);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Construire la liste des catégories avec leurs images de couverture et nombre de produits
  const categoriesList = useMemo(() => {
    const catMap = new Map();

    // 1. Initialiser avec les catégories de la base de données
    dbCategories.forEach((name) => {
      const clean = (name || '').trim();
      if (clean) {
        const customImg = dbCategoryImages[clean] || null;
        const subs = dbSubcategories[clean] || [];
        catMap.set(clean, { 
          name: clean, 
          count: 0, 
          image: customImg, 
          hasCustomImage: !!customImg,
          subcategories: subs 
        });
      }
    });

    // 2. Parcourir les produits pour calculer les totaux exacts (1 produit = 1 compte par catégorie)
    allProfiles.forEach((item) => {
      const pCats = Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories
        : (typeof item.category === 'string' && item.category.trim() !== ''
            ? item.category.split(',').map((s) => s.trim())
            : (Array.isArray(item.interests) ? item.interests : []));

      const coverImg = item.image || (Array.isArray(item.images) && item.images[0]) || null;

      // Dédupliquer les catégories parentes pour ce produit
      const seenParentsForThisProduct = new Set();

      pCats.forEach((c) => {
        const clean = (c || '').trim();
        if (!clean) return;

        // Trouver la catégorie parente correspondante
        let targetCat = null;
        if (catMap.has(clean)) {
          targetCat = clean;
        } else {
          for (const [parentName, parentData] of catMap.entries()) {
            if (parentData.subcategories && parentData.subcategories.includes(clean)) {
              targetCat = parentName;
              break;
            }
          }
        }

        const catKey = targetCat || clean;
        seenParentsForThisProduct.add(catKey);
      });

      // Incrémenter chaque catégorie parente trouvée exactement UNE FOIS par produit
      seenParentsForThisProduct.forEach((catKey) => {
        const customImg = dbCategoryImages[catKey] || null;
        if (!catMap.has(catKey)) {
          catMap.set(catKey, { 
            name: catKey, 
            count: 1, 
            image: customImg || coverImg, 
            hasCustomImage: !!customImg,
            subcategories: dbSubcategories[catKey] || []
          });
        } else {
          const entry = catMap.get(catKey);
          entry.count += 1;
          if (!entry.hasCustomImage && !entry.image && coverImg) {
            entry.image = coverImg;
          }
        }
      });
    });

    return Array.from(catMap.values());
  }, [dbCategories, dbSubcategories, dbCategoryImages, allProfiles]);

  // Résoudre le nom réel de la catégorie à partir du slug d'URL ou du paramètre
  const selectedCategory = useMemo(() => {
    if (!rawParam) return null;
    let cleanParam = '';
    try {
      cleanParam = decodeURIComponent(rawParam).trim();
    } catch (e) {
      cleanParam = String(rawParam).trim();
    }
    if (cleanParam === 'favoris' || cleanParam === '__favorites__') {
      return '__favorites__';
    }

    const paramSlug = slugifyCategory(cleanParam);

    // 1. Chercher dans categoriesList
    const match = categoriesList.find((cat) => {
      if (!cat || !cat.name) return false;
      return (
        slugifyCategory(cat.name) === paramSlug || 
        cat.name.toLowerCase().trim() === cleanParam.toLowerCase() ||
        slugifyCategory(cat.name) === cleanParam.toLowerCase()
      );
    });
    if (match) return match.name;

    // 2. Chercher dans dbCategories
    const dbMatch = dbCategories.find((cat) => {
      const c = (cat || '').trim();
      return (
        slugifyCategory(c) === paramSlug || 
        c.toLowerCase() === cleanParam.toLowerCase() ||
        slugifyCategory(c) === cleanParam.toLowerCase()
      );
    });
    if (dbMatch) return dbMatch;

    // 3. Chercher dans allProfiles
    for (const book of allProfiles) {
      const bCats = Array.isArray(book.categories) && book.categories.length > 0
        ? book.categories
        : (typeof book.category === 'string' && book.category.trim() !== ''
            ? book.category.split(',').map((s) => s.trim())
            : (Array.isArray(book.interests) ? book.interests : []));
      for (const c of bCats) {
        if (
          slugifyCategory(c) === paramSlug || 
          (c || '').toLowerCase().trim() === cleanParam.toLowerCase() ||
          slugifyCategory(c) === cleanParam.toLowerCase()
        ) {
          return c;
        }
      }
    }

    return cleanParam.replace(/-/g, ' ');
  }, [rawParam, categoriesList, dbCategories, allProfiles]);

  const setSelectedCategory = (cat) => {
    if (cat) {
      if (cat === '__favorites__') {
        navigate('/categories/favoris');
      } else {
        const slug = slugifyCategory(cat);
        navigate(`/categories/${slug || encodeURIComponent(cat)}`);
      }
    } else {
      navigate('/categories');
    }
  };

  // Trier et filtrer les catégories
  const filteredCategories = useMemo(() => {
    let list = [...categoriesList];

    // Tri sélectionné
    if (sortBy === 'az') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }));
    } else if (sortBy === 'za') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'fr', { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => b.count - a.count);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((cat) => (cat.name || '').toLowerCase().includes(q));
  }, [categoriesList, sortBy, searchQuery]);

  // Réinitialiser la sous-catégorie sélectionnée lors du changement de catégorie
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory]);

  // Produits de la catégorie sélectionnée (et sous-catégorie)
  const filteredBooks = useMemo(() => {
    if (!selectedCategory) return [];

    if (selectedCategory === '__favorites__') {
      return likedList;
    }

    const selLower = selectedCategory.toLowerCase().trim();
    const selSlug = slugifyCategory(selectedCategory);
    const categorySubs = (dbSubcategories[selectedCategory] || []).map(s => s.toLowerCase().trim());
    const activeSubLower = selectedSubcategory ? selectedSubcategory.toLowerCase().trim() : null;

    return allProfiles.filter((prod) => {
      const pCats = Array.isArray(prod.categories) && prod.categories.length > 0
        ? prod.categories
        : (typeof prod.category === 'string' && prod.category.trim() !== ''
            ? prod.category.split(',').map((s) => s.trim())
            : (Array.isArray(prod.interests) ? prod.interests : []));

      if (activeSubLower) {
        return pCats.some((c) => (c || '').toLowerCase().trim() === activeSubLower || slugifyCategory(c || '') === slugifyCategory(selectedSubcategory));
      }

      return pCats.some((c) => {
        const cTrimmed = (c || '').trim();
        if (!cTrimmed) return false;
        const cLower = cTrimmed.toLowerCase();
        if (cLower === selLower) return true;
        if (selSlug && slugifyCategory(cTrimmed) === selSlug) return true;
        if (categorySubs.includes(cLower)) return true;
        return false;
      });
    });
  }, [selectedCategory, selectedSubcategory, dbSubcategories, likedList, allProfiles]);

  // Pagination progressive (Infinite Scroll) pour affichage instantané des livres
  const [visibleBooksCount, setVisibleBooksCount] = useState(24);
  const sentinelRef = useRef(null);

  // Réinitialiser le compteur et remonter en haut lors du changement de catégorie
  useEffect(() => {
    setVisibleBooksCount(24);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedCategory]);

  // Détecteur de défilement proactif ultra-fluide (IntersectionObserver déclenche 600px à l'avance sans aucun arrêt)
  useEffect(() => {
    if (!selectedCategory) return;

    const target = sentinelRef.current;
    if (target && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0] && entries[0].isIntersecting) {
            setVisibleBooksCount((prev) => (prev < filteredBooks.length ? prev + 24 : prev));
          }
        },
        { rootMargin: '600px 0px' }
      );
      observer.observe(target);
      return () => observer.disconnect();
    }

    // Fallback scroll listener
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 600) {
        setVisibleBooksCount((prev) => (prev < filteredBooks.length ? prev + 24 : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedCategory, filteredBooks.length, visibleBooksCount]);

  // Livres affichés par tranche de 24 (chargement 0 milliseconde)
  const displayedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleBooksCount);
  }, [filteredBooks, visibleBooksCount]);

  // Titre dynamique dans le header
  const headerTitle = useMemo(() => {
    if (!selectedCategory) return 'Catégories';
    if (selectedCategory === '__favorites__') return 'Mes Favoris';
    return selectedCategory;
  }, [selectedCategory]);

  return (
    <div className="page-wrapper">
      <Header 
        title={headerTitle} 
        showBack={true} 
        backUrl={selectedCategory ? undefined : '/'}
        onBackClick={selectedCategory ? () => setSelectedCategory(null) : undefined}
      />

      <div className="page-content space-top" style={{ paddingBottom: 'calc(115px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="container">
          
          {/* =========================================================================
              VUE 1 : GRILLE 2x2 DES CATÉGORIES (AVEC CARTE FAVORIS EN DÉBUT)
              ========================================================================= */}
          {!selectedCategory ? (
            <div>
              {/* Barre de recherche avec bouton de classement A-Z */}
              <div className="mb-2" style={{ position: 'relative' }}>
                <i 
                  className="feather icon-search" 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#94a3b8', 
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}
                />
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Rechercher une catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    paddingLeft: '38px', 
                    paddingRight: searchQuery ? '94px' : '68px',
                    borderRadius: '12px', 
                    fontSize: '13px',
                    height: '42px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '64px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <i className="feather icon-x" style={{ fontSize: '13px' }}></i>
                  </button>
                )}

                {/* Bouton pour classer de A à Z */}
                <button
                  type="button"
                  onClick={handleToggleSort}
                  title={
                    sortBy === 'az' 
                      ? 'Classé de A à Z (Cliquer pour Z à A)' 
                      : sortBy === 'za' 
                        ? 'Classé de Z à A (Cliquer pour trier par popularité)' 
                        : 'Classer les catégories de A à Z'
                  }
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: sortBy !== 'count' ? `1.5px solid ${primaryColor}` : '1px solid #e2e8f0',
                    backgroundColor: sortBy !== 'count' ? (accentColor ? `${accentColor}15` : 'rgba(37, 99, 235, 0.08)') : '#f8fafc',
                    color: sortBy !== 'count' ? primaryColor : '#64748b',
                    fontWeight: 700,
                    fontSize: '11px',
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: sortBy !== 'count' ? `0 2px 6px ${accentColor ? `${accentColor}33` : 'rgba(37, 99, 235, 0.2)'}` : 'none'
                  }}
                >
                  <span>{sortBy === 'za' ? 'Z-A' : 'A-Z'}</span>
                  {sortBy === 'az' && <i className="feather icon-arrow-down" style={{ fontSize: '10px', strokeWidth: '2.5' }}></i>}
                  {sortBy === 'za' && <i className="feather icon-arrow-up" style={{ fontSize: '10px', strokeWidth: '2.5' }}></i>}
                </button>
              </div>

              {/* Grille 2x4 défilable des catégories (Exactement 8 cartes : 4 lignes x 2 colonnes par écran) */}
              <div className="row g-2 categories-grid-2x2">
                
                {/* CATÉGORIES EN GRILLE 2x4 */}
                {filteredCategories.map((cat) => (
                  <div key={cat.name} className="col-6">
                    <div 
                      className="dz-media-card style-3"
                      onClick={() => setSelectedCategory(cat.name)}
                      style={{ 
                        position: 'relative', 
                        cursor: 'pointer',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#1e293b',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div className="dz-media" style={{ height: '100%', position: 'absolute', width: '100%' }}>
                        <img 
                          src={cat.image || '/assets/images/categories/telephones.svg'} 
                          alt={cat.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/categories/telephones.svg';
                          }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.2) 80%, transparent 100%)' }} />
                      </div>

                      <div 
                        className="dz-content" 
                        style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          width: '100%', 
                          padding: '8px 10px', 
                          zIndex: 2,
                          textAlign: 'left',
                          boxSizing: 'border-box'
                        }}
                      >
                        <h6 
                          className="title text-white mb-0" 
                          style={{ 
                            fontSize: '17px', 
                            fontWeight: 800, 
                            lineHeight: 1.15,
                            letterSpacing: '-0.2px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)'
                          }}
                        >
                          {cat.name}
                        </h6>

                        <span 
                          className="about d-block text-truncate" 
                          style={{ 
                            fontSize: '11px', 
                            color: '#94a3b8', 
                            opacity: 0.95,
                            marginTop: '1px',
                            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)'
                          }}
                        >
                          {cat.count} article{cat.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCategories.length === 0 && (
                <div className="text-center py-5">
                  <i className="feather icon-folder font-32 text-muted mb-2 d-block"></i>
                  <p className="text-muted font-13">Aucune catégorie ne correspond à votre recherche.</p>
                </div>
              )}
            </div>
          ) : (
            
            /* =========================================================================
               VUE 2 : GRILLE 2x2 DES PRODUITS FILTRÉS PAR LA CATÉGORIE OU FAVORIS
               ========================================================================= */
            <div>
              {/* Bouton de retour vers toutes les catégories */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="btn btn-sm btn-light rounded-pill px-3 py-1 font-12 d-inline-flex align-items-center gap-1 shadow-sm"
                  style={{ color: '#0f172a', fontWeight: 600, border: '1px solid #e2e8f0' }}
                >
                  <i className="feather icon-arrow-left"></i> Toutes les catégories
                </button>
                <span className="text-muted font-12" style={{ fontWeight: 600 }}>
                  {filteredBooks.length} article{filteredBooks.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Barre des sous-catégories (ex: Samsung, Apple iPhone, Xiaomi, Oppo...) */}
              {selectedCategory !== '__favorites__' && (dbSubcategories[selectedCategory] || []).length > 0 && (
                <div 
                  className="mb-3 d-flex align-items-center gap-2"
                  style={{
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    paddingBottom: '6px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory(null)}
                    className="btn btn-sm rounded-pill font-12 d-inline-flex align-items-center gap-1 shadow-sm"
                    style={{
                      whiteSpace: 'nowrap',
                      backgroundColor: selectedSubcategory === null ? primaryColor : '#f8fafc',
                      color: selectedSubcategory === null ? '#ffffff' : '#475569',
                      fontWeight: selectedSubcategory === null ? 700 : 600,
                      border: selectedSubcategory === null ? `1.5px solid ${primaryColor}` : '1px solid #e2e8f0',
                      padding: '5px 14px'
                    }}
                  >
                    Tous
                  </button>
                  {(dbSubcategories[selectedCategory] || []).map((sub) => {
                    const isSubSelected = selectedSubcategory === sub;
                    const subImg = dbCategoryImages[sub] || null;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubcategory(isSubSelected ? null : sub)}
                        className="btn btn-sm rounded-pill font-12 d-inline-flex align-items-center gap-1 shadow-sm"
                        style={{
                          whiteSpace: 'nowrap',
                          backgroundColor: isSubSelected ? primaryColor : '#ffffff',
                          color: isSubSelected ? '#ffffff' : '#334155',
                          fontWeight: isSubSelected ? 700 : 600,
                          border: isSubSelected ? `1.5px solid ${primaryColor}` : '1px solid #cbd5e1',
                          padding: '5px 12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {subImg && (
                          <img 
                            src={subImg} 
                            alt={sub} 
                            style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredBooks.length === 0 ? (
                <div className="text-center py-5">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: '64px', height: '64px', background: accentColor ? `${accentColor}1a` : 'var(--primary-light, rgba(37, 99, 235, 0.1))' }}
                  >
                    <i className="feather icon-book text-primary font-28"></i>
                  </div>
                  <h6 className="font-w600 mb-1">Aucun produit pour le moment</h6>
                  <p className="text-muted font-12 px-3 mb-3">
                    {selectedCategory === '__favorites__' 
                      ? "Vous n'avez pas encore ajouté d'articles à vos favoris."
                      : selectedSubcategory
                        ? `Aucun produit disponible dans la sous-catégorie "${selectedSubcategory}".`
                        : `Aucun produit disponible dans la catégorie "${selectedCategory}".`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="btn btn-primary rounded-xl px-3 py-2 font-13"
                  >
                    Voir toutes les catégories
                  </button>
                </div>
              ) : (
                <div className="home-grid-2x2">
                  {displayedBooks.map((card) => {
                    const displayPrice = card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : (card.distance || '');

                    return (
                      <div
                        key={card.id}
                        data-product-id={card.id}
                        onClick={() => setDetailCard(card)}
                        className="home-product-card"
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Image Couverture */}
                        <div style={{ position: 'relative', width: '100%', paddingTop: '130%', background: '#1c1c1e', overflow: 'hidden' }}>
                          {(() => {
                            const rawVid = card.video || (card.videos && card.videos[0]);
                            const cardVid = rawVid && typeof rawVid === 'string' && rawVid.trim() !== '' ? rawVid.trim() : null;
                            const rawImg = card.image || (card.images && card.images[0]);
                            const cardImg = rawImg && rawImg !== '/assets/images/books/book1.jpg' && String(rawImg).trim() !== '' ? rawImg : null;

                            if (cardVid) {
                              return (
                                <video
                                  src={`${cardVid}#t=0.1`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              );
                            }
                            if (cardImg) {
                              return (
                                <img
                                  src={cardImg}
                                  alt={card.name}
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/images/categories/telephones.svg';
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              );
                            }
                            return (
                              <img
                                src="/assets/images/categories/telephones.svg"
                                alt={card.name}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  padding: '1.5rem',
                                  backgroundColor: '#f8fafc'
                                }}
                              />
                            );
                          })()}

                          {/* Badge Format */}
                          {(card.format || card.badge) && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                background: 'rgba(0, 0, 0, 0.55)',
                                backdropFilter: 'blur(6px)',
                                color: '#fff',
                                fontSize: '10px',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                maxWidth: '85%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {card.format || card.badge}
                            </span>
                          )}
                        </div>

                        {/* Infos Produit */}
                        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <h6
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                lineHeight: '1.3',
                                marginBottom: '4px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                color: 'inherit'
                              }}
                            >
                              {card.name}
                            </h6>
                            {card.author && card.author.trim() !== '' && card.author.trim().toLowerCase() !== 'auteur' && (
                              <p
                                style={{
                                  fontSize: '11px',
                                  color: '#8e8e93',
                                  marginBottom: '6px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {card.author.trim()}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: primaryColor }}>
                              {displayPrice}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--secondary, #666)',
                                background: 'rgba(0,0,0,0.05)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              Voir
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Indicateur discret lors du défilement s'il reste des livres */}
                  {visibleBooksCount < filteredBooks.length && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '12px 0' }}>
                      <span className="text-muted font-11">
                        Affichage de {displayedBooks.length} sur {filteredBooks.length} livres...
                      </span>
                    </div>
                  )}

                  {/* Sentinelle invisible pour détection d'approche 600px avant le bas */}
                  {visibleBooksCount < filteredBooks.length && (
                    <div ref={sentinelRef} style={{ height: '20px', gridColumn: '1 / -1', pointerEvents: 'none' }} />
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

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

export default Wishlist;
