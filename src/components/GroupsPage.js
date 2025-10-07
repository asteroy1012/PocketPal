import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GroupDetail from './GroupDetail'; // Import the new component

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:3001/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    const name = prompt("Enter the name for your new group:");
    if (name) {
      const token = localStorage.getItem('authToken');
      try {
        await axios.post('http://localhost:3001/api/groups/create', { name }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchGroups(); // Refresh the list after creating a new group
      } catch (error) {
        alert("Failed to create group.");
      }
    }
  };

  // If a group is selected, render the GroupDetail component for it
  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  // Otherwise, show the list of groups
  return (
    <div className="view-container">
      <h2>Your Groups</h2>
      <div className="groups-actions">
        <button onClick={handleCreateGroup}>Create New Group</button>
      </div>
      {isLoading ? (
        <p>Loading groups...</p>
      ) : (
        <ul className="groups-list">
          {groups.length > 0 ? (
            groups.map(group => (
              <li key={group.id} onClick={() => setSelectedGroup(group)}>
                {group.name}
              </li>
            ))
          ) : (
            <p>You have no groups yet. Create one to get started!</p>
          )}
        </ul>
      )}
    </div>
  );
}

export default GroupsPage;