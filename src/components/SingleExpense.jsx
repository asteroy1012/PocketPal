import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SingleExpense() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Effect to create a preview URL when a file is selected
  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl('');
    }
  }, [selectedFile]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
    setIsError(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setMessage('Processing your bill...');
    setIsError(false);

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
      setSelectedFile(null); // Clear the file after successful upload
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. The bill may not be readable. Please try again.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">Add a Personal Expense</h2>
          <p className="text-gray-500 mt-2">Upload an image of a bill, and we'll automatically scan and add it to your dashboard.</p>
        </div>

        {/* File Upload Area */}
        <div className="mt-8">
          <label 
            htmlFor="file-upload" 
            className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Bill preview" className="object-contain h-full w-full rounded-lg" />
            ) : (
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m3-3H7" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
          </label>
        </div>

        {/* Message Area */}
        {message && (
          <div className={`mt-4 text-center p-3 rounded-md text-sm font-medium ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Upload & Process Bill'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SingleExpense;