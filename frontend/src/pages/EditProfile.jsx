import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDating } from '../context/DatingContext';
import { ALGERIA_CITIES, getCommunesByWilaya } from '../data/algeriaCities';

const EditProfile = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating();

  const [loggedUser] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Extraction initiale de la Wilaya et Commune existante
  const parseInitialLocation = () => {
    const rawWilaya = loggedUser?.wilaya || '';
    const rawCommune = loggedUser?.commune || '';
    const rawAddress = loggedUser?.address || userProfile?.location || '';

    let matchedWilaya = '';
    let matchedCommune = rawCommune;

    if (rawWilaya) {
      const city = ALGERIA_CITIES.find(
        (c) =>
          c.name.toLowerCase() === rawWilaya.toLowerCase() ||
          c.wilaya.toLowerCase() === rawWilaya.toLowerCase() ||
          c.code === rawWilaya
      );
      if (city) matchedWilaya = city.name;
    }

    if (!matchedWilaya && rawAddress) {
      for (const city of ALGERIA_CITIES) {
        if (
          rawAddress.toLowerCase().includes(city.wilaya.toLowerCase()) ||
          rawAddress.toLowerCase().includes(city.name.toLowerCase())
        ) {
          matchedWilaya = city.name;
          break;
        }
      }
    }

    if (matchedWilaya && !matchedCommune && rawAddress) {
      const communes = getCommunesByWilaya(matchedWilaya);
      for (const com of communes) {
        if (rawAddress.toLowerCase().includes(com.toLowerCase())) {
          matchedCommune = com;
          break;
        }
      }
    }

    return {
      wilaya: matchedWilaya,
      commune: matchedCommune
    };
  };

  const initialLoc = parseInitialLocation();

  const [formData, setFormData] = useState({
    name: loggedUser?.name || userProfile?.name || "",
    phone: loggedUser?.phone || userProfile?.phone || "",
    email: loggedUser?.email || userProfile?.email || "",
  });

  const [selectedWilaya, setSelectedWilaya] = useState(initialLoc.wilaya);
  const [selectedCommune, setSelectedCommune] = useState(initialLoc.commune);
  const [saving, setSaving] = useState(false);

  const availableCommunes = selectedWilaya ? getCommunesByWilaya(selectedWilaya) : [];

  const handleWilayaChange = (e) => {
    const newWilaya = e.target.value;
    setSelectedWilaya(newWilaya);
    setSelectedCommune('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fullAddress = selectedWilaya && selectedCommune
      ? `${selectedWilaya} - ${selectedCommune}`
      : (selectedWilaya || '');

    const updatedUser = {
      ...(loggedUser || {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      wilaya: selectedWilaya,
      commune: selectedCommune,
      address: fullAddress
    };

    localStorage.setItem('customer_user', JSON.stringify(updatedUser));

    if (setUserProfile) {
      setUserProfile((prev) => ({
        ...prev,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        wilaya: selectedWilaya,
        commune: selectedCommune,
        location: fullAddress,
        address: fullAddress
      }));
    }

    if (loggedUser?.id) {
      try {
        await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: loggedUser.id,
            name: updatedUser.name,
            phone: updatedUser.phone,
            email: updatedUser.email,
            wilaya: selectedWilaya,
            commune: selectedCommune,
            address: fullAddress
          })
        });
      } catch (err) {
        console.warn('Erreur mise à jour client API:', err);
      }
    }

    setSaving(false);
    navigate('/profile');
  };

  return (
    <div className="page-wrapper">
      <Header title="Modifier le Profil" showBack={true} backUrl="/profile" bgWhite={true} />

      <div className="page-content space-top p-b60">
        <div className="container">
          <form onSubmit={handleSubmit}>
            <div className="card mb-4" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div className="card-header pb-2 pt-3 px-3 border-0 bg-transparent">
                <h6 className="title mb-0 font-15 font-w600 text-dark">Informations Personnelles</h6>
              </div>
              <div 
                className="card-body p-3"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr', 
                  gap: '14px',
                  width: '100%'
                }}
              >
                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Nom Complet</label>
                  <input 
                    type="text" 
                    className="form-control w-100" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Votre nom complet"
                    style={{ height: '48px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Numéro de Téléphone</label>
                  <input 
                    type="text" 
                    className="form-control w-100" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: 0697037109"
                    style={{ height: '48px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Adresse Email</label>
                  <input 
                    type="email" 
                    className="form-control w-100" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nom@exemple.com"
                    style={{ height: '48px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>

                {/* Wilaya (Liste Déroulante) */}
                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Wilaya</label>
                  <select 
                    className="form-control w-100" 
                    required
                    value={selectedWilaya}
                    onChange={handleWilayaChange}
                    style={{ 
                      height: '48px', 
                      borderRadius: '12px', 
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="">Sélectionnez la wilaya</option>
                    {ALGERIA_CITIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Commune (Liste Déroulante) */}
                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Commune</label>
                  <select 
                    className="form-control w-100" 
                    required
                    disabled={!selectedWilaya}
                    value={selectedCommune}
                    onChange={(e) => setSelectedCommune(e.target.value)}
                    style={{ 
                      height: '48px', 
                      borderRadius: '12px', 
                      fontSize: '14px',
                      cursor: selectedWilaya ? 'pointer' : 'not-allowed',
                      backgroundColor: selectedWilaya ? '#ffffff' : '#f8f9fa'
                    }}
                  >
                    <option value="">
                      {selectedWilaya ? 'Sélectionnez la commune' : 'Choisissez une wilaya'}
                    </option>
                    {availableCommunes.map((comm) => (
                      <option key={comm} value={comm}>
                        {comm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-lg btn-gradient w-100 dz-flex-box rounded-xl"
              disabled={saving}
              style={{ cursor: 'pointer', height: '50px', fontSize: '15px', fontWeight: 600 }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
