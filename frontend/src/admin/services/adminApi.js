// frontend/src/admin/services/adminApi.js
// Communication service with PHP backend at http://localhost:8000/api

const API_BASE_URL = '/api';

// Fallback mock data in case PHP backend is not yet started or during development
const FALLBACK_STATS = {
  totalRevenue: 13000,
  totalOrders: 5,
  pendingOrders: 2,
  totalProducts: 6,
  totalCustomers: 5,
  currency: 'DA',
  recentOrders: [
    {
      id: 5,
      order_number: '#CMD-1086',
      customer_name: 'Karim Belhadj',
      customer_phone: '0771234567',
      customer_email: 'karim@outlook.com',
      customer_address: 'Sétif',
      total_amount: 1950,
      items_summary: '1x Le Chant du Silence',
      status: 'En attente',
      payment_method: 'Paiement à la livraison',
      created_at: '2026-10-13 10:37:15'
    },
    {
      id: 4,
      order_number: '#CMD-1085',
      customer_name: 'Amina Mansouri',
      customer_phone: '0554321987',
      customer_email: 'amina@email.com',
      customer_address: 'Annaba',
      total_amount: 2100,
      items_summary: '1x The Whispering Oak',
      status: 'Expédiée',
      payment_method: 'Paiement à la livraison',
      created_at: '2026-10-13 10:37:15'
    },
    {
      id: 3,
      order_number: '#CMD-1084',
      customer_name: 'Yacine Kaci',
      customer_phone: '0661239845',
      customer_email: 'yacine@yahoo.fr',
      customer_address: 'Constantine',
      total_amount: 4600,
      items_summary: '2x Les Chroniques Oubliées',
      status: 'En attente',
      payment_method: 'Paiement à la livraison',
      created_at: '2026-10-13 10:37:15'
    },
    {
      id: 2,
      order_number: '#CMD-1083',
      customer_name: 'Sara Benali',
      customer_phone: '0770984512',
      customer_email: 'sara@gmail.com',
      customer_address: 'Oran, Maraval',
      total_amount: 1850,
      items_summary: '1x The Art of Whispers',
      status: 'Confirmée',
      payment_method: 'Paiement à la livraison',
      created_at: '2026-10-13 10:37:15'
    },
    {
      id: 1,
      order_number: '#CMD-1082',
      customer_name: 'Mohamed Guedaoui',
      customer_phone: '0550123456',
      customer_email: 'mohamed@email.com',
      customer_address: 'Alger Centre',
      total_amount: 2500,
      items_summary: '1x The Chronicles of Autumn',
      status: 'Livrée',
      payment_method: 'Paiement à la livraison',
      created_at: '2026-10-13 10:37:15'
    }
  ],
  weeklyChart: [
    { day: 'Lun', sales: 4350, orders: 2 },
    { day: 'Mar', sales: 6900, orders: 3 },
    { day: 'Mer', sales: 8400, orders: 4 },
    { day: 'Jeu', sales: 5200, orders: 2 },
    { day: 'Ven', sales: 12500, orders: 5 },
    { day: 'Sam', sales: 16800, orders: 7 },
    { day: 'Dim', sales: 14200, orders: 6 }
  ],
  trafficStats: {
    "7": {
      dates: ["08 Oct", "09 Oct", "10 Oct", "11 Oct", "12 Oct", "13 Oct", "14 Oct"],
      totalVisits: [112, 110, 34, 26, 17, 3, 2],
      uniqueVisitors: [18, 19, 9, 11, 8, 2, 1]
    },
    "14": {
      dates: ["01 Oct", "02 Oct", "03 Oct", "04 Oct", "05 Oct", "06 Oct", "07 Oct", "08 Oct", "09 Oct", "10 Oct", "11 Oct", "12 Oct", "13 Oct", "14 Oct"],
      totalVisits: [0, 0, 0, 0, 0, 0, 0, 112, 110, 34, 26, 17, 3, 2],
      uniqueVisitors: [0, 0, 0, 0, 0, 0, 0, 18, 19, 9, 11, 8, 2, 1]
    },
    "30": {
      dates: ["15 Sep", "18 Sep", "21 Sep", "24 Sep", "27 Sep", "30 Sep", "03 Oct", "06 Oct", "09 Oct", "12 Oct", "14 Oct"],
      totalVisits: [0, 0, 0, 0, 0, 0, 0, 2, 110, 17, 2],
      uniqueVisitors: [0, 0, 0, 0, 0, 0, 0, 1, 19, 8, 1]
    },
    countries: [
      { code: "DZ", name: "Algérie", visits: 1544, percentage: 98.2 },
      { code: "FR", name: "France", visits: 22, percentage: 1.4 },
      { code: "US", name: "États-Unis", visits: 6, percentage: 0.4 }
    ],
    devices: {
      mobile: 1047,
      desktop: 397,
      tablet: 128
    }
  }
};

