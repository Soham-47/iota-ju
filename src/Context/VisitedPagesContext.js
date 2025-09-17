import React, { createContext, useState, useContext } from 'react';

const VisitedPagesContext = createContext();

export const useVisitedPages = () => useContext(VisitedPagesContext);

export const VisitedPagesProvider = ({ children }) => {
  const [visitedPages, setVisitedPages] = useState(new Set());

  const addVisitedPage = (path) => {
    setVisitedPages((prev) => new Set(prev).add(path));
  };

  return (
    <VisitedPagesContext.Provider value={{ visitedPages, addVisitedPage }}>
      {children}
    </VisitedPagesContext.Provider>
  );
};
