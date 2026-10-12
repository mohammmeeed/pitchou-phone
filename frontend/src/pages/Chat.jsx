import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const defaultMessages = [
  { id: 1, text: "Hi Richard, thanks for adding me", time: "08:35", isUser: false },
  { id: 2, text: "Hi Miselia, you're welcome, nice to meet you too", time: "08:40", isUser: true },
  { id: 3, text: "I see you're into music, can you sing for me?", time: "09:44 AM", isUser: false },
  { id: 4, text: "Sure, anytime!", time: "09:45 AM", isUser: true },
  { id: 5, text: "Really! What style do you sing?", time: "10:44 AM", isUser: false },
  { id: 6, text: "Acoustic pop and indie vibes :)", time: "10:45 AM", isUser: true },
];

const Chat = () => {
  const [searchParams] = useSearchParams();
  const { matches } = useDating();
  const contactId = searchParams.get('id');
  const contact = matches.find(m => String(m.id) === contactId) || {
    name: "Miselia, 24",
    image: "/assets/images/user/pic1.jpg",
  };

  const [messages, setMessages] = useState(defaultMessages);
  const [inputText, setInputText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true,
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Optional cute automated reply after 1 sec
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sounds great! Let's definitely talk more about it 😊",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: false,
        }
      ]);
    }, 1000);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header header-fixed bg-white">
        <div className="container">
          <div className="header-content">
            <div className="left-content me-3">
              <Link to="/chat-list" className="back-btn">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
            </div>
            <div className="mid-content d-flex align-items-center text-start">
              <div className="media media-40 rounded-circle me-3">
                <img src={contact.image} alt={contact.name} className="rounded-circle w-100 h-100" style={{ objectFit: 'cover' }} />
              </div>
              <div>
                <h6 className="title mb-0">{contact.name}</h6>
                <span className="font-12 text-muted">Online 24m ago</span>
              </div>	
            </div>
            <div className="right-content d-flex align-items-center gap-2">
              <a role="button" tabIndex={0} className="dz-icon btn btn-primary light" style={{ cursor: 'pointer' }}>
                <i className="fa-solid fa-phone"></i>
              </a>
              <a role="button" tabIndex={0} className="dz-icon me-0 btn btn-primary light" style={{ cursor: 'pointer' }}>
                <i className="fa-solid fa-video"></i>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="page-content space-top p-b60 message-content" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="container"> 
          <div className="chat-box-area"> 
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-content ${msg.isUser ? 'user' : ''}`}>
                <div className="message-item">
                  <div className="bubble">{msg.text}</div>    
                  <div className="message-time">{msg.time}</div>    
                </div>
              </div>
            ))}
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
