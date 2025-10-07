import React, { useState } from 'react';
import SingleExpense from './components/SingleExpense';
import Dashboard from './components/Dashboard';
import GroupExpense from './components/GroupExpense';
import './App.css'; // We will create this for basic styling

function App() {
  // State to manage which component is currently visible
  const [activeView, setActiveView] = useState('single');

  const renderView = () => {
    switch (activeView) {
      case 'single':
        return <SingleExpense />;
      case 'dashboard':
        return <Dashboard />;
      case 'group':
        return <GroupExpense />;
      default:
        return <SingleExpense />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <nav>
          {/* Buttons to switch between views */}
          <button onClick={() => setActiveView('single')} className={activeView === 'single' ? 'active' : ''}>
            Single Expense
          </button>
          <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'active' : ''}>
            Dashboard
          </button>
          <button onClick={() => setActiveView('group')} className={activeView === 'group' ? 'active' : ''}>
            Group Expense
          </button>
        </nav>
      </header>
      <main className="app-main">
        {/* Render the component based on the activeView state */}
        {renderView()}
      </main>
    </div>
  );
}

export default App;