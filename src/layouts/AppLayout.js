import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LayoutDashboard, Map } from 'lucide-react';
import { NotificationSystem } from '../components/NotificationSystem';

const AppLayout = () => {
  return (
    <div className="flex h-screen">
      {/* Panel Lateral */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">LumVida Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            to="/"
            className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Panel Administrativo</span>
          </Link>
          <Link 
            to="/mapa"
            className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <Map className="h-5 w-5" />
            <span>Mapa de Incidencias</span>
          </Link>
        </nav>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;