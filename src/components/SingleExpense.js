import React, { useState } from 'react';
import axios from 'axios';

function SingleExpense() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setMessage('Processing your bill...');

    const formData = new FormData();
    formData.append('billImage', selectedFile);
    const token = localStorage.getItem('authToken');

    try {
      const response = await axios.post('http://localhost:3001/api/expenses/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      setMessage(`Success! Added expense from ${response.data.vendor} for $${response.data.total_amount}.`);
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. The bill may not be readable. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="view-container">
      <h2>Upload a Personal Expense Bill</h2>
      <p>Upload an image of a bill, and we'll automatically add it to your dashboard.</p>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload} disabled={!selectedFile || isLoading}>
        {isLoading ? 'Processing...' : 'Upload & Process Bill'}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default SingleExpense;