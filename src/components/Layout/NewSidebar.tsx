import React from 'react';
import { 
  Home, 
  Plus, 
  Eye, 
  Users, 
  Shield, 
  CheckSquare,
  BarChart3,
  Award,
  TrendingUp,
  Archive,
  UserPlus,
  Building
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NewSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NewSidebar: React.FC<NewSidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const { hasRole, hasDepartment } = useAuth();

  const menuSections = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: Home, roles: ['admin', 'user', 'sales'] }
      ]
    },
    {
      title: 'إدارة العمليات',
      items: [
        { id: 'add-operation', label: 'إضافة عملية', icon: Plus, roles: ['admin', 'user'] },
        { id: 'view-operations', label: 'استعراض العمليات', icon: Eye, roles: ['admin', 'user'] },
        { id: 'clients', label: 'إدارة العملاء', icon: Users, roles: ['admin', 'user'] }
      ]
    },
    {
      title: 'الضمانات والشهادات',
      items: [
        { id: 'guarantees', label: 'الضمانات', icon: Shield, roles: ['admin', 'user'] },
        { id: 'warranties', label: 'شهادات الضمان', icon: Award, roles: ['admin', 'user'] },
        { id: 'checks', label: 'الشيكات والمدفوعات', icon: CheckSquare, roles: ['admin', 'user'] }
      ]
    },
    {
      title: 'المبيعات',
      items: [
        { id: 'sales-opportunities', label: 'الفرص التجارية', icon: TrendingUp, roles: ['admin', 'sales'] },
        { id: 'sales-pipeline', label: 'مسار المبيعات', icon: Building, roles: ['admin', 'sales'] },
        { id: 'sales-archive', label: 'أرشيف الفرص', icon: Archive, roles: ['admin', 'sales'] }
      ]
    },
    {
      title: 'التقارير والإحصائيات',
      items: [
        { id: 'reports', label: 'التقارير', icon: BarChart3, roles: ['admin', 'user', 'sales'] }
      ]
    }
  ];

  // Add admin-only section
  if (hasRole('admin')) {
    menuSections.push({
      title: 'إدارة النظام',
      items: [
        { id: 'user-management', label: 'إدارة المستخدمين', icon: UserPlus, roles: ['admin'] },
        { id: 'system-settings', label: 'إعدادات النظام', icon: Shield, roles: ['admin'] }
      ]
    });
  }

  const handleItemClick = (itemId: string) => {
    onViewChange(itemId);
    if (window.innerWidth < 1024) { // Close sidebar on mobile after selection
      onClose();
    }
  };

  const canAccessItem = (item: any) => {
    return item.roles.some((role: string) => hasRole(role));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 w-64 bg-gray-50 border-l border-gray-200 
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header - mobile only */}
          <div className="lg:hidden p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">القائمة الرئيسية</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {menuSections.map((section) => {
                const accessibleItems = section.items.filter(canAccessItem);
                
                if (accessibleItems.length === 0) return null;

                return (
                  <div key={section.title}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {accessibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => handleItemClick(item.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-right transition-colors ${
                                isActive
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="text-center">
              <div className="text-xs text-gray-500">الإصدار 2.0</div>
              <div className="text-xs text-gray-400">النظام متعدد المستخدمين</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default NewSidebar;