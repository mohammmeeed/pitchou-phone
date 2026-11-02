import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [cartToast, setCartToast] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const datingCtx = useDating();

  const isSearchParamActive = Boolean(
    searchParams.get('search') === 'true' ||
    searchParams.get('search') === '1' ||
    searchParams.get('search') === 'open'
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => datingCtx?.activeFilters?.search || '');
  const searchInputRef = useRef(null);
  const searchBarRef = useRef(null);
  const [searchBarHeight, setSearchBarHeight] = useState(215);
  const prevSearchParamRef = useRef(isSearchParamActive);

  useEffect(() => {
    if (isSearchParamActive) {
      const timer = setTimeout(() => {
        setSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 180);
      }, 60);
      prevSearchParamRef.current = true;
      return () => clearTimeout(timer);
    } else if (prevSearchParamRef.current) {
      setSearchOpen(false);
      prevSearchParamRef.current = false;
    }
  }, [isSearchParamActive]);

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('home_view_mode') || 'feed';
    } catch (e) {
      return 'feed';
    }
  });

  const profiles = Array.isArray(datingCtx?.profiles) ? datingCtx.profiles : [];
  const addToLiked = datingCtx?.addToLiked;
  const addToCart = datingCtx?.addToCart;

  // Filtres actifs depuis le contexte global
  const activeFilters = datingCtx?.activeFilters || {};
  const selectedCategories = Array.isArray(activeFilters.categories) ? activeFilters.categories : [];
  const selectedLanguages = Array.isArray(activeFilters.languages) ? activeFilters.languages : [];
  const currentMaxPrice = activeFilters.maxPrice !== undefined ? Number(activeFilters.maxPrice) : 1000000;

  useLayoutEffect(() => {
    if (searchOpen && searchBarRef.current) {
      const h = searchBarRef.current.offsetHeight;
      if (h > 50) {
        setSearchBarHeight(h);
      }
    }
  }, [searchOpen, selectedCategories, selectedLanguages, currentMaxPrice]);

  // Catégories et Langues existantes dynamiques
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/attributes')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          const cats = Array.isArray(data.categories) ? data.categories : [];
          const subs = data.subcategories && typeof data.subcategories === 'object'
            ? Object.values(data.subcategories).flat()
            : [];
          setDbCategories(Array.from(new Set([...cats, ...subs])));
        }
      })
      .catch(() => {});
  }, []);

  const defaultLanguages = useMemo(() => ['Français', 'Anglais', 'Arabe'], []);

  const allProducts = useMemo(() => {
    return (datingCtx?.allProfiles && datingCtx.allProfiles.length > 0)
      ? datingCtx.allProfiles
      : profiles;
  }, [datingCtx?.allProfiles, profiles]);

  const categoriesList = useMemo(() => {
    const fromProducts = allProducts.flatMap((p) => {
      if (Array.isArray(p.categories)) return p.categories;
      if (typeof p.categories === 'string' && p.categories.trim() !== '') {
        try { return JSON.parse(p.categories); } catch (e) { return p.categories.split(',').map((s) => s.trim()); }
      }
      if (typeof p.category === 'string') return p.category.split(',').map((s) => s.trim());
      return [];
    }).filter(Boolean);
    const combined = Array.from(new Set([...dbCategories, ...fromProducts]));
    return combined.filter((c) => c && c.trim() !== '');
  }, [allProducts, dbCategories]);

  const languagesList = useMemo(() => {
    const fromProducts = allProducts.flatMap((p) => {
      if (Array.isArray(p.languages)) return p.languages;
      if (typeof p.languages === 'string' && p.languages.trim() !== '') {
        try { return JSON.parse(p.languages); } catch (e) { return p.languages.split(',').map((s) => s.trim()); }
      }
      return [];
    }).filter(Boolean);
    const combined = Array.from(new Set([...defaultLanguages, ...fromProducts]));
    return combined.filter((l) => l && l.trim() !== '');
  }, [allProducts, defaultLanguages]);

  const handleToggleSearch = () => {
    setSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 150);
      } else {
        if (searchParams.get('search')) {
          setSearchParams({}, { replace: true });
        }
      }
      return next;
    });
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    if (searchParams.get('search')) {
      setSearchParams({}, { replace: true });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchOpen) {
        handleCloseSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (datingCtx?.setActiveFilters) {
      datingCtx.setActiveFilters((prev) => ({
        ...prev,
        search: val
      }));
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (datingCtx?.setActiveFilters) {
      datingCtx.setActiveFilters((prev) => ({
        ...prev,
        search: ''
      }));
    }
    searchInputRef.current?.focus();
  };

  const toggleCategory = (cat) => {
    if (!datingCtx?.setActiveFilters) return;
    datingCtx.setActiveFilters((prev) => {
      const current = Array.isArray(prev?.categories) ? prev.categories : [];
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      return { ...prev, categories: updated };
    });
  };

  const toggleLanguage = (lang) => {
    if (!datingCtx?.setActiveFilters) return;
    datingCtx.setActiveFilters((prev) => {
      const current = Array.isArray(prev?.languages) ? prev.languages : [];
      const updated = current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang];
      return { ...prev, languages: updated };
    });
  };

  const handlePriceChange = (val) => {
    if (!datingCtx?.setActiveFilters) return;
    datingCtx.setActiveFilters((prev) => ({
      ...prev,
      maxPrice: Number(val)
    }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    if (!datingCtx?.setActiveFilters) return;
    datingCtx.setActiveFilters({
      search: '',
      categories: [],
      languages: [],
      maxPrice: 1000000
    });
  };

  // Gestion de la transition animée fluide (Shared Element / Morph) entre Feed et Grille
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [transitionState, setTransitionState] = useState(null);
  const isTransitioningRef = useRef(false);

  // Loader très simple avant chargement de la première image
  const [firstImageReady, setFirstImageReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [shopLogo] = useState(() => {
    try {
      return localStorage.getItem('shop_logo_image') || '/assets/images/logo.png';
    } catch (e) {
      return '/assets/images/logo.png';
    }
  });

  const loadingProducts = datingCtx?.loadingProducts ?? false;
  const firstCard = profiles[activeCardIndex] || profiles[0];
  const firstImageUrl = firstCard?.image || (firstCard?.images && firstCard.images[0]);

  useEffect(() => {
    // Si les produits MySQL sont en cours de chargement ou qu'il n'y a pas d'image, on attend
    if (loadingProducts || !firstImageUrl) return;

    let isMounted = true;
    const img = new Image();
    img.src = firstImageUrl;

    const onDone = () => {
      if (!isMounted) return;
      setFirstImageReady(true);
      setTimeout(() => {
        if (isMounted) setShowLoader(false);
      }, 350);
    };

    if (img.complete) {
      onDone();
    } else {
      img.onload = onDone;
      img.onerror = onDone;
    }

    const timer = setTimeout(onDone, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadingProducts, firstImageUrl]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setFirstImageReady(true);
      setTimeout(() => setShowLoader(false), 350);
    }, 3500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleViewModeChange = (mode) => {
    if (isTransitioningRef.current) return;

    if (mode === 'grid') {
      // Transition Mode Feed -> Mode Grille
      // 1. Capture de la position exacte de la grande carte affichée à l'écran
      const activeCardEl = document.querySelector('.dzSwipe_card.card-active');
      const firstRect = activeCardEl ? activeCardEl.getBoundingClientRect() : null;
      const targetCard = profiles[activeCardIndex] || profiles[0];

      if (firstRect && targetCard) {
        isTransitioningRef.current = true;
        setTransitionState({
          direction: 'to-grid',
          targetId: targetCard.id,
          firstRect
        });
      }
      setViewMode('grid');
    } else {
      // Transition Mode Grille -> Mode Feed
      // Trouver la carte la plus visible actuellement dans la grille
      let targetCard = profiles[activeCardIndex] || profiles[0];
      let targetEl = null;

      const gridCards = document.querySelectorAll('.home-product-card');
      for (const cardEl of gridCards) {
        const rect = cardEl.getBoundingClientRect();
        if (rect.bottom > 80 && rect.top < window.innerHeight - 80) {
          const id = Number(cardEl.getAttribute('data-product-id'));
          const foundIdx = profiles.findIndex((p) => p.id === id);
          if (foundIdx !== -1) {
            targetCard = profiles[foundIdx];
            targetEl = cardEl;
            setActiveCardIndex(foundIdx);
            break;
          }
        }
      }

      if (!targetEl && targetCard) {
        targetEl = document.querySelector(`[data-product-id="${targetCard.id}"]`) || document.querySelector('.home-product-card');
      }

      const firstRect = targetEl ? targetEl.getBoundingClientRect() : null;

      if (firstRect && targetCard) {
        isTransitioningRef.current = true;
        // Les autres cartes de la grille s'estompent doucement vers le bas
        const otherCards = document.querySelectorAll(`.home-product-card:not([data-product-id="${targetCard.id}"])`);
        otherCards.forEach((c) => {
          c.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          c.style.opacity = '0';
          c.style.transform = 'translateY(16px) scale(0.95)';
        });

        setTimeout(() => {
          setTransitionState({
            direction: 'to-feed',
            targetId: targetCard.id,
            firstRect
          });
          setViewMode('feed');
        }, 120);
      } else {
        setViewMode('feed');
      }
    }

    try {
      localStorage.setItem('home_view_mode', mode);
    } catch (e) { }
  };

  // Orchestration de l'animation FLIP (First, Last, Invert, Play)
  useLayoutEffect(() => {
    if (!transitionState) return;

    const { direction, targetId, firstRect } = transitionState;

    if (direction === 'to-grid') {
      const targetEl = document.querySelector(`[data-product-id="${targetId}"]`);
      if (!targetEl) {
        isTransitioningRef.current = false;
        setTransitionState(null);
        return;
      }

      const lastRect = targetEl.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const deltaW = firstRect.width / lastRect.width;
      const deltaH = firstRect.height / lastRect.height;

      // Invert : La carte de la grille commence avec la taille et position de la grande carte plein écran
      targetEl.style.transformOrigin = 'top left';
      targetEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
      targetEl.style.zIndex = '120';
      targetEl.style.borderRadius = '20px';
      targetEl.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
      targetEl.style.transition = 'none';

      // Les autres cartes de la grille commencent masquées et légèrement décalées
      const otherCards = document.querySelectorAll(`.home-product-card:not([data-product-id="${targetId}"])`);
      otherCards.forEach((c) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(24px) scale(0.94)';
        c.style.transition = 'none';
      });

      // Play : Rétrécissement fluide vers son emplacement dans la grille + apparition des autres cartes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          targetEl.style.transition = 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.42s ease, box-shadow 0.42s ease';
          targetEl.style.transform = 'translate(0, 0) scale(1)';
          targetEl.style.borderRadius = '14px';
          targetEl.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.05)';

          otherCards.forEach((c, idx) => {
            const delay = Math.min(idx * 25, 200);
            c.style.transition = `opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
            c.style.opacity = '1';
            c.style.transform = 'translateY(0) scale(1)';
          });

          setTimeout(() => {
            targetEl.style.transformOrigin = '';
            targetEl.style.transform = '';
            targetEl.style.zIndex = '';
            targetEl.style.borderRadius = '';
            targetEl.style.boxShadow = '';
            targetEl.style.transition = '';
            otherCards.forEach((c) => {
              c.style.opacity = '';
              c.style.transform = '';
              c.style.transition = '';
            });
            isTransitioningRef.current = false;
            setTransitionState(null);
          }, 450);
        });
      });
    } else if (direction === 'to-feed') {
      const activeCardEl = document.querySelector('.dzSwipe_card.card-active');
      if (!activeCardEl) {
        isTransitioningRef.current = false;
        setTransitionState(null);
        return;
      }

      const lastRect = activeCardEl.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const deltaW = firstRect.width / lastRect.width;
      const deltaH = firstRect.height / lastRect.height;

      // Invert : La grande carte plein écran commence à la taille et position de la petite case dans la grille
      activeCardEl.style.transformOrigin = 'top left';
      activeCardEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
      activeCardEl.style.borderRadius = '14px';
      activeCardEl.style.zIndex = '120';
      activeCardEl.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
      activeCardEl.style.transition = 'none';

      // Play : Agrandissement fluide pour reprendre tout l'écran
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          activeCardEl.style.transition = 'transform 0.44s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.44s ease, box-shadow 0.44s ease';
          activeCardEl.style.transform = 'translate(0, 0) scale(1)';
          activeCardEl.style.borderRadius = '20px';
          activeCardEl.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';

          setTimeout(() => {
            activeCardEl.style.transformOrigin = '';
            activeCardEl.style.transform = '';
            activeCardEl.style.borderRadius = '';
            activeCardEl.style.zIndex = '';
            activeCardEl.style.boxShadow = '';
            activeCardEl.style.transition = '';
            isTransitioningRef.current = false;
            setTransitionState(null);
          }, 460);
        });
      });
    }
  }, [transitionState]);

  // Pagination progressive (Infinite Scroll) pour le mode grille
  const [gridVisibleCount, setGridVisibleCount] = useState(24);
  const gridScrollAreaRef = useRef(null);
  const gridSentinelRef = useRef(null);

  // Réinitialiser la pagination progressive lors du changement de filtre ou de mode
  useEffect(() => {
    setGridVisibleCount(24);
    if (gridScrollAreaRef.current) {
      gridScrollAreaRef.current.scrollTop = 0;
    }
  }, [viewMode, activeFilters]);

  // Observer pour charger les livres suivants automatiquement au défilement
  useEffect(() => {
    if (viewMode !== 'grid') return;
    if (gridVisibleCount >= profiles.length) return;

    const sentinel = gridSentinelRef.current;
    const container = gridScrollAreaRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setGridVisibleCount((prev) => Math.min(prev + 24, profiles.length));
        }
      },
      {
        root: container,
        rootMargin: '350px 0px',
        threshold: 0.01
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, gridVisibleCount, profiles.length]);

  const handleGridScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400 && gridVisibleCount < profiles.length) {
      setGridVisibleCount((prev) => Math.min(prev + 24, profiles.length));
    }
  };

  const visibleGridProfiles = useMemo(() => {
    return profiles.slice(0, gridVisibleCount);
  }, [profiles, gridVisibleCount]);

  const handleSwipeRight = (card) => {
    if (addToCart) addToCart(card);
    setCartToast(card.name || 'Produit');
    setTimeout(() => {
      setCartToast(null);
    }, 1800);
  };

  return (
    <div className={`page-wrapper header-large ${viewMode === 'feed' ? 'overflow-hidden' : ''}`}>
      {/* Loader plein écran avec animated-logo.gif sur fond blanc */}
      {showLoader && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: firstImageReady ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: firstImageReady ? 'none' : 'auto'
          }}
        >
          <img
            src="/animated-logo.gif"
            alt="Chargement..."
            style={{
              width: '180px',
              maxWidth: '65vw',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

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

      {/* Toast Notification Panier lors du Swipe Droit */}
      {cartToast && (
        <div
          style={{
            position: 'fixed',
            top: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            zIndex: 9999,
            pointerEvents: 'none',
            border: '1px solid rgba(32, 159, 132, 0.6)'
          }}
        >
          <span style={{ fontSize: '15px' }}>🛒</span>
          <span style={{ color: '#209f84', fontWeight: 800 }}>+ 1 au Panier !</span>
          <span style={{ opacity: 0.85, fontSize: '12px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cartToast}
          </span>
        </div>
      )}

      {/* Header */}
      <Header
        showMenu={true}
        onMenuClick={() => setSidebarOpen(true)}
        showFilter={true}
        filterUrl="/filter"
        borderZero={true}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onSearchClick={handleToggleSearch}
        searchActive={searchOpen}
      />

      {/* Barre de Recherche et Filtres Coulissants (Descend depuis le haut de l'écran, épinglée et interactive sans bloquer le scroll) */}
      <div
        ref={searchBarRef}
        className="home-sliding-search-bar"
        style={{
          transform: searchOpen ? 'translateY(0)' : 'translateY(-100%)',
          opacity: searchOpen ? 1 : 0,
          pointerEvents: searchOpen ? 'auto' : 'none',
        }}
      >
        {/* Champ de recherche */}
        <div className="home-sliding-search-inner">
          <i className="feather icon-search" style={{ fontSize: '16px', color: 'var(--primary)', flexShrink: 0 }}></i>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par titre, auteur, genre..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '14px',
              color: 'inherit',
              padding: 0
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                border: 'none',
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                color: '#666',
                flexShrink: 0
              }}
              aria-label="Effacer la recherche"
            >
              <i className="feather icon-x" style={{ fontSize: '13px' }}></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCloseSearch}
              style={{
                border: 'none',
                background: 'rgba(0, 0, 0, 0.06)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                color: '#888',
                flexShrink: 0
              }}
              aria-label="Fermer la recherche"
              title="Fermer la recherche"
            >
              <i className="feather icon-chevron-up" style={{ fontSize: '13px' }}></i>
            </button>
          )}
        </div>

        {/* Section Filtres Glissants (Catégories, Langue, Prix) */}
        <div style={{ marginTop: '10px' }}>
          {/* Ligne 1 : Catégories */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--secondary, #71717a)' }}>
                Catégories
              </span>
              {(selectedCategories.length > 0 || selectedLanguages.length > 0 || currentMaxPrice < 1000000 || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div
              className="filter-chips-scroll"
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {categoriesList.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`filter-chip ${isSelected ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ligne 2 : Langue */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--secondary, #71717a)', display: 'block', marginBottom: '4px' }}>
              Langue
            </span>
            <div
              className="filter-chips-scroll"
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {languagesList.map((lang) => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`filter-chip ${isSelected ? 'active' : ''}`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ligne 3 : Prix */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--secondary, #71717a)' }}>
                Prix maximum
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                {currentMaxPrice >= 1000000 ? 'Tous les prix' : `${Number(currentMaxPrice).toLocaleString('fr-FR')} DA`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="500"
                max="1000000"
                step="5000"
                value={currentMaxPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="filter-slider"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Page Content : Vue Feed (Carte Unique) ou Vue Grille 2x2 (Scrollable) */}
      {viewMode === 'feed' ? (
        <div
          className={`home-card-wrapper ${searchOpen ? 'search-active' : ''}`}
          style={{
            '--search-bar-offset': `${60 + searchBarHeight + 6}px`,
            transition: 'top 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div className="home-card-container">
            {profiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888' }}>
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(32, 159, 132, 0.1)',
                    color: '#209f84',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    fontSize: '26px'
                  }}
                >
                  <i className="feather icon-book-open"></i>
                </div>
                <h5 style={{ fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Aucun livre disponible</h5>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Le catalogue est actuellement vide.</p>
              </div>
            ) : (
              <TinderCardStack
                profiles={profiles}
                onOpenDetail={(card) => setDetailCard(card)}
                onSwipeRight={handleSwipeRight}
                onResetFilters={handleResetFilters}
                onIndexChange={(idx) => setActiveCardIndex(idx)}
                initialIndex={activeCardIndex}
              />
            )}
          </div>
        </div>
      ) : (
        <div
          ref={gridScrollAreaRef}
          onScroll={handleGridScroll}
          className={`home-grid-scroll-area ${searchOpen ? 'search-active' : ''}`}
          style={{
            '--search-bar-offset': `${60 + searchBarHeight + 6}px`,
            transition: 'top 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {profiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.05)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '26px',
                  color: '#9ca3af'
                }}
              >
                <i className="feather icon-search"></i>
              </div>
              <p style={{ fontWeight: 600, color: '#111827', fontSize: '15px', marginBottom: '4px' }}>Aucun livre trouvé</p>
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
          ) : (
            <div className="home-grid-2x2">
              {visibleGridProfiles.map((card) => {
                const isCardLiked = datingCtx?.isLiked ? datingCtx.isLiked(card.id) : false;
                const displayPrice = card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : (card.distance || '');

                return (
                  <div
                    key={card.id}
                    data-product-id={card.id}
                    onClick={() => setDetailCard(card)}
                    className="home-product-card"
                  >
                    {/* Image Couverture */}
                    <div style={{ position: 'relative', width: '100%', paddingTop: '130%', background: '#1c1c1e', overflow: 'hidden' }}>
                      <img
                        src={card.image || (card.images && card.images[0]) || '/assets/images/books/book1.jpg'}
                        alt={card.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/images/books/book1.jpg';
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

                      {/* Badge Format */}
                      {card.format && (
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
                          {card.format}
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
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary, #fe2c55)' }}>
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

              {/* Sentinelle Infinite Scroll pour charger les livres suivants */}
              {gridVisibleCount < profiles.length && (
                <div
                  ref={gridSentinelRef}
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 0 30px',
                    color: '#8e8e93',
                    gap: '8px',
                    fontSize: '13px'
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fe2c55',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <span>Chargement de la suite...</span>
                </div>
              )}

              {/* Indicateur de fin */}
              {gridVisibleCount >= profiles.length && profiles.length > 24 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '20px 0 10px',
                    color: '#8e8e93',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  <span>Tous les {profiles.length} livres sont affichés</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onSearchClick={handleToggleSearch} isSearchOpen={searchOpen} />

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
