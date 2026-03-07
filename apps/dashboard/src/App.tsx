import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import Applications from './pages/Applications';
import Content from './pages/Content';
import Communications from './pages/Communications';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/:tenantSlug/dashboard" element={<Dashboard />} />
      <Route path="/:tenantSlug/animals" element={<Animals />} />
      <Route path="/:tenantSlug/applications" element={<Applications />} />
      <Route path="/:tenantSlug/communications" element={<Communications />} />
      <Route path="/:tenantSlug/content" element={<Content />} />
      <Route path="/:tenantSlug/settings" element={<Settings />} />
      <Route path="/:tenantSlug" element={<Navigate to="dashboard" replace />} />
      <Route path="/" element={<Navigate to="/mbpr/dashboard" replace />} />
    </Routes>
  );
}

export default App;
