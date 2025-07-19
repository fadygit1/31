import * as XLSX from 'xlsx';
import { Operation, Client } from '../types';
import { formatCurrency, formatDate, calculateTotalDeductions, calculateNetAmount } from './calculations';

// ألوان وأنماط Excel
const EXCEL_STYLES = {
  header: {
    font: { bold: true, color: { rgb: "FFFFFF" }, size: 12 },
    fill: { fgColor: { rgb: "2563EB" } }, // أزرق
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  },
  subHeader: {
    font: { bold: true, color: { rgb: "1F2937" }, size: 11 },
    fill: { fgColor: { rgb: "F3F4F6" } }, // رمادي فاتح
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  },
  data: {
    font: { color: { rgb: "374151" }, size: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    }
  },
  currency: {
    font: { color: { rgb: "059669" }, size: 10, bold: true }, // أخضر للمبالغ
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    }
  },
  negative: {
    font: { color: { rgb: "DC2626" }, size: 10, bold: true }, // أحمر للمبالغ السالبة
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    }
  },
  status: {
    completed: {
      font: { color: { rgb: "FFFFFF" }, size: 10, bold: true },
      fill: { fgColor: { rgb: "059669" } }, // أخضر
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    inProgress: {
      font: { color: { rgb: "FFFFFF" }, size: 10, bold: true },
      fill: { fgColor: { rgb: "D97706" } }, // برتقالي
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    partialPayment: {
      font: { color: { rgb: "FFFFFF" }, size: 10, bold: true },
      fill: { fgColor: { rgb: "EA580C" } }, // برتقالي داكن
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    fullPayment: {
      font: { color: { rgb: "FFFFFF" }, size: 10, bold: true },
      fill: { fgColor: { rgb: "16A34A" } }, // أخضر داكن
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    },
    overpaid: {
      font: { color: { rgb: "FFFFFF" }, size: 10, bold: true },
      fill: { fgColor: { rgb: "7C3AED" } }, // بنفسجي
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    }
  },
  title: {
    font: { bold: true, color: { rgb: "1F2937" }, size: 16 },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "E5E7EB" } }
  },
  summary: {
    font: { bold: true, color: { rgb: "1F2937" }, size: 11 },
    fill: { fgColor: { rgb: "FEF3C7" } }, // أصفر فاتح
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "medium", color: { rgb: "000000" } },
      right: { style: "medium", color: { rgb: "000000" } }
    }
  }
};

// دالة لتطبيق الأنماط على الخلايا
const applyCellStyle = (ws: XLSX.WorkSheet, cellRef: string, style: any) => {
  if (!ws[cellRef]) ws[cellRef] = {};
  ws[cellRef].s = style;
};

// دالة لتطبيق الأنماط على نطاق من الخلايا
const applyRangeStyle = (ws: XLSX.WorkSheet, range: string, style: any) => {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row++) {
    for (let col = decoded.s.c; col <= decoded.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      applyCellStyle(ws, cellRef, style);
    }
  }
};

// دالة لضبط عرض الأعمدة
const setColumnWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
  ws['!cols'] = widths.map(width => ({ width }));
};

// دالة للحصول على نمط الحالة
const getStatusStyle = (status: Operation['status']) => {
  switch (status) {
    case 'completed_full_payment':
      return EXCEL_STYLES.status.fullPayment;
    case 'completed_partial_payment':
      return EXCEL_STYLES.status.partialPayment;
    case 'completed_overpaid':
      return EXCEL_STYLES.status.overpaid;
    case 'completed':
      return EXCEL_STYLES.status.completed;
    case 'in_progress':
      return EXCEL_STYLES.status.inProgress;
    default:
      return EXCEL_STYLES.data;
  }
};

// دالة للحصول على تسمية الحالة
const getStatusLabel = (status: Operation['status']) => {
  const statusLabels = {
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتملة',
    'completed_partial_payment': 'مكتملة - دفع جزئي',
    'completed_full_payment': 'مكتملة ومدفوعة بالكامل',
    'completed_overpaid': 'مكتملة - سداد بالزيادة'
  };
  return statusLabels[status];
};

