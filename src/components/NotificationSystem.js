import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Trash2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from '@firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns/format';

export const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha no disponible';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'reportes', notificationId), { read: true });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'reportes', notificationId), { deleted: true });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    const reportsRef = collection(db, 'reportes');
    const q = query(reportsRef, orderBy('fecha', 'desc'), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newReport = change.doc.data();
          if (!newReport.deleted) {
            setNotifications(prev => [{
              id: change.doc.id,
              title: `Nuevo reporte: ${newReport.categoria}`,
              message: `Folio: ${newReport.folio}`,
              time: newReport.fecha,
              read: newReport.read || false
            }, ...prev].slice(0, 5));
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative p-2 rounded-lg hover:bg-gray-100"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Bell className="h-5 w-5" />
        {notifications.some(n => !n.read) && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notificaciones</h3>
            <div className="flex gap-2">
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={async () => {
                  try {
                    for (const notification of notifications) {
                      await updateDoc(doc(db, 'reportes', notification.id), { deleted: true });
                    }
                    setNotifications([]);
                  } catch (error) {
                    console.error('Error deleting all notifications:', error);
                  }
                }}
                title="Eliminar todas las notificaciones"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowDropdown(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-600">{notification.message}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(notification.time)}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Bell className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;