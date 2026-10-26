import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE = '/api';

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datingCtx = useDating();
  const { accentColor } = useTheme();

  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Résoudre le client connecté ou en session
  useEffect(() => {
    const initCustomer = async () => {
      let currentCust = null;
      try {
        const stored = localStorage.getItem('customer_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.id || parsed.phone || parsed.name)) {
            currentCust = parsed;
          }
        }
      } catch (e) {}

      const userPhone = currentCust?.phone || datingCtx?.userProfile?.phone;
      const userEmail = currentCust?.email || datingCtx?.userProfile?.email;

      // Toujours vérifier avec la base de données pour synchroniser l'ID réel dans la table `customers`
      try {
        const res = await fetch(`${API_BASE}/customers`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          if (userPhone || userEmail) {
            const matched = json.data.find(c => 
              (userPhone && String(c.phone).trim() === String(userPhone).trim()) || 
              (userEmail && String(c.email).trim().toLowerCase() === String(userEmail).trim().toLowerCase())
            );
            if (matched) {
              currentCust = matched;
              localStorage.setItem('customer_user', JSON.stringify(matched));
            }
          }
        }
      } catch (err) {
        console.warn('Erreur chargement clients:', err);
      }

      if (currentCust && currentCust.id) {
        setCustomer(currentCust);
        await fetchMessages(currentCust.id, true);
      }
    };

    initCustomer();
  }, []);

  // Polling automatique pour synchroniser les réponses de l'admin en temps réel
  useEffect(() => {
    if (!customer?.id) return;
    const interval = setInterval(() => {
      fetchMessages(customer.id, false);
    }, 2500);
    return () => clearInterval(interval);
  }, [customer?.id]);

  const fetchMessages = async (customerId, autoScroll = false) => {
    try {
      const res = await fetch(`${API_BASE}/messages?customer_id=${customerId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.messages)) {
        setMessages(json.messages);
        if (autoScroll) {
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err) {
      console.warn('Erreur messages:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (sending) return;

    // Si le visiteur n'a pas de compte connecté, afficher le pop-up
    if (!customer?.id) {
      setShowLoginModal(true);
      return;
    }

    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    setInputText('');
    setSending(true);

    const optimistic = {
      id: Date.now(),
      customer_id: customer.id,
      sender: 'customer',
      message: trimmed,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(scrollToBottom, 40);

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          sender: 'customer',
          message: trimmed
        })
      });
      const json = await res.json();
      if (json.success) {
        await fetchMessages(customer.id, true);
      }
    } catch (err) {
      console.error('Erreur envoi message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (typeof dateStr === 'string' && dateStr.includes(' ')) {
        return dateStr.split(' ')[1].substring(0, 5);
      }
    } catch (e) {}
    return '';
  };

  const themePrimary = accentColor || '#fe2c55';

  return (
    <div className="page-wrapper">
      {/* Header Support - Modern Clean */}
      <header className="header header-fixed bg-white border-bottom" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div className="container">
          <div className="header-content">
            <div className="left-content">
              <Link to="/" className="back-btn me-2">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <h5 className="title mb-0 font-w600" style={{ fontSize: '17px', color: '#111' }}>
                Support
              </h5>
            </div>
            <div className="mid-content"></div>
            <div className="right-content">
              {!customer?.id && (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    color: themePrimary,
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 12px'
                  }}
                >
                  <i className="icon feather icon-user me-1"></i>
                  Invité
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content Start */}
      <div className="page-content space-top p-b60 message-content" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="container"> 
          <div className="chat-box-area"> 
            {/* Message de bienvenue si aucune discussion */}
            {messages.length === 0 && (
              <div className="chat-content">
                <div className="message-item">
                  <div className="bubble">
                    Bonjour ! 👋 Bienvenue sur le support client LeerBook. Posez-nous vos questions sur vos commandes, livres et livraisons ici.
                  </div>
                  <div className="message-time">Support</div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`chat-content ${msg.sender === 'customer' ? 'user' : ''}`}
              >
                <div className="message-item">
                  <div 
                    className="bubble"
                    style={msg.sender === 'customer' ? {
                      background: `var(--btn-gradient, ${themePrimary})`,
                      color: '#ffffff'
                    } : {}}
                  >
                    {msg.message}
                  </div>    
                  <div className="message-time">{formatTime(msg.created_at)}</div>    
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div> 
      </div>

      {/* Input Footer */}
      <footer className="footer border-top fixed bg-white">
        <div className="container p-2">
          <div className="chat-footer">
            <form onSubmit={handleSend}>
              <div className="form-group mb-0">
                <div className="input-wrapper message-area">
                  <div className="append-media"></div>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Écrivez votre message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="btn-chat border-0 bg-transparent" 
                    style={{ 
                      cursor: 'pointer', 
                      color: themePrimary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                    title="Envoyer"
                  >
                    <i className="icon feather icon-send"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>    
        </div>
      </footer>

      {/* Pop-up : Compte requis pour les visiteurs (Couleur dynamique Apparence Admin) */}
      {showLoginModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '32px 24px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton Fermer (croix) */}
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f3f4f6',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              ✕
            </button>

            {/* Icône thématique */}
            <div 
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                margin: '0 auto 18px',
                background: `linear-gradient(135deg, ${themePrimary}18, ${themePrimary}35)`,
                color: themePrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: `0 10px 25px ${themePrimary}25`
              }}
            >
              <i className="icon feather icon-lock"></i>
            </div>

            {/* Titre */}
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Compte Requis
            </h4>

            {/* Message */}
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.55, marginBottom: '24px' }}>
              Vous avez besoin d'un compte pour envoyer un message et échanger directement avec notre service client.
            </p>

            {/* Bouton de redirection vers la page de Connexion avec la couleur choisie dans Apparence */}
            <button
              type="button"
              onClick={() => navigate('/login?redirect=chat')}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '16px',
                border: 'none',
                background: `var(--btn-gradient, ${themePrimary})`,
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `var(--btn-shadow, 0 8px 24px ${themePrimary}40)`,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s ease, opacity 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.opacity = '0.94';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              <i className="icon feather icon-log-in"></i>
              <span>Se connecter / Créer un compte</span>
            </button>

            {/* Bouton Plus tard */}
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
