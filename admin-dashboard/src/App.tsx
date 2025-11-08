import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import Content from './pages/Content';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/:tenantSlug/dashboard" element={<Dashboard />} />
      <Route path="/:tenantSlug/animals" element={<Animals />} />
      <Route path="/:tenantSlug/content" element={<Content />} />
      <Route path="/:tenantSlug/settings" element={<Settings />} />
      <Route path="/" element={<Navigate to="/mbpr/dashboard" replace />} />
    </Routes>
  );
}

export default App;
