import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GroupDetail from './GroupDetail';

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
        fetchGroups();
      } catch (error) {
        alert("Failed to create group.");
      }
    }
  };

  // If a group is selected, render the GroupDetail component for it
  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  // Otherwise, show the list of groups with new styling
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800">Your Groups</h2>
        <button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Group
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 mt-10">Loading groups...</p>
      ) : (
        groups.length > 0 ? (
          // Responsive Grid for Group Cards
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer transition-transform duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 truncate">{group.name}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Styled Empty State Message
          <div className="text-center bg-white p-10 rounded-lg shadow-sm mt-10">
            <h3 className="text-xl font-semibold text-gray-700">No groups found</h3>
            <p className="text-gray-500 mt-2">You haven't joined or created any groups yet. Get started by creating one!</p>
          </div>
        )
      )}
    </div>
  );
}

export default GroupsPage;