import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminPanel from './components/AdminPanel';
import IncidentsMap from './components/IncidentsMap';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Layout>
          <Routes>
            <Route path="/" element={<AdminPanel />} />
            <Route path="/map" element={<IncidentsMap />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;