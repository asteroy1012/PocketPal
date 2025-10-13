// src/components/LoadingModal.jsx
import React from 'react';
import Lottie from 'react-lottie';
import loading from '../loading.json';

function LoadingModal({ isVisible, progress }) {
  // If not visible, render nothing
  if (!isVisible) {
    return null;
  }

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loading,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  return (
    // Full-screen overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      {/* Modal content box */}
      <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center w-80">
        <Lottie options={defaultOptions} height={150} width={150} />
        <p className="text-lg font-semibold mt-4">Processing your bill...</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }} // Dynamic width based on progress
          ></div>
        </div>
        
        {/* Progress Text */}
        <p className="text-md text-gray-600 mt-2">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

export default LoadingModal;