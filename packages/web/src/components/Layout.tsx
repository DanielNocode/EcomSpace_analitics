/**
 * Main Layout Component
 * Provides sidebar navigation and main content area with responsive design
 */

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import type { NavLinkProps } from 'react-router-dom';
import {
  Home,
  Play,
  Clock,
  UserX,
  FileText,
  AlertTriangle,
  Users,
  User,
  LogOut,
  BarChart3,
  Timer,
  PlusCircle,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

/**
 * Layout component with sidebar navigation
 */
export function Layout() {
  const { user, logout } = useAuth();

  const navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/webinars', label: 'Вебинары', icon: <Play size={20} /> },
    { path: '/deferred', label: 'Отложенные платежи', icon: <Clock size={20} /> },
    { path: '/dead-leads', label: 'Мёртвые лиды', icon: <UserX size={20} /> },
    { path: '/time-to-action', label: 'Скорость конверсии', icon: <Timer size={20} /> },
    { path: '/bizon-reports', label: 'Bizon отчёты', icon: <FileText size={20} /> },
    { path: '/anomalies', label: 'Аномалии', icon: <AlertTriangle size={20} /> },
    { path: '/data-entry', label: 'Ввод данных', icon: <PlusCircle size={20} /> },
    { path: '/bizon-upload', label: 'Bizon загрузка', icon: <Upload size={20} /> },
  ];

  const adminItems: NavItem[] = [
    { path: '/admin/users', label: 'Пользователи', icon: <Users size={20} />, adminOnly: true },
  ];

  const profileItems: NavItem[] = [
    { path: '/profile', label: 'Профиль', icon: <User size={20} /> },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen bg-dark-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col overflow-y-auto">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 py-8 border-b border-dark-600">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EcomSpace</h1>
            <p className="text-xs text-gray-400">Analytics</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {/* Main Navigation */}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-dark-700 text-accent'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                }`
              }
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Divider */}
          <div className="my-4 border-t border-dark-600" />

          {/* Admin Navigation */}
          {user?.role === 'ADMIN' &&
            adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-dark-700 text-accent'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                  }`
                }
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}

          {/* Profile Navigation */}
          {profileItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-dark-700 text-accent'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                }`
              }
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section at Bottom */}
        <div className="px-4 py-4 border-t border-dark-600">
          <div className="px-4 py-3 rounded-lg bg-dark-700/50 mb-3">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                {user?.role === 'ADMIN' ? 'Администратор' : 'Просмотр'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            Выход
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
