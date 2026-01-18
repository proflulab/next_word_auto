'use client';

import Sidebar from '../components/ui/Sidebar';
import { useState, useEffect } from 'react';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedIsCollapsed = localStorage.getItem('isSidebarCollapsed');
    if (storedIsCollapsed) {
      setIsSidebarCollapsed(JSON.parse(storedIsCollapsed));
    }
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    const newIsCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newIsCollapsed);
    localStorage.setItem('isSidebarCollapsed', JSON.stringify(newIsCollapsed));
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} isMounted={isMounted} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;