import React, { useState } from 'react';
import { Building2, Settings, Download, Upload, Database, LogOut, User, Users, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NewHeaderProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const NewHeader: React.FC<NewHeaderProps> = ({ onExport, onImport, onToggleSidebar, isSidebarOpen }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout, hasRole } = useAuth();

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleLabel = (role: string) => {
    const roles = {
      'admin': 'مدير النظام',
      'user': 'مستخدم',
      'sales': 'مبيعات'
    };
    return roles[role as keyof typeof roles] || role;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 relative">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-gray-900">نظام إدارة العمليات - MEC DOORS</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">إدارة شاملة لمشاريع البناء والمقاولات</p>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                <Database className="w-3 h-3" />
                متعدد المستخدمين
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Export/Import buttons - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">تصدير البيانات</span>
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
              <Upload className="w-4 h-4" />
              <span className="hidden lg:inline">استيراد البيانات</span>
              <input
                type="file"
                accept=".json"
                onChange={onImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Management (Admin only) */}
          {hasRole('admin') && (
            <button className="hidden lg:flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
              <Users className="w-4 h-4" />
              إدارة المستخدمين
            </button>
          )}

          {/* Settings */}
          <div className="relative">
            <button 
              onClick={handleSettingsClick}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            
            {showSettings && (
              <div className="absolute left-0 top-12 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">الإعدادات</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">الإشعارات</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">النسخ الاحتياطي التلقائي</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">الوضع المظلم</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <hr className="my-3" />
                    
                    {/* Mobile export/import options */}
                    <div className="md:hidden space-y-2">
                      <button 
                        onClick={onExport}
                        className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2"
                      >
                        تصدير البيانات
                      </button>
                      <label className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2 cursor-pointer">
                        استيراد البيانات
                        <input
                          type="file"
                          accept=".json"
                          onChange={onImport}
                          className="hidden"
                        />
                      </label>
                      <hr className="my-2" />
                    </div>

                    <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2">
                      حول النظام
                    </button>
                    <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2">
                      المساعدة
                    </button>
                    {hasRole('admin') && (
                      <button className="w-full text-left text-sm text-red-600 hover:text-red-800 py-2">
                        مسح جميع البيانات
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={handleUserMenuClick}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden lg:block text-right">
                <div className="text-sm font-medium text-gray-900">{user?.full_name}</div>
                <div className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 top-12 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user?.full_name}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <div className="text-xs text-blue-600">{getRoleLabel(user?.role || '')} - {user?.department}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2">
                      الملف الشخصي
                    </button>
                    <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2">
                      تغيير كلمة المرور
                    </button>
                    <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2">
                      الإعدادات الشخصية
                    </button>
                    <hr className="my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-left text-sm text-red-600 hover:text-red-800 py-2"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay to close dropdowns */}
      {(showSettings || showUserMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowSettings(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
};

export default NewHeader;