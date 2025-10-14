import React, { useState } from 'react';
import Dashboard from './Dashboard';
import SingleExpense from './SingleExpense';
import GroupsPage from './GroupsPage';
import Lottie from 'react-lottie';
import Wallet from '../Wallet.json';

// --- CHANGE 1: Accept the 'user' prop ---
function MainApp({ user, onLogout }) {
  // State to manage which view is currently active
  const [activeView, setActiveView] = useState('dashboard');

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: Wallet,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  // --- CHANGE 2: Pass the 'user' prop down to child components ---
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'single_expense':
        return <SingleExpense user={user} />;
      case 'groups':
        return <GroupsPage user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="p-3 flex flex-col gap-5">
      <header className="flex flex-row items-center outline-2 outline-white p-2 rounded-xl bg-white h-[6rem]">
        <div className='basis-1/3 flex flex-row'>
          <div className='basis-1/2 font-bold text-5xl flex justify-center items-center'>PocketPal</div>
          <div className='basis-1/2 flex justify-center items-center'><Lottie options={defaultOptions} height={75} width={75} /></div>
        </div>
        
        <div className='basis-1/3 flex flex-row gap-4 justify-center items-center p-2'>
          <button className='basis-1/3 h-[3rem] rounded-xl outline-offset-2 outline-sky-500 focus:outline-2' onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button className='basis-1/3 h-[3rem] rounded-xl outline-offset-2 outline-sky-500 focus:outline-2' onClick={() => setActiveView('single_expense')}>Add Expense</button>
          <button className='basis-1/3 h-[3rem] rounded-xl outline-offset-2 outline-sky-500 focus:outline-2' onClick={() => setActiveView('groups')}>Groups</button>
        </div>

        <div className='basis-1/3 p-2 flex justify-end items-center'>
          <button onClick={onLogout} className="h-[3rem] w-[5rem] rounded-xl">Logout</button>
        </div>
        
      </header>
      <main className="app-main">
        {renderView()}
      </main>
    </div>
  );
}

export default MainApp;