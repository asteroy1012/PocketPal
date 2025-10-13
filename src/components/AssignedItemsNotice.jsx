import React, { useState } from 'react';
import axios from 'axios';

function AssignedItemsNotice({ notice }) {
    const [message, setMessage] = useState('');
    const [isAdded, setIsAdded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAddToDashboard = async () => {
        setMessage('');
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            
            const payload = {
                items: notice.items,
                vendor: `${notice.fromUser}'s Group Bill`,
                category: 'Group Expense'
            };

            await axios.post('http://localhost:3001/api/expenses/add-bulk', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage('Success! Added to your dashboard.');
            setIsAdded(true);
        } catch (error) {
            console.error("Failed to add expenses:", error);
            setMessage('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const total = notice.items.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="bg-white border border-blue-200 rounded-lg shadow-md p-4 my-2 max-w-md mx-auto">
            <div className="flex items-center mb-3">
                {/* Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-800">{notice.fromUser}</span> assigned you the following items:
                </p>
            </div>
            
            <ul className="divide-y divide-gray-200">
                {notice.items.map((item, index) => (
                    <li key={index} className="flex justify-between items-center py-2">
                        <span className="text-gray-700">{item.item}</span>
                        <span className="font-medium text-gray-900">${item.price.toFixed(2)}</span>
                    </li>
                ))}
            </ul>

            <div className="border-t mt-3 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-800">Your Total:</span>
                <span className="font-bold text-lg text-blue-600">${total.toFixed(2)}</span>
            </div>

            {message && <p className={`text-sm mt-3 text-center ${isAdded ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            
            <button
                className="w-full mt-4 px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleAddToDashboard}
                disabled={isAdded || isLoading}
            >
                {isLoading ? (
                    'Adding...'
                ) : isAdded ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Added to Dashboard!
                    </>
                ) : (
                    'Add to My Dashboard'
                )}
            </button>
        </div>
    );
}

export default AssignedItemsNotice;