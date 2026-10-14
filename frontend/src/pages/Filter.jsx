import React, { useState, useMemo } from 'react';
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

  // Catégories existantes
  const defaultCategories = useMemo(() => {
    try {
      const saved = localStorage.getItem('tiktok_shop_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      'Roman & Littérature',
      'Développement Personnel',
      'Histoire & Récits',
      'Fantasy & Mystère',
      'Philosophie & Poésie',
      'Roman Graphique'
    ];
  }, []);

  const categoriesList = useMemo(() => {
    const fromProducts = allProducts.map((p) => p.category).filter(Boolean);
    const combined = Array.from(new Set([...defaultCategories, ...fromProducts]));
    return combined.filter((c) => c && c.trim() !== '');
  }, [allProducts, defaultCategories]);

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

  // État des sélections
  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (Array.isArray(activeFilters.categories) && activeFilters.categories.length > 0) {
      return activeFilters.categories;
    }
    return [];
  });

  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    if (Array.isArray(activeFilters.languages) && activeFilters.languages.length > 0) {
      return activeFilters.languages;
    }
    return [];
  });

  const [priceRange, setPriceRange] = useState(() => {
    return activeFilters.maxPrice ? Number(activeFilters.maxPrice) : 3500;
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

  const handleApply = () => {
    if (setActiveFilters) {
      setActiveFilters({
        categories: selectedCategories,
        languages: selectedLanguages,
        maxPrice: Number(priceRange)
      });
    }
    navigate('/home');
  };

  return (
    <div className="page-wrapper">
      <Header title="Date Filter" showBack={true} backUrl="/home" />

      <div className="page-content space-top p-b50">
        <div className="container">
          
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
                {categoriesList.map((item, idx, arr) => {
                  const isChecked = selectedCategories.includes(item);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={item}
                      onClick={() => toggleCategory(item)}
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
                  <span>6 000+ DA</span>
                </div>
                <input 
                  type="range" 
                  className="form-range w-100" 
                  min="500" 
                  max="6000" 
                  step="50"
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
