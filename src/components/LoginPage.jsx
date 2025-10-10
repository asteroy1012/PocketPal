import React, { useState } from 'react';
import axios from 'axios';

// The URL of your backend's authentication endpoints
const API_URL = 'http://localhost:3001/api/auth';

function LoginPage({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const endpoint = isLoginView ? 'login' : 'register';
    const payload = isLoginView ? { email, password } : { username, email, password };

    try {
      const response = await axios.post(`${API_URL}/${endpoint}`, payload);
      // If registering, show a success message and switch to login view
      if (endpoint === 'register') {
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true);
      } else {
        // If logging in, call the onLogin prop with the new token
        onLogin(response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    }
  };

  return (
    <div className="login-container">
      <h2>{isLoginView ? 'Login' : 'Create Account'}</h2>
      <form onSubmit={handleSubmit}>
        {!isLoginView && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLoginView ? 'Login' : 'Register'}</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <button onClick={() => setIsLoginView(!isLoginView)} className="toggle-auth">
        {isLoginView ? 'Need an account? Register' : 'Have an account? Login'}
      </button>
    </div>
  );
}

export default LoginPage;