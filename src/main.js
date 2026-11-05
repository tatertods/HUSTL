import './styles.css';
import { createRoot } from 'react-dom/client';
import { h } from './lib/base.js';
import { App } from './App.js';

createRoot(document.getElementById('root')).render(h(App));
