import React, { useState } from 'react';
import Dashboard from './Dashboard';
import SingleExpense from './SingleExpense';
import GroupsPage from './GroupsPage';
import Lottie from 'react-lottie';
import Wallet from '../Wallet.json';

function MainApp({ onLogout }) {
  // State to manage which view is currently active
  const [activeView, setActiveView] = useState('dashboard');

  const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: Wallet, // The animation data goes here
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
};

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
    <div className="p-5 mt-5 flex flex-col gap-5">
      <header className="flex flex-row outline-2 outline-red-100 p-2 rounded-xl bg-white">
        <div className='basis-1/3 flex flex-row'>
        <div className='basis-1/2 font-bold text-5xl flex justify-center items-center  '>PocketPal</div>
        <div className='basis-1/2'><Lottie options={defaultOptions} height={75} width={75}/></div>
        </div>
        
        <nav className='basis-1/3 flex flex-row gap-4'>
          <button className='basis-1/3' onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button className = 'basis-1/3' classNameonClick={() => setActiveView('single_expense')}>Add Expense</button>
          <button className = 'basis-1/3' onClick={() => setActiveView('groups')}>Groups</button>
        </nav>
        <div className='basis-1/3 p-2 flex justify-end'><button onClick={onLogout} className="">Logout</button></div>
        
      </header>
      <main className="app-main">
        {renderView()}
      </main>
    </div>
  );
}

export default MainApp;