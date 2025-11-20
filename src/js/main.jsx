import '../styles/tailwind.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import HelloWorld from './components/HelloWorld.jsx';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<HelloWorld />);
} else {
  console.error('React root container #root not found');
}
