import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

// A simple modal component for confirming the bill split
const BillSplitModal = ({ items, onConfirm, onCancel, isLoading }) => (
  <div className="modal-backdrop">
    <div className="modal-content">
      <h3>Confirm Bill Items</h3>
      <p>Please confirm these items are correct before sending to the group.</p>
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <span>{item.item}</span>
            <span>${item.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="modal-actions">
        <button onClick={onCancel} disabled={isLoading}>Cancel</button>
        <button onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "Sending..." : "Confirm & Send"}
        </button>
      </div>
    </div>
  </div>
);

function ChatWindow({ group, onBack }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, items: [], isLoading: false });
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Effect to connect to the WebSocket and handle events
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('joinRoom', { groupId: group.id });

    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Disconnect when the component unmounts
    return () => newSocket.disconnect();
  }, [group.id]);
  
  // Effect to auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendMessage = () => {
    if (newMessage.trim() && socket) {
      const username = 'You'; // Ideally get from user context
      socket.emit('sendMessage', { groupId: group.id, message: newMessage, username });
      setMessages(prev => [...prev, { user: username, text: newMessage }]);
      setNewMessage('');
    }
  };

  const handleGroupSplitClick = () => fileInputRef.current.click();

  const handleFileForSplit = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setModalState({ ...modalState, isLoading: true });
    const formData = new FormData();
    formData.append('billImage', file);
    const token = localStorage.getItem('authToken');

    try {
      const res = await axios.post('http://localhost:3001/api/groups/split-bill', formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setModalState({ isOpen: true, items: res.data.items, isLoading: false });
    } catch (error) {
      alert('Failed to parse bill. Please try another image.');
      setModalState({ isOpen: false, items: [], isLoading: false });
    }
  };

  const confirmAndSendSplitRequest = () => {
    if (socket) {
      const username = 'User'; // Get from context
      socket.emit('sendSplitRequest', { groupId: group.id, items: modalState.items, username });
    }
    setModalState({ isOpen: false, items: [], isLoading: false });
  };

  return (
    <div className="chat-container">
      {modalState.isOpen &&
        <BillSplitModal
          items={modalState.items}
          isLoading={modalState.isLoading}
          onConfirm={confirmAndSendSplitRequest}
          onCancel={() => setModalState({ isOpen: false, items: [], isLoading: false })}
        />
      }
      <div className="chat-header">
        <button onClick={onBack}>&larr; Back to Groups</button>
        <h2>{group.name}</h2>
      </div>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          // In a real app, you would have a more complex component here to render
          // different message types (plain text vs. split request with buttons).
          <div key={index} className="message">
            <strong>{msg.user}: </strong>
            {typeof msg.text === 'string' ? msg.text : 'Sent a bill split request.'}
          </div>
        ))}
         <div ref={chatEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>
        <button onClick={handleGroupSplitClick}>Split Bill</button>
        <input type="file" ref={fileInputRef} onChange={handleFileForSplit} style={{ display: 'none' }} accept="image/*" />
      </div>
    </div>
  );
}

export default ChatWindow;