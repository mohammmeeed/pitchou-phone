// frontend/src/admin/pages/AdminProducts.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';
import AdminPagination from '../components/AdminPagination';

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video');
};

export default function AdminProducts({ initialView }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Category Searchable Select State & Refs (Filter Bar)
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const catDropdownRef = useRef(null);
  const catSearchInputRef = useRef(null);

  // Form Category Dropdown State & Refs (Add/Edit Form)
  const [isFormCatDropdownOpen, setIsFormCatDropdownOpen] = useState(false);
  const [formCatSearchQuery, setFormCatSearchQuery] = useState('');
  const formCatDropdownRef = useRef(null);
  const formCatSearchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target)) {
        setIsCatDropdownOpen(false);
      }
      if (formCatDropdownRef.current && !formCatDropdownRef.current.contains(event.target)) {
        setIsFormCatDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsCatDropdownOpen(false);
        setIsFormCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isCatDropdownOpen && catSearchInputRef.current) {
      setTimeout(() => catSearchInputRef.current?.focus(), 50);
    }
  }, [isCatDropdownOpen]);

  useEffect(() => {
    if (isFormCatDropdownOpen && formCatSearchInputRef.current) {
      setTimeout(() => formCatSearchInputRef.current?.focus(), 50);
    }
  }, [isFormCatDropdownOpen]);

  const navigate = useNavigate();
  const location = useLocation();

  // In-Page View State: 'list' (Catalogue table), 'form' (Integrated form card) or 'attributes'
  const isAttributesRoute = location.pathname === '/admin/attributes' || location.search.includes('view=attributes') || initialView === 'attributes';
  const [viewMode, setViewMode] = useState(() => (isAttributesRoute ? 'attributes' : 'list'));

  // Synchroniser viewMode lors des navigations (ex: clic dans la sidebar)
  useEffect(() => {
    if (location.pathname === '/admin/attributes' || location.search.includes('view=attributes')) {
      setViewMode('attributes');
    } else if (location.pathname === '/admin/products' && !location.search.includes('view=attributes')) {
      setViewMode('list');
    }
  }, [location.pathname, location.search]);

  const [editingProduct, setEditingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Upload Photo State & Ref
  const imageFilesInputRef = useRef(null);
  const videoFilesInputRef = useRef(null);
  const mediaFilesInputRef = useRef(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [manualMediaUrl, setManualMediaUrl] = useState('');
  const [draggedMediaIndex, setDraggedMediaIndex] = useState(null);
  const [dragOverMediaIndex, setDragOverMediaIndex] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualVideoUrl, setManualVideoUrl] = useState('');

  // Gestion des Attributs (Catégories & Langues)
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [newSubcatInput, setNewSubcatInput] = useState({}); // { [parentCat]: string }
  const [editingSubcategory, setEditingSubcategory] = useState(null); // { parent: string, oldName: string, value: string, image: string }
  const [languagesList, setLanguagesList] = useState([
    'Français',
    'Anglais',
    'Arabe'
  ]);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { oldName: string, value: string, image: string }
  const [categoryImages, setCategoryImages] = useState({});
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const [uploadingSubcatImage, setUploadingSubcatImage] = useState(false);
  const [newLangInput, setNewLangInput] = useState('');
  const [editingLanguage, setEditingLanguage] = useState(null); // { oldName: string, value: string }

  // Onglets & Recherche dans Paramètres des Attributs (Affichage en fenêtres dédiées pleine page)
  const [attributeTab, setAttributeTab] = useState('categories'); // 'categories' | 'languages' | 'wilayas'
  const [categorySearch, setCategorySearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');

  // Wilayas State (Ajout, Modification, Suppression et Tarifs de Livraison Bureau & Domicile)
  const [wilayasList, setWilayasList] = useState([]);
  const [newWilayaNameInput, setNewWilayaNameInput] = useState('');
  const [newWilayaBureauPriceInput, setNewWilayaBureauPriceInput] = useState('350');
  const [newWilayaDomicilePriceInput, setNewWilayaDomicilePriceInput] = useState('500');
  const [editingWilaya, setEditingWilaya] = useState(null); // { oldName: string, name: string, price_bureau: number, price_domicile: number, price: number }
  const [wilayaSearch, setWilayaSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    format: '',
    price: '',
    purchase_price: '',
    stock: '',
    category: '',
    categories: [],
    rating: 4.8,
    image: '',
    images: [],
    video: '',
    videos: [],
    media: [],
    bio: '',
    languages: []
  });


  const toggleCategory = (cat, parentCat = null) => {
    setFormData((prev) => {
      let current = [];
      if (Array.isArray(prev.categories) && prev.categories.length > 0) {
        current = prev.categories;
      } else if (prev.category) {
        current = prev.category.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const exists = current.includes(cat);
      let updated;
      if (exists) {
        updated = current.filter((c) => c !== cat);
      } else {
        updated = [...current, cat];
        if (parentCat && !current.includes(parentCat)) {
          updated.push(parentCat);
        }
      }
      return {
        ...prev,
        categories: updated,
        category: updated.join(', ')
      };
    });
  };

  const toggleLanguage = (lang) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.languages) ? prev.languages : [];
      const updated = current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang];
      return { ...prev, languages: updated };
    });
  };

  useEffect(() => {
    loadProducts();
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    try {
      const data = await adminApi.getAttributes();
      if (data) {
        if (Array.isArray(data.categories)) {
          setCategoriesList(data.categories);
        }
        if (data.subcategories && typeof data.subcategories === 'object') {
          setSubcategoriesMap(data.subcategories);
        }
        if (data.category_images && typeof data.category_images === 'object') {
          setCategoryImages(data.category_images);
        }
        if (Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguagesList(data.languages);
        }
        if (Array.isArray(data.wilayas)) {
          setWilayasList(data.wilayas);
        }
      }
    } catch (e) {
      console.warn('Erreur chargement attributs:', e);
    }
  };

  // Handlers pour Sous-catégories
  const handleAddSubcategory = async (parentCat) => {
    const trimmed = (newSubcatInput[parentCat] || '').trim();
    if (!trimmed) return;
    const currentSubs = subcategoriesMap[parentCat] || [];
    if (currentSubs.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette sous-catégorie existe déjà.');
      return;
    }
    const updatedSubs = [...currentSubs, trimmed];
    const updatedMap = {
      ...subcategoriesMap,
      [parentCat]: updatedSubs
    };
    setSubcategoriesMap(updatedMap);
    setNewSubcatInput((prev) => ({ ...prev, [parentCat]: '' }));
    showToast(`Sous-catégorie "${trimmed}" ajoutée à "${parentCat}" !`);
    await adminApi.saveAttributes({
      action: 'add_subcategory',
      parentCategory: parentCat,
      name: trimmed,
      categories: categoriesList,
      subcategories: updatedMap,
      category_images: categoryImages,
      languages: languagesList
    });
  };

  const handleSaveEditSubcategory = async (parentCat, oldName, newName, image) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      setEditingSubcategory(null);
      return;
    }
    const currentSubs = subcategoriesMap[parentCat] || [];
    const updatedSubs = currentSubs.map((s) => (s === oldName ? trimmed : s));
    const updatedMap = {
      ...subcategoriesMap,
      [parentCat]: updatedSubs
    };
    setSubcategoriesMap(updatedMap);

    const updatedImages = { ...categoryImages };
    if (oldName !== trimmed) {
      delete updatedImages[oldName];
    }
    if (image && typeof image === 'string' && image.trim() !== '') {
      updatedImages[trimmed] = image.trim();
    } else {
      delete updatedImages[trimmed];
    }
    setCategoryImages(updatedImages);
    setEditingSubcategory(null);
    showToast(`Sous-catégorie "${trimmed}" mise à jour !`);
    await adminApi.saveAttributes({
      action: 'edit_subcategory',
      parentCategory: parentCat,
      oldName,
      newName: trimmed,
      image: image || '',
      categories: categoriesList,
      subcategories: updatedMap,
      category_images: updatedImages,
      languages: languagesList
    });
  };

  const handleDeleteSubcategory = async (parentCat, subName) => {
    const currentSubs = subcategoriesMap[parentCat] || [];
    const updatedSubs = currentSubs.filter((s) => s !== subName);
    const updatedMap = {
      ...subcategoriesMap,
      [parentCat]: updatedSubs
    };
    setSubcategoriesMap(updatedMap);
    const updatedImages = { ...categoryImages };
    delete updatedImages[subName];
    setCategoryImages(updatedImages);
    showToast(`Sous-catégorie "${subName}" supprimée.`);
    await adminApi.saveAttributes({
      action: 'delete_subcategory',
      parentCategory: parentCat,
      name: subName,
      categories: categoriesList,
      subcategories: updatedMap,
      category_images: updatedImages,
      languages: languagesList
    });
  };

  const handleSubcatPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSubcatImage(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        setEditingSubcategory((prev) => ({
          ...prev,
          image: res.url
        }));
        showToast("Photo de sous-catégorie importée ! Cliquez sur Valider.");
      } else {
        alert("Erreur lors du téléversement de la photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement de la photo.");
    } finally {
      setUploadingSubcatImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDirectSubcatPhotoUpload = async (subName, parentCat, file) => {
    if (!file) return;
    setUploadingSubcatImage(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        const updatedImages = {
          ...categoryImages,
          [subName]: res.url
        };
        setCategoryImages(updatedImages);
        if (editingSubcategory && editingSubcategory.oldName === subName) {
          setEditingSubcategory((prev) => ({ ...prev, image: res.url }));
        }
        showToast(`Photo de "${subName}" enregistrée en base de données !`);
        await adminApi.saveAttributes({
          action: 'set_subcategory_image',
          parentCategory: parentCat,
          name: subName,
          image: res.url,
          categories: categoriesList,
          subcategories: subcategoriesMap,
          category_images: updatedImages,
          languages: languagesList
        });
      } else {
        alert("Erreur lors du téléversement de la photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement de la photo.");
    } finally {
      setUploadingSubcatImage(false);
    }
  };

  const handleDirectCatPhotoUpload = async (catName, file) => {
    if (!file) return;
    setUploadingCatImage(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        const updatedImages = {
          ...categoryImages,
          [catName]: res.url
        };
        setCategoryImages(updatedImages);
        if (editingCategory && editingCategory.oldName === catName) {
          setEditingCategory((prev) => ({ ...prev, image: res.url }));
        }
        showToast(`Photo de "${catName}" enregistrée en base de données !`);
        await adminApi.saveAttributes({
          action: 'set_category_image',
          name: catName,
          image: res.url,
          categories: categoriesList,
          subcategories: subcategoriesMap,
          category_images: updatedImages,
          languages: languagesList
        });
      } else {
        alert("Erreur lors du téléversement de la photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement de la photo.");
    } finally {
      setUploadingCatImage(false);
    }
  };

  // Handlers pour Catégories (Ajouter, Modifier avec image, Supprimer)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette catégorie existe déjà.');
      return;
    }
    const updated = [...categoriesList, trimmed];
    setCategoriesList(updated);
    setNewCatInput('');
    showToast(`Catégorie "${trimmed}" ajoutée avec succès !`);
    await adminApi.saveAttributes({ action: 'add_category', name: trimmed, categories: updated, category_images: categoryImages, languages: languagesList });
  };

  const handleCategoryPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCatImage(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        setEditingCategory((prev) => ({
          ...prev,
          image: res.url
        }));
        showToast("Photo de couverture importée ! Cliquez sur Valider pour enregistrer.");
      } else {
        alert("Erreur lors du téléversement de la photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement de la photo.");
    } finally {
      setUploadingCatImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveEditCategory = async (oldName, newName, image) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      setEditingCategory(null);
      return;
    }
    const updated = categoriesList.map((c) => (c === oldName ? trimmed : c));
    setCategoriesList(updated);

    const updatedImages = { ...categoryImages };
    if (oldName !== trimmed) {
      delete updatedImages[oldName];
    }
    if (image && typeof image === 'string' && image.trim() !== '') {
      updatedImages[trimmed] = image.trim();
    } else {
      delete updatedImages[trimmed];
    }
    setCategoryImages(updatedImages);

    const updatedMap = { ...subcategoriesMap };
    if (oldName !== trimmed) {
      updatedMap[trimmed] = updatedMap[oldName] || [];
      delete updatedMap[oldName];
      setSubcategoriesMap(updatedMap);
    }

    setFormData((prev) => {
      const currentCats = (prev.categories || []).map((c) => (c === oldName ? trimmed : c));
      return {
        ...prev,
        categories: currentCats,
        category: currentCats.join(', ')
      };
    });
    if (selectedCategory === oldName) {
      setSelectedCategory(trimmed);
    }
    setEditingCategory(null);
    showToast(`Catégorie "${trimmed}" mise à jour !`);
    await adminApi.saveAttributes({ 
      action: 'edit_category', 
      oldName, 
      newName: trimmed, 
      image: image || '',
      categories: updated, 
      subcategories: updatedMap,
      category_images: updatedImages,
      languages: languagesList 
    });
    await loadProducts();
  };

  const handleDeleteCategory = async (catName) => {
    const updated = categoriesList.filter((c) => c !== catName);
    setCategoriesList(updated);
    const updatedImages = { ...categoryImages };
    delete updatedImages[catName];
    setCategoryImages(updatedImages);
    const updatedMap = { ...subcategoriesMap };
    delete updatedMap[catName];
    setSubcategoriesMap(updatedMap);
    setFormData((prev) => {
      const currentCats = (prev.categories || []).filter((c) => c !== catName);
      return {
        ...prev,
        categories: currentCats,
        category: currentCats.join(', ')
      };
    });
    if (selectedCategory === catName) {
      setSelectedCategory('Tous');
    }
    showToast(`Catégorie "${catName}" supprimée.`);
    await adminApi.saveAttributes({ 
      action: 'delete_category', 
      name: catName, 
      categories: updated, 
      subcategories: updatedMap,
      category_images: updatedImages,
      languages: languagesList 
    });
  };

  // Handlers pour Langues (Ajouter, Modifier, Supprimer sans pop-up)
  const handleAddLanguage = async (e) => {
    e.preventDefault();
    const trimmed = newLangInput.trim();
    if (!trimmed) return;
    if (languagesList.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette langue existe déjà.');
      return;
    }
    const updated = [...languagesList, trimmed];
    setLanguagesList(updated);
    setNewLangInput('');
    showToast(`Langue "${trimmed}" ajoutée avec succès !`);
    await adminApi.saveAttributes({ action: 'add_language', name: trimmed, categories: categoriesList, languages: updated });
  };

  const handleSaveEditLanguage = async (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingLanguage(null);
      return;
    }
    const updated = languagesList.map((l) => (l === oldName ? trimmed : l));
    setLanguagesList(updated);
    if (Array.isArray(formData.languages) && formData.languages.includes(oldName)) {
      setFormData((prev) => ({
        ...prev,
        languages: prev.languages.map((l) => (l === oldName ? trimmed : l))
      }));
    }
    setEditingLanguage(null);
    showToast(`Langue renommée en "${trimmed}" !`);
    await adminApi.saveAttributes({ action: 'edit_language', oldName, newName: trimmed, categories: categoriesList, languages: updated });
  };

  const handleDeleteLanguage = async (langName) => {
    const updated = languagesList.filter((l) => l !== langName);
    setLanguagesList(updated);
    if (Array.isArray(formData.languages) && formData.languages.includes(langName)) {
      setFormData((prev) => ({
        ...prev,
        languages: prev.languages.filter((l) => l !== langName)
      }));
    }
    showToast(`Langue "${langName}" supprimée.`);
    await adminApi.saveAttributes({ action: 'delete_language', name: langName, categories: categoriesList, languages: updated });
  };

  // Handlers pour Wilayas & Frais de Livraison (Ajouter, Modifier, Supprimer)
  const handleAddWilaya = async (e) => {
    e.preventDefault();
    const trimmed = newWilayaNameInput.trim();
    if (!trimmed) return;
    if (wilayasList.some((w) => (w.name || '').toLowerCase() === trimmed.toLowerCase())) {
      showToast('Cette wilaya existe déjà.');
      return;
    }
    const pBureau = parseFloat(newWilayaBureauPriceInput) >= 0 ? parseFloat(newWilayaBureauPriceInput) : 350;
    const pDomicile = parseFloat(newWilayaDomicilePriceInput) >= 0 ? parseFloat(newWilayaDomicilePriceInput) : 500;
    const newObj = {
      name: trimmed,
      price_bureau: pBureau,
      price_domicile: pDomicile,
      price: pDomicile
    };
    const updated = [...wilayasList, newObj];
    setWilayasList(updated);
    setNewWilayaNameInput('');
    setNewWilayaBureauPriceInput('350');
    setNewWilayaDomicilePriceInput('500');
    showToast(`Wilaya "${trimmed}" ajoutée (Bureau: ${pBureau} DA, Domicile: ${pDomicile} DA) !`);
    const res = await adminApi.saveAttributes({
      action: 'add_wilaya',
      name: trimmed,
      price_bureau: pBureau,
      price_domicile: pDomicile,
      price: pDomicile,
      categories: categoriesList,
      languages: languagesList,
      wilayas: updated
    });
    if (res && Array.isArray(res.wilayas)) {
      setWilayasList(res.wilayas);
    }
  };

  const handleSaveEditWilaya = async (oldName, newName, newBureauPrice, newDomicilePrice) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      setEditingWilaya(null);
      return;
    }
    const pBureau = parseFloat(newBureauPrice) >= 0 ? parseFloat(newBureauPrice) : 350;
    const pDomicile = parseFloat(newDomicilePrice) >= 0 ? parseFloat(newDomicilePrice) : 500;
    const updated = wilayasList.map((w) =>
      w.name === oldName
        ? { ...w, name: trimmed, price_bureau: pBureau, price_domicile: pDomicile, price: pDomicile }
        : w
    );
    setWilayasList(updated);
    setEditingWilaya(null);
    showToast(`Wilaya "${trimmed}" mise à jour (Bureau: ${pBureau} DA, Domicile: ${pDomicile} DA) !`);
    const res = await adminApi.saveAttributes({
      action: 'edit_wilaya',
      oldName,
      newName: trimmed,
      price_bureau: pBureau,
      price_domicile: pDomicile,
      price: pDomicile,
      categories: categoriesList,
      languages: languagesList,
      wilayas: updated
    });
    if (res && Array.isArray(res.wilayas)) {
      setWilayasList(res.wilayas);
    }
  };

  const handleDeleteWilaya = async (wilayaName) => {
    const updated = wilayasList.filter((w) => w.name !== wilayaName);
    setWilayasList(updated);
    showToast(`Wilaya "${wilayaName}" supprimée.`);
    const res = await adminApi.saveAttributes({
      action: 'delete_wilaya',
      name: wilayaName,
      categories: categoriesList,
      languages: languagesList,
      wilayas: updated
    });
    if (res && Array.isArray(res.wilayas)) {
      setWilayasList(res.wilayas);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

    // =========================================================================
  // GESTION UNIFIÉE DES MÉDIAS (PHOTOS & VIDÉOS AVEC DRAG & DROP)
  // =========================================================================
  const getMediaList = () => {
    if (Array.isArray(formData.media) && formData.media.length > 0) {
      return formData.media.filter((item) => item && typeof item.url === 'string' && item.url.trim() !== '');
    }
    const imgs = (Array.isArray(formData.images) ? formData.images : (formData.image ? [formData.image] : []))
      .filter((u) => typeof u === 'string' && u.trim() !== '')
      .map((url) => ({ type: isVideoUrl(url) ? 'video' : 'image', url }));
    const vids = (Array.isArray(formData.videos) ? formData.videos : (formData.video ? [formData.video] : []))
      .filter((u) => typeof u === 'string' && u.trim() !== '')
      .map((url) => ({ type: 'video', url }));
    const seen = new Set();
    const result = [];
    [...imgs, ...vids].forEach((item) => {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url);
        result.push(item);
      }
    });
    return result;
  };

  const updateMediaList = (newMedia) => {
    const cleaned = (newMedia || []).filter((m) => m && typeof m.url === 'string' && m.url.trim() !== '');
    const images = cleaned.filter((m) => m.type === 'image').map((m) => m.url);
    const videos = cleaned.filter((m) => m.type === 'video').map((m) => m.url);
    setFormData((prev) => ({
      ...prev,
      media: cleaned,
      images,
      image: images[0] || '',
      videos,
      video: videos[0] || null
    }));
  };

  const uploadAndAddMedia = async (files) => {
    setUploadingMedia(true);
    setUploadSuccess('');
    setFormError('');
    try {
      const results = await adminApi.uploadMultipleMedia(files);
      const newItems = [];
      results.forEach((r, idx) => {
        if (r && r.success && r.url) {
          const file = files[idx];
          const isVid = file ? file.type.startsWith('video/') : isVideoUrl(r.url);
          newItems.push({
            type: isVid ? 'video' : 'image',
            url: r.url
          });
        }
      });

      if (newItems.length > 0) {
        const current = getMediaList();
        updateMediaList([...current, ...newItems]);
        setUploadSuccess(`${newItems.length} média(s) (photo/vidéo) chargé(s) avec succès !`);
      } else {
        setFormError('Erreur lors du chargement des médias');
      }
    } catch (err) {
      setFormError('Erreur lors du téléversement');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadAndAddMedia(files);
    if (e.target) e.target.value = '';
  };

  const handleDropMedia = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (files.length === 0) return;
    await uploadAndAddMedia(files);
  };

  const handleAddManualMedia = (e) => {
    if (e) e.preventDefault();
    const url = manualMediaUrl.trim();
    if (!url) return;
    const isVid = isVideoUrl(url);
    const current = getMediaList();
    updateMediaList([...current, { type: isVid ? 'video' : 'image', url }]);
    setManualMediaUrl('');
    setUploadSuccess(`${isVid ? 'Vidéo' : 'Photo'} ajoutée depuis le lien !`);
  };

  const handleRemoveMedia = (indexToRemove) => {
    const current = getMediaList();
    const updated = current.filter((_, i) => i !== indexToRemove);
    updateMediaList(updated);
  };

  const handleSetPrimaryMedia = (indexToPrimary) => {
    const current = getMediaList();
    const list = [...current];
    const [item] = list.splice(indexToPrimary, 1);
    updateMediaList([item, ...list]);
  };

  // Drag and Drop Handlers pour réordonner les médias
  const handleMediaDragStart = (e, index) => {
    setDraggedMediaIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {}
  };

  const handleMediaDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMediaIndex !== index) {
      setDragOverMediaIndex(index);
    }
  };

  const handleMediaDragEnd = () => {
    setDraggedMediaIndex(null);
    setDragOverMediaIndex(null);
  };

  const handleMediaDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedMediaIndex === null || draggedMediaIndex === targetIndex) {
      setDraggedMediaIndex(null);
      setDragOverMediaIndex(null);
      return;
    }
    const current = getMediaList();
    const list = [...current];
    const [moved] = list.splice(draggedMediaIndex, 1);
    list.splice(targetIndex, 0, moved);
    updateMediaList(list);
    setDraggedMediaIndex(null);
    setDragOverMediaIndex(null);
  };

  // Aliases rétrocompatibles
  const handleImageFilesChange = handleMediaFilesChange;
  const handleDropImages = handleDropMedia;
  const handleRemoveImage = handleRemoveMedia;
  const handleSetPrimaryImage = handleSetPrimaryMedia;
  const handleAddManualImage = handleAddManualMedia;
  const handleVideoFilesChange = handleMediaFilesChange;
  const handleDropVideos = handleDropMedia;
  const handleRemoveVideo = handleRemoveMedia;
  const handleSetPrimaryVideo = handleSetPrimaryMedia;
  const handleAddManualVideo = handleAddManualMedia;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormError('');
    setUploadSuccess('');
    setManualImageUrl('');
    setManualVideoUrl('');
    setFormData({
      name: '',
      author: '',
      format: '',
      price: '',
      purchase_price: '',
      stock: '',
      category: '',
      categories: [],
      rating: 4.8,
      image: '',
      images: [],
      video: '',
      videos: [],
    media: [],
      bio: '',
      languages: []
    });
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormError('');
    setUploadSuccess('');
    setManualImageUrl('');
    setManualVideoUrl('');

    let parsedLangs = [];
    if (Array.isArray(prod.languages)) {
      parsedLangs = prod.languages;
    } else if (typeof prod.languages === 'string' && prod.languages.trim() !== '') {
      parsedLangs = prod.languages.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Parse categories array
    let parsedCategories = [];
    if (Array.isArray(prod.categories) && prod.categories.length > 0) {
      parsedCategories = prod.categories;
    } else if (typeof prod.categories === 'string' && prod.categories.trim() !== '') {
      try {
        const decoded = JSON.parse(prod.categories);
        if (Array.isArray(decoded)) parsedCategories = decoded;
      } catch (e) {
        parsedCategories = prod.categories.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (prod.category) {
      parsedCategories = prod.category.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Parse images array
    let parsedImages = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      parsedImages = prod.images;
    } else if (typeof prod.images === 'string' && prod.images.trim() !== '') {
      try {
        const decoded = JSON.parse(prod.images);
        if (Array.isArray(decoded)) parsedImages = decoded;
      } catch (e) {
        parsedImages = [prod.images];
      }
    } else if (prod.image) {
      parsedImages = [prod.image];
    }
    parsedImages = (parsedImages || []).filter((u) => typeof u === 'string' && u.trim() !== '');

    // Parse videos array
    let parsedVideos = [];
    if (Array.isArray(prod.videos) && prod.videos.length > 0) {
      parsedVideos = prod.videos;
    } else if (typeof prod.videos === 'string' && prod.videos.trim() !== '') {
      try {
        const decoded = JSON.parse(prod.videos);
        if (Array.isArray(decoded)) parsedVideos = decoded;
      } catch (e) {
        parsedVideos = [prod.videos];
      }
    } else if (prod.video) {
      parsedVideos = [prod.video];
    }
    parsedVideos = (parsedVideos || []).filter((u) => typeof u === 'string' && u.trim() !== '');

    setFormData({
      name: prod.name || '',
      author: prod.author || '',
      format: prod.format || '',
      price: prod.price || '',
      purchase_price: prod.purchase_price !== undefined && prod.purchase_price !== null && Number(prod.purchase_price) > 0 ? String(prod.purchase_price) : '',
      stock: prod.stock !== undefined && prod.stock !== null ? String(prod.stock) : '0',
      category: parsedCategories.join(', '),
      categories: parsedCategories,
      rating: prod.rating || 4.8,
      image: parsedImages[0] || prod.image || '',
      images: parsedImages,
      video: parsedVideos[0] || prod.video || '',
      videos: parsedVideos,
      media: [
        ...parsedImages.map((u) => ({ type: isVideoUrl(u) ? 'video' : 'image', url: u })),
        ...parsedVideos.map((u) => ({ type: 'video', url: u }))
      ].filter((m) => m && typeof m.url === 'string' && m.url.trim() !== ''),
      bio: prod.bio || '',
      languages: parsedLangs
    });
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      setFormError('Veuillez renseigner au moins le nom du produit et son prix.');
      return;
    }

    const validImages = (formData.images || []).filter((u) => typeof u === 'string' && u.trim() !== '');
    const validVideos = (formData.videos || []).filter((u) => typeof u === 'string' && u.trim() !== '');
    const mainImg = validImages[0] || (typeof formData.image === 'string' && formData.image.trim() !== '' ? formData.image : '');
    const mainVid = validVideos[0] || (typeof formData.video === 'string' && formData.video.trim() !== '' ? formData.video : null);

    const payload = {
      format: formData.format || '',
      etat: formData.format || '',
      ...formData,
      category: (formData.categories || []).join(', ') || formData.category || '',
      categories: formData.categories || [],
      image: mainImg,
      images: validImages,
      video: mainVid,
      videos: validVideos,
      price: parseFloat(formData.price),
      purchase_price: formData.purchase_price !== '' ? parseFloat(formData.purchase_price) : 0,
      stock: parseInt(formData.stock, 10) || 0
    };

    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload);
        showToast('Produit mis à jour avec succès !');
      } else {
        await adminApi.createProduct(payload);
        showToast('Nouveau produit ajouté avec succès !');
      }
      setViewMode('list');
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormError('Erreur lors de l’enregistrement du produit dans la base de données.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteProduct(id);
      showToast('Produit supprimé avec succès.');
      setDeleteConfirmId(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.');
    }
  };

  const categoriesForFilter = useMemo(() => {
    const list = ['Tous', ...categoriesList];
    Object.keys(subcategoriesMap || {}).forEach((pCat) => {
      (subcategoriesMap[pCat] || []).forEach((sub) => {
        if (!list.includes(sub)) {
          list.push(sub);
        }
      });
    });
    return list;
  }, [categoriesList, subcategoriesMap]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    const norm = (s) => (s || '').toLowerCase().trim();

    categoriesForFilter.forEach((c) => {
      counts[c] = 0;
    });

    products.forEach((p) => {
      const pCats = Array.isArray(p.categories) && p.categories.length > 0
        ? p.categories
        : (p.category ? p.category.split(',').map((s) => s.trim()) : []);
      const pCatsNorm = pCats.map(norm);

      categoriesForFilter.forEach((cat) => {
        const catNorm = norm(cat);
        if (pCatsNorm.some((c) => c === catNorm || c.includes(catNorm))) {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      });
    });

    return counts;
  }, [products, categoriesForFilter]);

  const filteredCategoriesForSelect = useMemo(() => {
    const q = catSearchQuery.toLowerCase().trim();
    if (!q) return categoriesForFilter;
    return categoriesForFilter.filter((cat) => {
      if (cat === 'Tous') return 'tous'.includes(q) || 'toutes'.includes(q);
      return cat.toLowerCase().includes(q);
    });
  }, [categoriesForFilter, catSearchQuery]);

  const formCategoryOptions = useMemo(() => {
    const options = [];
    categoriesList.forEach((cat) => {
      options.push({ name: cat, isSub: false, parent: null, image: categoryImages[cat] });
      const subs = subcategoriesMap[cat] || [];
      subs.forEach((sub) => {
        options.push({ name: sub, isSub: true, parent: cat, image: categoryImages[sub] });
      });
    });
    return options;
  }, [categoriesList, subcategoriesMap, categoryImages]);

  const filteredFormCategories = useMemo(() => {
    const q = formCatSearchQuery.toLowerCase().trim();
    if (!q) return formCategoryOptions;
    return formCategoryOptions.filter((opt) =>
      opt.name.toLowerCase().includes(q) || (opt.parent && opt.parent.toLowerCase().includes(q))
    );
  }, [formCategoryOptions, formCatSearchQuery]);

  const filteredProducts = products.filter((p) => {
    const pName = (p.name || '').toLowerCase();
    const pAuthor = (p.author || '').toLowerCase();
    const q = (search || '').toLowerCase().trim();
    const matchesSearch = !q || pName.includes(q) || pAuthor.includes(q);

    let matchesCat = selectedCategory === 'Tous';
    if (!matchesCat) {
      const pCats = Array.isArray(p.categories) && p.categories.length > 0
        ? p.categories
        : (p.category ? p.category.split(',').map((s) => s.trim()) : []);
      const selLower = selectedCategory.toLowerCase().trim();
      matchesCat = pCats.some((c) => {
        const cLower = (c || '').toLowerCase().trim();
        return cLower === selLower || cLower.includes(selLower);
      });
    }
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast" style={{ backgroundColor: '#209f84' }}>
          <i className="fas fa-check-circle" /> {toastMessage}
        </div>
      )}

      {/* =========================================================================
          VIEW 0: PARAMÈTRES DES ATTRIBUTS (CATÉGORIES & LANGUES) - PAS DE POP-UP !
          ========================================================================= */}
      {viewMode === 'attributes' ? (
        <div>
          {/* Header de la page des attributs */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="page-title-wrap">
              <h1>Paramètres des Attributs</h1>
              <p className="breadcrumb-sub">Gérer les catégories de produits et les tarifs de livraison</p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => {
                  if (location.pathname === '/admin/attributes') {
                    navigate('/admin/products');
                  } else {
                    setViewMode(editingProduct ? 'form' : 'list');
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fas fa-arrow-left" /> {editingProduct ? 'Retour au Produit' : 'Retour au Catalogue'}
              </button>
            </div>
          </div>

          {/* Navigation par Onglets (Fenêtres en Pleine Page) */}
          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              marginBottom: '1.75rem',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.85rem',
              flexWrap: 'wrap'
            }}
          >
            {[
              { id: 'categories', label: 'Catégories de Produits', count: categoriesList.length, icon: 'fas fa-tags', color: '#fe2c55' },
              { id: 'wilayas', label: 'Wilayas & Tarifs de Livraison', count: wilayasList.length, icon: 'fas fa-truck-moving', color: '#0284c7' }
            ].map((tab) => {
              const isActive = attributeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAttributeTab(tab.id)}
                  style={{
                    padding: '0.7rem 1.35rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: isActive ? '#111827' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    boxShadow: isActive ? '0 4px 12px rgba(17,24,39,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={tab.icon} style={{ color: isActive ? '#ffffff' : tab.color }} />
                  <span>{tab.label}</span>
                  <span
                    style={{
                      padding: '0.15rem 0.55rem',
                      borderRadius: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b'
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FENÊTRE 1 : CATÉGORIES DE PRODUITS (Full Width) */}
          {attributeTab === 'categories' && (
            <div className="admin-card" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
              <div
                className="card-header-custom"
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#ffffff'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                    <i className="fas fa-tags" style={{ color: '#fe2c55' }} />
                    Catégories de Produits
                  </h4>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Gérer l'ensemble des catégories et sous-catégories de Pitchou Phone
                  </p>
                </div>
                <span className="badge-custom bg-soft-primary" style={{ fontWeight: 800, fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                  {categoriesList.length} catégories
                </span>
              </div>

              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Barre d'action : Formulaire d'ajout rapide + Barre de recherche */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <form
                    onSubmit={handleAddCategory}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.65rem',
                      flex: 1,
                      minWidth: '300px'
                    }}
                  >
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Nouvelle catégorie (ex: Téléphones, Accessoires, Batteries...)"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      style={{ flex: 1, minWidth: '220px' }}
                    />
                    <button
                      type="submit"
                      className="btn-primary-custom"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        whiteSpace: 'nowrap',
                        padding: '0.65rem 1.25rem',
                        fontWeight: 700
                      }}
                    >
                      <i className="fas fa-plus" /> Ajouter Catégorie
                    </button>
                  </form>

                  {/* Recherche rapide */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                    <i
                      className="fas fa-search"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                      }}
                    />
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Rechercher une catégorie..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Grille responsive des catégories */}
                {(() => {
                  const filteredCats = categoriesList.filter((cat) =>
                    !categorySearch ||
                    cat.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    (subcategoriesMap[cat] || []).some((s) => s.toLowerCase().includes(categorySearch.toLowerCase()))
                  );

                  if (filteredCats.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Aucune catégorie ne correspond à "{categorySearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                        gap: '1.25rem'
                      }}
                    >
                      {filteredCats.map((cat) => {
                        const isEditing = editingCategory?.oldName === cat;
                        const subs = subcategoriesMap[cat] || [];
                        const catImg = categoryImages[cat];

                        return (
                          <div
                            key={cat}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '1.25rem',
                              borderRadius: '12px',
                              backgroundColor: isEditing ? '#fef2f2' : '#ffffff',
                              border: isEditing ? '2px solid #fe2c55' : '1px solid #e2e8f0',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease',
                              gap: '1rem'
                            }}
                          >
                            {/* Card Header : Catégorie principale */}
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="form-control-custom"
                                    value={editingCategory.value}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, value: e.target.value })}
                                    placeholder="Nom de la catégorie"
                                    style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    className="btn-primary-custom"
                                    onClick={() => handleSaveEditCategory(cat, editingCategory.value, editingCategory.image)}
                                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                                    title="Enregistrer"
                                  >
                                    <i className="fas fa-check" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-light-custom"
                                    onClick={() => setEditingCategory(null)}
                                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                                    title="Annuler"
                                  >
                                    <i className="fas fa-times" />
                                  </button>
                                </div>

                                {/* Sélecteur de Photo / Icône pour la Catégorie */}
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.75rem', 
                                  padding: '0.6rem 0.75rem', 
                                  backgroundColor: '#ffffff', 
                                  borderRadius: '8px',
                                  border: '1px dashed #cbd5e1'
                                }}>
                                  {editingCategory.image ? (
                                    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                                      <img 
                                        src={editingCategory.image} 
                                        alt="Aperçu catégorie" 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '3px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setEditingCategory({ ...editingCategory, image: '' })}
                                        style={{
                                          position: 'absolute',
                                          top: '-6px',
                                          right: '-6px',
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          backgroundColor: '#ef4444',
                                          color: '#ffffff',
                                          border: 'none',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          lineHeight: 1,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer'
                                        }}
                                        title="Retirer l'image"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ 
                                      width: '48px', 
                                      height: '48px', 
                                      borderRadius: '6px', 
                                      backgroundColor: '#e2e8f0', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      color: '#94a3b8', 
                                      fontSize: '1.1rem',
                                      flexShrink: 0 
                                    }}>
                                      <i className="fas fa-mobile-alt" />
                                    </div>
                                  )}

                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label 
                                      className="btn-light-custom" 
                                      style={{ 
                                        cursor: uploadingCatImage ? 'not-allowed' : 'pointer', 
                                        margin: 0, 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        fontSize: '0.8rem', 
                                        padding: '0.35rem 0.75rem',
                                        width: 'fit-content',
                                        borderRadius: '6px',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0'
                                      }}
                                    >
                                      <i className="fas fa-upload" style={{ color: '#3b82f6' }} />
                                      <span>
                                        {uploadingCatImage 
                                          ? 'Téléversement...' 
                                          : editingCategory.image 
                                            ? 'Changer l\'image' 
                                            : 'Ajouter une image'}
                                      </span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        style={{ display: 'none' }} 
                                        onChange={handleCategoryPhotoUpload}
                                        disabled={uploadingCatImage}
                                      />
                                    </label>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      {editingCategory.image ? 'Image personnalisée active' : 'Aucune image (utilise le premier produit ou l\'icône)'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                  <label
                                    title="Cliquer pour changer la photo de la catégorie"
                                    style={{
                                      cursor: 'pointer',
                                      position: 'relative',
                                      display: 'inline-block',
                                      margin: 0
                                    }}
                                  >
                                    {catImg ? (
                                      <img
                                        src={catImg}
                                        alt={cat}
                                        style={{
                                          width: '42px',
                                          height: '42px',
                                          borderRadius: '8px',
                                          objectFit: 'contain',
                                          backgroundColor: '#f8fafc',
                                          flexShrink: 0,
                                          border: '1px solid #e2e8f0',
                                          padding: '4px'
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: '42px',
                                          height: '42px',
                                          borderRadius: '8px',
                                          backgroundColor: '#fee2e2',
                                          color: '#fe2c55',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '1.1rem',
                                          flexShrink: 0
                                        }}
                                      >
                                        <i className="fas fa-folder" />
                                      </div>
                                    )}
                                    <span
                                      style={{
                                        position: 'absolute',
                                        bottom: '-3px',
                                        right: '-3px',
                                        backgroundColor: '#0f172a',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        fontSize: '9px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                      }}
                                    >
                                      <i className="fas fa-camera" />
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleDirectCatPhotoUpload(cat, e.target.files[0]);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        fontSize: '1rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                      title={cat}
                                    >
                                      {cat}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                      {subs.length} sous-catégorie{subs.length > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, alignItems: 'center' }}>
                                  <label
                                    className="btn-light-custom"
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.8rem',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      margin: 0
                                    }}
                                    title="Changer la photo de la catégorie"
                                  >
                                    <i className="fas fa-camera" style={{ color: '#0ea5e9' }} />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleDirectCatPhotoUpload(cat, e.target.files[0]);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategory({ oldName: cat, value: cat, image: categoryImages[cat] || '' })}
                                    className="btn-light-custom"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                    title="Modifier la catégorie"
                                  >
                                    <i className="fas fa-edit" style={{ color: '#3b82f6' }} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="btn-light-custom"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                                    title="Supprimer la catégorie"
                                  >
                                    <i className="fas fa-trash-alt" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Section Sous-Catégories */}
                            <div
                              style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: '10px',
                                padding: '0.85rem',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <i className="fas fa-sitemap" style={{ color: '#3b82f6' }} />
                                  Sous-catégories
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {subs.length} configurée{subs.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Liste des sous-catégories existantes */}
                              {subs.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem 0' }}>
                                  Aucune sous-catégorie pour le moment.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                                  {subs.map((sub) => {
                                    const isSubEditing = editingSubcategory?.parent === cat && editingSubcategory?.oldName === sub;
                                    const subImg = categoryImages[sub];

                                    if (isSubEditing) {
                                      return (
                                        <div
                                          key={sub}
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                            padding: '0.6rem',
                                            backgroundColor: '#ffffff',
                                            border: '1.5px solid #3b82f6',
                                            borderRadius: '8px'
                                          }}
                                        >
                                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <input
                                              type="text"
                                              className="form-control-custom"
                                              value={editingSubcategory.value}
                                              onChange={(e) => setEditingSubcategory({ ...editingSubcategory, value: e.target.value })}
                                              placeholder="Nom sous-catégorie"
                                              style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                                              autoFocus
                                            />
                                            <button
                                              type="button"
                                              className="btn-primary-custom"
                                              onClick={() => handleSaveEditSubcategory(cat, sub, editingSubcategory.value, editingSubcategory.image)}
                                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                              title="Valider"
                                            >
                                              <i className="fas fa-check" />
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-light-custom"
                                              onClick={() => setEditingSubcategory(null)}
                                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                              title="Annuler"
                                            >
                                              <i className="fas fa-times" />
                                            </button>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {editingSubcategory.image ? (
                                              <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
                                                <img
                                                  src={editingSubcategory.image}
                                                  alt=""
                                                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingSubcategory({ ...editingSubcategory, image: '' })}
                                                  style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-4px',
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ef4444',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    fontSize: '9px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                  }}
                                                  title="Supprimer la photo"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ) : null}
                                            <label
                                              className="btn-light-custom"
                                              style={{
                                                cursor: uploadingSubcatImage ? 'not-allowed' : 'pointer',
                                                margin: 0,
                                                fontSize: '0.72rem',
                                                padding: '0.25rem 0.5rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}
                                            >
                                              <i className="fas fa-camera" style={{ color: '#3b82f6' }} />
                                              <span>{uploadingSubcatImage ? 'Chargement...' : editingSubcategory.image ? 'Changer la photo' : 'Ajouter une photo'}</span>
                                              <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleSubcatPhotoUpload}
                                                disabled={uploadingSubcatImage}
                                              />
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={sub}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0.4rem 0.6rem',
                                          borderRadius: '6px',
                                          backgroundColor: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          fontSize: '0.82rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                          <label
                                            title="Cliquer pour changer la photo de la sous-catégorie"
                                            style={{
                                              cursor: 'pointer',
                                              position: 'relative',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              margin: 0
                                            }}
                                          >
                                            {subImg ? (
                                              <img
                                                src={subImg}
                                                alt={sub}
                                                style={{
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '4px',
                                                  objectFit: 'contain',
                                                  backgroundColor: '#f8fafc',
                                                  padding: '2px',
                                                  border: '1px solid #cbd5e1'
                                                }}
                                              />
                                            ) : (
                                              <div
                                                style={{
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '4px',
                                                  backgroundColor: '#f1f5f9',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  border: '1px dashed #cbd5e1',
                                                  color: '#94a3b8'
                                                }}
                                              >
                                                <i className="fas fa-camera" style={{ fontSize: '0.7rem' }} />
                                              </div>
                                            )}
                                            <input
                                              type="file"
                                              accept="image/*"
                                              style={{ display: 'none' }}
                                              onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                  handleDirectSubcatPhotoUpload(sub, cat, e.target.files[0]);
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>
                                          <span
                                            style={{
                                              fontWeight: 600,
                                              color: '#1e293b',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }}
                                            title={sub}
                                          >
                                            {sub}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                                          <label
                                            className="btn-light-custom"
                                            style={{
                                              padding: '0.25rem 0.45rem',
                                              fontSize: '0.75rem',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              margin: 0
                                            }}
                                            title="Changer la photo de cette sous-catégorie"
                                          >
                                            <i className="fas fa-camera" style={{ color: '#0ea5e9' }} />
                                            <input
                                              type="file"
                                              accept="image/*"
                                              style={{ display: 'none' }}
                                              onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                  handleDirectSubcatPhotoUpload(sub, cat, e.target.files[0]);
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => setEditingSubcategory({ parent: cat, oldName: sub, value: sub, image: subImg || '' })}
                                            className="btn-light-custom"
                                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '4px' }}
                                            title="Modifier la sous-catégorie"
                                          >
                                            <i className="fas fa-edit" style={{ color: '#3b82f6' }} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSubcategory(cat, sub)}
                                            className="btn-light-custom"
                                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '4px', color: '#ef4444' }}
                                            title="Supprimer la sous-catégorie"
                                          >
                                            <i className="fas fa-trash-alt" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Formulaire d'ajout rapide de sous-catégorie */}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddSubcategory(cat);
                                }}
                                style={{
                                  display: 'flex',
                                  gap: '0.4rem',
                                  marginTop: '0.25rem'
                                }}
                              >
                                <input
                                  type="text"
                                  className="form-control-custom"
                                  placeholder="Nouvelle sous-catégorie..."
                                  value={newSubcatInput[cat] || ''}
                                  onChange={(e) => setNewSubcatInput({ ...newSubcatInput, [cat]: e.target.value })}
                                  style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                />
                                <button
                                  type="submit"
                                  className="btn-primary-custom"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                  title="Ajouter à cette catégorie"
                                >
                                  <i className="fas fa-plus" />
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* FENÊTRE 2 : LANGUES (Full Width) */}
          {attributeTab === 'languages' && (
            <div className="admin-card" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
              <div
                className="card-header-custom"
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#ffffff'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                    <i className="fas fa-globe" style={{ color: '#209f84' }} />
                    Langues
                  </h4>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Gérer les langues disponibles
                  </p>
                </div>
                <span className="badge-custom bg-soft-info" style={{ fontWeight: 800, fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                  {languagesList.length} langues configurées
                </span>
              </div>

              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Barre d'action : Formulaire d'ajout rapide + Barre de recherche */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <form
                    onSubmit={handleAddLanguage}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.65rem',
                      flex: 1,
                      minWidth: '300px'
                    }}
                  >
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Nouvelle langue (ex: Espagnol, Italien, Allemand...)"
                      value={newLangInput}
                      onChange={(e) => setNewLangInput(e.target.value)}
                      style={{ flex: 1, minWidth: '220px' }}
                    />
                    <button
                      type="submit"
                      className="btn-primary-custom"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        whiteSpace: 'nowrap',
                        padding: '0.65rem 1.25rem',
                        fontWeight: 700
                      }}
                    >
                      <i className="fas fa-plus" /> Ajouter Langue
                    </button>
                  </form>

                  {/* Recherche rapide */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                    <i
                      className="fas fa-search"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                      }}
                    />
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Rechercher une langue..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Grille responsive des langues */}
                {(() => {
                  const filteredLangs = languagesList.filter((lang) =>
                    !languageSearch || lang.toLowerCase().includes(languageSearch.toLowerCase())
                  );

                  if (filteredLangs.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <i className="fas fa-language" style={{ fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Aucune langue ne correspond à "{languageSearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.75rem'
                      }}
                    >
                      {filteredLangs.map((lang) => {
                        const isEditing = editingLanguage?.oldName === lang;

                        return (
                          <div
                            key={lang}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              backgroundColor: isEditing ? '#f0fdf4' : '#ffffff',
                              border: isEditing ? '1.5px solid #209f84' : '1px solid #e2e8f0',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-control-custom"
                                  value={editingLanguage.value}
                                  onChange={(e) => setEditingLanguage({ ...editingLanguage, value: e.target.value })}
                                  style={{ flex: 1, padding: '0.4rem 0.65rem', fontSize: '0.88rem' }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="btn-primary-custom"
                                  onClick={() => handleSaveEditLanguage(lang, editingLanguage.value)}
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  title="Enregistrer"
                                >
                                  <i className="fas fa-check" />
                                </button>
                                <button
                                  type="button"
                                  className="btn-light-custom"
                                  onClick={() => setEditingLanguage(null)}
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  title="Annuler"
                                >
                                  <i className="fas fa-times" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                                  <i className="fas fa-language" style={{ color: '#209f84', fontSize: '1.1rem', flexShrink: 0 }} />
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: '#1e293b',
                                      fontSize: '0.9rem',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={lang}
                                  >
                                    {lang}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLanguage({ oldName: lang, value: lang })}
                                    className="btn-light-custom"
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                    title="Modifier cette langue"
                                  >
                                    <i className="fas fa-edit" style={{ color: '#3b82f6' }} /> Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLanguage(lang)}
                                    className="btn-light-custom"
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                                    title="Supprimer cette langue"
                                  >
                                    <i className="fas fa-trash-alt" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* FENÊTRE 3 : WILAYAS D'ALGÉRIE & FRAIS DE LIVRAISON (Full Width) */}
          {attributeTab === 'wilayas' && (
            <div className="admin-card" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
              <div
                className="card-header-custom"
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#ffffff'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                    <i className="fas fa-truck-moving" style={{ color: '#0284c7' }} />
                    Wilayas d'Algérie & Tarifs de Livraison
                  </h4>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Ajouter, modifier ou supprimer des wilayas et personnaliser le prix de livraison spécifique pour chacune
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge-custom bg-soft-info" style={{ fontWeight: 800, fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '0.35rem' }} />
                    {wilayasList.length} wilayas configurées
                  </span>
                </div>
              </div>

              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Barre d'action : Formulaire d'ajout rapide + Barre de recherche */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  {/* Formulaire d'ajout rapide inline avec tarifs Bureau et Domicile */}
                  <form
                    onSubmit={handleAddWilaya}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.65rem',
                      flex: 1,
                      minWidth: '320px'
                    }}
                  >
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Nom / Code wilaya (ex: 59 - Nouvelle Wilaya)"
                      value={newWilayaNameInput}
                      onChange={(e) => setNewWilayaNameInput(e.target.value)}
                      style={{ flex: '1 1 200px', minWidth: '170px' }}
                    />

                    {/* Tarif Bureau */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd'
                      }}
                      title="Tarif de livraison retrait au bureau / agence (Stopdesk)"
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-building" /> Bureau:
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        className="form-control-custom"
                        placeholder="350"
                        value={newWilayaBureauPriceInput}
                        onChange={(e) => setNewWilayaBureauPriceInput(e.target.value)}
                        style={{ width: '85px', padding: '0.25rem 0.4rem', fontSize: '0.88rem', fontWeight: 700, border: '1px solid #e2e8f0' }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>DA</span>
                    </div>

                    {/* Tarif Domicile */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0'
                      }}
                      title="Tarif de livraison à domicile"
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-home" /> Domicile:
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        className="form-control-custom"
                        placeholder="500"
                        value={newWilayaDomicilePriceInput}
                        onChange={(e) => setNewWilayaDomicilePriceInput(e.target.value)}
                        style={{ width: '85px', padding: '0.25rem 0.4rem', fontSize: '0.88rem', fontWeight: 700, border: '1px solid #e2e8f0' }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>DA</span>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary-custom"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        whiteSpace: 'nowrap',
                        padding: '0.65rem 1.25rem',
                        fontWeight: 700
                      }}
                    >
                      <i className="fas fa-plus" /> Ajouter Wilaya
                    </button>
                  </form>

                  {/* Recherche rapide */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                    <i
                      className="fas fa-search"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                      }}
                    />
                    <input
                      type="text"
                      className="form-control-custom"
                      placeholder="Filtrer par nom ou numéro..."
                      value={wilayaSearch}
                      onChange={(e) => setWilayaSearch(e.target.value)}
                      style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Grille des wilayas configurées */}
                {(() => {
                  const filteredWilayas = wilayasList.filter((w) =>
                    !wilayaSearch ||
                    (w.name || '').toLowerCase().includes(wilayaSearch.toLowerCase())
                  );

                  if (filteredWilayas.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <i className="fas fa-map-marked-alt" style={{ fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Aucune wilaya ne correspond à "{wilayaSearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                        gap: '0.75rem',
                        maxHeight: '620px',
                        overflowY: 'auto',
                        paddingRight: '0.25rem'
                      }}
                    >
                      {filteredWilayas.map((wilaya) => {
                        const bureauPrice = wilaya.price_bureau !== undefined ? wilaya.price_bureau : Math.max(250, (wilaya.price || 500) - 200);
                        const domicilePrice = wilaya.price_domicile !== undefined ? wilaya.price_domicile : (wilaya.price || 500);

                        return (
                          <div
                            key={wilaya.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                              <i className="fas fa-map-marker-alt" style={{ color: '#0284c7', fontSize: '0.92rem', flexShrink: 0 }} />
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#1e293b',
                                  fontSize: '0.9rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={wilaya.name}
                              >
                                {wilaya.name}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                              {/* Badge Bureau */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1px solid #bae6fd'
                                }}
                                title="Tarif retrait au bureau (Stopdesk)"
                              >
                                <i className="fas fa-building" style={{ fontSize: '0.7rem' }} /> {bureauPrice} DA
                              </span>

                              {/* Badge Domicile */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#16a34a',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1px solid #bbf7d0'
                                }}
                                title="Tarif livraison à domicile"
                              >
                                <i className="fas fa-home" style={{ fontSize: '0.7rem' }} /> {domicilePrice} DA
                              </span>

                              <button
                                type="button"
                                onClick={() => setEditingWilaya({
                                  oldName: wilaya.name,
                                  name: wilaya.name,
                                  price_bureau: bureauPrice,
                                  price_domicile: domicilePrice,
                                  price: domicilePrice
                                })}
                                className="btn-light-custom"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                                title="Modifier les prix de livraison dans une fenêtre pop-up"
                              >
                                <i className="fas fa-edit" style={{ color: '#3b82f6' }} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteWilaya(wilaya.name)}
                                className="btn-light-custom"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
                                title="Supprimer cette wilaya"
                              >
                                <i className="fas fa-trash-alt" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* POP-UP MODAL : MODIFIER LES PRIX DE LIVRAISON DE LA WILAYA */}
                {editingWilaya && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 99999,
                      padding: '1rem'
                    }}
                    onClick={() => setEditingWilaya(null)}
                  >
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* En-tête du Pop-up */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1.25rem 1.5rem',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: '#f8fafc'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              backgroundColor: '#e0f2fe',
                              color: '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.15rem'
                            }}
                          >
                            <i className="fas fa-truck-moving" />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                              Modifier Tarifs de Livraison
                            </h3>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                              Wilaya : <strong style={{ color: '#0284c7' }}>{editingWilaya.oldName}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingWilaya(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.25rem',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px'
                          }}
                          title="Fermer"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>

                      {/* Corps du Pop-up */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEditWilaya(
                            editingWilaya.oldName,
                            editingWilaya.name,
                            editingWilaya.price_bureau,
                            editingWilaya.price_domicile
                          );
                        }}
                      >
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {/* Nom de la Wilaya */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
                              Nom / Numéro de la Wilaya *
                            </label>
                            <div style={{ position: 'relative' }}>
                              <i
                                className="fas fa-map-marker-alt"
                                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0284c7' }}
                              />
                              <input
                                type="text"
                                className="form-control-custom"
                                value={editingWilaya.name}
                                onChange={(e) => setEditingWilaya({ ...editingWilaya, name: e.target.value })}
                                required
                                style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '0.9rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', fontSize: '0.95rem' }}
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Grille 2 colonnes pour les 2 tarifs */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* Tarif Bureau (Stopdesk) */}
                            <div
                              style={{
                                backgroundColor: '#f0f9ff',
                                border: '1.5px solid #bae6fd',
                                borderRadius: '10px',
                                padding: '0.9rem'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.45rem' }}>
                                <i className="fas fa-building" /> Tarif Bureau (Stopdesk)
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  className="form-control-custom"
                                  value={editingWilaya.price_bureau}
                                  onChange={(e) => setEditingWilaya({ ...editingWilaya, price_bureau: e.target.value })}
                                  required
                                  style={{ width: '100%', paddingRight: '2.4rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontWeight: 700, fontSize: '0.95rem', backgroundColor: '#ffffff' }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    color: '#64748b'
                                  }}
                                >
                                  DA
                                </span>
                              </div>
                              <small style={{ display: 'block', fontSize: '0.74rem', color: '#0284c7', marginTop: '0.35rem' }}>
                                Retrait au bureau
                              </small>
                            </div>

                            {/* Tarif Domicile */}
                            <div
                              style={{
                                backgroundColor: '#f0fdf4',
                                border: '1.5px solid #bbf7d0',
                                borderRadius: '10px',
                                padding: '0.9rem'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: 800, color: '#15803d', marginBottom: '0.45rem' }}>
                                <i className="fas fa-home" /> Tarif Domicile
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  className="form-control-custom"
                                  value={editingWilaya.price_domicile}
                                  onChange={(e) => setEditingWilaya({ ...editingWilaya, price_domicile: e.target.value })}
                                  required
                                  style={{ width: '100%', paddingRight: '2.4rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontWeight: 700, fontSize: '0.95rem', backgroundColor: '#ffffff' }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    color: '#64748b'
                                  }}
                                >
                                  DA
                                </span>
                              </div>
                              <small style={{ display: 'block', fontSize: '0.74rem', color: '#16a34a', marginTop: '0.35rem' }}>
                                Livraison à domicile
                              </small>
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.82rem',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <i className="fas fa-info-circle text-primary" />
                            <span>Ces tarifs seront appliqués automatiquement lors du paiement de commande pour cette wilaya.</span>
                          </div>
                        </div>

                        {/* Pied du Pop-up */}
                        <div
                          style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid #f1f5f9',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                          }}
                        >
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => setEditingWilaya(null)}
                            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', cursor: 'pointer' }}
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="btn-primary-custom"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.65rem 1.5rem',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fas fa-check" /> Enregistrer les Tarifs
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'form' ? (
        <div>
          {/* Header de la page d'édition */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="page-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <h1>{editingProduct ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}</h1>
                <p className="breadcrumb-sub">
                  {editingProduct
                    ? `Mise à jour des informations pour "${formData.name || editingProduct.name}"`
                    : 'Remplissez le formulaire ci-dessous pour ajouter un article au catalogue'}
                </p>
              </div>

              {/* Bouton Paramètres des Attributs */}
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => navigate('/admin/attributes')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-sliders-h" style={{ color: '#fe2c55' }} />
                <span>Paramètres des Attributs</span>
              </button>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setViewMode('list')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fas fa-arrow-left" /> Retour au Catalogue
              </button>
            </div>
          </div>

          {/* Message d'erreur inline si présent */}
          {formError && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              <i className="fas fa-exclamation-circle" />
              <span>{formError}</span>
            </div>
          )}

          {/* Layout Principal : Formulaire à gauche + Aperçu en direct à droite (Plein écran) */}
          <div className="product-form-layout">
            {/* Colonne Formulaire */}
            <div className="admin-card" style={{ overflow: 'visible', position: 'relative' }}>
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <h4>
                  <i className="flaticon-381-box" style={{ color: '#111111', marginRight: '0.5rem' }} />
                  Informations du Produit
                </h4>
                <span className="badge-custom bg-soft-primary">
                  {editingProduct ? 'Édition' : 'Nouveau'}
                </span>
              </div>

              <div className="card-body-custom" style={{ padding: '1.5rem', overflow: 'visible' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {/* Nom */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label-custom">Nom / Titre du Produit *</label>
                      <input
                        type="text"
                        className="form-control-custom"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    {/* Catégories du Produit (Dropdown Sélecteur Recherchable) */}
                    <div
                      ref={formCatDropdownRef}
                      className="form-group-custom"
                      style={{ gridColumn: '1 / -1', position: 'relative' }}
                    >
                      {/* Header with Title and Manage link */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label className="form-label-custom" style={{ margin: 0 }}>Catégorie(s) du Produit *</label>
                          {(() => {
                            const currentCats = Array.isArray(formData.categories) && formData.categories.length > 0
                              ? formData.categories
                              : (formData.category ? formData.category.split(',').map((s) => s.trim()).filter(Boolean) : []);
                            if (currentCats.length === 0) return null;
                            return (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  padding: '0.15rem 0.6rem',
                                  borderRadius: '9999px',
                                  border: '1px solid #bfdbfe'
                                }}
                              >
                                {currentCats.length} sélectionnée{currentCats.length > 1 ? 's' : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {(() => {
                            const currentCats = Array.isArray(formData.categories) && formData.categories.length > 0
                              ? formData.categories
                              : (formData.category ? formData.category.split(',').map((s) => s.trim()).filter(Boolean) : []);
                            if (currentCats.length === 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, categories: [], category: '' }))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#888',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                              >
                                Tout désélectionner
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => setViewMode('attributes')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#fe2c55',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <i className="fas fa-sliders-h" style={{ fontSize: '0.72rem' }} />
                            Gérer
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Trigger Box */}
                      {(() => {
                        const currentCats = Array.isArray(formData.categories) && formData.categories.length > 0
                          ? formData.categories
                          : (formData.category ? formData.category.split(',').map((s) => s.trim()).filter(Boolean) : []);

                        return (
                          <>
                            <div
                              onClick={() => setIsFormCatDropdownOpen((prev) => !prev)}
                              style={{
                                minHeight: '48px',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '10px',
                                border: isFormCatDropdownOpen ? '1.5px solid #111111' : '1px solid #d4d4d8',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                boxShadow: isFormCatDropdownOpen ? '0 0 0 3px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.18s ease'
                              }}
                            >
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', flex: 1 }}>
                                {currentCats.length === 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.88rem' }}>
                                    <i className="fas fa-tags" style={{ color: '#a1a1aa' }} />
                                    <span>Sélectionner une ou plusieurs catégories dans la liste déroulante...</span>
                                  </div>
                                ) : (
                                  currentCats.map((cat) => (
                                    <span
                                      key={cat}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.3rem 0.65rem',
                                        borderRadius: '6px',
                                        backgroundColor: '#111111',
                                        color: '#ffffff',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCategory(cat);
                                      }}
                                    >
                                      <span>{cat}</span>
                                      <i
                                        className="fas fa-times"
                                        style={{ fontSize: '0.72rem', opacity: 0.85, cursor: 'pointer' }}
                                        title="Retirer"
                                      />
                                    </span>
                                  ))
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <i
                                  className={`fas fa-chevron-${isFormCatDropdownOpen ? 'up' : 'down'}`}
                                  style={{ fontSize: '0.85rem', color: '#71717a' }}
                                />
                              </div>
                            </div>

                            {/* Dropdown Menu Popover */}
                            {isFormCatDropdownOpen && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 6px)',
                                  left: 0,
                                  width: '100%',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e4e4e7',
                                  borderRadius: '12px',
                                  boxShadow: '0 14px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)',
                                  zIndex: 1050,
                                  overflow: 'hidden'
                                }}
                              >
                                {/* Search input inside dropdown */}
                                <div
                                  style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid #f4f4f5',
                                    backgroundColor: '#fafafa',
                                    position: 'relative'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i
                                    className="fas fa-search"
                                    style={{
                                      position: 'absolute',
                                      left: '1.25rem',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      color: '#a1a1aa',
                                      fontSize: '0.85rem'
                                    }}
                                  />
                                  <input
                                    ref={formCatSearchInputRef}
                                    type="text"
                                    placeholder="Rechercher une catégorie..."
                                    value={formCatSearchQuery}
                                    onChange={(e) => setFormCatSearchQuery(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.55rem 2rem 0.55rem 2.2rem',
                                      fontSize: '0.86rem',
                                      border: '1px solid #e4e4e7',
                                      borderRadius: '8px',
                                      backgroundColor: '#ffffff',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  {formCatSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setFormCatSearchQuery('')}
                                      style={{
                                        position: 'absolute',
                                        right: '1.25rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#a1a1aa'
                                      }}
                                    >
                                      <i className="fas fa-times" />
                                    </button>
                                  )}
                                </div>

                                {/* Header info */}
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.45rem 0.85rem',
                                    backgroundColor: '#ffffff',
                                    borderBottom: '1px solid #f4f4f5',
                                    fontSize: '0.75rem',
                                    color: '#71717a'
                                  }}
                                >
                                  <span>{filteredFormCategories.length} catégories disponibles</span>
                                  {currentCats.length > 0 && (
                                    <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                      {currentCats.length} cochée{currentCats.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>

                                {/* Scrollable categories checkbox list */}
                                <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '0.4rem' }}>
                                  {filteredFormCategories.length === 0 ? (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                                      <i className="fas fa-search" style={{ display: 'block', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#d4d4d8' }} />
                                      Aucune catégorie ne correspond à « {formCatSearchQuery} »
                                    </div>
                                  ) : (
                                    filteredFormCategories.map((opt) => {
                                      const catName = typeof opt === 'string' ? opt : opt.name;
                                      const isSub = typeof opt === 'object' && opt.isSub;
                                      const parentName = typeof opt === 'object' ? opt.parent : null;
                                      const catImg = typeof opt === 'object' ? opt.image : categoryImages[catName];
                                      const isSelected = currentCats.includes(catName);
                                      return (
                                        <div
                                          key={`${parentName || ''}_${catName}`}
                                          onClick={() => toggleCategory(catName, parentName)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: isSub ? '0.42rem 0.75rem 0.42rem 1.75rem' : '0.55rem 0.75rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                                            transition: 'background-color 0.12s ease',
                                            marginBottom: '2px',
                                            borderLeft: isSub ? '2px solid #e2e8f0' : 'none'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                            <span
                                              style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: isSelected ? '1.5px solid #111111' : '1.5px solid #d4d4d8',
                                                backgroundColor: isSelected ? '#111111' : '#ffffff',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.68rem',
                                                color: '#ffffff',
                                                transition: 'all 0.15s ease'
                                              }}
                                            >
                                              {isSelected && <i className="fas fa-check" />}
                                            </span>
                                            {catImg ? (
                                              <img
                                                src={catImg}
                                                alt=""
                                                style={{
                                                  width: isSub ? '18px' : '22px',
                                                  height: isSub ? '18px' : '22px',
                                                  borderRadius: '4px',
                                                  objectFit: 'contain'
                                                }}
                                              />
                                            ) : (
                                              <i
                                                className={isSub ? 'fas fa-angle-right' : 'fas fa-folder'}
                                                style={{ fontSize: isSub ? '0.72rem' : '0.85rem', color: isSub ? '#94a3b8' : '#fe2c55' }}
                                              />
                                            )}
                                            <span style={{ fontSize: isSub ? '0.82rem' : '0.88rem', fontWeight: isSelected || !isSub ? 600 : 400, color: '#18181b' }}>
                                              {isSub && <span style={{ color: '#94a3b8', marginRight: '4px', fontSize: '0.75rem' }}>↳</span>}
                                              {catName}
                                            </span>
                                          </div>
                                          {isSelected && (
                                            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                                              Sélectionné
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                {/* Footer bar */}
                                <div
                                  style={{
                                    padding: '0.5rem 0.85rem',
                                    borderTop: '1px solid #f4f4f5',
                                    backgroundColor: '#fafafa',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span style={{ fontSize: '0.78rem', color: '#71717a' }}>
                                    {currentCats.length} catégorie{currentCats.length > 1 ? 's' : ''} choisie{currentCats.length > 1 ? 's' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setIsFormCatDropdownOpen(false)}
                                    style={{
                                      padding: '0.4rem 0.95rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      backgroundColor: '#111111',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Prix de Vente */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Prix de Vente (en DA) *</label>
                      <input
                        type="number"
                        step="50"
                        className="form-control-custom"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>

                    {/* Prix d'Achat */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Prix d'Achat (en DA)</label>
                      <input
                        type="number"
                        step="50"
                        className="form-control-custom"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      />
                      {formData.price && formData.purchase_price && Number(formData.price) > Number(formData.purchase_price) && (
                        <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                          Marge: +{(Number(formData.price) - Number(formData.purchase_price)).toLocaleString()} DA ({Math.round(((Number(formData.price) - Number(formData.purchase_price)) / Number(formData.price)) * 100)}%)
                        </div>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Quantité en Stock</label>
                      <input
                        type="number"
                        className="form-control-custom"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>

                    {/* État du Produit */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label className="form-label-custom" style={{ margin: 0, fontWeight: 700, color: '#18181b' }}>
                          État du Produit
                        </label>
                        {formData.format && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '0.15rem 0.6rem',
                              borderRadius: '9999px',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            Sélectionné : {formData.format}
                          </span>
                        )}
                      </div>

                      {/* Menu déroulant quand on clique */}
                      <div style={{ position: 'relative' }}>
                        <select
                          className="form-control-custom"
                          value={formData.format || ''}
                          onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                          style={{
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: formData.format ? '#0f172a' : '#94a3b8',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <option value="">-- Choisir l'état du produit --</option>
                          <option value="Sous blister">📦 Sous blister</option>
                          <option value="Très bon état">⭐ Très bon état</option>
                          <option value="Bon état">👍 Bon état</option>
                          <option value="Occasion">🔄 Occasion</option>
                          {formData.format && !['Sous blister', 'Très bon état', 'Bon état', 'Occasion'].includes(formData.format) && (
                            <option value={formData.format}>{formData.format}</option>
                          )}
                        </select>
                      </div>

                      {/* Raccourcis en un clic (Pills interactives) */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Sous blister', icon: '📦', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                          { label: 'Très bon état', icon: '⭐', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                          { label: 'Bon état', icon: '👍', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                          { label: 'Occasion', icon: '🔄', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
                        ].map((opt) => {
                          const isSelected = formData.format === opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setFormData({ ...formData, format: opt.label })}
                              style={{
                                padding: '0.42rem 0.9rem',
                                fontSize: '0.82rem',
                                fontWeight: isSelected ? 700 : 500,
                                borderRadius: '9999px',
                                border: `1.5px solid ${isSelected ? opt.color : opt.border}`,
                                backgroundColor: isSelected ? opt.bg : '#ffffff',
                                color: isSelected ? opt.color : '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: isSelected ? `0 2px 6px ${opt.border}` : '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                              {isSelected && <i className="fas fa-check" style={{ fontSize: '0.75rem', marginLeft: '2px' }}></i>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* =========================================================================
                        SECTION : MULTI-MÉDIAS DU PRODUIT (PHOTOS & VIDÉOS AVEC DRAG & DROP)
                        ========================================================================= */}
                    {(() => {
                      const mediaList = getMediaList();
                      const photoCount = mediaList.filter((m) => m.type === 'image').length;
                      const videoCount = mediaList.filter((m) => m.type === 'video').length;

                      return (
                        <div className="form-group-custom" style={{ gridColumn: '1 / -1', borderTop: '1px solid #f0f0f0', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#18181b' }}>
                                📸 / 🎬 Galerie Médias du Produit (Photos & Vidéos)
                              </span>
                              <span className="badge-custom bg-soft-primary" style={{ fontWeight: 700 }}>
                                {photoCount} photo(s)
                              </span>
                              <span className="badge-custom bg-soft-info" style={{ fontWeight: 700 }}>
                                {videoCount} vidéo(s)
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>
                              La première photo sert de <strong>Couverture principale</strong> • Glissez-déposez pour réorganiser l'ordre
                            </span>
                          </div>

                          {/* Zone de Téléversement Multi-Médias (Photos & Vidéos) */}
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDropMedia}
                            onClick={() => mediaFilesInputRef.current?.click()}
                            style={{
                              border: '2px dashed #93c5fd',
                              borderRadius: '10px',
                              padding: '1.35rem',
                              textAlign: 'center',
                              backgroundColor: '#f8fafc',
                              cursor: 'pointer',
                              marginBottom: '0.85rem',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <input
                              type="file"
                              ref={mediaFilesInputRef}
                              accept="image/*,video/*"
                              multiple
                              onChange={handleMediaFilesChange}
                              style={{ display: 'none' }}
                            />

                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                backgroundColor: '#111111',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              }}
                            >
                              {uploadingMedia ? (
                                <i className="flaticon-381-refresh" style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <i className="flaticon-381-photo" />
                              )}
                            </div>

                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111111' }}>
                                {uploadingMedia
                                  ? 'Téléversement des médias en cours...'
                                  : 'Ajouter une ou plusieurs photos et vidéos depuis votre appareil'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '0.2rem' }}>
                                Cliquez ou glissez-déposez ici (Sélection multiple possible • JPG, PNG, WEBP, GIF, MP4, WebM, MOV)
                              </div>
                            </div>
                          </div>

                          {/* Champ textuel pour ajouter un média par URL */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input
                                type="text"
                                className="form-control-custom"
                                placeholder="Ou coller un lien d'image ou vidéo (/uploads/... ou https://...)"
                                value={manualMediaUrl}
                                onChange={(e) => setManualMediaUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualMedia();
                                  }
                                }}
                                style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                              />
                              <i
                                className="fas fa-link"
                                style={{
                                  position: 'absolute',
                                  left: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#a1a1aa',
                                  fontSize: '0.85rem'
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="btn-light-custom"
                              onClick={handleAddManualMedia}
                              style={{ whiteSpace: 'nowrap', padding: '0.55rem 1rem', fontSize: '0.82rem' }}
                            >
                              <i className="fas fa-plus" /> Ajouter média
                            </button>
                          </div>

                          {/* Grille d'aperçu des médias avec Drag & Drop */}
                          {mediaList.length > 0 ? (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '0.85rem',
                                marginBottom: '1rem'
                              }}
                            >
                              {mediaList.map((item, idx) => {
                                const isPrimary = idx === 0;
                                const isDragged = draggedMediaIndex === idx;
                                const isDragOver = dragOverMediaIndex === idx;
                                const isVid = item.type === 'video';

                                return (
                                  <div
                                    key={`${item.url}-${idx}`}
                                    draggable
                                    onDragStart={(e) => handleMediaDragStart(e, idx)}
                                    onDragOver={(e) => handleMediaDragOver(e, idx)}
                                    onDragEnd={handleMediaDragEnd}
                                    onDrop={(e) => handleMediaDrop(e, idx)}
                                    style={{
                                      position: 'relative',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      border: isDragOver
                                        ? '2.5px dashed #2563eb'
                                        : isPrimary
                                        ? '2.5px solid #111111'
                                        : '1px solid #e4e4e7',
                                      backgroundColor: isVid ? '#000000' : '#f8fafc',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      boxShadow: isPrimary ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.05)',
                                      opacity: isDragged ? 0.35 : 1,
                                      cursor: 'grab',
                                      transform: isDragOver ? 'scale(1.03)' : 'none',
                                      transition: 'transform 0.15s ease, border-color 0.15s ease'
                                    }}
                                  >
                                    <div style={{ height: '140px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                                      {isVid ? (
                                        <video
                                          src={item.url}
                                          muted
                                          playsInline
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                                        />
                                      ) : (
                                        <img
                                          src={item.url}
                                          alt={`Média ${idx + 1}`}
                                          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff', pointerEvents: 'none' }}
                                          onError={(e) => {
                                            e.target.src = '/assets/images/categories/telephones.svg';
                                          }}
                                        />
                                      )}

                                      {/* Badge Principal */}
                                      {isPrimary && (
                                        <span
                                          style={{
                                            position: 'absolute',
                                            top: '6px',
                                            left: '6px',
                                            backgroundColor: '#111111',
                                            color: '#ffffff',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            zIndex: 3
                                          }}
                                        >
                                          ★ Principale
                                        </span>
                                      )}

                                      {/* Badge Type (Photo / Vidéo) */}
                                      <span
                                        style={{
                                          position: 'absolute',
                                          top: isPrimary ? '28px' : '6px',
                                          left: '6px',
                                          backgroundColor: isVid ? '#2563eb' : 'rgba(17, 17, 17, 0.75)',
                                          color: '#ffffff',
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                          zIndex: 3
                                        }}
                                      >
                                        {isVid ? '🎬 Vidéo' : '🖼️ Photo'}
                                      </span>

                                      {/* Poignée Drag & Drop indicator */}
                                      <div
                                        title="Glisser-déposer pour changer l'ordre"
                                        style={{
                                          position: 'absolute',
                                          top: '6px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          backgroundColor: 'rgba(0,0,0,0.5)',
                                          color: '#ffffff',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          fontSize: '0.65rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          zIndex: 3
                                        }}
                                      >
                                        <i className="fas fa-grip-vertical" />
                                      </div>

                                      {/* Bouton Supprimer */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveMedia(idx);
                                        }}
                                        title="Supprimer ce média"
                                        style={{
                                          position: 'absolute',
                                          top: '6px',
                                          right: '6px',
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                          color: '#ffffff',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.7rem',
                                          zIndex: 4
                                        }}
                                      >
                                        <i className="fas fa-trash-alt" />
                                      </button>
                                    </div>

                                    {!isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryMedia(idx)}
                                        style={{
                                          border: 'none',
                                          background: '#f4f4f5',
                                          color: '#18181b',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          padding: '6px 5px',
                                          cursor: 'pointer',
                                          borderTop: '1px solid #e4e4e7',
                                          transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => (e.target.style.background = '#e4e4e7')}
                                        onMouseLeave={(e) => (e.target.style.background = '#f4f4f5')}
                                      >
                                        ★ Mettre en principal
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '0.85rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.82rem',
                                color: '#64748b',
                                textAlign: 'center',
                                marginBottom: '1rem'
                              }}
                            >
                              <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />
                              Aucun média ajouté pour l'instant. Ajoutez des photos ou des vidéos pour afficher le produit.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Description */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label-custom">Résumé & Description</label>
                      <textarea
                        rows="4"
                        className="form-control-custom"
                        placeholder="Présentation du produit pour les acheteurs..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Boutons d'Action */}
                  <div
                    style={{
                      marginTop: '2rem',
                      paddingTop: '1.25rem',
                      borderTop: '1px solid #f0f0f0',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <button type="submit" className="btn-primary-custom" style={{ padding: '0.75rem 1.75rem' }}>
                      <i className="fas fa-save" style={{ marginRight: '0.5rem' }} />
                      {editingProduct ? 'Enregistrer les Modifications' : 'Créer le Produit'}
                    </button>
                    <button
                      type="button"
                      className="btn-light-custom"
                      onClick={() => setViewMode('list')}
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Colonne Aperçu en Direct */}
            <div className="admin-card product-preview-card">
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <h4>Aperçu de la Fiche</h4>
                <span className="badge-custom bg-soft-info">Live</span>
              </div>
              <div className="card-body-custom" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '150px',
                    height: '210px',
                    margin: '0 auto 1.25rem',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    backgroundColor: '#f8f8f8'
                  }}
                >
                  {(() => {
                    const hasImg = formData.image && typeof formData.image === 'string' && formData.image.trim() !== '';
                    const vidUrl = formData.video || (Array.isArray(formData.videos) && formData.videos[0] ? formData.videos[0] : null);

                    if (hasImg) {
                      return (
                        <img
                          src={formData.image}
                          alt={formData.name || 'Aperçu'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#ffffff' }}
                          onError={(e) => {
                            e.target.src = '/assets/images/categories/telephones.svg';
                          }}
                        />
                      );
                    }

                    if (vidUrl) {
                      return (
                        <video
                          src={`${vidUrl}#t=0.1`}
                          controls
                          muted
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000000' }}
                        />
                      );
                    }

                    return (
                      <img
                        src="/assets/images/categories/telephones.svg"
                        alt={formData.name || 'Aperçu'}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1.5rem', backgroundColor: '#ffffff' }}
                      />
                    );
                  })()}
                </div>

                {(() => {
                  const previewCats = Array.isArray(formData.categories) && formData.categories.length > 0
                    ? formData.categories
                    : (formData.category ? formData.category.split(',').map((s) => s.trim()).filter(Boolean) : []);
                  if (previewCats.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {previewCats.map((cat, idx) => (
                        <span key={idx} className="badge-custom bg-soft-primary" style={{ fontSize: '0.75rem' }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <h3 style={{ fontSize: '1.15rem', color: '#333', margin: '0.4rem 0 0.2rem' }}>
                  {formData.name || 'Titre du Produit'}
                </h3>
                {formData.format && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <span 
                      style={{ 
                        fontSize: '0.78rem', 
                        fontWeight: 700, 
                        color: formData.format === 'Sous blister' ? '#16a34a' : formData.format === 'Très bon état' ? '#2563eb' : formData.format === 'Bon état' ? '#d97706' : '#64748b',
                        background: formData.format === 'Sous blister' ? '#f0fdf4' : formData.format === 'Très bon état' ? '#eff6ff' : formData.format === 'Bon état' ? '#fffbeb' : '#f8fafc',
                        border: `1px solid ${formData.format === 'Sous blister' ? '#bbf7d0' : formData.format === 'Très bon état' ? '#bfdbfe' : formData.format === 'Bon état' ? '#fde68a' : '#e2e8f0'}`,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      {formData.format === 'Sous blister' ? '📦' : formData.format === 'Très bon état' ? '⭐' : formData.format === 'Bon état' ? '👍' : '🔄'} {formData.format}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.85rem',
                    padding: '0.75rem 0.5rem',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase' }}>Prix Vente</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111' }}>
                      {formData.price ? Number(formData.price).toLocaleString() : '0'} DA
                    </div>
                  </div>
                  {formData.purchase_price && Number(formData.purchase_price) > 0 ? (
                    <>
                      <div style={{ width: '1px', height: '28px', backgroundColor: '#e0e0e0' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase' }}>Prix Achat</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>
                          {Number(formData.purchase_price).toLocaleString()} DA
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div style={{ width: '1px', height: '28px', backgroundColor: '#e0e0e0' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase' }}>Disponibilité</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: Number(formData.stock) > 0 ? '#209f84' : '#f72b50' }}>
                      {formData.stock || 0} en stock
                    </div>
                  </div>
                </div>

                {formData.price && formData.purchase_price && Number(formData.price) > Number(formData.purchase_price) ? (
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.8rem', background: '#f0fdf4', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'inline-block' }}>
                    <i className="fas fa-chart-line" style={{ marginRight: '4px' }} />
                    Marge brute : +{(Number(formData.price) - Number(formData.purchase_price)).toLocaleString()} DA / unité
                  </div>
                ) : null}

                {formData.bio && (
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#666',
                      lineHeight: '1.5',
                      textAlign: 'left',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      padding: '0.5rem',
                      background: '#f9f9f9',
                      borderRadius: '6px'
                    }}
                  >
                    {formData.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: CATALOGUE DES PRODUITS (VUE TABULAIRE)
            ========================================================================= */
        <div>
          {/* Page Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="page-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <h1>Gestion des Produits</h1>
                <p className="breadcrumb-sub">Catalogue des produits en vente, tarification en DA et gestion des stocks</p>
              </div>
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => navigate('/admin/attributes')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-sliders-h" style={{ color: '#fe2c55' }} />
                <span>Paramètres des Attributs</span>
              </button>
            </div>
            <div className="page-actions">
              <button className="btn-light-custom" onClick={loadProducts}>
                <i className="flaticon-381-refresh" /> Actualiser
              </button>
              <button className="btn-primary-custom" onClick={handleOpenAdd}>
                <i className="flaticon-381-add-1" /> Ajouter un Produit
              </button>
            </div>
          </div>

          {/* Filter / Search Bar */}
          {/* Filter / Search Bar */}
          <div className="admin-card" style={{ marginBottom: '1.5rem', overflow: 'visible', position: 'relative', zIndex: 20 }}>
            <div
              className="card-body-custom"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'visible'
              }}
            >
              {/* Left: Search input by title / author */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 280px', maxWidth: '420px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <i
                    className="flaticon-381-search-2"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#888'
                    }}
                  />
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Rechercher un produit..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ paddingLeft: '2.4rem' }}
                  />
                </div>
                {search && (
                  <button
                    className="btn-light-custom"
                    onClick={() => {
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0.5rem 0.8rem' }}
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Right: Searchable Select for Categories */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Active filter badge if category is selected */}
                {selectedCategory !== 'Tous' && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      backgroundColor: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '50px',
                      fontSize: '0.82rem',
                      color: '#be123c',
                      fontWeight: 600
                    }}
                  >
                    <span>Filtre: {selectedCategory}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('Tous');
                        setCurrentPage(1);
                      }}
                      title="Réinitialiser la catégorie"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#be123c',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.85rem'
                      }}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                )}

                {/* The Searchable Select Combobox */}
                <div ref={catDropdownRef} style={{ position: 'relative', minWidth: '280px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.65rem 1rem',
                      backgroundColor: '#ffffff',
                      border: isCatDropdownOpen ? '1.5px solid #111111' : '1px solid #d4d4d8',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: '#18181b',
                      fontWeight: 500,
                      boxShadow: isCatDropdownOpen ? '0 0 0 3px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i
                        className="fas fa-layer-group"
                        style={{
                          color: selectedCategory !== 'Tous' ? '#fe2c55' : '#71717a',
                          fontSize: '0.95rem'
                        }}
                      />
                      <span style={{ fontWeight: selectedCategory !== 'Tous' ? 600 : 500, color: selectedCategory !== 'Tous' ? '#111111' : '#52525b' }}>
                        {selectedCategory === 'Tous' ? 'Toutes les catégories' : selectedCategory}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          backgroundColor: selectedCategory !== 'Tous' ? '#fe2c55' : '#f4f4f5',
                          color: selectedCategory !== 'Tous' ? '#ffffff' : '#71717a',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '12px'
                        }}
                      >
                        {selectedCategory === 'Tous'
                          ? products.length
                          : (categoryCounts[selectedCategory] || 0)}
                      </span>
                      <i
                        className={`fas fa-chevron-${isCatDropdownOpen ? 'up' : 'down'}`}
                        style={{ fontSize: '0.75rem', color: '#a1a1aa' }}
                      />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isCatDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: '330px',
                        maxWidth: '90vw',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '12px',
                        boxShadow: '0 14px 38px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                        zIndex: 1050,
                        overflow: 'hidden'
                      }}
                    >
                      {/* Search Input inside Dropdown */}
                      <div
                        style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid #f4f4f5',
                          backgroundColor: '#fafafa',
                          position: 'relative'
                        }}
                      >
                        <i
                          className="fas fa-search"
                          style={{
                            position: 'absolute',
                            left: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#a1a1aa',
                            fontSize: '0.85rem'
                          }}
                        />
                        <input
                          ref={catSearchInputRef}
                          type="text"
                          placeholder="Rechercher une catégorie..."
                          value={catSearchQuery}
                          onChange={(e) => setCatSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem 2rem 0.5rem 2.2rem',
                            fontSize: '0.84rem',
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            outline: 'none',
                            color: '#18181b',
                            boxSizing: 'border-box'
                          }}
                        />
                        {catSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCatSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '1.25rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#a1a1aa',
                              padding: '2px 5px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <i className="fas fa-times" />
                          </button>
                        )}
                      </div>

                      {/* Header info */}
                      <div
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#a1a1aa',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>Catégories ({filteredCategoriesForSelect.length})</span>
                        {selectedCategory !== 'Tous' && (
                          <span
                            onClick={() => {
                              setSelectedCategory('Tous');
                              setCurrentPage(1);
                              setIsCatDropdownOpen(false);
                            }}
                            style={{ color: '#fe2c55', cursor: 'pointer', textTransform: 'none' }}
                          >
                            Réinitialiser
                          </span>
                        )}
                      </div>

                      {/* Category Options List */}
                      <div
                        style={{
                          maxHeight: '260px',
                          overflowY: 'auto',
                          padding: '0.35rem'
                        }}
                      >
                        {filteredCategoriesForSelect.length === 0 ? (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                            <i className="fas fa-search" style={{ display: 'block', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#d4d4d8' }} />
                            Aucune catégorie ne correspond à « {catSearchQuery} »
                          </div>
                        ) : (
                          filteredCategoriesForSelect.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            const count = cat === 'Tous' ? products.length : (categoryCounts[cat] || 0);

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setCurrentPage(1);
                                  setIsCatDropdownOpen(false);
                                  setCatSearchQuery('');
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.55rem 0.75rem',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: isSelected ? '#111111' : 'transparent',
                                  color: isSelected ? '#ffffff' : '#27272a',
                                  cursor: 'pointer',
                                  fontSize: '0.84rem',
                                  fontWeight: isSelected ? 600 : 400,
                                  textAlign: 'left',
                                  transition: 'background-color 0.12s ease',
                                  marginBottom: '2px'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f4f4f5';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cat === 'Tous' ? (
                                    <i className="fas fa-border-all" style={{ fontSize: '0.8rem', color: isSelected ? '#ffffff' : '#71717a' }} />
                                  ) : null}
                                  {cat === 'Tous' ? 'Toutes les catégories' : cat}
                                </span>

                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.1rem 0.45rem',
                                      borderRadius: '10px',
                                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
                                      color: isSelected ? '#ffffff' : '#71717a',
                                      fontWeight: 600
                                    }}
                                  >
                                    {count}
                                  </span>
                                  {isSelected && (
                                    <i className="fas fa-check" style={{ fontSize: '0.75rem', color: '#34d399' }} />
                                  )}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="admin-card">
            <div className="card-header-custom">
              <h4>Catalogue ({filteredProducts.length} produits trouvés)</h4>
              <span className="badge-custom bg-soft-primary">Devise: DA</span>
            </div>
            <div className="table-responsive-custom">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Aperçu</th>
                    <th>Nom du Produit</th>
                    <th>Catégorie</th>
                    <th>Prix (DA)</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                        <i
                          className="flaticon-381-box"
                          style={{ fontSize: '2.5rem', color: '#ccc', display: 'block', marginBottom: '0.5rem' }}
                        />
                        Aucun produit ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const stockNum = parseInt(p.stock, 10);
                      const isConfirmingDelete = deleteConfirmId === p.id;

                      return (
                        <tr key={p.id}>
                          <td>
                            {(() => {
                              const hasImg = p.image && typeof p.image === 'string' && p.image.trim() !== '';
                              const vidUrl = p.video || (Array.isArray(p.videos) && p.videos[0] ? p.videos[0] : null);

                              if (hasImg) {
                                return (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    style={{
                                      width: '46px',
                                      height: '60px',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                    }}
                                    onError={(e) => {
                                      e.target.src = '/assets/images/categories/telephones.svg';
                                    }}
                                  />
                                );
                              }

                              if (vidUrl) {
                                return (
                                  <div
                                    title="Aperçu vidéo (survolez pour lecture)"
                                    style={{
                                      position: 'relative',
                                      width: '46px',
                                      height: '60px',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                      backgroundColor: '#000000',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                      const v = e.currentTarget.querySelector('video');
                                      if (v) v.play().catch(() => {});
                                    }}
                                    onMouseLeave={(e) => {
                                      const v = e.currentTarget.querySelector('video');
                                      if (v) {
                                        v.pause();
                                        v.currentTime = 0.1;
                                      }
                                    }}
                                  >
                                    <video
                                      src={`${vidUrl}#t=0.1`}
                                      muted
                                      playsInline
                                      preload="metadata"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                      }}
                                    />
                                    <span
                                      style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '2px',
                                        fontSize: '0.58rem',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        color: '#ffffff',
                                        borderRadius: '3px',
                                        padding: '1px 3px',
                                        lineHeight: 1,
                                        pointerEvents: 'none'
                                      }}
                                    >
                                      🎬
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <img
                                  src="/assets/images/categories/telephones.svg"
                                  alt={p.name}
                                  style={{
                                    width: '46px',
                                    height: '60px',
                                    objectFit: 'contain',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    backgroundColor: '#f8fafc',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                  }}
                                />
                              );
                            })()}
                          </td>
                          <td>
                            <div>
                              <strong style={{ color: '#333', fontSize: '0.95rem' }}>{p.name}</strong>
                              {p.format ? (
                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{p.format}</div>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {(() => {
                              const cats = Array.isArray(p.categories) && p.categories.length > 0
                                ? p.categories
                                : (p.category ? p.category.split(',').map((s) => s.trim()).filter(Boolean) : []);
                              if (cats.length === 0) {
                                return <span style={{ color: '#aaa', fontSize: '0.8rem' }}>—</span>;
                              }
                              return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '240px' }}>
                                  {cats.map((cat, idx) => (
                                    <span
                                      key={idx}
                                      className="badge-custom bg-soft-info"
                                      style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <strong style={{ fontSize: '0.96rem', color: '#111111' }}>
                              {Number(p.price).toLocaleString()} DA
                            </strong>
                            {p.purchase_price !== undefined && p.purchase_price !== null && Number(p.purchase_price) > 0 ? (
                              <div style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '2px' }}>
                                Achat: <span style={{ color: '#475569', fontWeight: 600 }}>{Number(p.purchase_price).toLocaleString()} DA</span>
                                {Number(p.price) > Number(p.purchase_price) && (
                                  <span style={{ color: '#16a34a', fontWeight: 600, marginLeft: '4px' }}>
                                    (+{(Number(p.price) - Number(p.purchase_price)).toLocaleString()} DA)
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            {stockNum > 10 ? (
                              <span className="badge-custom bg-soft-success">{stockNum} en stock</span>
                            ) : stockNum > 0 ? (
                              <span className="badge-custom bg-soft-warning">{stockNum} restant(s)</span>
                            ) : (
                              <span className="badge-custom bg-soft-danger">Rupture de stock</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isConfirmingDelete ? (
                              <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  className="btn-danger-custom"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    backgroundColor: '#f72b50',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Supprimer ?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    backgroundColor: '#eee',
                                    color: '#555',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  className="btn-icon-custom bg-soft-primary"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Modifier ce produit"
                                >
                                  <i className="fas fa-pen" />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-custom bg-soft-danger"
                                  onClick={() => setDeleteConfirmId(p.id)}
                                  title="Supprimer ce produit"
                                >
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Contrôles de Pagination Numérique Fluide (1 2 ... 60 61 ... 127 128) */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              itemLabel="produits"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
