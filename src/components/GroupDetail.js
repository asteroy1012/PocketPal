import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatWindow from './ChatWindow'; // We'll launch the chat from here

function GroupDetail({ group, onBack }) {
  const [members, setMembers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('authToken');

  // Function to fetch the current members of the group
  const fetchMembers = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data);
    } catch (error) {
      console.error("Failed to fetch members", error);
    }
  };

  // Fetch members when the component loads
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
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add user.');
    }
  };

  // If showChat is true, render the chat window
  if (showChat) {
    return <ChatWindow group={group} onBack={() => setShowChat(false)} />;
  }

  // Otherwise, show the group detail view
  return (
    <div className="view-container">
      <div className="group-detail-header">
        <button onClick={onBack}>&larr; Back to Groups</button>
        <h2>{group.name}</h2>
        <button className="enter-chat-button" onClick={() => setShowChat(true)}>Enter Chat</button>
      </div>

      {message && <p className="message">{message}</p>}

      <div className="group-detail-content">
        <div className="members-list">
          <h3>Current Members</h3>
          <ul>
            {members.map(member => <li key={member.id}>{member.username}</li>)}
          </ul>
        </div>

        <div className="add-member-section">
          <h3>Add New Members</h3>
          <input
            type="text"
            placeholder="Search for users by username..."
            value={searchTerm}
            onChange={handleSearch}
          />
          <ul className="search-results-list">
            {searchResults.map(user => (
              <li key={user.id}>
                <span>{user.username}</span>
                <button onClick={() => handleAddMember(user.id)}>Add</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GroupDetail;