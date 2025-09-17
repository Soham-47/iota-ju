import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useVisitedPages } from '../Context/VisitedPagesContext';
import Loader from './Loader';

const PageLoader = ({ children }) => {
  const { visitedPages, addVisitedPage } = useVisitedPages();
  const location = useLocation();
  const [loading, setLoading] = useState(!visitedPages.has(location.pathname));

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        addVisitedPage(location.pathname);
      }, 2000); // Simulate a 2-second loading time
      return () => clearTimeout(timer);
    }
  }, [loading, addVisitedPage, location.pathname]);

  if (loading) {
    return <Loader />;
  }

  return children;
};

export default PageLoader;
