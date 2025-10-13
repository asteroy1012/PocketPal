import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatWindow from './ChatWindow';

function GroupDetail({ group, onBack }) {
  const [members, setMembers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const token = localStorage.getItem('authToken');

  // Function to fetch the current members of the group
  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data);
    } catch (error) {
      console.error("Failed to fetch members", error);
    }
    setIsLoadingMembers(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [group.id]);

  // Function to handle searching for users
  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) { // Only search if term is 3+ characters
      try {
        const response = await axios.post('http://localhost:3001/api/users/search', { searchTerm: term }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search failed', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Function to add a user to the group
  const handleAddMember = async (userIdToAdd) => {
    setMessage('');
    try {
      await axios.post(`http://localhost:3001/api/groups/${group.id}/members`, { userIdToAdd }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('User added successfully!');
      // Reset search and refresh member list
      setSearchTerm('');
      setSearchResults([]);
      fetchMembers();
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add user.';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // If showChat is true, render the chat window
  if (showChat) {
    return <ChatWindow group={group} onBack={() => setShowChat(false)} />;
  }

  // Otherwise, show the group detail view
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-3xl font-bold text-gray-800">{group.name}</h2>
        </div>
        <button
          onClick={() => setShowChat(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
        >
          Enter Chat
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>

      {message && <p className="text-center mb-4 text-sm font-medium text-green-600">{message}</p>}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Members List Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Group Members ({members.length})</h3>
          {isLoadingMembers ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <ul className="space-y-3">
              {members.map(member => (
                <li key={member.id} className="flex items-center gap-3">
                  <div className="bg-gray-200 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{member.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Member Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Add New Member</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 transform -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {searchResults.map(user => (
              <li key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                <span className="text-gray-700">{user.username}</span>
                <button 
                  onClick={() => handleAddMember(user.id)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full hover:bg-blue-200 transition"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GroupDetail;