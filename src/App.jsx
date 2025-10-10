import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import './App.css'; // We will create this file for basic styling

function App() {
  const [token, setToken] = useState(null);

  // On initial load, check if a token exists in localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Callback for when login is successful
  const handleLogin = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  // Callback for logging out
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  return (
    <div className="app-root">
      {/* If there is no token, show the login page. Otherwise, show the main app. */}
      {!token ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <MainApp onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;