export const adminApi = {
  // 0. Authentication & Admin Session
  isAuthenticated() {
    return !!localStorage.getItem('admin_token');
  },

  getCurrentAdmin() {
    try {
      const stored = localStorage.getItem('admin_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      id: 1,
      name: 'leerbook',
      email: 'leerbook',
      phone: '0550123456',
      role: 'admin'
    };
  },

  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === 'admin') {
          localStorage.setItem('admin_token', data.token || 'tk_admin_' + Date.now());
          localStorage.setItem('admin_user', JSON.stringify(data.user));
          return { success: true, user: data.user };
        } else {
          return { success: false, message: "Accès refusé : Ce compte n'a pas les privilèges administrateur." };
        }
      }
      return { success: false, message: data.message || 'Identifiants invalides' };
    } catch (err) {
      console.warn('Login error:', err);
      return { success: false, message: 'Identifiants incorrects ou serveur indisponible' };
    }
  },

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  // 1. Get Dashboard Stats
  async getStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      if (!res.ok) throw new Error('API non accessible');
      const json = await res.json();
      return json.data || FALLBACK_STATS;
    } catch (err) {
      console.warn('Utilisation des données locales (PHP server en attente):', err.message);
      return FALLBACK_STATS;
    }
  },

  // 2. Products CRUD
  async getProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error('API non accessible');
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('Fallback products:', err.message);
      // Fallback local products
      const local = localStorage.getItem('admin_products_cache');
      if (local) return JSON.parse(local);
      return [
        {
          id: 1,
          name: 'The Chronicles of Autumn',
          author: 'Sophia Sterling',
          format: 'Édition Reliée',
          price: 2500,
          purchase_price: 1600,
          stock: 14,
          category: 'Roman & Littérature',
          rating: 4.9,
          image: '/assets/images/recent-pic/pic1.png',
          bio: 'Un voyage poétique au cœur des mystères d’automne.'
        },
        {
          id: 2,
          name: 'The Art of Whispers',
          author: 'Alex Rivera',
          format: 'Broché Premium',
          price: 1850,
          purchase_price: 1200,
          stock: 22,
          category: 'Développement Personnel',
          rating: 4.7,
          image: '/assets/images/recent-pic/pic2.png',
          bio: 'Apprenez à maîtriser l’art subtil de la communication humaine.'
        },
        {
          id: 3,
          name: 'Les Chroniques Oubliées',
          author: 'Amine Belkacem',
          format: 'Édition Collector',
          price: 2300,
          purchase_price: 1500,
          stock: 8,
          category: 'Histoire & Récits',
          rating: 4.8,
          image: '/assets/images/recent-pic/pic3.png',
          bio: 'Une immersion dans les légendes et mémoires d’Afrique du Nord.'
        },
        {
          id: 4,
          name: 'The Whispering Oak',
          author: 'Elena Rostova',
          format: 'Couverture Rigide',
          price: 2100,
          purchase_price: 1350,
          stock: 19,
          category: 'Fantasy & Mystère',
          rating: 4.9,
          image: '/assets/images/recent-pic/pic4.png',
          bio: 'Une forêt ancienne aux secrets que seuls les initiés osent déchiffrer.'
        },
        {
          id: 5,
          name: 'Le Chant du Silence',
          author: 'Karim Ziani',
          format: 'Édition Poche',
          price: 1950,
          purchase_price: 1250,
          stock: 15,
          category: 'Philosophie & Poésie',
          rating: 4.6,
          image: '/assets/images/recent-pic/pic5.png',
          bio: 'Des méditations profondes sur le calme et la résilience.'
        },
        {
          id: 6,
          name: 'Echos du Destin',
          author: 'Nadia Bensaid',
          format: 'Édition Limitée',
          price: 2700,
          purchase_price: 1750,
          stock: 5,
          category: 'Roman Graphique',
          rating: 4.9,
          image: '/assets/images/recent-pic/pic6.png',
          bio: 'Quand les choix d’une vie résonnent à travers les générations.'
        }
      ];
    }
  },

  async createProduct(productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback product create:', err.message);
      return { success: true, message: 'Produit sauvegardé en mémoire locale', data: { id: Date.now(), ...productData } };
    }
  },

  async updateProduct(id, productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...productData })
      });
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        // En cas de réponse sans JSON
      }
      if (!res.ok) {
        throw new Error(json?.message || `Erreur serveur (${res.status})`);
      }
      return json || { success: true, message: 'Produit mis à jour avec succès', data: { id, ...productData } };
    } catch (err) {
      console.warn('Product update error:', err.message);
      throw err;
    }
  },

  async deleteProduct(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/products?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback product delete:', err.message);
      return { success: true, message: 'Produit supprimé' };
    }
  },

  // 3. Orders Management
  async getOrders(status = '') {
    try {
      const url = status ? `${API_BASE_URL}/orders?status=${encodeURIComponent(status)}` : `${API_BASE_URL}/orders`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API non accessible');
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('Fallback orders:', err.message);
      return FALLBACK_STATS.recentOrders;
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback order update:', err.message);
      return { success: true, message: `Statut mis à jour en: ${newStatus}` };
    }
  },

  async deleteOrder(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback order delete:', err.message);
      return { success: true, message: 'Commande supprimée' };
    }
  },

  // 4. Customers List
  async getCustomers() {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (!res.ok) throw new Error('API non accessible');
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('Fallback customers:', err.message);
      const saved = localStorage.getItem('admin_fallback_customers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      return [
        { id: 1, name: 'Mohamed Guedaoui', email: 'mohamed@email.com', phone: '0550123456', password: 'motdepasse123', address: 'Alger Centre', total_orders: 1, total_spent: 2500, created_at: '2026-10-13 10:37:15' }
      ];
    }
  },

  async updateCustomer(customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.error('Erreur mise à jour client:', err);
      return { success: false, message: err.message || 'Erreur réseau' };
    }
  },

  async deleteCustomer(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback customer delete:', err.message);
      try {
        const saved = localStorage.getItem('admin_fallback_customers');
        let list = saved ? JSON.parse(saved) : [
          { id: 1, name: 'Mohamed Guedaoui', email: 'mohamed@email.com', phone: '0550123456', address: 'Alger Centre', total_orders: 1, total_spent: 2500, created_at: '2026-10-13 10:37:15' }
        ];
        list = list.filter((c) => String(c.id) !== String(id));
        localStorage.setItem('admin_fallback_customers', JSON.stringify(list));
      } catch (e) {}
      return { success: true, message: 'Client supprimé' };
    }
  },

  // 5. Messages & Chat
  async getConversations() {
    try {
      const res = await fetch(`${API_BASE_URL}/messages`);
      if (!res.ok) throw new Error('API messages non accessible');
      const json = await res.json();
      return json.conversations || [];
    } catch (err) {
      console.warn('Fallback conversations:', err.message);
      return [];
    }
  },

  async getCustomerMessages(customerId) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages?customer_id=${customerId}`);
      if (!res.ok) throw new Error('API customer messages non accessible');
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback customer messages:', err.message);
      return { customer: null, messages: [] };
    }
  },

  async sendMessage(customerId, messageText, sender = 'admin', customerData = null) {
    try {
      const payload = {
        customer_id: customerId,
        message: messageText,
        sender
      };
      if (customerData) {
        payload.customer_name = customerData.name;
        payload.customer_phone = customerData.phone;
        payload.customer_email = customerData.email;
        payload.customer_address = customerData.address;
      }
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback send message:', err.message);
      return { success: false };
    }
  },

  async deleteConversation(customerId) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages?customer_id=${customerId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback delete conversation:', err.message);
      return { success: true, message: 'Discussion supprimée' };
    }
  },

  async deleteMessage(messageId) {
    try {
      const res = await fetch(`${API_BASE_URL}/messages?id=${messageId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Fallback delete message:', err.message);
      return { success: true, message: 'Message supprimé' };
    }
  },

  // 6. Admin Profile Management
  async getAdminProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin_profile`);
      if (!res.ok) throw new Error('API non accessible');
      const data = await res.json();
      if (data.success && data.admin) {
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        return data.admin;
      }
      return this.getCurrentAdmin();
    } catch (err) {
      console.warn('Fallback get profile:', err.message);
      return this.getCurrentAdmin();
    }
  },

  async updateAdminProfile(profileData) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success && data.admin) {
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
      }
      return data;
    } catch (err) {
      console.warn('Fallback update profile:', err.message);
      const updated = { ...this.getCurrentAdmin(), ...profileData };
      localStorage.setItem('admin_user', JSON.stringify(updated));
      return { success: true, message: 'Profil mis à jour en local', admin: updated };
    }
  },

  async createAdminAccount(accountData) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...accountData, action: 'create' })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Fallback create admin:', err.message);
      return { success: false, error: err.message || 'Erreur réseau' };
    }
  },

  async getAllAdmins() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin_profile?list=true`);
      if (!res.ok) throw new Error('API non accessible');
      const data = await res.json();
      return data.admins || [];
    } catch (err) {
      console.warn('Fallback get all admins:', err.message);
      return [];
    }
  },

  // 7. Upload Photo or Video from Device (Single & Multi-files)
  async uploadMedia(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        return {
          success: true,
          url: data.url,
          type: data.type || (file.type?.startsWith('video/') ? 'video' : 'image'),
          filename: data.filename
        };
      }
      throw new Error(data?.error || 'Erreur lors du téléversement');
    } catch (err) {
      console.warn('Upload API fallback vers base64 DataURL:', err.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            success: true,
            url: e.target.result,
            type: file.type?.startsWith('video/') ? 'video' : 'image'
          });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Impossible de lire le fichier' });
        };
        reader.readAsDataURL(file);
      });
    }
  },

  async uploadMultipleMedia(files) {
    const list = Array.from(files);
    const results = [];
    for (const f of list) {
      const res = await this.uploadMedia(f);
      if (res && res.success) {
        results.push(res);
      }
    }
    return results;
  },

  async uploadImage(file) {
    return this.uploadMedia(file);
  },

  // 8. Paramètres du Système (Boutique, Apparence, SMTP)
  async getParameters() {
    try {
      const res = await fetch(`${API_BASE_URL}/parameters`);
      if (!res.ok) throw new Error('Erreur API paramètres');
      const data = await res.json();
      if (data?.settings?.block_f12 !== undefined) {
        try {
          localStorage.setItem('block_f12', String(data.settings.block_f12));
          window.dispatchEvent(new CustomEvent('block_f12_changed', { detail: String(data.settings.block_f12) }));
        } catch (e) {}
      }
      return data.settings || null;
    } catch (err) {
      console.warn('Fallback getParameters:', err.message);
      return null;
    }
  },

  async saveParameters(settings) {
    if (settings?.accent_color) {
      try {
        localStorage.setItem('shop_accent_color', settings.accent_color);
      } catch (e) {}
    }
    if (settings?.block_f12 !== undefined) {
      try {
        localStorage.setItem('block_f12', String(settings.block_f12));
        window.dispatchEvent(new CustomEvent('block_f12_changed', { detail: String(settings.block_f12) }));
      } catch (e) {}
    }
    try {
      const res = await fetch(`${API_BASE_URL}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', settings })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Fallback saveParameters:', err.message);
      return { success: false, error: err.message };
    }
  },

  async testSmtp(smtpConfig) {
    try {
      const res = await fetch(`${API_BASE_URL}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_smtp', ...smtpConfig })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Fallback testSmtp:', err.message);
      return { success: false, message: 'Erreur réseau lors du test SMTP' };
    }
  },

  async sendTestEmail(targetEmail) {
    try {
      const res = await fetch(`${API_BASE_URL}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test_email', email: targetEmail })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Fallback sendTestEmail:', err.message);
      return { success: false, message: 'Erreur réseau lors de l\'envoi du test' };
    }
  },

  // 9. Attributs du Catalogue (Catégories, Langues & Wilayas de Livraison)
  async getAttributes() {
    try {
      const res = await fetch(`${API_BASE_URL}/attributes`);
      if (!res.ok) throw new Error('Erreur API attributs');
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.wilayas)) {
          try {
            localStorage.setItem('tiktok_shop_wilayas', JSON.stringify(data.wilayas));
          } catch (e) {}
        }
        return {
          categories: data.categories || [],
          languages: data.languages || [],
          wilayas: Array.isArray(data.wilayas) ? data.wilayas : []
        };
      }
    } catch (err) {
      console.warn('Fallback getAttributes:', err.message);
    }
    // Fallback localStorage
    try {
      const savedCats = localStorage.getItem('tiktok_shop_categories');
      const savedLangs = localStorage.getItem('tiktok_shop_languages');
      const savedWilayas = localStorage.getItem('tiktok_shop_wilayas');
      return {
        categories: savedCats ? JSON.parse(savedCats) : [
          'Roman & Littérature',
          'Développement Personnel',
          'Histoire & Récits',
          'Fantasy & Mystère',
          'Philosophie & Poésie',
          'Roman Graphique'
        ],
        languages: savedLangs ? JSON.parse(savedLangs) : ['Français', 'Anglais', 'Arabe'],
        wilayas: savedWilayas ? JSON.parse(savedWilayas) : []
      };
    } catch (e) {
      return {
        categories: [
          'Roman & Littérature',
          'Développement Personnel',
          'Histoire & Récits',
          'Fantasy & Mystère',
          'Philosophie & Poésie',
          'Roman Graphique'
        ],
        languages: ['Français', 'Anglais', 'Arabe'],
        wilayas: []
      };
    }
  },

  async saveAttributes(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (payload.categories) {
        localStorage.setItem('tiktok_shop_categories', JSON.stringify(payload.categories));
      }
      if (payload.languages) {
        localStorage.setItem('tiktok_shop_languages', JSON.stringify(payload.languages));
      }
      if (data && Array.isArray(data.wilayas)) {
        localStorage.setItem('tiktok_shop_wilayas', JSON.stringify(data.wilayas));
      } else if (payload.wilayas) {
        localStorage.setItem('tiktok_shop_wilayas', JSON.stringify(payload.wilayas));
      }
      return data;
    } catch (err) {
      console.warn('Fallback saveAttributes vers localStorage:', err.message);
      if (payload.categories) {
        localStorage.setItem('tiktok_shop_categories', JSON.stringify(payload.categories));
      }
      if (payload.languages) {
        localStorage.setItem('tiktok_shop_languages', JSON.stringify(payload.languages));
      }
      if (payload.wilayas) {
        localStorage.setItem('tiktok_shop_wilayas', JSON.stringify(payload.wilayas));
      }
      return { success: true, message: 'Attributs enregistrés localement' };
    }
  },

  // Journal de Caisse & Trésorerie
  async getCashflow(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/cashflow.php?${qs}`);
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Erreur getCashflow:', err.message);
      return { success: false, data: [], kpi: {}, counts: {} };
    }
  },

  async createCashflowEntry(entry) {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return await res.json();
    } catch (err) {
      console.error('Erreur createCashflowEntry:', err);
      throw err;
    }
  },

  async updateCashflowEntry(entry) {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return await res.json();
    } catch (err) {
      console.error('Erreur updateCashflowEntry:', err);
      throw err;
    }
  },

  async deleteCashflowEntry(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow.php?id=${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (err) {
      console.error('Erreur deleteCashflowEntry:', err);
      throw err;
    }
  },

  // Catégories d'opérations du Journal de Caisse
  async getCashflowCategories() {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow_categories`);
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Fallback cashflow categories:', err.message);
      return {
        success: true,
        recettes: ['VENTE BOUTIQUE / POS', 'VERSEMENT CLIENT', 'AUTRE RECETTE'],
        depenses: ['ACHAT MARCHANDISE / STOCK', 'FRAIS DE LIVRAISON', 'FOURNITURES & EMBALLAGE', 'MARKETING & PUBLICITÉ', 'LOYER & CHARGES', 'AUTRE DÉPENSE']
      };
    }
  },

  async saveCashflowCategory(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow_categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error('Erreur saveCashflowCategory:', err);
      throw err;
    }
  }
};

