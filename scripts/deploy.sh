#!/bin/bash

echo "🚀 بدء نشر مشروع ALLOUL&Q"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ALLOUL&Q"
APP_VERSION="1.0.0"
BUILD_NUMBER=$(date +%s)

echo -e "${BLUE}📱 المرحلة 1: بناء و رفع iOS على TestFlight${NC}"
echo "=================================="

# Build for iOS
echo -e "${YELLOW}⏳ جاري بناء iOS...${NC}"
cd "$(dirname "$0")/.."

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}📦 تثبيت EAS CLI...${NC}"
    npm install -g eas-cli
fi

# Build for iOS
echo -e "${YELLOW}⏳ جاري البناء مع EAS Build...${NC}"
eas build --platform ios --auto-submit

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ تم بناء iOS بنجاح!${NC}"
else
    echo -e "${YELLOW}⚠️  فشل بناء iOS - تحقق من الأخطاء أعلاه${NC}"
fi

echo ""
echo -e "${BLUE}🌐 المرحلة 2: نشر الويب على Vercel${NC}"
echo "=================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 تثبيت Vercel CLI...${NC}"
    npm install -g vercel
fi

# Navigate to web directory
if [ -d "web" ]; then
    cd web
    
    echo -e "${YELLOW}⏳ جاري نشر الويب على Vercel...${NC}"
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ تم نشر الويب بنجاح!${NC}"
    else
        echo -e "${YELLOW}⚠️  فشل النشر على Vercel${NC}"
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️  لم يتم العثور على مجلد web${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo "✨ اكتمل النشر!"
echo "=================================="
echo ""
echo -e "${BLUE}📊 ملخص النشر:${NC}"
echo "📱 iOS: جاري الرفع على TestFlight"
echo "🌐 Web: منشور على Vercel"
echo ""
echo -e "${YELLOW}التالي:${NC}"
echo "1. تحقق من TestFlight: https://testflight.apple.com"
echo "2. تحقق من الويب على Vercel Dashboard"
echo "3. شارك رابط TestFlight مع الفريق"
