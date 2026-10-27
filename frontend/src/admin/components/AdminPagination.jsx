// frontend/src/admin/components/AdminPagination.jsx
import React from 'react';

/**
 * Calcule la plage de pages à afficher avec ellipses, selon le format demandé :
 * 1 2 ..... 60 61 .... 127 128
 */
export function getPaginationRange(currentPage, totalPages, delta = 1) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const startPages = [1, 2];
  const endPages = [totalPages - 1, totalPages];

  let rangeStart = Math.max(3, currentPage - delta);
  let rangeEnd = Math.min(totalPages - 2, currentPage + delta);

  if (currentPage <= 4) {
    rangeStart = 3;
    rangeEnd = Math.min(totalPages - 2, 5);
  } else if (currentPage >= totalPages - 3) {
    rangeStart = Math.max(3, totalPages - 4);
    rangeEnd = totalPages - 2;
  }

  pages.push(...startPages);

  if (rangeStart > 3) {
    pages.push('dots-left');
  }

  for (let p = rangeStart; p <= rangeEnd; p++) {
    if (!pages.includes(p)) {
      pages.push(p);
    }
  }

  if (rangeEnd < totalPages - 2) {
    pages.push('dots-right');
  }

  for (const p of endPages) {
    if (!pages.includes(p)) {
      pages.push(p);
    }
  }

  return pages;
}

export default function AdminPagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = 'éléments'
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (itemsPerPage || 25))) {
    return null;
  }

  const pages = getPaginationRange(currentPage, totalPages);
  const startIdx = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endIdx = itemsPerPage && totalItems !== undefined ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className="admin-pagination-container">
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <div className="admin-pagination-info">
          Affichage de <strong>{startIdx}</strong> à <strong>{endIdx}</strong> sur{' '}
          <strong>{Number(totalItems).toLocaleString('fr-FR')}</strong> {itemLabel}
        </div>
      )}

      <div className="admin-pagination-nav">
        {/* Bouton Précédent */}
        <button
          type="button"
          className="admin-pagination-arrow"
          disabled={currentPage <= 1}
          onClick={() => {
            if (currentPage > 1) {
              onPageChange(currentPage - 1);
            }
          }}
          aria-label="Page précédente"
        >
          ← Précédent
        </button>

        {/* Numéros de page et ellipses (1 2 ... 60 61 ... 127 128) */}
        <div className="admin-pagination-pages">
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`${p}-${idx}`} className="admin-pagination-ellipsis" aria-hidden="true">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                className={`admin-pagination-num ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Bouton Suivant */}
        <button
          type="button"
          className="admin-pagination-arrow"
          disabled={currentPage >= totalPages}
          onClick={() => {
            if (currentPage < totalPages) {
              onPageChange(currentPage + 1);
            }
          }}
          aria-label="Page suivante"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
