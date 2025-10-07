import React, { useState } from 'react';
import Dashboard from './Dashboard';
import SingleExpense from './SingleExpense';
import GroupsPage from './GroupsPage';

function MainApp({ onLogout }) {
  // State to manage which view is currently active
  const [activeView, setActiveView] = useState('dashboard');

  // Function to render the correct component based on the active view
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'single_expense':
        return <SingleExpense />;
      case 'groups':
        return <GroupsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <nav>
          <button onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button onClick={() => setActiveView('single_expense')}>Add Expense</button>
          <button onClick={() => setActiveView('groups')}>Groups</button>
        </nav>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      <main className="app-main">
        {renderView()}
      </main>
    </div>
  );
}

export default MainApp;