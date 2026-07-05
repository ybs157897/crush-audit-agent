import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { globalStyles } from './styles';

// Inject global styles
const styleEl = document.createElement('style');
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
