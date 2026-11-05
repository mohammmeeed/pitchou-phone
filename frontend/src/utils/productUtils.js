// frontend/src/utils/productUtils.js

const MAIN_CATEGORIES_NORM = [
  'téléphones', 'telephones',
  'accessoires',
  'batteries',
  'chargeurs & câbles', 'chargeurs & cables', 'chargeurs et cables',
  'écrans & pièces', 'ecrans & pieces', 'ecrans et pieces',
  'livres', 'formats'
];

const KNOWN_BRANDS_NORM = [
  'apple', 'samsung', 'xiaomi', 'oneplus', 'one plus', 'realme',
  'google pixel', 'pixel', 'google', 'huawei', 'oppo', 'infinix',
  'tecno', 'honor', 'hoco', 'anker', 'baseus', 'sony', 'redmi',
  'poco', 'motorola', 'nokia', 'vivo', 'iqoo', 'zte', 'nothing',
  'lenovo', 'asus', 'tcl', 'itel'
];

/**
 * Extrait la sous-catégorie d'un produit en excluant strictement la catégorie principale et la marque.
 * Ne retourne JAMAIS la marque (ex: 'Samsung') ni la catégorie principale (ex: 'Téléphones').
 * Exemples de sous-catégories valides: 'Sous blister', 'Très bon état', 'Bon état', 'Occasion', 'Écouteurs & Casques', 'Powerbanks', etc.
 */
export function getProductSubcategory(card) {
  if (!card) return '';

  const brandVal = (card.brand || card.marque || card.author || '').trim();
  const brandNorm = brandVal.toLowerCase();

  const isInvalid = (val) => {
    if (!val || typeof val !== 'string') return true;
    const clean = val.trim();
    if (!clean || clean.length < 2) return true;
    const norm = clean.toLowerCase();

    // 1. Ne doit pas être la marque du produit
    if (brandNorm && (norm === brandNorm || norm.includes(brandNorm) || brandNorm.includes(norm))) {
      return true;
    }
    // 2. Ne doit pas être une marque connue
    if (KNOWN_BRANDS_NORM.includes(norm)) {
      return true;
    }
    // 3. Ne doit pas être une catégorie principale
    if (MAIN_CATEGORIES_NORM.includes(norm)) {
      return true;
    }
    // 4. Mots réservés génériques
    if (['format', 'edition', 'auteur', 'default', 'null', 'undefined'].includes(norm)) {
      return true;
    }
    return false;
  };

  // Priorité 1 : Champ sous-catégorie explicite s'il est valide
  const directSub = card.subcategory || card.sub_category || card.sous_categorie;
  if (directSub && !isInvalid(directSub)) {
    return directSub.trim();
  }

  // Priorité 2 : Liste des catégories associées au produit
  const cats = Array.isArray(card.categories)
    ? card.categories
    : (typeof card.category === 'string' && card.category.trim() !== ''
        ? card.category.split(',').map((s) => s.trim()).filter(Boolean)
        : []);

  for (const c of cats) {
    if (c && !isInvalid(c)) {
      return c.trim();
    }
  }

  // Priorité 3 : État du produit (spécifique aux téléphones : Sous blister, Très bon état, etc.)
  const rawEtat = card.etat || card.format;
  if (rawEtat && !isInvalid(rawEtat)) {
    return rawEtat.trim();
  }

  return '';
}

