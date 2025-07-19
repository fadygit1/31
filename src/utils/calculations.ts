import { Operation, OperationItem, Deduction } from '../types';

export const calculateItemTotal = (item: OperationItem): number => {
  return item.amount * (item.executionPercentage / 100);
};

export const calculateOperationTotal = (items: OperationItem[]): number => {
  return items.reduce((total, item) => total + item.amount, 0);
};

export const calculateExecutedTotal = (items: OperationItem[]): number => {
  return items.reduce((total, item) => total + calculateItemTotal(item), 0);
};

export const calculateDeductions = (executedTotal: number, deductions: Deduction[]): number => {
  return deductions.reduce((total, deduction) => {
    if (!deduction.isActive) return total;
    
    if (deduction.type === 'percentage') {
      return total + (executedTotal * deduction.value / 100);
    } else {
      return total + deduction.value;
    }
  }, 0);
};

export const calculateNetAmount = (operation: Operation): number => {
  const executedTotal = calculateExecutedTotal(operation.items);
  const totalDeductions = calculateDeductions(executedTotal, operation.deductions);
  return executedTotal - totalDeductions;
};

// حساب المبلغ الصافي المستحق (بعد الخصومات)
export const calculateNetDue = (operation: Operation): number => {
  const netAmount = calculateNetAmount(operation);
  return netAmount - operation.totalReceived;
};

// حساب إجمالي الخصومات
export const calculateTotalDeductions = (operation: Operation): number => {
  const executedTotal = calculateExecutedTotal(operation.items);
  return calculateDeductions(executedTotal, operation.deductions);
};

export const calculateOverallExecutionPercentage = (items: OperationItem[]): number => {
  if (items.length === 0) return 0;
  
  const totalAmount = calculateOperationTotal(items);
  const executedAmount = calculateExecutedTotal(items);
  
  return totalAmount > 0 ? (executedAmount / totalAmount) * 100 : 0;
};

// دالة محسنة لحساب حالة العملية مع اعتبار الخصومات جزء من السداد وإضافة حالة السداد بالزيادة
export const calculateOperationStatus = (operation: Operation): Operation['status'] => {
  const executionPercentage = operation.overallExecutionPercentage;
  const totalAmount = operation.totalAmount;
  const totalReceived = operation.totalReceived;
  const totalDeductions = calculateTotalDeductions(operation);
  
  // إذا لم تكتمل العملية بعد
  if (executionPercentage < 100) {
    return 'in_progress';
  }
  
  // إذا اكتملت العملية (نسبة التنفيذ 100%)
  if (executionPercentage >= 100) {
    // حساب إجمالي ما تم سداده (المدفوعات + الخصومات)
    const totalPaid = totalReceived + totalDeductions;
    
    // إذا تم سداد أكثر من إجمالي العملية (سداد بالزيادة)
    if (totalPaid > totalAmount + 0.01) { // هامش خطأ صغير
      return 'completed_overpaid';
    }
    // إذا تم سداد المبلغ كاملاً (مع هامش خطأ صغير)
    else if (Math.abs(totalPaid - totalAmount) <= 0.01) {
      return 'completed_full_payment';
    }
    // إذا تم سداد جزء من المبلغ
    else if (totalPaid > 0) {
      return 'completed_partial_payment';
    }
    // إذا لم يتم سداد أي مبلغ
    else {
      return 'completed';
    }
  }
  
  return 'in_progress';
};

export const generateOperationCode = (clientName: string, operationName: string): string => {
  const clientCode = clientName.split(' ')[0].substring(0, 3).toUpperCase();
  const operationCode = operationName.split(' ')[0].substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${clientCode}-${operationCode}-${timestamp}`;
};

export const generateItemCode = (operationCode: string, itemIndex: number): string => {
  return `${operationCode}-${String(itemIndex + 1).padStart(3, '0')}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' EGP';
};

export const formatDate = (date: Date): string => {
  if (!date || !(date instanceof Date)) return '';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const formatDateTime = (date: Date): string => {
  if (!date || !(date instanceof Date)) return '';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};