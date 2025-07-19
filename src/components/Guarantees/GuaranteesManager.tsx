import React, { useState } from 'react';
import { CreditCard, FileText, Search, Filter, Calendar, AlertTriangle, CheckCircle, X, Download, FileSpreadsheet, FileEdit, Eye } from 'lucide-react';
import { Operation, Client, GuaranteeCheck, GuaranteeLetter } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { exportDetailedGuaranteesReportToPDF, exportGuaranteesToExcel, exportDetailedGuaranteesReportToWord } from '../../utils/exportUtils';

interface GuaranteesManagerProps {
  operations: Operation[];
  clients: Client[];
}

interface AdvancedFilters {
  clientId: string;
  operationId: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  bank: string;
}

const GuaranteesManager: React.FC<GuaranteesManagerProps> = ({ operations, clients }) => {
  const [activeTab, setActiveTab] = useState<'checks' | 'letters'>('checks');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'returned' | 'expiring' | 'expired'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewingGuarantee, setViewingGuarantee] = useState<any>(null);
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    clientId: 'all',
    operationId: 'all',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    bank: ''
  });

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  const getOperationName = (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    return operation ? operation.name : 'عملية غير معروفة';
  };

  const getItemName = (operationId: string, itemId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return 'بند غير معروف';
    const item = operation.items.find(item => item.id === itemId);
    return item ? item.description : 'بند غير معروف';
  };

  // جمع جميع شيكات الضمان من جميع العمليات مع تحويل التواريخ
  const allGuaranteeChecks = operations.flatMap(operation => 
    operation.guaranteeChecks.map(check => ({
      ...check,
      // تحويل التواريخ من string إلى Date إذا لزم الأمر
      checkDate: check.checkDate instanceof Date ? check.checkDate : new Date(check.checkDate),
      deliveryDate: check.deliveryDate instanceof Date ? check.deliveryDate : new Date(check.deliveryDate),
      expiryDate: check.expiryDate instanceof Date ? check.expiryDate : new Date(check.expiryDate),
      returnDate: check.returnDate ? (check.returnDate instanceof Date ? check.returnDate : new Date(check.returnDate)) : undefined,
      operationId: operation.id,
      operationName: operation.name,
      operationCode: operation.code,
      clientId: operation.clientId,
      clientName: getClientName(operation.clientId),
      type: 'شيك ضمان'
    }))
  );

  // جمع جميع خطابات الضمان من جميع العمليات مع تحويل التواريخ
  const allGuaranteeLetters = operations.flatMap(operation => 
    operation.guaranteeLetters.map(letter => ({
      ...letter,
      // تحويل التواريخ من string إلى Date إذا لزم الأمر
      letterDate: letter.letterDate instanceof Date ? letter.letterDate : new Date(letter.letterDate),
      dueDate: letter.dueDate instanceof Date ? letter.dueDate : new Date(letter.dueDate),
      returnDate: letter.returnDate ? (letter.returnDate instanceof Date ? letter.returnDate : new Date(letter.returnDate)) : undefined,
      operationId: operation.id,
      operationName: operation.name,
      operationCode: operation.code,
      clientId: operation.clientId,
      clientName: getClientName(operation.clientId),
      type: 'خطاب ضمان'
    }))
  );

  const isExpiringSoon = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date: Date) => {
    const today = new Date();
    return date < today;
  };

  const applyAdvancedFilters = (items: any[]): any[] => {
    return items.filter(item => {
      // البحث النصي
      const searchMatch = !advancedFilters.bank || 
        (item.bank || '').toLowerCase().includes(advancedFilters.bank.toLowerCase()) ||
        item.clientName.toLowerCase().includes(advancedFilters.bank.toLowerCase()) ||
        item.operationName.toLowerCase().includes(advancedFilters.bank.toLowerCase()) ||
        (item.checkNumber || item.letterNumber || '').toLowerCase().includes(advancedFilters.bank.toLowerCase());

      // فلتر العميل
      const clientMatch = advancedFilters.clientId === 'all' || item.clientId === advancedFilters.clientId;

      // فلتر العملية
      const operationMatch = advancedFilters.operationId === 'all' || item.operationId === advancedFilters.operationId;

      // فلتر الحالة
      const statusMatch = advancedFilters.status === 'all' || 
                         (advancedFilters.status === 'active' && !item.isReturned) ||
                         (advancedFilters.status === 'returned' && item.isReturned);

      // فلتر التاريخ
      let dateMatch = true;
      if (advancedFilters.startDate) {
        const startDate = new Date(advancedFilters.startDate);
        const itemDate = activeTab === 'checks' ? item.checkDate : item.letterDate;
        dateMatch = dateMatch && new Date(itemDate) >= startDate;
      }
      if (advancedFilters.endDate) {
        const endDate = new Date(advancedFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        const itemDate = activeTab === 'checks' ? item.checkDate : item.letterDate;
        dateMatch = dateMatch && new Date(itemDate) <= endDate;
      }

      // فلتر المبلغ
      let amountMatch = true;
      if (advancedFilters.minAmount) {
        const minAmount = parseFloat(advancedFilters.minAmount);
        amountMatch = amountMatch && item.amount >= minAmount;
      }
      if (advancedFilters.maxAmount) {
        const maxAmount = parseFloat(advancedFilters.maxAmount);
        amountMatch = amountMatch && item.amount <= maxAmount;
      }

      return searchMatch && clientMatch && operationMatch && statusMatch && dateMatch && amountMatch;
    });
  };

  const filteredChecks = showAdvancedFilters 
    ? applyAdvancedFilters(allGuaranteeChecks)
    : allGuaranteeChecks.filter(check => {
        const matchesSearch = (check.checkNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (check.bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             check.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             check.operationName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && !check.isReturned && !isExpired(check.expiryDate)) ||
                             (statusFilter === 'returned' && check.isReturned) ||
                             (statusFilter === 'expiring' && !check.isReturned && isExpiringSoon(check.expiryDate)) ||
                             (statusFilter === 'expired' && !check.isReturned && isExpired(check.expiryDate));
        
        return matchesSearch && matchesStatus;
      });

  const filteredLetters = showAdvancedFilters 
    ? applyAdvancedFilters(allGuaranteeLetters)
    : allGuaranteeLetters.filter(letter => {
        const matchesSearch = (letter.letterNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (letter.bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             letter.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             letter.operationName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && !letter.isReturned && !isExpired(letter.dueDate)) ||
                             (statusFilter === 'returned' && letter.isReturned) ||
                             (statusFilter === 'expiring' && !letter.isReturned && isExpiringSoon(letter.dueDate)) ||
                             (statusFilter === 'expired' && !letter.isReturned && isExpired(letter.dueDate));
        
        return matchesSearch && matchesStatus;
      });

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      clientId: 'all',
      operationId: 'all',
      status: 'all',
      type: 'all',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      bank: ''
    });
  };

  const handleAdvancedFilterChange = (field: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleView = (guarantee: any) => {
    setViewingGuarantee(guarantee);
  };

  // Export handlers
  const handleExportPDF = () => {
    try {
      exportDetailedGuaranteesReportToPDF(operations, clients);
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      exportGuaranteesToExcel(operations, clients);
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      alert('حدث خطأ أثناء تصدير ملف Excel');
    }
  };

  const handleExportWord = () => {
    try {
      exportDetailedGuaranteesReportToWord(operations, clients);
    } catch (error) {
      console.error('خطأ في تصدير Word:', error);
      alert('حدث خطأ أثناء تصدير ملف Word');
    }
  };

  // حساب الإحصائيات مع التنبيهات
  const totalGuaranteeChecks = allGuaranteeChecks.length;
  const totalGuaranteeLetters = allGuaranteeLetters.length;
  const activeGuaranteeChecks = allGuaranteeChecks.filter(check => !check.isReturned && !isExpired(check.expiryDate)).length;
  const activeGuaranteeLetters = allGuaranteeLetters.filter(letter => !letter.isReturned && !isExpired(letter.dueDate)).length;
  const expiringChecks = allGuaranteeChecks.filter(check => !check.isReturned && isExpiringSoon(check.expiryDate)).length;
  const expiringLetters = allGuaranteeLetters.filter(letter => !letter.isReturned && isExpiringSoon(letter.dueDate)).length;
  const expiredChecks = allGuaranteeChecks.filter(check => !check.isReturned && isExpired(check.expiryDate)).length;
  const expiredLetters = allGuaranteeLetters.filter(letter => !letter.isReturned && isExpired(letter.dueDate)).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة الضمانات</h2>
        <p className="text-gray-600">متابعة وإدارة شيكات وخطابات الضمان مع تنبيهات الحالة</p>
      </div>

      {/* Status Alerts */}
      {(expiringChecks + expiringLetters > 0 || expiredChecks + expiredLetters > 0) && (
        <div className="mb-6 space-y-3">
          {expiringChecks + expiringLetters > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">
                  تنبيه: يوجد {expiringChecks + expiringLetters} ضمان ينتهي خلال 30 يوماً
                  ({expiringChecks} شيك ضمان، {expiringLetters} خطاب ضمان)
                </span>
              </div>
            </div>
          )}
          
          {expiredChecks + expiredLetters > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">
                  تحذير: يوجد {expiredChecks + expiredLetters} ضمان منتهي الصلاحية
                  ({expiredChecks} شيك ضمان، {expiredLetters} خطاب ضمان)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-1">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('checks')}
            className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm transition-all ${
              activeTab === 'checks'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            شيكات الضمان ({totalGuaranteeChecks})
            {expiringChecks > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                {expiringChecks}
              </span>
            )}
            {expiredChecks > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {expiredChecks}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('letters')}
            className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm transition-all ${
              activeTab === 'letters'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            خطابات الضمان ({totalGuaranteeLetters})
            {expiringLetters > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                {expiringLetters}
              </span>
            )}
            {expiredLetters > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {expiredLetters}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Export Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          تصدير PDF
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          تصدير Excel
        </button>
        <button
          onClick={handleExportWord}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <FileEdit className="w-4 h-4" />
          تصدير Word
        </button>
      </div>

      {/* Basic Filters */}
      {!showAdvancedFilters && (
        <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الضمانات</option>
              <option value="active">الضمانات النشطة</option>
              <option value="expiring">تنتهي قريباً (30 يوم)</option>
              <option value="expired">منتهية الصلاحية</option>
              <option value="returned">الضمانات المستردة</option>
            </select>

            <button 
              onClick={() => setShowAdvancedFilters(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              فلاتر متقدمة
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mb-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              الفلاتر المتقدمة
            </h3>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* البحث في البنك */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البحث في البنك أو العميل
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="اسم البنك، العميل، أو العملية..."
                  value={advancedFilters.bank}
                  onChange={(e) => handleAdvancedFilterChange('bank', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* العميل */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العميل
              </label>
              <select
                value={advancedFilters.clientId}
                onChange={(e) => handleAdvancedFilterChange('clientId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع العملاء</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* العملية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العملية
              </label>
              <select
                value={advancedFilters.operationId}
                onChange={(e) => handleAdvancedFilterChange('operationId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع العمليات</option>
                {operations.map((operation) => (
                  <option key={operation.id} value={operation.id}>
                    {operation.name}
                  </option>
                ))}
              </select>
            </div>

            {/* الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الضمان
              </label>
              <select
                value={advancedFilters.status}
                onChange={(e) => handleAdvancedFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشطة</option>
                <option value="returned">مستردة</option>
              </select>
            </div>

            {/* تاريخ البداية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                من تاريخ
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={advancedFilters.startDate}
                  onChange={(e) => handleAdvancedFilterChange('startDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* تاريخ النهاية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                إلى تاريخ
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={advancedFilters.endDate}
                  onChange={(e) => handleAdvancedFilterChange('endDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* الحد الأدنى للمبلغ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للمبلغ (ج.م)
              </label>
              <input
                type="number"
                placeholder="0"
                value={advancedFilters.minAmount}
                onChange={(e) => handleAdvancedFilterChange('minAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>

            {/* الحد الأقصى للمبلغ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى للمبلغ (ج.م)
              </label>
              <input
                type="number"
                placeholder="∞"
                value={advancedFilters.maxAmount}
                onChange={(e) => handleAdvancedFilterChange('maxAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex gap-3">
            <button
              onClick={resetAdvancedFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              مسح الفلاتر
            </button>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              إخفاء الفلاتر المتقدمة
            </button>
          </div>

          {/* عرض عدد النتائج */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">
                {activeTab === 'checks' ? filteredChecks.length : filteredLetters.length}
              </span> ضمان من أصل {activeTab === 'checks' ? allGuaranteeChecks.length : allGuaranteeLetters.length}
            </p>
          </div>
        </div>
      )}

      {/* Guarantee Details Modal */}
      {viewingGuarantee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل {viewingGuarantee.type}</h3>
              <button
                onClick={() => setViewingGuarantee(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">معلومات الضمان</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-blue-600 font-medium">
                        {viewingGuarantee.type === 'شيك ضمان' ? 'رقم الشيك:' : 'رقم الخطاب:'}
                      </span>
                      <p className="text-blue-900">
                        {viewingGuarantee.checkNumber || viewingGuarantee.letterNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600 font-medium">المبلغ:</span>
                      <p className="text-blue-900">{formatCurrency(viewingGuarantee.amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600 font-medium">البنك:</span>
                      <p className="text-blue-900">{viewingGuarantee.bank}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">معلومات العملية</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-green-600 font-medium">العميل:</span>
                      <p className="text-green-900">{viewingGuarantee.clientName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-green-600 font-medium">العملية:</span>
                      <p className="text-green-900">{viewingGuarantee.operationName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-green-600 font-medium">مرتبط بـ:</span>
                      <p className="text-green-900">
                        {viewingGuarantee.relatedTo === 'operation' 
                          ? 'العملية كاملة' 
                          : `البند: ${getItemName(viewingGuarantee.operationId, viewingGuarantee.relatedItemId || '')}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">التواريخ</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-purple-600 font-medium">
                        {viewingGuarantee.type === 'شيك ضمان' ? 'تاريخ الشيك:' : 'تاريخ الخطاب:'}
                      </span>
                      <p className="text-purple-900">
                        {formatDate(viewingGuarantee.checkDate || viewingGuarantee.letterDate)}
                      </p>
                    </div>
                    {viewingGuarantee.deliveryDate && (
                      <div>
                        <span className="text-sm text-purple-600 font-medium">تاريخ التسليم:</span>
                        <p className="text-purple-900">{formatDate(viewingGuarantee.deliveryDate)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-purple-600 font-medium">تاريخ الانتهاء:</span>
                      <p className="text-purple-900">
                        {formatDate(viewingGuarantee.expiryDate || viewingGuarantee.dueDate)}
                      </p>
                    </div>
                    {viewingGuarantee.returnDate && (
                      <div>
                        <span className="text-sm text-purple-600 font-medium">تاريخ الاسترداد:</span>
                        <p className="text-purple-900">{formatDate(viewingGuarantee.returnDate)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">الحالة</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600 font-medium">حالة الضمان:</span>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          viewingGuarantee.isReturned 
                            ? 'bg-green-100 text-green-800' 
                            : isExpired(viewingGuarantee.expiryDate || viewingGuarantee.dueDate)
                            ? 'bg-red-100 text-red-800'
                            : isExpiringSoon(viewingGuarantee.expiryDate || viewingGuarantee.dueDate)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {viewingGuarantee.isReturned ? 'مُسترد' : 
                           isExpired(viewingGuarantee.expiryDate || viewingGuarantee.dueDate) ? 'منتهي الصلاحية' :
                           isExpiringSoon(viewingGuarantee.expiryDate || viewingGuarantee.dueDate) ? 'ينتهي قريباً' :
                           'قائم'}
                        </span>
                      </div>
                    </div>
                    {viewingGuarantee.notes && (
                      <div>
                        <span className="text-sm text-gray-600 font-medium">ملاحظات:</span>
                        <p className="text-gray-900">{viewingGuarantee.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Alerts */}
              {!viewingGuarantee.isReturned && (
                <>
                  {isExpiringSoon(viewingGuarantee.expiryDate || viewingGuarantee.dueDate) && 
                   !isExpired(viewingGuarantee.expiryDate || viewingGuarantee.dueDate) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="text-yellow-800 font-medium">
                          تنبيه: هذا الضمان سينتهي خلال 30 يوماً
                        </span>
                      </div>
                    </div>
                  )}

                  {isExpired(viewingGuarantee.expiryDate || viewingGuarantee.dueDate) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800 font-medium">
                          تحذير: هذا الضمان منتهي الصلاحية
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guarantee Checks */}
      {activeTab === 'checks' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الشيك
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    البنك
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العملية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الانتهاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChecks.map((check) => (
                  <tr key={check.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {check.checkNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(check.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {check.bank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {check.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {check.operationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {isExpired(check.expiryDate) && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {isExpiringSoon(check.expiryDate) && !isExpired(check.expiryDate) && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={
                          isExpired(check.expiryDate) ? 'text-red-600' :
                          isExpiringSoon(check.expiryDate) ? 'text-yellow-600' :
                          'text-gray-900'
                        }>
                          {formatDate(check.expiryDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                        check.isReturned 
                          ? 'bg-green-100 text-green-800' 
                          : isExpired(check.expiryDate)
                          ? 'bg-red-100 text-red-800'
                          : isExpiringSoon(check.expiryDate)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {check.isReturned ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            مُسترد
                          </>
                        ) : isExpired(check.expiryDate) ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            منتهي الصلاحية
                          </>
                        ) : isExpiringSoon(check.expiryDate) ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            ينتهي قريباً
                          </>
                        ) : (
                          'قائم'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleView(check)}
                        className="text-blue-600 hover:text-blue-900"
                        title="معاينة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredChecks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد شيكات ضمان تطابق المعايير المحددة</p>
            </div>
          )}
        </div>
      )}

      {/* Guarantee Letters */}
      {activeTab === 'letters' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الخطاب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    البنك
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العملية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الاستحقاق
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLetters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {letter.letterNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {letter.bank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(letter.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {letter.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {letter.operationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {isExpired(letter.dueDate) && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {isExpiringSoon(letter.dueDate) && !isExpired(letter.dueDate) && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={
                          isExpired(letter.dueDate) ? 'text-red-600' :
                          isExpiringSoon(letter.dueDate) ? 'text-yellow-600' :
                          'text-gray-900'
                        }>
                          {formatDate(letter.dueDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                        letter.isReturned 
                          ? 'bg-green-100 text-green-800' 
                          : isExpired(letter.dueDate)
                          ? 'bg-red-100 text-red-800'
                          : isExpiringSoon(letter.dueDate)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {letter.isReturned ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            مُسترد
                          </>
                        ) : isExpired(letter.dueDate) ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            منتهي الصلاحية
                          </>
                        ) : isExpiringSoon(letter.dueDate) ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            ينتهي قريباً
                          </>
                        ) : (
                          'قائم'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleView(letter)}
                        className="text-blue-600 hover:text-blue-900"
                        title="معاينة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLetters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد خطابات ضمان تطابق المعايير المحددة</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">إجمالي الضمانات</p>
              <p className="text-2xl font-bold text-blue-900">
                {allGuaranteeChecks.length + allGuaranteeLetters.length}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">الضمانات النشطة</p>
              <p className="text-2xl font-bold text-green-900">
                {activeGuaranteeChecks + activeGuaranteeLetters}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">تنتهي قريباً</p>
              <p className="text-2xl font-bold text-yellow-900">
                {expiringChecks + expiringLetters}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">منتهية الصلاحية</p>
              <p className="text-2xl font-bold text-red-900">
                {expiredChecks + expiredLetters}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الضمانات المستردة</p>
              <p className="text-2xl font-bold text-gray-900">
                {allGuaranteeChecks.filter(c => c.isReturned).length + 
                 allGuaranteeLetters.filter(l => l.isReturned).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuaranteesManager;