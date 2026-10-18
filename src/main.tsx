import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './swRegistration.ts';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for offline PWA functionality
registerServiceWorker();

