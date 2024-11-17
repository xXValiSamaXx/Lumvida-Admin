import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Map, LayoutDashboard } from "lucide-react";

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: 'Panel Administrativo',
      path: '/',
    },
    {
      icon: <Map className="h-4 w-4" />,
      label: 'Mapa de Incidencias',
      path: '/map',
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen w-full flex">
      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <nav className="flex flex-col gap-4 p-4 mt-16">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`flex items-center gap-2 p-2 rounded-md w-full text-left
                ${location.pathname === item.path 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'hover:bg-gray-100'
                }`}
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 border-r bg-white shadow-sm">
        <nav className="flex flex-col gap-4 p-4 w-full">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`flex items-center gap-2 p-2 rounded-md w-full text-left
                ${location.pathname === item.path 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'hover:bg-gray-100'
                }`}
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="lg:p-0">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;