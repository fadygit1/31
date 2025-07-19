import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import axios from 'axios';
// import Cookies from 'js-cookie';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'sales';
  department: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasDepartment: (department: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default users for local mode
const DEFAULT_USERS = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@mec-doors.com',
    full_name: 'مدير النظام',
    role: 'admin' as const,
    department: 'الإدارة',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'admin123'
  },
  {
    id: '2',
    username: 'user',
    email: 'user@mec-doors.com',
    full_name: 'مستخدم عادي',
    role: 'user' as const,
    department: 'العمليات',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'user123'
  },
  {
    id: '3',
    username: 'sales',
    email: 'sales@mec-doors.com',
    full_name: 'موظف مبيعات',
    role: 'sales' as const,
    department: 'المبيعات',
    is_active: true,
    created_at: new Date().toISOString(),
    password: 'sales123'
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem('currentUser');
      const savedToken = localStorage.getItem('authToken');
      
      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setToken(savedToken);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = DEFAULT_USERS.find(u => u.username === username && u.password === password);
    
    if (!foundUser) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    
    if (!foundUser.is_active) {
      throw new Error('هذا المستخدم غير نشط');
    }
    
    const { password: _, ...userData } = foundUser;
    const newToken = `token_${foundUser.id}_${Date.now()}`;
    
    setToken(newToken);
    setUser(userData);
    
    // Store in localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('authToken', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has all roles
    return user.role === role;
  };

  const hasDepartment = (department: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has access to all departments
    return user.department === department;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    hasRole,
    hasDepartment
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};