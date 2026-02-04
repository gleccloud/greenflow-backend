import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Menu,
  X,
  BarChart3,
  ShoppingCart,
  FileText,
  LogOut,
  Bell,
  Settings,
  Leaf,
} from 'lucide-react';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active role from URL
  const getRole = () => {
    if (location.pathname.includes('shipper')) return 'shipper';
    if (location.pathname.includes('carrier')) return 'carrier';
    if (location.pathname.includes('owner')) return 'owner';
    return 'shipper';
  };

  const role = getRole();

  const roleLabels = {
    shipper: '화주사',
    carrier: '물류사',
    owner: '차주',
  };

  const navItems = [
    {
      label: '개요',
      icon: BarChart3,
      href: `/dashboard/${role}`,
    },
    {
      label: role === 'shipper' ? '입찰' : role === 'carrier' ? '오더' : '운행',
      icon: ShoppingCart,
      href: `#`,
    },
    {
      label: '리포트',
      icon: FileText,
      href: `#`,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 p-1 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-6">
          <Leaf className="h-7 w-7 text-emerald-400" />
          <div>
            <p className="text-sm font-bold">GreenFlow</p>
            <p className="text-xs text-slate-400">{roleLabels[role as keyof typeof roleLabels]}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="border-t border-slate-800 space-y-1 px-3 py-4">
          <button className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>설정</span>
            </div>
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>돌아가기</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Menu Button (Mobile) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden flex-1 text-sm text-slate-600 md:flex">
              <nav className="flex gap-2">
                <a href="/" className="hover:text-slate-900">
                  홈
                </a>
                <span className="text-slate-400">/</span>
                <span className="text-slate-900 font-medium">대시보드</span>
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-slate-100 rounded-lg">
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              <div className="h-8 w-8 rounded-full bg-emerald-600" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
