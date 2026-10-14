// frontend/src/admin/pages/AdminProducts.jsx
import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // In-Page View State: 'list' (Catalogue table) or 'form' (Integrated form card, NO pop-up!)
  const [viewMode, setViewMode] = useState('list');
  const [editingProduct, setEditingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Upload Photo State & Ref
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Gestion des Attributs (Catégories & Langues)
  const [categoriesList, setCategoriesList] = useState([
    'Roman & Littérature',
    'Développement Personnel',
    'Histoire & Récits',
    'Fantasy & Mystère',
    'Philosophie & Poésie',
    'Roman Graphique'
  ]);
  const [languagesList, setLanguagesList] = useState([
    'Français',
    'Anglais',
    'Arabe'
  ]);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { oldName: string, value: string }
  const [newLangInput, setNewLangInput] = useState('');
  const [editingLanguage, setEditingLanguage] = useState(null); // { oldName: string, value: string }

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    format: '',
    price: '',
    stock: '15',
    category: '',
    rating: 4.8,
    image: '/assets/images/books/book1.jpg',
    bio: '',
    languages: []
  });

  const toggleLanguage = (lang) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.languages) ? prev.languages : [];
      const updated = current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang];
      return { ...prev, languages: updated };
    });
  };

  const sampleImages = [
    { label: 'Livre 1 (Couverture 1)', url: '/assets/images/books/book1.jpg' },
    { label: 'Livre 2 (Couverture 2)', url: '/assets/images/books/book2.jpg' },
    { label: 'Livre 3 (Couverture 3)', url: '/assets/images/books/book3.jpg' }
  ];

  useEffect(() => {
    loadProducts();
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    try {
      const data = await adminApi.getAttributes();
      if (data) {
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategoriesList(data.categories);
        }
        if (Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguagesList(data.languages);
        }
      }
    } catch (e) {
      console.warn('Erreur chargement attributs:', e);
    }
  };

  // Handlers pour Catégories (Ajouter, Modifier, Supprimer sans pop-up)
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
    await adminApi.saveAttributes({ action: 'add_category', name: trimmed, categories: updated, languages: languagesList });
  };

  const handleSaveEditCategory = async (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCategory(null);
      return;
    }
    const updated = categoriesList.map((c) => (c === oldName ? trimmed : c));
    setCategoriesList(updated);
    if (formData.category === oldName) {
      setFormData((prev) => ({ ...prev, category: trimmed }));
    }
    if (selectedCategory === oldName) {
      setSelectedCategory(trimmed);
    }
    setEditingCategory(null);
    showToast(`Catégorie renommée en "${trimmed}" !`);
    await adminApi.saveAttributes({ action: 'edit_category', oldName, newName: trimmed, categories: updated, languages: languagesList });
    await loadProducts();
  };

  const handleDeleteCategory = async (catName) => {
    const updated = categoriesList.filter((c) => c !== catName);
    setCategoriesList(updated);
    if (formData.category === catName) {
      setFormData((prev) => ({ ...prev, category: '' }));
    }
    if (selectedCategory === catName) {
      setSelectedCategory('Tous');
    }
    showToast(`Catégorie "${catName}" supprimée.`);
    await adminApi.saveAttributes({ action: 'delete_category', name: catName, categories: updated, languages: languagesList });
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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadSuccess('');
    setFormError('');
    try {
      const res = await adminApi.uploadImage(file);
      if (res && res.success && res.url) {
        setFormData((prev) => ({ ...prev, image: res.url }));
        setUploadSuccess(`Photo "${file.name}" chargée avec succès depuis votre appareil !`);
      } else {
        setFormError(res?.error || 'Erreur lors du chargement de la photo');
      }
    } catch (err) {
      setFormError('Erreur lors du téléversement du fichier');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDropImage = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadingImage(true);
      setUploadSuccess('');
      setFormError('');
      try {
        const res = await adminApi.uploadImage(file);
        if (res && res.success && res.url) {
          setFormData((prev) => ({ ...prev, image: res.url }));
          setUploadSuccess(`Photo "${file.name}" chargée avec succès depuis votre appareil !`);
        } else {
          setFormError(res?.error || 'Erreur lors du chargement de la photo');
        }
      } catch (err) {
        setFormError('Erreur lors du téléversement');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormError('');
    setUploadSuccess('');
    setFormData({
      name: '',
      author: '',
      format: '',
      price: '',
      stock: '15',
      category: '',
      rating: 4.8,
      image: '/assets/images/books/book1.jpg',
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

    let parsedLangs = [];
    if (Array.isArray(prod.languages)) {
      parsedLangs = prod.languages;
    } else if (typeof prod.languages === 'string' && prod.languages.trim() !== '') {
      parsedLangs = prod.languages.split(',').map((s) => s.trim()).filter(Boolean);
    }

    setFormData({
      name: prod.name || '',
      author: prod.author || '',
      format: prod.format || '',
      price: prod.price || '',
      stock: prod.stock || '15',
      category: prod.category || '',
      rating: prod.rating || 4.8,
      image: prod.image || '/assets/images/books/book1.jpg',
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

    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, {
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10) || 0
        });
        showToast('Produit mis à jour avec succès !');
      } else {
        await adminApi.createProduct({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10) || 0
        });
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

  const categoriesForFilter = ['Tous', ...categoriesList];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
              <p className="breadcrumb-sub">Ajouter, modifier ou supprimer les catégories et langues du catalogue</p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setViewMode(editingProduct ? 'form' : 'list')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fas fa-arrow-left" /> {editingProduct ? 'Retour au Produit' : 'Retour au Catalogue'}
              </button>
            </div>
          </div>

          {/* Grille 2 colonnes des attributs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Carte 1 : Catégories */}
            <div className="admin-card">
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>
                  <i className="fas fa-tags" style={{ color: '#fe2c55', marginRight: '0.5rem' }} />
                  Catégories de Produits
                </h4>
                <span className="badge-custom bg-soft-primary">
                  {categoriesList.length} catégories
                </span>
              </div>
              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Formulaire d'ajout inline */}
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Nouvelle catégorie (ex: Sciences, Biographie...)"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', padding: '0.65rem 1.15rem' }}
                  >
                    <i className="fas fa-plus" /> Ajouter
                  </button>
                </form>

                {/* Liste des catégories avec Modifier et Supprimer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {categoriesList.map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0'
                      }}
                    >
                      {editingCategory?.oldName === cat ? (
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editingCategory.value}
                            onChange={(e) => setEditingCategory({ ...editingCategory, value: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn-primary-custom"
                            onClick={() => handleSaveEditCategory(cat, editingCategory.value)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Enregistrer"
                          >
                            <i className="fas fa-check" />
                          </button>
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => setEditingCategory(null)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Annuler"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <i className="fas fa-folder" style={{ color: '#9ca3af', fontSize: '0.9rem' }} />
                            <span style={{ fontWeight: 600, color: '#18181b', fontSize: '0.92rem' }}>{cat}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditingCategory({ oldName: cat, value: cat })}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              title="Modifier cette catégorie"
                            >
                              <i className="fas fa-edit" style={{ color: '#3b82f6' }} /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                              title="Supprimer cette catégorie"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Carte 2 : Langues */}
            <div className="admin-card">
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>
                  <i className="fas fa-globe" style={{ color: '#209f84', marginRight: '0.5rem' }} />
                  Langues des Livres
                </h4>
                <span className="badge-custom bg-soft-info">
                  {languagesList.length} langues
                </span>
              </div>
              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                {/* Formulaire d'ajout inline */}
                <form onSubmit={handleAddLanguage} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    className="form-control-custom"
                    placeholder="Nouvelle langue (ex: Espagnol, Italien...)"
                    value={newLangInput}
                    onChange={(e) => setNewLangInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', padding: '0.65rem 1.15rem' }}
                  >
                    <i className="fas fa-plus" /> Ajouter
                  </button>
                </form>

                {/* Liste des langues avec Modifier et Supprimer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {languagesList.map((lang) => (
                    <div
                      key={lang}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0'
                      }}
                    >
                      {editingLanguage?.oldName === lang ? (
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control-custom"
                            value={editingLanguage.value}
                            onChange={(e) => setEditingLanguage({ ...editingLanguage, value: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn-primary-custom"
                            onClick={() => handleSaveEditLanguage(lang, editingLanguage.value)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Enregistrer"
                          >
                            <i className="fas fa-check" />
                          </button>
                          <button
                            type="button"
                            className="btn-light-custom"
                            onClick={() => setEditingLanguage(null)}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                            title="Annuler"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <i className="fas fa-language" style={{ color: '#9ca3af', fontSize: '0.9rem' }} />
                            <span style={{ fontWeight: 600, color: '#18181b', fontSize: '0.92rem' }}>{lang}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditingLanguage({ oldName: lang, value: lang })}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              title="Modifier cette langue"
                            >
                              <i className="fas fa-edit" style={{ color: '#3b82f6' }} /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLanguage(lang)}
                              className="btn-light-custom"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px', color: '#ef4444' }}
                              title="Supprimer cette langue"
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

              {/* Bouton Paramètres des Attributs (Positionné exactement là où entouré en bleu par l'utilisateur !) */}
              <button
                type="button"
                className="btn-light-custom"
                onClick={() => setViewMode('attributes')}
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

          {/* Layout Principal : Formulaire à gauche (2/3) + Aperçu en direct à droite (1/3) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Colonne Formulaire */}
            <div className="admin-card" style={{ flex: 2 }}>
              <div className="card-header-custom" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <h4>
                  <i className="flaticon-381-box" style={{ color: '#111111', marginRight: '0.5rem' }} />
                  Informations du Produit
                </h4>
                <span className="badge-custom bg-soft-primary">
                  {editingProduct ? 'Édition' : 'Nouveau'}
                </span>
              </div>

              <div className="card-body-custom" style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {/* Nom */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label-custom">Nom / Titre du Produit *</label>
                      <input
                        type="text"
                        className="form-control-custom"
                        placeholder="Ex: Les Chroniques d'Alger"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    {/* Auteur */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Auteur / Écrivain (Optionnel)</label>
                      <input
                        type="text"
                        className="form-control-custom"
                        placeholder="Ex: Yasmina Khadra (Optionnel)"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      />
                    </div>

                    {/* Catégorie */}
                    <div className="form-group-custom">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label className="form-label-custom" style={{ margin: 0 }}>Catégorie</label>
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
                      <select
                        className="form-control-custom"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">-- Aucune catégorie --</option>
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Prix */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Prix (en DA) *</label>
                      <input
                        type="number"
                        step="50"
                        className="form-control-custom"
                        placeholder="Ex: 2500"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>

                    {/* Stock */}
                    <div className="form-group-custom">
                      <label className="form-label-custom">Quantité en Stock</label>
                      <input
                        type="number"
                        className="form-control-custom"
                        placeholder="Ex: 20"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>

                    {/* Format */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label-custom">Format / Édition</label>
                      <input
                        type="text"
                        className="form-control-custom"
                        placeholder="Ex: Édition Reliée, Broché, Grand Format, Poche..."
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      />
                    </div>

                    {/* Sélection des Langues */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <label className="form-label-custom" style={{ margin: 0 }}>Langue(s) du Livre</label>
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
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {languagesList.map((lang) => {
                          const isSelected = (formData.languages || []).includes(lang);
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => toggleLanguage(lang)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.15rem',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #111111' : '1px solid #d4d4d8',
                                backgroundColor: isSelected ? '#111111' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#374151',
                                fontWeight: isSelected ? 600 : 500,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <i
                                className={isSelected ? 'fas fa-check-circle' : 'far fa-circle'}
                                style={{ fontSize: '0.9rem', color: isSelected ? '#34d399' : '#9ca3af' }}
                              />
                              <span>{lang}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Image de Couverture avec Téléversement depuis l'appareil */}
                    <div className="form-group-custom" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Image de Couverture du Produit</span>
                        <span style={{ fontSize: '0.78rem', color: '#71717a', fontWeight: 500 }}>
                          depuis l'appareil ou URL
                        </span>
                      </label>

                      {/* Zone de Téléversement depuis l'appareil */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropImage}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed #d4d4d8',
                          borderRadius: '10px',
                          padding: '1.25rem',
                          textAlign: 'center',
                          backgroundColor: '#fafafa',
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
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />

                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            backgroundColor: '#111111',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        >
                          {uploadingImage ? (
                            <i className="flaticon-381-refresh" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <i className="flaticon-381-photo" />
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111111' }}>
                            {uploadingImage
                              ? 'Téléversement en cours...'
                              : 'Recharger une photo depuis votre appareil'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '0.2rem' }}>
                            Cliquez pour choisir un fichier ou glissez-déposez ici (JPG, PNG, WEBP)
                          </div>
                        </div>
                      </div>

                      {/* Message de succès après upload */}
                      {uploadSuccess && (
                        <div
                          style={{
                            padding: '0.5rem 0.85rem',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <i className="fas fa-check-circle" />
                          <span>{uploadSuccess}</span>
                        </div>
                      )}

                      {/* Champ textuel pour URL manuelle */}
                      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                        <input
                          type="text"
                          className="form-control-custom"
                          placeholder="/uploads/... ou URL externe"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
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

                      {/* Échantillons d'images rapides */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 500 }}>
                          Ou choisir parmi les images existantes :
                        </span>
                        {sampleImages.map((s) => (
                          <button
                            key={s.url}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, image: s.url });
                              setUploadSuccess('');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: formData.image === s.url ? '2px solid #111111' : '1px solid #ddd',
                              backgroundColor: formData.image === s.url ? '#f4f4f5' : '#fff',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            <img
                              src={s.url}
                              alt={s.label}
                              style={{ width: '22px', height: '30px', objectFit: 'cover', borderRadius: '3px' }}
                            />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

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
            <div className="admin-card" style={{ maxWidth: '380px', position: 'sticky', top: '90px' }}>
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
                  <img
                    src={formData.image || '/assets/images/books/book1.jpg'}
                    alt={formData.name || 'Aperçu'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = '/assets/images/books/book1.jpg';
                    }}
                  />
                </div>

                {formData.category ? (
                  <span className="badge-custom bg-soft-primary" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                    {formData.category}
                  </span>
                ) : null}

                <h3 style={{ fontSize: '1.15rem', color: '#333', margin: '0.4rem 0 0.2rem' }}>
                  {formData.name || 'Titre du Produit'}
                </h3>
                {(formData.author || formData.format) && (
                  <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
                    {formData.author}
                    {formData.author && formData.format ? ' • ' : ''}
                    {formData.format ? <small>{formData.format}</small> : null}
                  </p>
                )}

                {/* Badges Langues Live */}
                {Array.isArray(formData.languages) && formData.languages.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                    {formData.languages.map((lang) => (
                      <span
                        key={lang}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          fontWeight: 600
                        }}
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#999', textTransform: 'uppercase' }}>Prix Vente</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111111' }}>
                      {formData.price ? Number(formData.price).toLocaleString() : '0'} DA
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '30px', backgroundColor: '#e0e0e0' }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#999', textTransform: 'uppercase' }}>Disponibilité</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: Number(formData.stock) > 0 ? '#209f84' : '#f72b50' }}>
                      {formData.stock || 0} en stock
                    </div>
                  </div>
                </div>

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
                onClick={() => setViewMode('attributes')}
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
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div
              className="card-body-custom"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '260px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
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
                    placeholder="Rechercher par titre ou auteur..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '2.4rem' }}
                  />
                </div>
                {search && (
                  <button className="btn-light-custom" onClick={() => setSearch('')} style={{ padding: '0.5rem 0.8rem' }}>
                    Effacer
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {categoriesForFilter.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '50px',
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? '#111111' : '#eaeaea',
                      backgroundColor: selectedCategory === cat ? '#111111' : '#ffffff',
                      color: selectedCategory === cat ? '#ffffff' : '#555',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
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
                    <th>Auteur</th>
                    <th>Catégorie</th>
                    <th>Prix (DA)</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                        <i
                          className="flaticon-381-box"
                          style={{ fontSize: '2.5rem', color: '#ccc', display: 'block', marginBottom: '0.5rem' }}
                        />
                        Aucun produit ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const stockNum = parseInt(p.stock, 10);
                      const isConfirmingDelete = deleteConfirmId === p.id;

                      return (
                        <tr key={p.id}>
                          <td>
                            <img
                              src={p.image || '/assets/images/books/book1.jpg'}
                              alt={p.name}
                              style={{
                                width: '46px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                              }}
                              onError={(e) => {
                                e.target.src = '/assets/images/books/book1.jpg';
                              }}
                            />
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
                            <span style={{ fontWeight: 500, color: p.author ? '#555' : '#aaa' }}>
                              {p.author || '—'}
                            </span>
                          </td>
                          <td>
                            {p.category ? (
                              <span className="badge-custom bg-soft-info">{p.category}</span>
                            ) : (
                              <span style={{ color: '#aaa', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            <strong style={{ fontSize: '1rem', color: '#111111' }}>
                              {Number(p.price).toLocaleString()} DA
                            </strong>
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
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
