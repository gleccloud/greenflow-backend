import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';

const CONSOLE_NAV_ITEMS = [
  {
    path: '/console',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    path: '/console/api-keys',
    label: 'API Keys',
    icon: '🔑',
  },
  {
    path: '/console/documentation',
    label: 'Documentation',
    icon: '📚',
  },
  {
    path: '/console/logs',
    label: 'Request Logs',
    icon: '📋',
  },
  {
    path: '/console/webhooks',
    label: 'Webhooks',
    icon: '🪝',
  },
  {
    path: '/console/integrations',
    label: 'Integrations',
    icon: '🔗',
  },
  {
    path: '/console/billing',
    label: 'Billing',
    icon: '💳',
  },
  {
    path: '/console/settings',
    label: 'Settings',
    icon: '⚙️',
  },
];

interface NavItemProps {
  item: typeof CONSOLE_NAV_ITEMS[0];
  isActive: boolean;
}

function NavItem({ item, isActive }: NavItemProps) {
  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-600'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="text-xl">{item.icon}</span>
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
}

export function ConsoleLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <Link to="/console" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">GL</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <h1 className="text-lg font-bold text-slate-900">GreenFlow</h1>
                <p className="text-xs text-slate-500">API Console</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {CONSOLE_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
            />
          ))}
        </nav>

        {/* User Menu */}
        <div className="border-t border-slate-200 p-4 space-y-2">
          {sidebarOpen && (
            <>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <Settings size={18} />
                <span>Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {CONSOLE_NAV_ITEMS.find(item => location.pathname === item.path)?.label || 'Console'}
              </h2>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer">
              U
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
