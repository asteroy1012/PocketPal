import React, { useState } from 'react';
import axios from 'axios';
import Lottie from 'lottie-react'; // Import the Lottie player
import SignIn from '../SignIn.json'; 

// --- Password Visibility Icons ---
const EyeOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.05 10.05 0 013.543-5.175M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 2l20 20" />
  </svg>
);


function LoginPage({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    
    const endpoint = isLoginView ? 'login' : 'register';
    const payload = isLoginView ? { email, password } : { username, email, password };
    const API_URL = 'http://localhost:3001/api/auth';

    try {
      const response = await axios.post(`${API_URL}/${endpoint}`, payload);
      if (endpoint === 'register') {
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true);
      } else {
        onLogin(response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    // The main container now conditionally applies the cozy cursor style
    <div className={`min-h-screen bg-gray-100 flex items-center justify-center p-4 ${isLoginView ? 'cozy-cursor' : ''}`}>
        {/* Style block defining the custom cursors */}
        <style>
            {`
                /* The cozy pointer for the login view */
                .cozy-cursor { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="rgba(0,0,0,0.8)" d="M2,2 L26,16 L2,30 Z"/></svg>'), auto; }
                
                /* The larger I-beam text cursor for input fields */
                .big-text-cursor { cursor: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2032%2032%22%3E%3Cpath%20stroke%3D%22rgba(0%2C0%2C0%2C0.8)%22%20stroke-width%3D%223%22%20d%3D%22M16%2C4%20V28%20M10%2C4%20H22%20M10%2C28%20H22%22%2F%3E%3C%2Fsvg%3E'), text; }
            `}
        </style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl w-full">
        
        {/* Left Card: Lottie Animation */}
        <div className="bg-emerald-300 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center">
            <Lottie animationData={SignIn} loop={true} className="w-full max-w-xs" />
            <h1 className="text-4xl font-bold mt-8 text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.2)'}}>PocketPal</h1>
            <p className="mt-2 text-emerald-100 font-medium">Your smart, simple expense tracker.</p>
        </div>

        {/* Right Card: Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            {isLoginView ? 'Welcome Back!' : 'Create Your Account'}
          </h2>
          <p className="text-gray-500 mb-8">{isLoginView ? 'Sign in to continue' : 'Get started in seconds'}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginView && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 big-text-cursor"
                    />
              </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 big-text-cursor"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 big-text-cursor"
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                    >
                        {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
              {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {error && <p className="mt-4 text-center text-red-500">{error}</p>}
          {message && <p className="mt-4 text-center text-green-500">{message}</p>}

          <p className="mt-8 text-center text-sm text-gray-600">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-blue-600 hover:text-blue-500">
              {isLoginView ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;