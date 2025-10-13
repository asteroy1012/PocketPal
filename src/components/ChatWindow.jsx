import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AssignedItemsNotice from './AssignedItemsNotice';

// --- Styled Bill Assignment Modal with Animation ---
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
        // MODIFIED: Added explicit animation classes for a smoother entry.
        // The backdrop-blur will create a "frosted glass" effect over the content behind it.
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn">
            {/* Modal Content Box: Added entrance animation */}
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all ring-1 ring-black ring-opacity-5 animate-scaleIn">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Assign Bill Items</h3>
                <p className="text-sm text-gray-500 mb-4">Assign each item from the bill to a group member.</p>
                
                {/* Scrollable list for assignments */}
                <ul className="max-h-[50vh] overflow-y-auto my-4 bg-gray-50 p-2 rounded-md border">
                    {items.map((item, index) => (
                        <li key={index} className="flex justify-between items-center py-3 px-2 hover:bg-gray-100 rounded-md">
                            <span className="text-gray-800">{item.item} - ${item.price.toFixed(2)}</span>
                            <select
                                value={assignments[index] || ''}
                                onChange={(e) => handleAssignmentChange(index, e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
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

                {/* Modal Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={onCancel} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition disabled:bg-gray-400"
                    >
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
    const [currentUser, setCurrentUser] = useState(null);
    const [userColors, setUserColors] = useState({});
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const colorIndex = useRef(0);
    const COLORS = ['bg-pink-100', 'bg-yellow-100', 'bg-green-100', 'bg-purple-100', 'bg-indigo-100'];

    // This useEffect hook handles the WebSocket connection and user setup.
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(decodedToken);

        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);
        
        newSocket.emit('joinRoom', { groupId: group.id, userId: decodedToken.id });

        newSocket.on('message', (message) => {
            setUserColors(prevColors => {
                if (!prevColors[message.user]) {
                    const newColor = COLORS[colorIndex.current % COLORS.length];
                    colorIndex.current++;
                    return { ...prevColors, [message.user]: newColor };
                }
                return prevColors;
            });
            setMessages(prev => [...prev, message]);
        });

        return () => newSocket.disconnect();
    }, [group.id]);
    
    // This useEffect hook handles auto-scrolling.
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            const billRes = await axios.post('http://localhost:3001/api/groups/split-bill', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setModalState({ isOpen: true, items: billRes.data.items, isLoading: false });
        } catch (error) {
            alert('Failed to parse bill. Please try another image.');
            setModalState({ isOpen: false, items: [], isLoading: false });
        }
    };
    
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

            socket.emit('sendAssignments', {
                groupId: group.id,
                assignments: assignmentsByUser,
                username: decodedToken.username
            });
        }
        setModalState({ isOpen: false, items: [], isLoading: false });
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && socket) {
          const token = localStorage.getItem('authToken');
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          socket.emit('sendMessage', { groupId: group.id, message: newMessage, username: decodedToken.username });
          setNewMessage('');
        }
    };

    const handleGroupSplitClick = () => {
        fileInputRef.current.click();
    };

    const renderMessage = (msg) => {
        if (!currentUser) return null;

        const isMyMessage = msg.user === currentUser.username;
        const colorClass = isMyMessage ? 'bg-blue-200' : (userColors[msg.user] || 'bg-gray-200');

        switch (msg.type) {
            case 'assignmentNotice':
                return <AssignedItemsNotice notice={msg} />;
            case 'text':
            default:
                return (
                    <div className={`flex w-full ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xs md:max-w-md">
                            {!isMyMessage && <p className="text-xs text-gray-500 ml-2">{msg.user}</p>}
                            <div className={`px-4 py-2 rounded-2xl ${colorClass}`}>
                                <span className="text-gray-800">{msg.text}</span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="chat-container flex flex-col h-[85vh] bg-white border rounded-lg shadow-md">
            {modalState.isOpen &&
                <BillAssignmentModal
                    items={modalState.items}
                    groupMembers={groupMembers}
                    isLoading={modalState.isLoading}
                    onConfirm={handleConfirmAssignments}
                    onCancel={() => setModalState({ isOpen: false, items: [], isLoading: false })}
                />
            }
            <div className="chat-header flex items-center p-4 border-b">
                <button onClick={onBack} className="text-blue-600 hover:underline mr-4">&larr; Back</button>
                <h2 className="text-xl font-bold text-gray-800">{group.name}</h2>
            </div>

            <div className="chat-messages flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
                {messages.map((msg, index) => (
                    <div key={`${msg.id}-${index}`}>{renderMessage(msg)}</div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* --- UPDATED & RESTYLED Chat Input Area --- */}
            <div className="chat-input-area flex items-center gap-2 p-4 border-t bg-gray-100">
                <button 
                    onClick={handleGroupSplitClick}
                    className="p-2 text-gray-500 rounded-full hover:bg-gray-200 transition"
                    title="Split a Bill"
                >
                    {/* SVG Icon for attaching a file */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <input
                    type="text"
                    value={newMessage}
                    // BUG FIX: Corrected e.e.target.value to e.target.value
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 px-4"
                />
                <button 
                    onClick={handleSendMessage}
                    className="p-2 text-blue-600 rounded-full hover:bg-blue-100 transition"
                    title="Send Message"
                >
                    {/* SVG Icon for sending a message */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
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