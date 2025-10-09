import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AssignedItemsNotice from './AssignedItemsNotice';

// The BillAssignmentModal component does not need any changes.
const BillAssignmentModal = ({ items, groupMembers, onConfirm, onCancel, isLoading }) => {
    const [assignments, setAssignments] = useState({});

    const handleAssignmentChange = (itemIndex, userId) => {
        setAssignments(prev => ({
            ...prev,
            [itemIndex]: userId,
        }));
    };

    const handleSubmit = () => {
        if (Object.keys(assignments).length !== items.length) {
            alert("Please assign all items before submitting.");
            return;
        }
        onConfirm(assignments);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content large">
                <h3>Assign Bill Items to Group Members</h3>
                <ul className="assignment-list">
                    {items.map((item, index) => (
                        <li key={index} className="assignment-item">
                            <span>{item.item} - ${item.price.toFixed(2)}</span>
                            <select
                                value={assignments[index] || ''}
                                onChange={(e) => handleAssignmentChange(index, e.target.value)}
                            >
                                <option value="" disabled>Assign to...</option>
                                {groupMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.username}
                                    </option>
                                ))}
                            </select>
                        </li>
                    ))}
                </ul>
                <div className="modal-actions">
                    <button onClick={onCancel} disabled={isLoading}>Cancel</button>
                    <button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Sending..." : "Submit Assignments"}
                    </button>
                </div>
            </div>
        </div>
    );
};


function ChatWindow({ group, onBack }) {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false, items: [], isLoading: false });
    const [groupMembers, setGroupMembers] = useState([]);
    // REMOVED: No longer need to track socketsInRoom on the frontend.
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    // This useEffect hook handles the WebSocket connection.
    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);
        
        const token = localStorage.getItem('authToken');
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = decodedToken.id;

        // MODIFIED: We no longer listen for 'updateUserList' as the server handles this now.
        newSocket.emit('joinRoom', { groupId: group.id, userId: currentUserId });

        newSocket.on('message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => newSocket.disconnect();
    }, [group.id]);
    
    // This useEffect hook handles auto-scrolling to the latest message.
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // This function opens the assignment modal after fetching necessary data.
    const openAssignmentModal = async (file) => {
        if (!file) return;
        setModalState({ ...modalState, isLoading: true });
        
        try {
            const token = localStorage.getItem('authToken');
            const membersRes = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroupMembers(membersRes.data);

            const formData = new FormData();
            formData.append('billImage', file);
            // This endpoint is for parsing the bill, not saving expenses.
            const billRes = await axios.post('http://localhost:3001/api/groups/split-bill', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setModalState({ isOpen: true, items: billRes.data.items, isLoading: false });
        } catch (error) {
            alert('Failed to parse bill. Please try another image.');
            setModalState({ isOpen: false, items: [], isLoading: false });
        }
    };
    
    // This function handles submitting the assignments to the backend via WebSocket.
    const handleConfirmAssignments = (assignmentsFromModal) => {
        if (socket) {
            const token = localStorage.getItem('authToken');
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            
            const assignmentsByUser = {};
            for (const itemIndex in assignmentsFromModal) {
                const userId = assignmentsFromModal[itemIndex];
                const item = modalState.items[itemIndex];
                if (!assignmentsByUser[userId]) {
                    assignmentsByUser[userId] = [];
                }
                assignmentsByUser[userId].push(item);
            }

            // MODIFIED: We no longer send socketsInRoom because the backend tracks this reliably.
            socket.emit('sendAssignments', {
                groupId: group.id,
                assignments: assignmentsByUser,
                username: decodedToken.username
            });
        }
        setModalState({ isOpen: false, items: [], isLoading: false });
    };

    // This function handles sending a normal text message.
    const handleSendMessage = () => {
        if (newMessage.trim() && socket) {
          const token = localStorage.getItem('authToken');
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          socket.emit('sendMessage', { groupId: group.id, message: newMessage, username: decodedToken.username });
          
          // REMOVED: Do not add the message locally. Let the server broadcast it back.
          // This prevents the sender from seeing duplicate messages.
          
          setNewMessage('');
        }
    };

    // This function triggers the hidden file input.
    const handleGroupSplitClick = () => {
        fileInputRef.current.click();
    };

    // This function conditionally renders different types of messages.
    const renderMessage = (msg) => {
        switch (msg.type) {
            case 'assignmentNotice':
                return <AssignedItemsNotice notice={msg} />;
            case 'text':
            default:
                return (
                    <div className="message">
                        <strong>{msg.user}: </strong>
                        <span>{msg.text}</span>
                    </div>
                );
        }
    };

    // --- JSX (Main Component Render) ---
    return (
        <div className="chat-container">
            {modalState.isOpen &&
                <BillAssignmentModal
                    items={modalState.items}
                    groupMembers={groupMembers}
                    isLoading={modalState.isLoading}
                    onConfirm={handleConfirmAssignments}
                    onCancel={() => setModalState({ isOpen: false, items: [], isLoading: false })}
                />
            }
            <div className="chat-header">
                <button onClick={onBack}>&larr; Back to Group Details</button>
                <h2>{group.name}</h2>
            </div>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={`${msg.id}-${index}`}>{renderMessage(msg)}</div>
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
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => openAssignmentModal(e.target.files[0])}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
            </div>
        </div>
    );
}

export default ChatWindow;