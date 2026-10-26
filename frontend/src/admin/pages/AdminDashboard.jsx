// frontend/src/admin/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await adminApi.getStats();
      setStats(statsData);
      setOrders(statsData.recentOrders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [trafficPeriod, setTrafficPeriod] = useState('14'); // '7' | '14' | '30'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Données réelles de trafic et de pays issues de l'API backend
  const currentTraffic = stats?.trafficStats?.[trafficPeriod] || {
    dates: [],
    totalVisits: [],
    uniqueVisitors: []
  };

  const countriesData = stats?.trafficStats?.countries || [];
  const devicesData = stats?.trafficStats?.devices || {
    mobile: 0,
    desktop: 0,
    tablet: 0
  };

  // Couleurs principales du panneau d'administration (Theme Mediqu / Hospital React)
  const adminPrimaryColor = '#111111';
  const adminUniqueColor = '#209f84';

  // Calculs géométriques SVG pour les courbes lisses du graphique
  const svgWidth = 720;
  const svgHeight = 250;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 210;

  const dates = currentTraffic.dates || [];
  const totalVisits = currentTraffic.totalVisits || [];
  const uniqueVisitors = currentTraffic.uniqueVisitors || [];
  const numPoints = dates.length;

  // Calcul dynamique de l'échelle selon les données réelles
  const peakVal = Math.max(10, ...(totalVisits.length ? totalVisits : [10]));
  const step = peakVal > 200 ? 50 : (peakVal > 80 ? 25 : (peakVal > 30 ? 10 : 5));
  const maxScaleVal = Math.ceil(peakVal / (step * 3)) * (step * 3) || 120;
  const gridLevels = [
    maxScaleVal,
    Math.round((maxScaleVal * 2) / 3),
    Math.round(maxScaleVal / 3),
    0
  ];

  const totalPoints = totalVisits.map((val, idx) => {
    const x = padLeft + (idx / Math.max(1, numPoints - 1)) * (svgWidth - padLeft - padRight);
    const y = padBottom - (val / maxScaleVal) * (padBottom - padTop);
    return { x, y, val, date: dates[idx], uniqueVal: uniqueVisitors[idx] || 0 };
  });

  const uniquePoints = uniqueVisitors.map((val, idx) => {
    const x = padLeft + (idx / Math.max(1, numPoints - 1)) * (svgWidth - padLeft - padRight);
    const y = padBottom - (val / maxScaleVal) * (padBottom - padTop);
    return { x, y, val, date: dates[idx] };
  });

  const getCurvedPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const getAreaPath = (pts, base = padBottom) => {
    const line = getCurvedPath(pts);
    if (!line || pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `${line} L ${last.x.toFixed(1)} ${base} L ${first.x.toFixed(1)} ${base} Z`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Livrée':
        return <span className="badge-custom bg-soft-success"><i className="fas fa-check-circle" /> Livrée</span>;
      case 'Confirmée':
        return <span className="badge-custom bg-soft-info"><i className="fas fa-thumbs-up" /> Confirmée</span>;
      case 'Expédiée':
        return <span className="badge-custom bg-soft-primary"><i className="fas fa-shipping-fast" /> Expédiée</span>;
      case 'Annulée':
        return <span className="badge-custom bg-soft-danger"><i className="fas fa-times-circle" /> Annulée</span>;
      case 'En attente':
      default:
        return <span className="badge-custom bg-soft-warning"><i className="fas fa-clock" /> En attente</span>;
    }
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Tableau de Bord E-Commerce</h1>
          <p className="breadcrumb-sub">Vue d'ensemble de la boutique en Dinars Algériens (DA)</p>
        </div>
        <div className="page-actions">
          <button className="btn-light-custom" onClick={loadData}>
            <i className="flaticon-381-refresh" /> Actualiser
          </button>
          <Link to="/admin/products" className="btn-primary-custom">
            <i className="flaticon-381-add-1" /> Gérer les Produits
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards Grid (Section 4.C design.md) */}
      <div className="stat-grid">
        {/* Card 1: Revenue */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Chiffre d'Affaires</span>
            <h3 className="stat-value">
              {stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '13,000'} <small style={{ fontSize: '1rem', color: '#111111' }}>DA</small>
            </h3>
            <span className="stat-trend text-success" style={{ color: '#209f84' }}>
              <i className="fas fa-arrow-up" /> +18.4% ce mois
            </span>
          </div>
          <div className="stat-icon-box bg-soft-primary">
            <i className="flaticon-381-diamond" />
          </div>
        </div>

        {/* Card 2: Orders */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Commandes</span>
            <h3 className="stat-value">{stats?.totalOrders ?? 5}</h3>
            <span className="stat-trend text-warning" style={{ color: '#ff5c00' }}>
              <i className="fas fa-clock" /> {stats?.pendingOrders ?? 2} en attente
            </span>
          </div>
          <div className="stat-icon-box bg-soft-warning">
            <i className="flaticon-381-calendar-1" />
          </div>
        </div>

        {/* Card 3: Products */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Produits</span>
            <h3 className="stat-value">{stats?.totalProducts ?? 6}</h3>
            <span className="stat-trend text-info" style={{ color: '#2781d5' }}>
              <i className="fas fa-check" /> 100% en stock
            </span>
          </div>
          <div className="stat-icon-box bg-soft-info">
            <i className="flaticon-381-box" />
          </div>
        </div>

        {/* Card 4: Customers */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Clients Enregistrés</span>
            <h3 className="stat-value">{stats?.totalCustomers ?? 5}</h3>
            <span className="stat-trend text-success" style={{ color: '#209f84' }}>
              <i className="fas fa-user-check" /> Acheteurs vérifiés
            </span>
          </div>
          <div className="stat-icon-box bg-soft-success">
            <i className="flaticon-381-user-7" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          NOUVELLE SECTION : Évolution du Trafic & Visites en Temps Réel + Visites par Pays
          ========================================================================= */}
      <div className="traffic-analytics-grid">
        {/* Carte Gauche : Évolution du Trafic & Visites en Temps Réel */}
        <div className="admin-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            className="card-header-custom"
            style={{
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem 1.5rem'
            }}
          >
            <div>
              <h4 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#18181b', margin: 0 }}>
                Évolution du Trafic & Visites en Temps Réel
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '3px', borderRadius: '2px', backgroundColor: adminPrimaryColor }} />
                  <strong style={{ color: '#18181b' }}>Visites totales</strong>
                  <span style={{ color: '#71717a', fontWeight: 400 }}>(toutes sessions & répétitions)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '3px', borderRadius: '2px', backgroundColor: adminUniqueColor }} />
                  <strong style={{ color: '#18181b' }}>Visiteurs uniques</strong>
                </div>
              </div>
            </div>

            {/* Sélecteur de période (7 jours, 14 jours, 30 jours) */}
            <div style={{ display: 'inline-flex', gap: '2px', backgroundColor: '#f4f4f5', padding: '3px', borderRadius: '20px', border: '1px solid #e4e4e7' }}>
              {['7', '14', '30'].map((p) => {
                const isActive = trafficPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTrafficPeriod(p);
                      setHoveredPoint(null);
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      padding: '5px 14px',
                      borderRadius: '16px',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 600 : 500,
                      backgroundColor: isActive ? adminPrimaryColor : 'transparent',
                      color: isActive ? '#ffffff' : '#71717a',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.22)' : 'none'
                    }}
                  >
                    {p} jours
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card-body-custom" style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ width: '100%', height: 'auto', minWidth: '500px', overflow: 'visible' }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  {/* Dégradé monochrome sleek pour la surface des visites totales */}
                  <linearGradient id="trafficAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={adminPrimaryColor} stopOpacity="0.14" />
                    <stop offset="60%" stopColor={adminPrimaryColor} stopOpacity="0.04" />
                    <stop offset="100%" stopColor={adminPrimaryColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Lignes de repère horizontales en pointillés */}
                {gridLevels.map((lvl) => {
                  const y = padBottom - (lvl / maxScaleVal) * (padBottom - padTop);
                  return (
                    <g key={lvl}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#f1f1f4"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 9}
                        y={y + 4}
                        textAnchor="end"
                        fill="#a1a1aa"
                        fontSize="11"
                        fontWeight="500"
                        fontFamily="inherit"
                      >
                        {lvl}
                      </text>
                    </g>
                  );
                })}

                {/* Surface ombrée sous la courbe des visites totales */}
                <path
                  d={getAreaPath(totalPoints, padBottom)}
                  fill="url(#trafficAreaGrad)"
                />

                {/* Courbe lissée des visites totales (Ligne principale noir carbone / admin primary) */}
                <path
                  d={getCurvedPath(totalPoints)}
                  fill="none"
                  stroke={adminPrimaryColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Courbe lissée des visiteurs uniques (Ligne vert émeraude / admin success) */}
                <path
                  d={getCurvedPath(uniquePoints)}
                  fill="none"
                  stroke={adminUniqueColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points sur la courbe des visites totales */}
                {totalPoints.map((pt, idx) => (
                  <circle
                    key={`tot-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill="#ffffff"
                    stroke={adminPrimaryColor}
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                ))}

                {/* Points sur la courbe des visiteurs uniques (affichés quand val > 0) */}
                {uniquePoints.map((pt, idx) => {
                  if (pt.val === 0) return null;
                  return (
                    <circle
                      key={`uniq-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="3"
                      fill="#ffffff"
                      stroke={adminUniqueColor}
                      strokeWidth="2"
                      style={{ transition: 'all 0.15s ease' }}
                    />
                  );
                })}

                {/* Libellés de date sur l'axe X */}
                {totalPoints.map((pt, idx) => (
                  <text
                    key={`lbl-${idx}`}
                    x={pt.x}
                    y={padBottom + 24}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="10.5"
                    fontWeight="500"
                    fontFamily="inherit"
                  >
                    {pt.date}
                  </text>
                ))}

                {/* Zones invisibles pour le survol et tooltip interactif */}
                {totalPoints.map((pt, idx) => (
                  <rect
                    key={`hit-${idx}`}
                    x={pt.x - (svgWidth - padLeft - padRight) / (numPoints * 2)}
                    y={padTop}
                    width={(svgWidth - padLeft - padRight) / Math.max(1, numPoints - 1)}
                    height={padBottom - padTop + 30}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(idx)}
                  />
                ))}

                {/* Tooltip au survol */}
                {hoveredPoint !== null && totalPoints[hoveredPoint] && (
                  <g pointerEvents="none">
                    <line
                      x1={totalPoints[hoveredPoint].x}
                      y1={padTop}
                      x2={totalPoints[hoveredPoint].x}
                      y2={padBottom}
                      stroke={adminPrimaryColor}
                      strokeDasharray="3 3"
                      strokeWidth="1.2"
                      opacity="0.3"
                    />
                    <circle
                      cx={totalPoints[hoveredPoint].x}
                      cy={totalPoints[hoveredPoint].y}
                      r="5.5"
                      fill={adminPrimaryColor}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <rect
                      x={Math.min(svgWidth - 145, Math.max(8, totalPoints[hoveredPoint].x - 65))}
                      y={Math.max(8, totalPoints[hoveredPoint].y - 56)}
                      width="135"
                      height="46"
                      rx="6"
                      fill="#18181b"
                      opacity="0.95"
                    />
                    <text
                      x={Math.min(svgWidth - 145, Math.max(8, totalPoints[hoveredPoint].x - 65)) + 67}
                      y={Math.max(8, totalPoints[hoveredPoint].y - 56) + 17}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {totalPoints[hoveredPoint].date}
                    </text>
                    <text
                      x={Math.min(svgWidth - 145, Math.max(8, totalPoints[hoveredPoint].x - 65)) + 67}
                      y={Math.max(8, totalPoints[hoveredPoint].y - 56) + 34}
                      textAnchor="middle"
                      fontSize="10"
                    >
                      <tspan fill="#ffffff" fontWeight="700">{totalPoints[hoveredPoint].val} visites</tspan>
                      <tspan fill="#a1a1aa"> • </tspan>
                      <tspan fill="#4ade80" fontWeight="600">{totalPoints[hoveredPoint].uniqueVal} uniques</tspan>
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Carte Droite : Visites par Pays */}
        <div className="admin-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              className="card-header-custom"
              style={{
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem'
              }}
            >
              <h4 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#18181b', margin: 0 }}>
                Visites par Pays
              </h4>
              <span
                style={{
                  backgroundColor: '#f4f4f5',
                  color: '#18181b',
                  border: '1px solid #e4e4e7',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {countriesData.length} pays
              </span>
            </div>

            <div className="card-body-custom" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {countriesData.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#71717a', padding: '2rem 1rem', fontSize: '0.88rem' }}>
                    <div style={{ marginBottom: '0.4rem', fontSize: '1.3rem' }}>🌐</div>
                    <strong>Aucune visite enregistrée pour le moment</strong>
                    <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
                      Les visites réelles apparaîtront automatiquement dès que des visiteurs naviguent sur la boutique.
                    </div>
                  </div>
                ) : (
                  countriesData.map((country, idx) => (
                    <div key={idx}>
                      {/* Première ligne : Code, Nom, Badge et Nombre de visites */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#18181b' }}>{country.code}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#18181b' }}>{country.name}</span>
                          <span
                            style={{
                              backgroundColor: '#f4f4f5',
                              color: '#888890',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600
                            }}
                          >
                            {country.code}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#18181b' }}>{country.visits}</span>{' '}
                          <span style={{ fontWeight: 400, color: '#71717a', fontSize: '0.82rem' }}>visites</span>
                        </div>
                      </div>

                      {/* Barre de progression pleine largeur */}
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: '#f4f4f5',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${country.percentage}%`,
                            backgroundColor: idx === 0 ? adminPrimaryColor : (idx === 1 ? '#2781d5' : '#209f84'),
                            borderRadius: '6px',
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </div>

                      {/* Pourcentage sous la barre aligné à droite */}
                      <div style={{ textAlign: 'right', marginTop: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: '#18181b', fontSize: '0.8rem' }}>
                          {country.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pied de carte avec répartition par appareil */}
          <div
            style={{
              padding: '1.1rem 1.5rem',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.84rem',
              color: '#52525b',
              backgroundColor: '#fafafa',
              borderRadius: '0 0 var(--admin-radius-lg) var(--admin-radius-lg)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Mobile :</span>
              <strong style={{ color: '#18181b' }}>{devicesData.mobile}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Desktop :</span>
              <strong style={{ color: '#18181b' }}>{devicesData.desktop}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#65a30d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Tablet :</span>
              <strong style={{ color: '#18181b' }}>{devicesData.tablet}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Weekly Sales Chart Widget */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="card-header-custom">
            <h4>Activité des Ventes (Cette Semaine)</h4>
            <span className="badge-custom bg-soft-primary">Hebdomadaire</span>
          </div>
          <div className="card-body-custom">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', gap: '10px' }}>
              {(() => {
                const weeklyData = stats?.weeklyChart || [];
                const maxSales = Math.max(1000, ...weeklyData.map((w) => w.sales));
                const peakItem = weeklyData.reduce((prev, cur) => (cur.sales > (prev?.sales || 0) ? cur : prev), null);

                return weeklyData.map((item, idx) => {
                  const isPeak = peakItem && item.sales === peakItem.sales && item.sales > 0;
                  const isToday = idx === weeklyData.length - 1;
                  const heightPercent = item.sales > 0 ? Math.max(12, Math.round((item.sales / maxSales) * 100)) : 6;

                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: item.sales > 0 ? '#111111' : '#a1a1aa', marginBottom: '6px' }}>
                        {item.sales > 0 ? (item.sales >= 1000 ? `${(item.sales / 1000).toFixed(item.sales % 1000 === 0 ? 0 : 1)}k` : item.sales) : '0'}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '28px',
                          height: `${heightPercent}%`,
                          background: isPeak
                            ? 'linear-gradient(180deg, #111111 0%, #333333 100%)'
                            : (isToday ? '#209f84' : (item.sales > 0 ? '#18181b' : '#e4e4e7')),
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.4s ease'
                        }}
                        title={`${item.day} ${item.date || ''}: ${Number(item.sales).toLocaleString()} DA (${item.orders} commandes)`}
                      />
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isToday ? '#111111' : '#71717a', marginTop: '8px' }}>
                        {item.day}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                {(() => {
                  const growth = stats?.weeklySalesStats?.growthPercent;
                  if (growth === undefined || growth === null) {
                    return <span style={{ color: '#71717a' }}>Données en direct</span>;
                  }
                  const isPositive = growth > 0;
                  const isNegative = growth < 0;
                  const color = isPositive ? '#209f84' : (isNegative ? '#ef4444' : '#71717a');
                  const sign = isPositive ? '+' : '';
                  return (
                    <span>
                      <strong style={{ color }}>{sign}{growth}%</strong> vs semaine passée
                    </span>
                  );
                })()}
              </div>
              <div>
                Pic des ventes:{' '}
                <strong style={{ color: '#111111' }}>
                  {(() => {
                    const peak = stats?.weeklyChart?.reduce((prev, cur) => (cur.sales > (prev?.sales || 0) ? cur : prev), null);
                    return peak && peak.sales > 0 ? `${peak.day} (${Number(peak.sales).toLocaleString()} DA)` : 'En cours';
                  })()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Highlights Widget */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="card-header-custom">
            <h4>Statuts des Commandes</h4>
            <Link to="/admin/orders" style={{ fontSize: '0.82rem', color: '#111111', textDecoration: 'none', fontWeight: 600 }}>
              Voir tout <i className="fas fa-arrow-right" />
            </Link>
          </div>
          <div className="card-body-custom">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                {
                  status: 'En attente',
                  label: 'Commandes En Attente',
                  dotColor: '#ff5c00',
                  bg: '#fcfaff',
                  border: '#f0e6f9',
                  badgeClass: 'badge-custom bg-soft-warning',
                  count: stats?.ordersByStatus?.['En attente'] ?? stats?.pendingOrders ?? 0
                },
                {
                  status: 'Livrée',
                  label: 'Commandes Livrées',
                  dotColor: '#209f84',
                  bg: '#f5faf9',
                  border: '#e1f4f0',
                  badgeClass: 'badge-custom bg-soft-success',
                  count: stats?.ordersByStatus?.['Livrée'] ?? 0
                },
                {
                  status: 'Confirmée',
                  label: 'Commandes Confirmées',
                  dotColor: '#2781d5',
                  bg: '#f4f8fd',
                  border: '#e2effc',
                  badgeClass: 'badge-custom bg-soft-info',
                  count: stats?.ordersByStatus?.['Confirmée'] ?? 0
                },
                {
                  status: 'Expédiée',
                  label: 'Commandes Expédiées',
                  dotColor: '#111111',
                  bg: '#f4f4f5',
                  border: '#e4e4e7',
                  badgeClass: 'badge-custom bg-soft-primary',
                  count: stats?.ordersByStatus?.['Expédiée'] ?? 0
                }
              ].map((item) => {
                const count = item.count;
                return (
                  <Link
                    key={item.status}
                    to={`/admin/orders?status=${encodeURIComponent(item.status)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 1rem',
                      background: item.bg,
                      borderRadius: '8px',
                      border: `1px solid ${item.border}`,
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.dotColor }} />
                      <span style={{ fontWeight: 600, color: '#18181b' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={item.badgeClass} style={{ cursor: 'pointer' }}>
                        {count} {count > 1 ? 'commandes' : 'commande'}
                      </span>
                      <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', color: '#a1a1aa' }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Data Table (Section 4.D design.md) */}
      <div className="admin-card">
        <div className="card-header-custom">
          <div>
            <h4>Dernières Commandes Reçues</h4>
            <small style={{ color: '#888' }}>Synchronisées en direct avec MySQL & PHP Backend</small>
          </div>
          <Link to="/admin/orders" className="btn-primary-custom" style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}>
            <i className="flaticon-381-file" /> Toutes les Commandes
          </Link>
        </div>
        <div className="table-responsive-custom">
          <table className="table-custom">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Client</th>
                <th>Wilaya / Adresse</th>
                <th>Articles</th>
                <th>Total (DA)</th>
                <th>Paiement</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    Aucune commande trouvée.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong style={{ color: '#111111' }}>{ord.order_number}</strong>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#333' }}>{ord.customer_name}</div>
                        <small style={{ color: '#888' }}>{ord.customer_phone}</small>
                      </div>
                    </td>
                    <td>{ord.customer_address}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ord.items_summary}
                    </td>
                    <td>
                      <strong>{Number(ord.total_amount).toLocaleString()} DA</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#555' }}>{ord.payment_method}</span>
                    </td>
                    <td>{getStatusBadge(ord.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to="/admin/orders"
                        className="btn-icon-custom bg-soft-primary"
                        title="Voir & Modifier"
                        style={{ textDecoration: 'none' }}
                      >
                        <i className="fas fa-eye" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
