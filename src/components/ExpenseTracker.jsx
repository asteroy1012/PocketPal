// src/components/ExpenseTracker.js

import React from 'react';

/**
 * A simple component to display a list of expenses.
 * @param {Object[]} expenses - An array of expense objects to display.
 * Each object should have vendor, category, and totalAmount.
 */
function ExpenseTracker({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return <p>No expenses recorded yet. Upload a bill to get started!</p>;
  }

  return (
    <div>
      <h2>My Expenses</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Vendor</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Category</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid black', padding: '8px' }}>{expense.vendor || 'N/A'}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{expense.category || 'Uncategorized'}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>${expense.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExpenseTracker;