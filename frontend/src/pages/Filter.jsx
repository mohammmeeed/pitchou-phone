import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDating, initialProfiles } from '../context/DatingContext';

const Filter = () => {
  const navigate = useNavigate();
  const datingCtx = useDating();

  // Liste de tous les produits existants
  const allProducts = (datingCtx?.allProfiles && datingCtx.allProfiles.length > 0)
    ? datingCtx.allProfiles
    : (datingCtx?.profiles && datingCtx.profiles.length > 0 ? datingCtx.profiles : initialProfiles);

  const activeFilters = datingCtx?.activeFilters || {};
  const setActiveFilters = datingCtx?.setActiveFilters;

  // Catégories & Sous-catégories chargées depuis la BDD Pitchou
  const [dbCategories, setDbCategories] = useState([]);
  const [dbSubcategories, setDbSubcategories] = useState({});

  useEffect(() => {
    fetch('/api/attributes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.categories)) {
          setDbCategories(data.categories);
        }
        if (data?.subcategories && typeof data.subcategories === 'object') {
          setDbSubcategories(data.subcategories);
        }
      })
      .catch((err) => console.warn('Erreur chargement attributes dans Filter:', err));
  }, []);

  const categoriesOptions = useMemo(() => {
    const list = [];
    const added = new Set();

    dbCategories.forEach((cat) => {
      list.push({ name: cat, isSub: false, parent: null });
      added.add(cat.toLowerCase().trim());
      const subs = dbSubcategories[cat] || [];
      subs.forEach((sub) => {
        list.push({ name: sub, isSub: true, parent: cat });
        added.add(sub.toLowerCase().trim());
      });
    });

    // Également inclure les catégories trouvées sur les produits actuels
    allProducts.forEach((p) => {
      let pCats = [];
      if (Array.isArray(p.categories)) pCats = p.categories;
      else if (typeof p.categories === 'string' && p.categories.trim() !== '') {
        try { pCats = JSON.parse(p.categories); } catch(e) { pCats = p.categories.split(',').map((s) => s.trim()); }
      } else if (typeof p.category === 'string') {
        pCats = p.category.split(',').map((s) => s.trim());
      }
      pCats.forEach((c) => {
        const clean = (c || '').trim();
        if (clean && !added.has(clean.toLowerCase())) {
          list.push({ name: clean, isSub: false, parent: null });
          added.add(clean.toLowerCase());
        }
      });
    });

    return list;
  }, [dbCategories, dbSubcategories, allProducts]);

  // Langues existantes
  const defaultLanguages = useMemo(() => {
    try {
      const saved = localStorage.getItem('tiktok_shop_languages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Français', 'Anglais', 'Arabe'];
  }, []);

  const languagesList = useMemo(() => {
    const fromProducts = allProducts.flatMap((p) => {
      if (Array.isArray(p.languages)) return p.languages;
      if (typeof p.languages === 'string') return p.languages.split(',').map((s) => s.trim());
      return [];
    }).filter(Boolean);
    const combined = Array.from(new Set([...defaultLanguages, ...fromProducts]));
    return combined.filter((l) => l && l.trim() !== '');
  }, [allProducts, defaultLanguages]);

  const [searchQuery, setSearchQuery] = useState(() => {
    return activeFilters.search || '';
  });

  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (Array.isArray(activeFilters.categories) && activeFilters.categories.length > 0) {
      return activeFilters.categories;
    }
    return [];
  });

  const [selectedEtats, setSelectedEtats] = useState(() => {
    if (Array.isArray(activeFilters.etats) && activeFilters.etats.length > 0) {
      return activeFilters.etats;
    }
    return [];
  });

  const toggleEtat = (etat) => {
    setSelectedEtats((prev) =>
      prev.includes(etat) ? prev.filter((e) => e !== etat) : [...prev, etat]
    );
  };

  const [etatsOpen, setEtatsOpen] = useState(true);

  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    if (Array.isArray(activeFilters.languages) && activeFilters.languages.length > 0) {
      return activeFilters.languages;
    }
    return [];
  });

  const [priceRange, setPriceRange] = useState(() => {
    return activeFilters.maxPrice && Number(activeFilters.maxPrice) > 6000 ? Number(activeFilters.maxPrice) : 1000000;
  });

  // États pour les Dropdowns (accordéons déroulants)
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const [isClearing, setIsClearing] = useState(false);

  const handleClearFilters = () => {
    setIsClearing(true);
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedLanguages([]);
    setPriceRange(1000000);
    if (setActiveFilters) {
      setActiveFilters({
        search: '',
        categories: [],
        languages: [],
        maxPrice: 1000000
      });
    }
    if (datingCtx?.resetCards) {
      datingCtx.resetCards();
    }
    setTimeout(() => {
      setIsClearing(false);
    }, 400);
  };

  const handleApply = () => {
    if (datingCtx?.resetCards) {
      datingCtx.resetCards();
    }
    if (setActiveFilters) {
      setActiveFilters({
        search: searchQuery.trim(),
        categories: selectedCategories,
        languages: selectedLanguages,
        maxPrice: Number(priceRange)
      });
    }
    navigate('/');
  };

  return (
    <div className="page-wrapper">
      <Header 
        title="Date Filter" 
        showBack={true} 
        backUrl="/" 
        rightCustom={
          <a
            role="button"
            tabIndex={0}
            onClick={handleClearFilters}
            className="filter-icon"
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--secondary, #111827)'
            }}
            title="Effacer tous les filtres"
            aria-label="Effacer tous les filtres"
          >
            <i 
              className="icon feather icon-rotate-ccw" 
              style={{ 
                fontSize: '18px', 
                transition: 'transform 0.4s ease',
                transform: isClearing ? 'rotate(-360deg)' : 'none'
              }}
            ></i>
          </a>
        }
      />

      <div className="page-content space-top p-b50">
        <div className="container">
          
          {/* BARRE DE RECHERCHE */}
          <div className="card style-1" style={{ overflow: 'hidden', marginBottom: '16px' }}>
            <div 
              className="d-flex align-items-center"
              style={{
                padding: '12px 16px',
                gap: '12px'
              }}
            >
              <i className="icon feather icon-search" style={{ fontSize: '18px', color: '#9ca3af', flexShrink: 0 }}></i>
              <input
                type="text"
                className="form-control border-0 p-0 shadow-none"
                placeholder="Rechercher un produit, catégorie, marque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApply();
                  }
                }}
                style={{
                  fontSize: '14px',
                  background: 'transparent',
                  color: 'var(--title, #111827)',
                  fontWeight: 400,
                  outline: 'none',
                  boxShadow: 'none'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%'
                  }}
                  title="Effacer"
                  aria-label="Effacer la recherche"
                >
                  <i className="icon feather icon-x" style={{ fontSize: '16px' }}></i>
                </button>
              )}
            </div>
          </div>

          {/* CARTE 1 : DROPDOWN CATÉGORIES EXISTANTES */}
          <div className="card style-1" style={{ overflow: 'hidden', marginBottom: '16px' }}>
            <div 
              className="card-header d-flex align-items-center justify-content-between"
              onClick={() => setCategoriesOpen((prev) => !prev)}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: categoriesOpen ? '1px solid #f1f3f6' : 'none',
                padding: '14px 16px',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <h6 className="title font-w400 font-14 mb-0">Catégories</h6>
                {selectedCategories.length > 0 && (
                  <span 
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--rgba-primary-1, rgba(254, 44, 85, 0.12))',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {selectedCategories.length}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span 
                  style={{ 
                    fontSize: '13px', 
                    color: selectedCategories.length > 0 ? 'var(--primary)' : '#9ca3af', 
                    fontWeight: 500 
                  }}
                >
                  {selectedCategories.length === 0 
                    ? 'Toutes' 
                    : (selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} sélect.`)}
                </span>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#6b7280" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: categoriesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Menu déroulant (Dropdown body) avec les mêmes cases à cocher carrées */}
            {categoriesOpen && (
              <div className="card-body p-0" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {categoriesOptions.map((opt, idx, arr) => {
                  const catName = opt.name;
                  const isChecked = selectedCategories.includes(catName);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={`${opt.parent || ''}_${catName}`}
                      onClick={() => toggleCategory(catName)}
                      className="d-flex align-items-center justify-content-between px-3 py-2"
                      style={{
                        cursor: 'pointer',
                        paddingLeft: opt.isSub ? '28px' : '16px',
                        borderBottom: isLast ? 'none' : '1px solid #f1f3f6',
                        transition: 'background 0.2s ease',
                        backgroundColor: isChecked ? 'var(--rgba-primary-1, rgba(254, 44, 85, 0.03))' : 'transparent',
                      }}
                    >
                      <span 
                        style={{
                          fontSize: opt.isSub ? '14px' : '15px',
                          fontWeight: isChecked || !opt.isSub ? 600 : 400,
                          color: isChecked ? '#111827' : (opt.isSub ? '#6b7280' : '#1f2937'),
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {opt.isSub && <span style={{ color: '#9ca3af', marginRight: '6px' }}>↳</span>}
                        {catName}
                      </span>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: isChecked ? '2px solid var(--primary)' : '2px solid #d1d5db',
                          background: isChecked ? 'var(--primary-gradient, linear-gradient(135deg, #f33e5b 0%, #fe2c55 100%))' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isChecked ? '0 3px 8px var(--rgba-primary-4, rgba(254, 44, 85, 0.35))' : 'none',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARTE : ÉTAT DU PRODUIT (Neuf, 10/10, Bon état, Occasion) */}
          <div className="card style-1" style={{ overflow: 'hidden', marginBottom: '16px' }}>
            <div 
              className="card-header d-flex align-items-center justify-content-between"
              onClick={() => setEtatsOpen((prev) => !prev)}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: etatsOpen ? '1px solid #f1f3f6' : 'none',
                padding: '14px 16px',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <h6 className="title font-w400 font-14 mb-0">État du Produit</h6>
                {selectedEtats.length > 0 && (
                  <span 
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--rgba-primary-1, rgba(254, 44, 85, 0.12))',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {selectedEtats.length}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span 
                  style={{ 
                    fontSize: '13px', 
                    color: selectedEtats.length > 0 ? 'var(--primary)' : '#9ca3af', 
                    fontWeight: 500 
                  }}
                >
                  {selectedEtats.length === 0 
                    ? 'Tous les états' 
                    : (selectedEtats.length === 1 ? selectedEtats[0] : `${selectedEtats.length} sélect.`)}
                </span>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#6b7280" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: etatsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {etatsOpen && (
              <div className="card-body p-0">
                {[
                  { name: 'Sous blister', icon: '📦' },
                  { name: 'Très bon état', icon: '⭐' },
                  { name: 'Bon état', icon: '👍' },
                  { name: 'Occasion', icon: '🔄' }
                ].map((item, idx, arr) => {
                  const isChecked = selectedEtats.includes(item.name);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={item.name}
                      onClick={() => toggleEtat(item.name)}
                      className="d-flex align-items-center justify-content-between px-3 py-2"
                      style={{
                        cursor: 'pointer',
                        borderBottom: isLast ? 'none' : '1px solid #f1f3f6',
                        transition: 'background 0.2s ease',
                        backgroundColor: isChecked ? 'var(--rgba-primary-1, rgba(254, 44, 85, 0.03))' : 'transparent',
                      }}
                    >
                      <span 
                        style={{
                          fontSize: '14px',
                          fontWeight: isChecked ? 600 : 400,
                          color: isChecked ? '#111827' : '#374151',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>

                      <div 
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isChecked ? '2px solid var(--primary)' : '2px solid #d1d5db',
                          backgroundColor: isChecked ? 'var(--primary)' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARTE 2 : DROPDOWN LANGUES EXISTANTES */}
          <div className="card style-1" style={{ overflow: 'hidden', marginBottom: '16px' }}>
            <div 
              className="card-header d-flex align-items-center justify-content-between"
              onClick={() => setLanguagesOpen((prev) => !prev)}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: languagesOpen ? '1px solid #f1f3f6' : 'none',
                padding: '14px 16px',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <h6 className="title font-w400 font-14 mb-0">Langues</h6>
                {selectedLanguages.length > 0 && (
                  <span 
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--rgba-primary-1, rgba(254, 44, 85, 0.12))',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {selectedLanguages.length}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span 
                  style={{ 
                    fontSize: '13px', 
                    color: selectedLanguages.length > 0 ? 'var(--primary)' : '#9ca3af', 
                    fontWeight: 500 
                  }}
                >
                  {selectedLanguages.length === 0 
                    ? 'Toutes' 
                    : (selectedLanguages.length === 1 ? selectedLanguages[0] : `${selectedLanguages.length} sélect.`)}
                </span>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#6b7280" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: languagesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Menu déroulant (Dropdown body) avec les mêmes cases à cocher carrées */}
            {languagesOpen && (
              <div className="card-body p-0">
                {languagesList.map((item, idx, arr) => {
                  const isChecked = selectedLanguages.includes(item);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={item}
                      onClick={() => toggleLanguage(item)}
                      className="d-flex align-items-center justify-content-between px-3 py-3"
                      style={{
                        cursor: 'pointer',
                        borderBottom: isLast ? 'none' : '1px solid #f1f3f6',
                        transition: 'background 0.2s ease',
                        backgroundColor: isChecked ? 'var(--rgba-primary-1, rgba(254, 44, 85, 0.03))' : 'transparent',
                      }}
                    >
                      <span 
                        style={{
                          fontSize: '15px',
                          fontWeight: isChecked ? 600 : 400,
                          color: isChecked ? '#111827' : '#4b5563',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {item}
                      </span>
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: isChecked ? '2px solid var(--primary)' : '2px solid #d1d5db',
                          background: isChecked ? 'var(--primary-gradient, linear-gradient(135deg, #f33e5b 0%, #fe2c55 100%))' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isChecked ? '0 3px 8px var(--rgba-primary-4, rgba(254, 44, 85, 0.35))' : 'none',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARTE 3 : BARRE DE SÉLECTION DU PRIX */}
          <div className="card style-1" style={{ marginBottom: '16px' }}>
            <div className="card-header" style={{ padding: '14px 16px' }}>
              <h6 className="title font-w400 font-14 mb-0">Prix</h6>
            </div>
            <div className="card-body">
              <div className="range-slider style-1">
                <div className="mb-3 title font-w600 font-16 d-flex justify-content-between">
                  <span>500 DA</span>
                  <span className="text-primary font-w700">{priceRange.toLocaleString('fr-FR')} DA</span>
                  <span>1 000 000+ DA</span>
                </div>
                <input 
                  type="range" 
                  className="form-range w-100" 
                  min="500" 
                  max="1000000" 
                  step="5000"
                  value={priceRange} 
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="footer fixed">
        <div className="container">
          <button 
            type="button" 
            onClick={handleApply}
            className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filter;
