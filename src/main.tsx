import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { initSettingsSync } from './store/useStore';
import './styles/tokens.css';
import './styles/components.css';

// Apply saved theme before first render to avoid flash
const savedPrefs = localStorage.getItem('seedwatch-prefs');
if (savedPrefs) {
  try {
    const { state } = JSON.parse(savedPrefs);
    if (state?.theme === 'dark' || state?.theme === 'light') {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
  } catch { /* ignore */ }
}

// Sync settings from Transmission's settings.json (non-blocking)
initSettingsSync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
