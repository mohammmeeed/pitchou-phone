// frontend/src/context/DatingContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const DatingContext = createContext();

export const initialProfiles = [];

// Algorithme de mélange aléatoire Fisher-Yates
const shuffleArray = (array) => {
  if (!Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const DatingProvider = ({ children }) => {
  const [allProfiles, setAllProfiles] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeFilters, setActiveFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('tiktok_shop_active_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.maxPrice === 6000 || !parsed.maxPrice)) {
          parsed.maxPrice = 1000000;
        }
        return parsed;
      }
    } catch (e) { }
    return {
      search: '',
      categories: [],
      languages: [],
      maxPrice: 1000000
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_shop_active_filters', JSON.stringify(activeFilters));
    } catch (e) { }
  }, [activeFilters]);

  // Profils filtrés selon les critères actifs
  const profiles = React.useMemo(() => {
    const normalize = (val) =>
      String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    return allProfiles.filter((p) => {
      // 0. Recherche textuelle (titre, auteur, catégorie, description, langue)
      if (activeFilters.search && activeFilters.search.trim() !== '') {
        const q = normalize(activeFilters.search);

        // Titre
        const titleMatch = normalize(p.name || p.title).includes(q);
        // Auteur
        const authorMatch = normalize(p.author).includes(q);
        // Description
        const descMatch = normalize(p.bio || p.description).includes(q);

        // Catégorie
        const pCats = Array.isArray(p.categories) && p.categories.length > 0
          ? p.categories
          : (typeof p.category === 'string' && p.category.trim() !== ''
            ? p.category.split(',').map((s) => s.trim())
            : (Array.isArray(p.interests) ? p.interests : []));
        const catMatch = pCats.some((c) => normalize(c).includes(q));

        // Langue
        const pLangs = Array.isArray(p.languages)
          ? p.languages
          : (typeof p.languages === 'string' && p.languages.trim() !== ''
            ? p.languages.split(',').map((s) => s.trim())
            : (typeof p.language === 'string' ? [p.language] : []));
        const langMatch = pLangs.some((l) => normalize(l).includes(q));

        if (!titleMatch && !authorMatch && !descMatch && !catMatch && !langMatch) {
          return false;
        }
      }

      // 1. Catégories
      if (activeFilters.categories && activeFilters.categories.length > 0) {
        const pCats = Array.isArray(p.categories) && p.categories.length > 0
          ? p.categories
          : (typeof p.category === 'string' && p.category.trim() !== ''
            ? p.category.split(',').map((s) => s.trim())
            : []);
        const activeNorm = activeFilters.categories.map((c) => (c || '').toLowerCase().trim());
        const matchesCategory = pCats.some((c) => activeNorm.includes((c || '').toLowerCase().trim()));
        if (!matchesCategory) {
          return false;
        }
      }
      // 2. Langues
      if (activeFilters.languages && activeFilters.languages.length > 0) {
        const pLangs = Array.isArray(p.languages)
          ? p.languages
          : (typeof p.languages === 'string' && p.languages.trim() !== ''
            ? p.languages.split(',').map((s) => s.trim())
            : []);
        const matchesLang = pLangs.some((l) => activeFilters.languages.includes(l));
        if (!matchesLang) return false;
      }
      // 3. Prix maximum
      if (activeFilters.maxPrice && Number(activeFilters.maxPrice) < 1000000 && Number(p.price) > Number(activeFilters.maxPrice)) {
        return false;
      }
      return true;
    });
  }, [allProfiles, activeFilters]);

  const [swipedList, setSwipedList] = useState([]);

  const [likedList, setLikedList] = useState(() => {
    try {
      const saved = localStorage.getItem('tiktok_shop_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_shop_favorites', JSON.stringify(likedList));
    } catch (e) { }
  }, [likedList]);

  const [matches, setMatches] = useState([
    { id: 1, name: "Support", image: "/assets/images/user/pic1.jpg", lastMsg: "Bonjour ! Comment pouvons-nous vous aider ?", time: "À l'instant", active: true },
    { id: 2, name: "Service Livraison", image: "/assets/images/user/pic2.jpg", lastMsg: "Votre colis est bien pris en charge avec Yalidine.", time: "1h", active: false },
    { id: 3, name: "Conseiller Client", image: "/assets/images/user/pic3.jpg", lastMsg: "Ce livre est bien disponible en stock.", time: "Hier", active: false }
  ]);

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.name || u.phone)) {
          return {
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            gender: u.gender || "Men",
            interestedIn: u.interestedIn || "Livres",
            lookingFor: u.lookingFor || "",
            avatar: u.avatar || null,
            age: u.age || 25,
            location: u.address || "",
          };
        }
      }
    } catch (e) { }
    return null;
  });

  // Synchroniser avec les modifications de localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('customer_user');
        if (saved) {
          const u = JSON.parse(saved);
          setUserProfile({
            name: u.name || "",
            phone: u.phone || "",
            email: u.email || "",
            gender: u.gender || "Men",
            interestedIn: u.interestedIn || "Livres",
            lookingFor: u.lookingFor || "",
            avatar: u.avatar || null,
            age: u.age || 25,
            location: u.address || ""
          });
        } else {
          setUserProfile(null);
        }
      } catch (e) { }

      try {
        const savedCart = localStorage.getItem('tiktok_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          }
        } else {
          setCartItems([]);
        }
      } catch (e) { }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    try {
      localStorage.removeItem('customer_user');
      localStorage.removeItem('customer_token');
    } catch (e) { }
    setUserProfile(null);
  };

  // Panier e-commerce synchronisé avec localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('tiktok_cart');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_cart', JSON.stringify(cartItems));
    } catch (e) { }
  }, [cartItems]);

  // Charger les produits réels depuis le backend PHP MySQL (Admin Panel)
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('API non joignable');
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        const formatted = json.data.map((p) => ({
          id: p.id,
          name: p.name,
          title: p.name,
          author: p.author || '',
          format: p.format || '',
          price: Number(p.price) || 0,
          purchase_price: Number(p.purchase_price) || 0,
          priceFormatted: `${Number(p.price).toLocaleString('fr-FR')} DA`,
          image: p.image || '/assets/images/books/book1.jpg',
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
          video: p.video || null,
          videos: Array.isArray(p.videos) && p.videos.length > 0 ? p.videos : (p.video ? [p.video] : []),
          bio: p.bio || '',
          location: p.location || '',
          distance: `${Number(p.price).toLocaleString('fr-FR')} DA`,
          category: p.category || '',
          categories: Array.isArray(p.categories) && p.categories.length > 0
            ? p.categories
            : (typeof p.category === 'string' && p.category.trim() !== '' ? p.category.split(',').map((s) => s.trim()).filter(Boolean) : []),
          stock: p.stock || 0,
          languages: Array.isArray(p.languages)
            ? p.languages
            : (typeof p.languages === 'string' && p.languages.trim() !== ''
              ? p.languages.split(',').map((s) => s.trim()).filter(Boolean)
              : [])
        }));

        // Filtrer strictement les livres en stock (> 0) pour le site public
        const inStock = formatted.filter((p) => (Number(p.stock) || 0) > 0);
        setAllProfiles(shuffleArray(inStock));
      } else {
        setAllProfiles([]);
      }
    } catch (err) {
      console.warn('Erreur chargement produits:', err.message);
      setAllProfiles([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addToCart = (product) => {
    if (!product || (product.stock !== undefined && Number(product.stock) <= 0)) return;
    setCartItems((prev) => {
      const existing = prev.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.name || product.title,
          format: product.format || '',
          price: Number(product.price) || 0,
          purchase_price: Number(product.purchase_price) || 0,
          quantity: 1,
          image: product.image || '/assets/images/books/book1.jpg'
        }
      ];
    });
  };

  const updateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (String(item.id) === String(id)) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const swipeCard = (id, action) => {
    setSwipedList((prev) => [...prev, { id, action }]);
  };

  const resetCards = () => {
    setSwipedList([]);
  };

  const addToLiked = (card) => {
    if (!card) return;
    setLikedList((prev) => {
      const exists = prev.some((item) => String(item.id) === String(card.id));
      if (exists) return prev;
      const newItem = {
        id: card.id,
        name: card.name || card.title,
        author: card.author || '',
        school: card.author
          ? `${card.author} • ${card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : ''}`
          : (card.distance || (card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : '')),
        price: card.price || 0,
        priceFormatted: card.priceFormatted || (card.price ? `${Number(card.price).toLocaleString('fr-FR')} DA` : ''),
        image: card.image || '/assets/images/books/book1.jpg',
        video: card.video || null,
        format: card.format || '',
        bio: card.bio || '',
      };
      return [newItem, ...prev];
    });
  };

  const removeFromLiked = (id) => {
    setLikedList((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const isLiked = (id) => {
    return likedList.some((item) => String(item.id) === String(id));
  };

  return (
    <DatingContext.Provider
      value={{
        profiles,
        allProfiles,
        loadingProducts,
        setProfiles: setAllProfiles,
        activeFilters,
        setActiveFilters,
        fetchProducts,
        swipedList,
        swipeCard,
        resetCards,
        likedList,
        setLikedList,
        addToLiked,
        removeFromLiked,
        isLiked,
        matches,
        setMatches,
        userProfile,
        setUserProfile,
        cartItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        logout
      }}
    >
      {children}
    </DatingContext.Provider>
  );
};

export const useDating = () => useContext(DatingContext);
