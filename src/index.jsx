import React from 'react';
import ReactDOM from 'react-dom/client';
import Portfolio from './Portfolio';
import ErrorBoundary from './ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Portfolio />
    </ErrorBoundary>
  </React.StrictMode>
);
