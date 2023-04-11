import React from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const history = useNavigate();

  const handleLogout = () => {
    // Clear access token from local storage
    localStorage.clear();
    // Redirect to home page
    history('/login');
  };

  return (
    <button onClick={handleLogout}>Logout</button>
  );
};

export default Logout;
