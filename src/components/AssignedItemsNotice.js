import React, { useState } from 'react';
import axios from 'axios';

function AssignedItemsNotice({ notice }) {
    const [message, setMessage] = useState('');
    const [isAdded, setIsAdded] = useState(false);

    const handleAddToDashboard = async () => {
        setMessage('');
        try {
            const token = localStorage.getItem('authToken');
            
            // This payload now matches what the '/add-bulk' endpoint expects
            const payload = {
                items: notice.items,
                vendor: `${notice.fromUser}'s Group Bill`,
                category: 'Group Expense' // A default category for group splits
            };

            // --- THIS IS THE FIX ---
            // The URL now correctly points to your running backend server on port 3001.
            await axios.post('http://localhost:3001/api/expenses/add-bulk', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage('Success! Added to your dashboard.');
            setIsAdded(true); // Disable the button after a successful addition
        } catch (error) {
            console.error("Failed to add expenses:", error);
            setMessage('An error occurred. Please try again.');
        }
    };

    return (
        <div className="assignment-notice-container">
            <div className="split-header">
                <strong>{notice.fromUser}</strong> assigned you the following items:
            </div>
            <ul className="split-item-list">
                {notice.items.map((item, index) => (
                    <li key={index} className="split-item">
                        <span>{item.item}</span>
                        <span>${item.price.toFixed(2)}</span>
                    </li>
                ))}
            </ul>
            {message && <p className="success-message">{message}</p>}
            <button
                className="add-to-dashboard-btn"
                onClick={handleAddToDashboard}
                disabled={isAdded}
            >
                {isAdded ? 'Added to Dashboard!' : 'Add to My Dashboard'}
            </button>
        </div>
    );
}

export default AssignedItemsNotice;