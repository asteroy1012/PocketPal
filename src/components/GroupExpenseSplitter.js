// src/components/GroupExpenseSplitter.js

import React, { useState, useEffect } from 'react';

/**
 * Component to split a bill among group members.
 * @param {Object[]} billItems - Array of items from the bill. Each object should have 'item' and 'price'.
 * @param {Object[]} groupMembers - Array of group members. Each object should have 'id' and 'name'.
 * @param {Function} onFinalizeSplit - A callback function that is called with the calculated totals for each member.
 */
function GroupExpenseSplitter({ billItems, groupMembers, onFinalizeSplit }) {
  // State to track which user is assigned to each item's index
  const [assignedItems, setAssignedItems] = useState({}); // e.g., { 0: 'userId1', 1: 'userId2' }

  // Reset state if the bill items change
  useEffect(() => {
    const initialAssignments = {};
    billItems.forEach((_, index) => {
      initialAssignments[index] = null; // null means unassigned
    });
    setAssignedItems(initialAssignments);
  }, [billItems]);

  const handleAssignmentChange = (itemIndex, userId) => {
    setAssignedItems(prev => ({
      ...prev,
      [itemIndex]: userId,
    }));
  };

  const calculateTotals = () => {
    const totals = {};
    // Initialize totals for all members to 0
    groupMembers.forEach(member => {
      totals[member.id] = 0;
    });

    // Add up the prices of assigned items for each member
    billItems.forEach((item, index) => {
      const assignedToUserId = assignedItems[index];
      if (assignedToUserId && totals[assignedToUserId] !== undefined) {
        totals[assignedToUserId] += item.price;
      }
    });

    return totals;
  };

  const handleFinalize = () => {
    const finalTotals = calculateTotals();
    console.log("Final Split:", finalTotals);
    // This is where you would send the data back to your main app component
    onFinalizeSplit(finalTotals);
    alert("Split has been finalized! Check the console for the totals.");
  };

  if (!billItems || billItems.length === 0) {
    return <p>No items detected on the bill to split.</p>;
  }

  const finalTotals = calculateTotals();

  return (
    <div style={{ marginTop: '20px', border: '1px solid grey', padding: '15px' }}>
      <h2>Split Group Bill</h2>
      <div>
        {billItems.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>{item.item} - ${item.price.toFixed(2)}</span>
            <select
              value={assignedItems[index] || ''}
              onChange={(e) => handleAssignmentChange(index, e.target.value || null)}
            >
              <option value="">-- Assign to --</option>
              {groupMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <hr />

      <h3>Summary</h3>
      {Object.entries(finalTotals).map(([userId, total]) => {
        const member = groupMembers.find(m => m.id === userId);
        return (
          <p key={userId}>
            <strong>{member ? member.name : `User ${userId}`} owes:</strong> ${total.toFixed(2)}
          </p>
        );
      })}

      <button onClick={handleFinalize} style={{ marginTop: '15px' }}>
        Finalize Split & Add to Personal Expenses
      </button>
    </div>
  );
}

export default GroupExpenseSplitter;