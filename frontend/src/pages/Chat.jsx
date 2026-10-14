import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const API_BASE = 'http://localhost:8000/api';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const datingCtx = useDating();

  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

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
          if (parsed) {
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
          } else if (!currentCust || !currentCust.id) {
            currentCust = json.data[0];
            localStorage.setItem('customer_user', JSON.stringify(currentCust));
          }
        }
      } catch (err) {
        console.warn('Erreur chargement clients:', err);
      }

      if (currentCust) {
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
    if (!inputText.trim() || !customer?.id || sending) return;

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

  return (
    <div className="page-wrapper">
      {/* Header Support TikTok Shop - Modern Clean */}
      <header className="header header-fixed bg-white border-bottom" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div className="container">
          <div className="header-content">
            <div className="left-content">
              <Link to="/home" className="back-btn me-2">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <h5 className="title mb-0 font-w600" style={{ fontSize: '17px', color: '#111' }}>
                Support TikTok Shop
              </h5>
            </div>
            <div className="mid-content"></div>
            <div className="right-content"></div>
          </div>
        </div>
      </header>

      {/* Page Content Start - DatingKit original layout */}
      <div className="page-content space-top p-b60 message-content" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="container"> 
          <div className="chat-box-area"> 
            {messages.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`chat-content ${msg.sender === 'customer' ? 'user' : ''}`}
              >
                <div className="message-item">
                  <div className="bubble">{msg.message}</div>    
                  <div className="message-time">{formatTime(msg.created_at)}</div>    
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div> 
      </div>

      {/* Input Footer - DatingKit original */}
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
                    placeholder="Send message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button type="submit" className="btn-chat border-0 bg-transparent" style={{ cursor: 'pointer' }}>
                    <i className="icon feather icon-send"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>    
        </div>
      </footer>
    </div>
  );
};

export default Chat;
