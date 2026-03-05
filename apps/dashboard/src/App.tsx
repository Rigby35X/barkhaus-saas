import { Routes, Route, Navigate } from 'react-router-dom';
import Animals from './pages/Animals';
import Content from './pages/Content';
import Settings from './pages/Settings';
import Communications from './pages/Communications';

function App() {
  return (
    <Routes>
      <Route path="/:tenantSlug/animals" element={<Animals />} />
      <Route path="/:tenantSlug/content" element={<Content />} />
      <Route path="/:tenantSlug/communications" element={<Communications />} />
      <Route path="/:tenantSlug/settings" element={<Settings />} />
      <Route path="/" element={<Navigate to="/mbpr/animals" replace />} />
    </Routes>
  );
}

export default App;
