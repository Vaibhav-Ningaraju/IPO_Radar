import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import IPOPage from './pages/IPOPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/ipo/:id" element={<IPOPage />} />
    </Routes>
  );
}