import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { UserData } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>('landing');
  const [userData, setUserData] = useState<UserData | null>(null);

  // Load saved user data on app start
  useEffect(() => {
    const savedUserData = localStorage.getItem('giteasy_user_data');
    if (savedUserData) {
      try {
        const parsedData = JSON.parse(savedUserData);
        setUserData(parsedData);
        // Don't automatically redirect to dashboard
        // User needs to explicitly navigate there
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('giteasy_user_data');
      }
    }
  }, []);

  const handleGetStarted = (data: UserData) => {
    setUserData(data);
    setCurrentPage('dashboard');
    // Save user data to localStorage
    localStorage.setItem('giteasy_user_data', JSON.stringify(data));
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
    // Don't clear user data when going back
  };

  const handleLogout = () => {
    setCurrentPage('landing');
    setUserData(null);
    localStorage.removeItem('giteasy_user_data');
  };

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' ? (
        <LandingPage 
          onGetStarted={handleGetStarted} 
          existingUserData={userData}
          hasExistingData={!!userData}
        />
      ) : (
        <Dashboard 
          userData={userData!} 
          onBackToLanding={handleBackToLanding}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;