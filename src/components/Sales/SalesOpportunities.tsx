import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, TrendingUp, DollarSign, Calendar, User, Eye, Edit, Archive, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
// import axios from 'axios';

interface SalesOpportunity {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  potential_client_name?: string;
  potential_client_contact?: any;
  estimated_value?: number;
  probability?: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source?: string;
  assigned_to?: string;
  expected_close_date?: string;
  actual_close_date?: string;
  notes?: string;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
  client_name?: string;
  assigned_to_name?: string;
}

const SalesOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<SalesOpportunity | null>(null);
  const [statistics, setStatistics] = useState<any>({
    statistics: {
      total_opportunities: 0,
      won: 0,
      total_value: 0,
      avg_probability: 50
    }
  });
  
  const { user, hasRole } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    potentialClientName: '',
    estimatedValue: '',
    probability: '50',
    stage: 'lead',
    source: '',
    expectedCloseDate: '',
    notes: ''
  });

  useEffect(() => {
    // loadOpportunities();
    // loadStatistics();
    setLoading(false);
  }, []);

  // const loadOpportunities = async () => {
  //   try {
  //     const response = await axios.get('/sales/opportunities');
  //     setOpportunities(response.data.opportunities || []);
  //   } catch (error) {
  //     console.error('Error loading opportunities:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const loadStatistics = async () => {
  //   try {
  //     const response = await axios.get('/sales/statistics');
  //     setStatistics(response.data);
  //   } catch (error) {
  //     console.error('Error loading statistics:', error);
  //   }
  // };

  const getStageLabel = (stage: string) => {
    const stages = {
      'lead': 'عميل محتمل',
      'qualified': 'مؤهل',
      'proposal': 'عرض سعر',
      'negotiation': 'تفاوض',
      'won': 'تم الفوز',
      'lost': 'فُقدت'
    };
    return stages[stage as keyof typeof stages] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors = {
      'lead': 'bg-gray-100 text-gray-800',
      'qualified': 'bg-blue-100 text-blue-800',
      'proposal': 'bg-yellow-100 text-yellow-800',
      'negotiation': 'bg-orange-100 text-orange-800',
      'won': 'bg-green-100 text-green-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' ج.م';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opportunity.potential_client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      potentialClientName: '',
      estimatedValue: '',
      probability: '50',
      stage: 'lead',
      source: '',
      expectedCloseDate: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingOpportunity(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate saving
    const newOpportunity: SalesOpportunity = {
      id: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      potential_client_name: formData.potentialClientName,
      estimated_value: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      probability: parseInt(formData.probability),
      stage: formData.stage as any,
      source: formData.source,
      expected_close_date: formData.expectedCloseDate || undefined,
      notes: formData.notes,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (editingOpportunity) {
      setOpportunities(prev => prev.map(op => 
        op.id === editingOpportunity.id ? { ...newOpportunity, id: editingOpportunity.id } : op
      ));
    } else {
      setOpportunities(prev => [...prev, newOpportunity]);
    }
    
    resetForm();
    alert('تم حفظ الفرصة التجارية بنجاح');
  };

  const handleEdit = (opportunity: SalesOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description || '',
      potentialClientName: opportunity.potential_client_name || '',
      estimatedValue: opportunity.estimated_value?.toString() || '',
      probability: opportunity.probability?.toString() || '50',
      stage: opportunity.stage,
      source: opportunity.source || '',
      expectedCloseDate: opportunity.expected_close_date ? opportunity.expected_close_date.split('T')[0] : '',
      notes: opportunity.notes || ''
    });
    setShowAddForm(true);
  };

  const handleArchive = async (opportunity: SalesOpportunity) => {
    if (window.confirm('هل أنت متأكد من أرشفة هذه الفرصة؟')) {
      setOpportunities(prev => prev.filter(op => op.id !== opportunity.id));
      alert('تم أرشفة الفرصة بنجاح');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">جاري تحميل الفرص التجارية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">الفرص التجارية</h2>
        <p className="text-gray-600">إدارة ومتابعة الفرص التجارية والعملاء المحتملين</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">إجمالي الفرص</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.statistics.total_opportunities || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">الفرص المفوزة</p>
                <p className="text-2xl font-bold text-green-900">{statistics.statistics.won || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">القيمة الإجمالية</p>
                <p className="text-2xl font-bold text-purple-900">
                  {statistics.statistics.total_value ? formatCurrency(statistics.statistics.total_value) : '0 ج.م'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">متوسط الاحتمالية</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {statistics.statistics.avg_probability ? Math.round(statistics.statistics.avg_probability) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="البحث في الفرص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع المراحل</option>
            <option value="lead">عميل محتمل</option>
            <option value="qualified">مؤهل</option>
            <option value="proposal">عرض سعر</option>
            <option value="negotiation">تفاوض</option>
            <option value="won">تم الفوز</option>
            <option value="lost">فُقدت</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة فرصة جديدة
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingOpportunity ? 'تعديل الفرصة التجارية' : 'إضافة فرصة تجارية جديدة'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان الفرصة *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="أدخل عنوان الفرصة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم العميل المحتمل
                </label>
                <input
                  type="text"
                  value={formData.potentialClientName}
                  onChange={(e) => setFormData({ ...formData, potentialClientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اسم العميل المحتمل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  القيمة المتوقعة (ج.م)
                </label>
                <input
                  type="number"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1000"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  احتمالية النجاح (%)
                </label>
                <input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المرحلة
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lead">عميل محتمل</option>
                  <option value="qualified">مؤهل</option>
                  <option value="proposal">عرض سعر</option>
                  <option value="negotiation">تفاوض</option>
                  <option value="won">تم الفوز</option>
                  <option value="lost">فُقدت</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مصدر الفرصة
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="موقع إلكتروني، إحالة، معرض..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ المتوقع للإغلاق
                </label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف تفصيلي للفرصة التجارية"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingOpportunity ? 'تحديث' : 'إضافة'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Opportunities Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الفرصة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل المحتمل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  القيمة المتوقعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاحتمالية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المرحلة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ المتوقع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOpportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{opportunity.title}</div>
                      {opportunity.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{opportunity.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {opportunity.potential_client_name || opportunity.client_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${opportunity.probability || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">
                        {opportunity.probability || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage)}`}>
                      {getStageLabel(opportunity.stage)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {opportunity.expected_close_date ? formatDate(opportunity.expected_close_date) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(opportunity)}
                        className="text-blue-600 hover:text-blue-900"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(opportunity)}
                        className="text-red-600 hover:text-red-900"
                        title="أرشفة"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد فرص تجارية تطابق المعايير المحددة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesOpportunities;