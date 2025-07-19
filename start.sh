#!/bin/bash

# نظام إدارة العمليات الإنشائية
# ملف تشغيل للأنظمة Unix/Linux/Mac

clear
echo "========================================"
echo "   نظام إدارة العمليات الإنشائية"
echo "========================================"
echo ""
echo "جاري تشغيل البرنامج..."
echo ""

# الانتقال لمجلد المشروع
cd "$(dirname "$0")"

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ خطأ: Node.js غير مثبت على النظام"
    echo ""
    echo "يرجى تثبيت Node.js من الرابط التالي:"
    echo "https://nodejs.org"
    echo ""
    read -p "اضغط Enter للمتابعة..."
    exit 1
fi

# التحقق من وجود مجلد project
if [ ! -d "project" ]; then
    echo "❌ خطأ: مجلد project غير موجود"
    echo "تأكد من وجود ملفات المشروع في مجلد project"
    echo ""
    read -p "اضغط Enter للمتابعة..."
    exit 1
fi

cd project

# التحقق من وجود package.json
if [ ! -f "package.json" ]; then
    echo "❌ خطأ: ملف package.json غير موجود"
    echo "تأكد من وجود ملفات المشروع الصحيحة"
    echo ""
    read -p "اضغط Enter للمتابعة..."
    exit 1
fi

# التحقق من تثبيت المكتبات
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت المكتبات للمرة الأولى..."
    echo "هذا قد يستغرق بضع دقائق..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ خطأ في تثبيت المكتبات"
        echo ""
        read -p "اضغط Enter للمتابعة..."
        exit 1
    fi
    echo "✅ تم تثبيت المكتبات بنجاح"
    echo ""
fi

echo "🚀 تشغيل البرنامج..."
echo ""
echo "ستفتح نافذة المتصفح تلقائياً على:"
echo "http://localhost:5173"
echo ""
echo "⚠️  لا تغلق هذه النافذة أثناء استخدام البرنامج"
echo ""

# فتح المتصفح (حسب النظام)
if command -v xdg-open &> /dev/null; then
    # Linux
    sleep 3 && xdg-open "http://localhost:5173" &
elif command -v open &> /dev/null; then
    # macOS
    sleep 3 && open "http://localhost:5173" &
fi

# تشغيل البرنامج
npm run dev