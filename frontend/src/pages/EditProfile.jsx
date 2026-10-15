import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDating } from '../context/DatingContext';

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

  const [formData, setFormData] = useState({
    name: loggedUser?.name || userProfile?.name || "",
    phone: loggedUser?.phone || userProfile?.phone || "",
    email: loggedUser?.email || userProfile?.email || "",
    address: loggedUser?.address || userProfile?.location || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const updatedUser = {
      ...(loggedUser || {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim()
    };

    localStorage.setItem('customer_user', JSON.stringify(updatedUser));

    if (setUserProfile) {
      setUserProfile(prev => ({
        ...prev,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        location: updatedUser.address
      }));
    }

    if (loggedUser?.id) {
      try {
        await fetch('http://localhost:8000/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: loggedUser.id,
            name: updatedUser.name,
            phone: updatedUser.phone,
            email: updatedUser.email,
            address: updatedUser.address
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

                <div style={{ width: '100%' }}>
                  <label className="form-label font-w600 font-13 text-muted mb-1 d-block">Wilaya / Adresse de Livraison</label>
                  <input 
                    type="text" 
                    className="form-control w-100" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex: Alger, Oran, Constantine..."
                    style={{ height: '48px', borderRadius: '12px', fontSize: '14px' }}
                  />
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