// دوال تصدير Word محسنة مع Fallback
const createWordDocument = async (content: string, filename: string): Promise<boolean> => {
  try {
    // استخدام HTML-to-Word converter بدلاً من docx
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.warn('Word export failed:', error);
    return false;
  }
};

const fallbackToHTML = (content: string, filename: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تقرير</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace('.docx', '.html');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportOperationsToExcel = (operations: Operation[], clients: Client[], title: string = 'تقرير العمليات') => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  // إعداد البيانات
  const data = operations.map(operation => {
    const totalDeductions = calculateTotalDeductions(operation);
    const netAmount = calculateNetAmount(operation);
    const totalPaid = operation.totalReceived + totalDeductions;
    const remainingAmount = operation.totalAmount - totalPaid;

    return {
      'كود العملية': operation.code,
      'اسم العملية': operation.name,
      'العميل': getClientName(operation.clientId),
      'القيمة الإجمالية': operation.totalAmount,
      'الخصومات': totalDeductions,
      'الصافي المستحق': netAmount,
      'المبلغ المحصل': operation.totalReceived,
      'إجمالي المسدد': totalPaid,
      'المبلغ المتبقي': remainingAmount,
      'نسبة الإنجاز': `${operation.overallExecutionPercentage.toFixed(1)}%`,
      'الحالة': getStatusLabel(operation.status),
      'تاريخ الإنشاء': formatDate(operation.createdAt)
    };
  });

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(data);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' }); // سطر فارغ

  // تحديث نطاق البيانات
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  range.s.r = 3; // البدء من الصف الرابع
  ws['!ref'] = XLSX.utils.encode_range(range);

  // تطبيق الأنماط
  // عنوان التقرير
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(data[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  data.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      
      // تطبيق أنماط مختلفة حسب نوع البيانات
      if (colIndex === headers.indexOf('القيمة الإجمالية') || 
          colIndex === headers.indexOf('الصافي المستحق') || 
          colIndex === headers.indexOf('المبلغ المحصل') ||
          colIndex === headers.indexOf('إجمالي المسدد')) {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.currency);
      } else if (colIndex === headers.indexOf('الخصومات') || 
                 colIndex === headers.indexOf('المبلغ المتبقي')) {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.negative);
      } else if (colIndex === headers.indexOf('الحالة')) {
        const operation = operations[rowIndex];
        applyCellStyle(ws, cellRef, getStatusStyle(operation.status));
      } else {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
      }
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [15, 25, 20, 15, 12, 15, 15, 15, 15, 12, 20, 12]);

  // إضافة ملخص في النهاية
  const summaryStartRow = data.length + 6;
  const totalAmount = operations.reduce((sum, op) => sum + op.totalAmount, 0);
  const totalReceived = operations.reduce((sum, op) => sum + op.totalReceived, 0);
  const totalDeductions = operations.reduce((sum, op) => sum + calculateTotalDeductions(op), 0);
  const totalPaid = totalReceived + totalDeductions;

  const summaryData = [
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['الملخص الإجمالي', '', '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي العمليات:', operations.length, '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي القيمة:', formatCurrency(totalAmount), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المحصل:', formatCurrency(totalReceived), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي الخصومات:', formatCurrency(totalDeductions), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المسدد:', formatCurrency(totalPaid), '', '', '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 6; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.currency);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'العمليات');
  
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportClientsToExcel = (clients: Client[], title: string = 'تقرير العملاء') => {
  const getClientTypeLabel = (type: string) => {
    const types = {
      'owner': 'مالك',
      'main_contractor': 'مقاول رئيسي',
      'consultant': 'استشاري'
    };
    return types[type as keyof typeof types] || type;
  };

  // إعداد البيانات
  const data = clients.map(client => {
    const mainContact = client.contacts?.find(contact => contact.isMainContact);
    
    return {
      'اسم العميل': client.name,
      'نوع العميل': getClientTypeLabel(client.type),
      'رقم الهاتف': client.phone || '-',
      'البريد الإلكتروني': client.email || '-',
      'العنوان': client.address || '-',
      'جهة الاتصال الرئيسية': mainContact?.name || '-',
      'منصب جهة الاتصال': mainContact?.position || '-',
      'هاتف جهة الاتصال': mainContact?.phone || '-',
      'عدد جهات الاتصال': client.contacts?.length || 0,
      'تاريخ الإضافة': formatDate(client.createdAt)
    };
  });

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(data);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' });

  // تطبيق الأنماط
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(data[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  data.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [25, 15, 15, 25, 30, 20, 20, 15, 12, 12]);

  // إضافة ملخص
  const summaryStartRow = data.length + 6;
  const summaryData = [
    ['', '', '', '', '', '', '', '', '', ''],
    ['الملخص الإجمالي', '', '', '', '', '', '', '', '', ''],
    ['إجمالي العملاء:', clients.length, '', '', '', '', '', '', '', ''],
    ['المالكين:', clients.filter(c => c.type === 'owner').length, '', '', '', '', '', '', '', ''],
    ['المقاولين الرئيسيين:', clients.filter(c => c.type === 'main_contractor').length, '', '', '', '', '', '', '', ''],
    ['الاستشاريين:', clients.filter(c => c.type === 'consultant').length, '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 5; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.data);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportFinancialReportToExcel = (operations: Operation[], clients: Client[]) => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  // إعداد البيانات المالية
  const data = operations.map(operation => {
    const totalDeductions = calculateTotalDeductions(operation);
    const netAmount = calculateNetAmount(operation);
    const totalPaid = operation.totalReceived + totalDeductions;
    const remainingAmount = operation.totalAmount - totalPaid;
    const paymentRate = operation.totalAmount > 0 ? (totalPaid / operation.totalAmount) * 100 : 0;

    return {
      'العملية': operation.name,
      'العميل': getClientName(operation.clientId),
      'القيمة الإجمالية': operation.totalAmount,
      'المبلغ المنفذ': operation.items.reduce((sum, item) => sum + (item.amount * item.executionPercentage / 100), 0),
      'إجمالي الخصومات': totalDeductions,
      'الصافي المستحق': netAmount,
      'المبلغ المحصل نقداً': operation.totalReceived,
      'إجمالي المسدد': totalPaid,
      'المبلغ المتبقي': remainingAmount,
      'معدل السداد': `${paymentRate.toFixed(1)}%`,
      'نسبة التنفيذ': `${operation.overallExecutionPercentage.toFixed(1)}%`,
      'الحالة': getStatusLabel(operation.status)
    };
  });

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(data);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [['التقرير المالي الشامل']], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' });

  // تطبيق الأنماط
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(data[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  data.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      
      // تطبيق أنماط مختلفة حسب نوع البيانات
      if (headers[colIndex].includes('القيمة') || 
          headers[colIndex].includes('المبلغ') || 
          headers[colIndex].includes('الصافي')) {
        if (headers[colIndex].includes('المتبقي') || headers[colIndex].includes('الخصومات')) {
          applyCellStyle(ws, cellRef, EXCEL_STYLES.negative);
        } else {
          applyCellStyle(ws, cellRef, EXCEL_STYLES.currency);
        }
      } else if (headers[colIndex] === 'الحالة') {
        const operation = operations[rowIndex];
        applyCellStyle(ws, cellRef, getStatusStyle(operation.status));
      } else {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
      }
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [25, 20, 15, 15, 15, 15, 15, 15, 15, 12, 12, 20]);

  // إضافة ملخص مالي شامل
  const summaryStartRow = data.length + 6;
  const totalAmount = operations.reduce((sum, op) => sum + op.totalAmount, 0);
  const totalReceived = operations.reduce((sum, op) => sum + op.totalReceived, 0);
  const totalDeductions = operations.reduce((sum, op) => sum + calculateTotalDeductions(op), 0);
  const totalNet = operations.reduce((sum, op) => sum + calculateNetAmount(op), 0);
  const totalPaid = totalReceived + totalDeductions;
  const totalRemaining = totalAmount - totalPaid;
  const overallPaymentRate = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const summaryData = [
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['الملخص المالي الإجمالي', '', '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي قيمة العمليات:', formatCurrency(totalAmount), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي الخصومات:', formatCurrency(totalDeductions), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي الصافي المستحق:', formatCurrency(totalNet), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المحصل نقداً:', formatCurrency(totalReceived), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المسدد (نقدي + خصومات):', formatCurrency(totalPaid), '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المبلغ المتبقي:', formatCurrency(totalRemaining), '', '', '', '', '', '', '', '', '', ''],
    ['معدل السداد الإجمالي:', `${overallPaymentRate.toFixed(1)}%`, '', '', '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 8; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.currency);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'التقرير المالي');
  
  const fileName = `التقرير_المالي_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportGuaranteesToExcel = (operations: Operation[], clients: Client[]) => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  // جمع جميع الضمانات
  const allGuarantees: any[] = [];

  operations.forEach(operation => {
    // شيكات الضمان
    operation.guaranteeChecks.forEach(check => {
      allGuarantees.push({
        'نوع الضمان': 'شيك ضمان',
        'رقم الضمان': check.checkNumber,
        'المبلغ': check.amount,
        'البنك': check.bank,
        'العميل': getClientName(operation.clientId),
        'العملية': operation.name,
        'تاريخ الإصدار': formatDate(check.checkDate),
        'تاريخ التسليم': formatDate(check.deliveryDate),
        'تاريخ الانتهاء': formatDate(check.expiryDate),
        'الحالة': check.isReturned ? 'مُسترد' : 'قائم',
        'تاريخ الاسترداد': check.returnDate ? formatDate(check.returnDate) : '-'
      });
    });

    // خطابات الضمان
    operation.guaranteeLetters.forEach(letter => {
      allGuarantees.push({
        'نوع الضمان': 'خطاب ضمان',
        'رقم الضمان': letter.letterNumber,
        'المبلغ': letter.amount,
        'البنك': letter.bank,
        'العميل': getClientName(operation.clientId),
        'العملية': operation.name,
        'تاريخ الإصدار': formatDate(letter.letterDate),
        'تاريخ التسليم': '-',
        'تاريخ الانتهاء': formatDate(letter.dueDate),
        'الحالة': letter.isReturned ? 'مُسترد' : 'قائم',
        'تاريخ الاسترداد': letter.returnDate ? formatDate(letter.returnDate) : '-'
      });
    });
  });

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(allGuarantees);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [['تقرير الضمانات الشامل']], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' });

  // تطبيق الأنماط
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(allGuarantees[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  allGuarantees.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      
      if (headers[colIndex] === 'المبلغ') {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.currency);
      } else if (headers[colIndex] === 'الحالة') {
        const isReturned = value === 'مُسترد';
        applyCellStyle(ws, cellRef, isReturned ? EXCEL_STYLES.status.completed : EXCEL_STYLES.status.inProgress);
      } else {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
      }
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [15, 15, 12, 20, 20, 25, 12, 12, 12, 10, 12]);

  // إضافة ملخص
  const summaryStartRow = allGuarantees.length + 6;
  const totalGuarantees = allGuarantees.length;
  const activeGuarantees = allGuarantees.filter(g => g['الحالة'] === 'قائم').length;
  const returnedGuarantees = allGuarantees.filter(g => g['الحالة'] === 'مُسترد').length;
  const totalAmount = allGuarantees.reduce((sum, g) => sum + (g['المبلغ'] || 0), 0);

  const summaryData = [
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['ملخص الضمانات', '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي الضمانات:', totalGuarantees, '', '', '', '', '', '', '', '', ''],
    ['الضمانات القائمة:', activeGuarantees, '', '', '', '', '', '', '', '', ''],
    ['الضمانات المستردة:', returnedGuarantees, '', '', '', '', '', '', '', '', ''],
    ['إجمالي قيمة الضمانات:', formatCurrency(totalAmount), '', '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 5; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.currency);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الضمانات');
  
  const fileName = `تقرير_الضمانات_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportWarrantyCertificatesToExcel = (operations: Operation[], clients: Client[]) => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  const getItemName = (operationId: string, itemId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return 'بند غير معروف';
    const item = operation.items.find(item => item.id === itemId);
    return item ? item.description : 'بند غير معروف';
  };

  // جمع جميع شهادات الضمان
  const allWarranties: any[] = [];

  operations.forEach(operation => {
    (operation.warrantyCertificates || []).forEach(warranty => {
      const isExpired = new Date(warranty.endDate) < new Date();
      
      allWarranties.push({
        'رقم الشهادة': warranty.certificateNumber,
        'العميل': getClientName(operation.clientId),
        'العملية': operation.name,
        'البند': warranty.relatedTo === 'item' && warranty.relatedItemId 
          ? getItemName(operation.id, warranty.relatedItemId)
          : 'العملية كاملة',
        'وصف الضمان': warranty.description,
        'تاريخ الإصدار': formatDate(warranty.issueDate),
        'تاريخ البداية': formatDate(warranty.startDate),
        'تاريخ النهاية': formatDate(warranty.endDate),
        'مدة الضمان (شهر)': warranty.warrantyPeriodMonths,
        'الحالة': warranty.isActive && !isExpired ? 'نشط' : 'منتهي',
        'ملاحظات': warranty.notes || '-'
      });
    });
  });

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(allWarranties);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [['تقرير شهادات الضمان']], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' });

  // تطبيق الأنماط
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(allWarranties[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  allWarranties.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      
      if (headers[colIndex] === 'الحالة') {
        const isActive = value === 'نشط';
        applyCellStyle(ws, cellRef, isActive ? EXCEL_STYLES.status.completed : EXCEL_STYLES.status.inProgress);
      } else {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
      }
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [15, 20, 25, 25, 30, 12, 12, 12, 10, 10, 20]);

  // إضافة ملخص
  const summaryStartRow = allWarranties.length + 6;
  const totalWarranties = allWarranties.length;
  const activeWarranties = allWarranties.filter(w => w['الحالة'] === 'نشط').length;
  const expiredWarranties = allWarranties.filter(w => w['الحالة'] === 'منتهي').length;

  const summaryData = [
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['ملخص شهادات الضمان', '', '', '', '', '', '', '', '', '', ''],
    ['إجمالي الشهادات:', totalWarranties, '', '', '', '', '', '', '', '', ''],
    ['الشهادات النشطة:', activeWarranties, '', '', '', '', '', '', '', '', ''],
    ['الشهادات المنتهية:', expiredWarranties, '', '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 4; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.data);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'شهادات الضمان');
  
  const fileName = `تقرير_شهادات_الضمان_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportChecksAndPaymentsToExcel = (operations: Operation[], clients: Client[]) => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  // جمع جميع المدفوعات
  const allPayments = operations.flatMap(operation => 
    operation.receivedPayments.map(payment => ({
      'نوع الدفع': payment.type === 'check' ? 'شيك' : 'نقدي',
      'المبلغ': payment.amount,
      'التاريخ': formatDate(payment.date),
      'العميل': getClientName(operation.clientId),
      'العملية': operation.name,
      'رقم الشيك': payment.checkNumber || '-',
      'البنك': payment.bank || '-',
      'تاريخ الاستلام': payment.receiptDate ? formatDate(payment.receiptDate) : '-',
      'الحالة': payment.type === 'check' 
        ? (payment.receiptDate ? 'مستلم' : 'معلق')
        : 'مستلم',
      'ملاحظات': payment.notes || '-'
    }))
  );

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(allPayments);

  // إضافة عنوان التقرير
  XLSX.utils.sheet_add_aoa(ws, [['تقرير الشيكات والمدفوعات']], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [['تاريخ التقرير: ' + formatDate(new Date())]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A3' });

  // تطبيق الأنماط
  applyCellStyle(ws, 'A1', EXCEL_STYLES.title);
  applyCellStyle(ws, 'A2', EXCEL_STYLES.subHeader);

  // رؤوس الأعمدة
  const headers = Object.keys(allPayments[0] || {});
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    applyCellStyle(ws, cellRef, EXCEL_STYLES.header);
  });

  // بيانات الجدول
  allPayments.forEach((row, rowIndex) => {
    Object.values(row).forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      
      if (headers[colIndex] === 'المبلغ') {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.currency);
      } else if (headers[colIndex] === 'الحالة') {
        const isReceived = value === 'مستلم';
        applyCellStyle(ws, cellRef, isReceived ? EXCEL_STYLES.status.completed : EXCEL_STYLES.status.inProgress);
      } else {
        applyCellStyle(ws, cellRef, EXCEL_STYLES.data);
      }
    });
  });

  // ضبط عرض الأعمدة
  setColumnWidths(ws, [12, 15, 12, 20, 25, 15, 20, 12, 10, 20]);

  // إضافة ملخص
  const summaryStartRow = allPayments.length + 6;
  const totalAmount = allPayments.reduce((sum, payment) => sum + payment['المبلغ'], 0);
  const totalChecks = allPayments.filter(p => p['نوع الدفع'] === 'شيك').length;
  const totalCash = allPayments.filter(p => p['نوع الدفع'] === 'نقدي').length;
  const pendingChecks = allPayments.filter(p => p['نوع الدفع'] === 'شيك' && p['الحالة'] === 'معلق').length;

  const summaryData = [
    ['', '', '', '', '', '', '', '', '', ''],
    ['ملخص المدفوعات', '', '', '', '', '', '', '', '', ''],
    ['إجمالي المبلغ:', formatCurrency(totalAmount), '', '', '', '', '', '', '', ''],
    ['عدد الشيكات:', totalChecks, '', '', '', '', '', '', '', ''],
    ['المدفوعات النقدية:', totalCash, '', '', '', '', '', '', '', ''],
    ['الشيكات المعلقة:', pendingChecks, '', '', '', '', '', '', '', '']
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${summaryStartRow}` });

  // تطبيق أنماط الملخص
  applyCellStyle(ws, `A${summaryStartRow + 1}`, EXCEL_STYLES.summary);
  for (let i = 2; i <= 5; i++) {
    applyCellStyle(ws, `A${summaryStartRow + i}`, EXCEL_STYLES.subHeader);
    applyCellStyle(ws, `B${summaryStartRow + i}`, EXCEL_STYLES.currency);
  }

  // إنشاء المصنف وحفظه
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الشيكات والمدفوعات');
  
  const fileName = `تقرير_الشيكات_والمدفوعات_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// دوال تصدير Word محسنة مع Fallback
export const exportOperationsToWord = async (operations: Operation[], clients: Client[], title: string = 'تقرير العمليات') => {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  const content = `
    <div class="header">
      <h1>${title}</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>كود العملية</th>
          <th>اسم العملية</th>
          <th>العميل</th>
          <th>القيمة الإجمالية</th>
          <th>المبلغ المحصل</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${operations.map(operation => `
          <tr>
            <td>${operation.code}</td>
            <td>${operation.name}</td>
            <td>${getClientName(operation.clientId)}</td>
            <td>${formatCurrency(operation.totalAmount)}</td>
            <td>${formatCurrency(operation.totalReceived)}</td>
            <td>${getStatusLabel(operation.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="summary">
      <h3>الملخص الإجمالي</h3>
      <p>إجمالي العمليات: ${operations.length}</p>
      <p>إجمالي القيمة: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalAmount, 0))}</p>
      <p>إجمالي المحصل: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalReceived, 0))}</p>
    </div>
  `;

  const success = await createWordDocument(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportClientsToWord = async (clients: Client[], title: string = 'تقرير العملاء') => {
  const getClientTypeLabel = (type: string) => {
    const types = {
      'owner': 'مالك',
      'main_contractor': 'مقاول رئيسي',
      'consultant': 'استشاري'
    };
    return types[type as keyof typeof types] || type;
  };

  const content = `
    <div class="header">
      <h1>${title}</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>اسم العميل</th>
          <th>نوع العميل</th>
          <th>رقم الهاتف</th>
          <th>البريد الإلكتروني</th>
          <th>العنوان</th>
        </tr>
      </thead>
      <tbody>
        ${clients.map(client => `
          <tr>
            <td>${client.name}</td>
            <td>${getClientTypeLabel(client.type)}</td>
            <td>${client.phone || '-'}</td>
            <td>${client.email || '-'}</td>
            <td>${client.address || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="summary">
      <h3>الملخص الإجمالي</h3>
      <p>إجمالي العملاء: ${clients.length}</p>
      <p>المالكين: ${clients.filter(c => c.type === 'owner').length}</p>
      <p>المقاولين الرئيسيين: ${clients.filter(c => c.type === 'main_contractor').length}</p>
      <p>الاستشاريين: ${clients.filter(c => c.type === 'consultant').length}</p>
    </div>
  `;

  const success = await createWordDocument(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportFinancialReportToWord = async (operations: Operation[], clients: Client[]) => {
  const content = `
    <div class="header">
      <h1>التقرير المالي الشامل</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <h3>الملخص المالي الإجمالي</h3>
      <p>إجمالي قيمة العمليات: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalAmount, 0))}</p>
      <p>إجمالي المحصل: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalReceived, 0))}</p>
      <p>إجمالي الخصومات: ${formatCurrency(operations.reduce((sum, op) => sum + calculateTotalDeductions(op), 0))}</p>
    </div>
  `;

  const success = await createWordDocument(content, `التقرير_المالي_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `التقرير_المالي_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportDetailedGuaranteesReportToWord = async (operations: Operation[], clients: Client[]) => {
  const content = `
    <div class="header">
      <h1>تقرير الضمانات المفصل</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <h3>ملخص الضمانات</h3>
      <p>إجمالي شيكات الضمان: ${operations.reduce((sum, op) => sum + op.guaranteeChecks.length, 0)}</p>
      <p>إجمالي خطابات الضمان: ${operations.reduce((sum, op) => sum + op.guaranteeLetters.length, 0)}</p>
    </div>
  `;

  const success = await createWordDocument(content, `تقرير_الضمانات_المفصل_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `تقرير_الضمانات_المفصل_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportWarrantyCertificatesReportToWord = async (operations: Operation[], clients: Client[]) => {
  const content = `
    <div class="header">
      <h1>تقرير شهادات الضمان</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <h3>ملخص شهادات الضمان</h3>
      <p>إجمالي الشهادات: ${operations.reduce((sum, op) => sum + (op.warrantyCertificates || []).length, 0)}</p>
    </div>
  `;

  const success = await createWordDocument(content, `تقرير_شهادات_الضمان_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `تقرير_شهادات_الضمان_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportChecksAndPaymentsToWord = async (operations: Operation[], clients: Client[]) => {
  const content = `
    <div class="header">
      <h1>تقرير الشيكات والمدفوعات</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <h3>ملخص المدفوعات</h3>
      <p>إجمالي المدفوعات: ${operations.reduce((sum, op) => sum + op.receivedPayments.length, 0)}</p>
    </div>
  `;

  const success = await createWordDocument(content, `تقرير_الشيكات_والمدفوعات_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `تقرير_الشيكات_والمدفوعات_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

export const exportOperationDetailsToWord = async (operation: Operation, client: Client) => {
  const content = `
    <div class="header">
      <h1>تفاصيل العملية: ${operation.name}</h1>
      <p>كود العملية: ${operation.code}</p>
      <p>العميل: ${client.name}</p>
    </div>
    
    <div class="summary">
      <h3>الملخص المالي</h3>
      <p>القيمة الإجمالية: ${formatCurrency(operation.totalAmount)}</p>
      <p>المبلغ المحصل: ${formatCurrency(operation.totalReceived)}</p>
      <p>نسبة الإنجاز: ${operation.overallExecutionPercentage.toFixed(1)}%</p>
    </div>
  `;

  const success = await createWordDocument(content, `تفاصيل_العملية_${operation.code}_${new Date().toISOString().split('T')[0]}.docx`);
  
  if (!success) {
    fallbackToHTML(content, `تفاصيل_العملية_${operation.code}_${new Date().toISOString().split('T')[0]}.docx`);
  }
};

// دوال PDF (تبقى كما هي مع إضافة console.log للتنبيه)
export const exportOperationsToPDF = (operations: Operation[], clients: Client[], title: string = 'تقرير العمليات') => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'عميل غير معروف';
  };

  const content = `
    <div class="header">
      <h1>${title}</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>كود العملية</th>
          <th>اسم العملية</th>
          <th>العميل</th>
          <th>القيمة الإجمالية</th>
          <th>المبلغ المحصل</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${operations.map(operation => `
          <tr>
            <td>${operation.code}</td>
            <td>${operation.name}</td>
            <td>${getClientName(operation.clientId)}</td>
            <td>${formatCurrency(operation.totalAmount)}</td>
            <td>${formatCurrency(operation.totalReceived)}</td>
            <td>${getStatusLabel(operation.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  fallbackToHTML(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportClientsToPDF = (clients: Client[], title: string = 'تقرير العملاء') => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const getClientTypeLabel = (type: string) => {
    const types = {
      'owner': 'مالك',
      'main_contractor': 'مقاول رئيسي',
      'consultant': 'استشاري'
    };
    return types[type as keyof typeof types] || type;
  };

  const content = `
    <div class="header">
      <h1>${title}</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>اسم العميل</th>
          <th>نوع العميل</th>
          <th>رقم الهاتف</th>
          <th>البريد الإلكتروني</th>
        </tr>
      </thead>
      <tbody>
        ${clients.map(client => `
          <tr>
            <td>${client.name}</td>
            <td>${getClientTypeLabel(client.type)}</td>
            <td>${client.phone || '-'}</td>
            <td>${client.email || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  fallbackToHTML(content, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportFinancialReportToPDF = (operations: Operation[], clients: Client[]) => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const content = `
    <div class="header">
      <h1>التقرير المالي الشامل</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
    
    <div class="summary">
      <h3>الملخص المالي الإجمالي</h3>
      <p>إجمالي قيمة العمليات: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalAmount, 0))}</p>
      <p>إجمالي المحصل: ${formatCurrency(operations.reduce((sum, op) => sum + op.totalReceived, 0))}</p>
    </div>
  `;

  fallbackToHTML(content, `التقرير_المالي_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportDetailedGuaranteesReportToPDF = (operations: Operation[], clients: Client[]) => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const content = `
    <div class="header">
      <h1>تقرير الضمانات المفصل</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
  `;

  fallbackToHTML(content, `تقرير_الضمانات_المفصل_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportWarrantyCertificatesReportToPDF = (operations: Operation[], clients: Client[]) => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const content = `
    <div class="header">
      <h1>تقرير شهادات الضمان</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
  `;

  fallbackToHTML(content, `تقرير_شهادات_الضمان_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportChecksAndPaymentsToPDF = (operations: Operation[], clients: Client[]) => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const content = `
    <div class="header">
      <h1>تقرير الشيكات والمدفوعات</h1>
      <p>تاريخ التقرير: ${formatDate(new Date())}</p>
    </div>
  `;

  fallbackToHTML(content, `تقرير_الشيكات_والمدفوعات_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportOperationDetailsToPDF = (operation: Operation, client: Client) => {
  console.log('PDF export functionality - using HTML fallback for now');
  
  const content = `
    <div class="header">
      <h1>تفاصيل العملية: ${operation.name}</h1>
      <p>كود العملية: ${operation.code}</p>
      <p>العميل: ${client.name}</p>
    </div>
  `;

  fallbackToHTML(content, `تفاصيل_العملية_${operation.code}_${new Date().toISOString().split('T')[0]}.pdf`);
};