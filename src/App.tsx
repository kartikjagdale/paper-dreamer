import { Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { OllamaFallback } from './components/OllamaFallback';
import { useModels } from './hooks/useModels';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { modelsLoading, modelsError, ollamaStatus, retrying, retry } = useModels();

  const showFallback = !modelsLoading && (ollamaStatus === 'unavailable' || ollamaStatus === 'no-models');

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-steel-light">
      <AppHeader />
      {showFallback ? (
        <OllamaFallback
          type={ollamaStatus === 'no-models' ? 'no-models' : 'unavailable'}
          error={modelsError}
          onRetry={retry}
          retrying={retrying}
        />
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      )}
    </div>
  );
}
