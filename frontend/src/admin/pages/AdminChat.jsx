// frontend/src/admin/pages/AdminChat.jsx
// Messagerie & Chat avec les clients (Hospital React / Mediqu Design System)

import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { adminApi } from '../services/adminApi';

export default function AdminChat() {
  const [conversations, setConversations] = useState([]);
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Ref sur le conteneur scrollable des messages pour un défilement vertical pur (SANS scrollIntoView)
  const messagesContainerRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Verrouille strictement le défilement horizontal de la carte pour empêcher tout décalage du panneau gauche
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollLeft = 0;
    }
  }, [activeCustomerId, messages]);

  // Réponses rapides prédéfinies pour le e-commerce
  const quickReplies = [
    "Bonjour ! Votre commande est bien confirmée.",
    "Votre colis a été expédié avec Yalidine Express.",
    "Ce livre est actuellement en stock avec livraison rapide.",
    "Merci beaucoup pour votre confiance sur LeerBook !"
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  // Polling automatique toutes les 3 secondes pour recevoir les nouveaux messages et conversations
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeCustomerId) {
        fetchMessages(activeCustomerId, false);
      }
      refreshConversationsSilent();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeCustomerId]);

  const refreshConversationsSilent = async () => {
    try {
      const data = await adminApi.getConversations();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (e) {}
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getConversations();
      setConversations(data);
      if (data.length > 0 && !activeCustomerId) {
        selectConversation(data[0].customer_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (customerId) => {
    setActiveCustomerId(customerId);
    await fetchMessages(customerId, true);
  };

  const fetchMessages = async (customerId, scroll = false) => {
    try {
      const res = await adminApi.getCustomerMessages(customerId);
      if (res && res.success) {
        setMessages(res.messages || []);
        setActiveCustomer(res.customer || null);
        if (scroll) {
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scroll vertical pur du conteneur de messages - ÉVITE tout décalage horizontal des panneaux
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeCustomerId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    // Mise à jour optimiste dans l'UI
    const optimisticMsg = {
      id: Date.now(),
      customer_id: activeCustomerId,
      sender: 'admin',
      message: textToSend,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 30);

    try {
      await adminApi.sendMessage(activeCustomerId, textToSend, 'admin');
      // Rafraîchir conversations pour mettre à jour le dernier message
      const updatedConvs = await adminApi.getConversations();
      setConversations(updatedConvs);
      await fetchMessages(activeCustomerId, true);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text) => {
    setInputText(text);
  };

  const filteredConversations = conversations.filter((c) =>
    (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_phone || '').includes(search) ||
    (c.customer_address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-wrap">
          <h1>Messagerie & Chat Clients</h1>
          <p className="breadcrumb-sub">
            Échangez en temps réel avec vos clients et acheteurs LeerBook
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-light-custom" onClick={loadConversations}>
            <i className="flaticon-381-refresh" /> Actualiser
          </button>
        </div>
      </div>

      {/* Main Chat Container - Flexbox Robuste (Empêche tout décalage du panneau gauche) */}
      <div
        ref={chatContainerRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0;
        }}
        className="admin-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          minHeight: '680px',
          height: 'calc(100vh - 220px)',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* =========================================================================
            PANEL GAUCHE : LISTE DES CONVERSATIONS CLIENTS (Largeur fixe, 100% visible)
            ========================================================================= */}
        <div
          style={{
            width: '320px',
            minWidth: '320px',
            maxWidth: '320px',
            flexShrink: 0,
            borderRight: '1px solid #eaeaea',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff'
          }}
        >
          {/* En-tête de la liste & Recherche */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111111' }}>
                Discussions ({conversations.length})
              </h4>
            </div>

            <div style={{ position: 'relative' }}>
              <i
                className="flaticon-381-search-2"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999',
                  fontSize: '0.9rem'
                }}
              />
              <input
                type="text"
                className="form-control-custom"
                placeholder="Rechercher client, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.3rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Liste des contacts scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.5rem 0' }}>
            {loading && conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#999' }}>
                <i className="flaticon-381-refresh" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }} />
                Chargement des discussions...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#999', fontSize: '0.88rem' }}>
                Aucun client trouvé.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.customer_id === activeCustomerId;
                const initials = (conv.customer_name || 'Client')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={conv.customer_id}
                    onClick={() => selectConversation(conv.customer_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1.25rem',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid #111111' : '4px solid transparent',
                      backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Avatar initiales */}
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#111111' : '#e4e4e7',
                        color: isSelected ? '#ffffff' : '#111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}
                    >
                      {initials}
                    </div>

                    {/* Infos client et aperçu du dernier message */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: '#111111',
                            fontSize: '0.92rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {conv.customer_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#999', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {conv.last_message_time ? conv.last_message_time.split(' ')[1]?.substring(0, 5) : ''}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: isSelected ? '#111111' : '#777',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {conv.last_sender === 'admin' && <span style={{ fontWeight: 600 }}>Vous : </span>}
                        {conv.last_message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            PANEL DROIT : CONVERSATION ACTIVE & SAISIE DU MESSAGE
            ========================================================================= */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fdfdff',
            overflow: 'hidden'
          }}
        >
          {activeCustomer ? (
            <>
              {/* En-tête de la discussion active */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#111111',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      flexShrink: 0
                    }}
                  >
                    {(activeCustomer.name || 'C')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeCustomer.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#777', flexWrap: 'wrap' }}>
                      <span>
                        <i className="fas fa-phone-alt" style={{ color: '#209f84', marginRight: '0.3rem' }} />
                        {activeCustomer.phone}
                      </span>
                      {activeCustomer.address && (
                        <span>
                          <i className="fas fa-map-marker-alt" style={{ color: '#ff5c00', marginRight: '0.3rem' }} />
                          {activeCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <a
                    href={`tel:${activeCustomer.phone}`}
                    className="btn-light-custom"
                    style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <i className="fas fa-phone-alt" /> Appeler
                  </a>
                </div>
              </div>

              {/* Corps des messages (historique de chat) avec ref pour scroll vertical */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  backgroundColor: '#fbfbfd'
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#999' }}>
                    <i className="flaticon-381-send-2" style={{ fontSize: '2.5rem', color: '#ddd', display: 'block', marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0 }}>Aucun message échangé pour le moment.</p>
                    <small>Envoyez un message pour démarrer la conversation avec ce client.</small>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender === 'admin';
                    const timeStr = m.created_at ? m.created_at.split(' ')[1]?.substring(0, 5) : '';

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                          alignItems: 'flex-end',
                          gap: '0.5rem'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '68%',
                            padding: '0.85rem 1.15rem',
                            borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isAdmin
                              ? 'linear-gradient(135deg, #111111 0%, #2b2b2b 100%)'
                              : '#ffffff',
                            color: isAdmin ? '#ffffff' : '#333333',
                            boxShadow: isAdmin
                              ? '0 3px 12px rgba(0, 0, 0, 0.25)'
                              : '0 2px 8px rgba(0, 0, 0, 0.05)',
                            border: isAdmin ? 'none' : '1px solid #ebebeb',
                            fontSize: '0.92rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                          }}
                        >
                          <div>{m.message}</div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: isAdmin ? 'rgba(255,255,255,0.75)' : '#999999',
                              textAlign: 'right',
                              marginTop: '0.35rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '0.3rem'
                            }}
                          >
                            <span>{timeStr}</span>
                            {isAdmin && <i className="fas fa-check-double" style={{ fontSize: '0.65rem' }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Réponses rapides suggérées */}
              <div
                style={{
                  padding: '0.65rem 1.25rem',
                  borderTop: '1px solid #f0f0f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  flexShrink: 0,
                  width: '100%',
                  minWidth: 0
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#999', alignSelf: 'center', flexShrink: 0, fontWeight: 600 }}>
                  Réponses rapides :
                </span>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickReply(qr)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.78rem',
                      borderRadius: '50px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#f8f8fa',
                      color: '#111111',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Barre de saisie et envoi du message */}
              <form
                onSubmit={handleSend}
                style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid #f0f0f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexShrink: 0,
                  width: '100%'
                }}
              >
                <input
                  type="text"
                  className="form-control-custom"
                  placeholder="Écrire un message au client (appuyez sur Entrée pour envoyer)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '0.8rem 1.1rem',
                    fontSize: '0.92rem',
                    borderRadius: '50px'
                  }}
                />

                <button
                  type="submit"
                  className="btn-primary-custom"
                  disabled={!inputText.trim() || sending}
                  style={{
                    borderRadius: '50px',
                    padding: '0.8rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: !inputText.trim() || sending ? 0.6 : 1,
                    cursor: !inputText.trim() || sending ? 'not-allowed' : 'pointer'
                  }}
                >
                  <i className="flaticon-381-send-2" />
                  <span>Envoyer</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
              <div style={{ textAlign: 'center' }}>
                <i className="flaticon-381-send-2" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }} />
                <h3>Sélectionnez une discussion</h3>
                <p>Choisissez un client dans la liste à gauche pour voir les messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
