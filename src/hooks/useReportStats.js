import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from '@firebase/firestore';
import { db } from '../firebase';

export const useReportStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalChange: 0,
    pendingChange: 0,
    completedChange: 0
  });

  useEffect(() => {
    const calculateStats = (reports) => {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      
      const currentMonthReports = reports.filter(r => 
        new Date(r.fecha.seconds * 1000) >= oneMonthAgo
      );
      
      const previousMonthReports = reports.filter(r => {
        const date = new Date(r.fecha.seconds * 1000);
        return date < oneMonthAgo && date >= new Date(oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1));
      });

      const currentStats = {
        total: currentMonthReports.length,
        pending: currentMonthReports.filter(r => r.estado === 'pendiente').length,
        completed: currentMonthReports.filter(r => r.estado === 'completado').length
      };

      const previousStats = {
        total: previousMonthReports.length,
        pending: previousMonthReports.filter(r => r.estado === 'pendiente').length,
        completed: previousMonthReports.filter(r => r.estado === 'completado').length
      };

      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
      };

      setStats({
        ...currentStats,
        totalChange: calculateChange(currentStats.total, previousStats.total),
        pendingChange: calculateChange(currentStats.pending, previousStats.pending),
        completedChange: calculateChange(currentStats.completed, previousStats.completed)
      });
    };

    const reportsRef = collection(db, 'reportes');
    const unsubscribe = onSnapshot(query(reportsRef), (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      calculateStats(reports);
    });

    return () => unsubscribe();
  }, []);

  return stats;
};

export default useReportStats;