import React, { useState } from 'react';
import axios from 'axios';

function SingleExpense() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage(''); // Clear previous messages
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setMessage('Uploading and processing...');

    // FormData is required for sending files
    const formData = new FormData();
    formData.append('billImage', selectedFile);

    try {
      // Make sure your backend is running on port 3001
      const response = await axios.post('http://localhost:3001/api/upload-bill', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(`Success! Expense for ${response.data.vendor} added.`);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Upload failed. Please check the console for details.');
    } finally {
      setIsLoading(false);
      setSelectedFile(null); // Clear the file input after upload
    }
  };

  return (
    <div className="view-container">
      <h2>Upload a Single Expense</h2>
      <p>Select an image of a bill or receipt.</p>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Upload Expense'}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default SingleExpense;