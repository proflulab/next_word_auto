'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, FileText, LayoutTemplate, Bot } from 'lucide-react';

const navLinks = [
  { href: '/certificate', label: '动态文档生成器', icon: FileText, color: 'text-blue-500' },
  { href: '/templates', label: '模板管理系统', icon: LayoutTemplate, color: 'text-orange-500' },
  { href: '/batch', label: '批量处理中心', icon: Bot, color: 'text-green-500' },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMounted: boolean;
}

const Sidebar = ({ isCollapsed, toggleSidebar, isMounted }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className={`bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-800 dark:text-gray-300 flex flex-col shadow-lg ${isMounted && 'transition-all duration-300'} ${isCollapsed ? 'w-20' : 'w-56'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            
        </div>
      <nav className="flex-grow p-4">
        <ul>
          {navLinks.map(link => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <li key={link.href} className="mb-2 group relative">
                <Link
                  href={link.href}
                  className={`block p-3 rounded-lg transition-colors font-medium flex items-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`h-6 w-6 ${isCollapsed ? '' : 'mr-4'} ${link.color}`} />
                  <span className={`${isCollapsed ? 'hidden' : 'block whitespace-nowrap'}`}>{link.label}</span>
                </Link>
                {isCollapsed && (
                  <Link href={link.href} className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-4 py-2 bg-gray-800 text-white text-base rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {link.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 w-full flex justify-center">
            <ChevronLeft className={`${isMounted && 'transition-transform duration-300'} ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;