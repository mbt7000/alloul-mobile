#!/bin/bash

echo "📱 بدء بناء iOS و رفع على TestFlight"
echo "=========================================="

# تهيئة EAS
if ! grep -q "\"eas\"" eas.json 2>/dev/null; then
    echo "🔧 تهيئة EAS..."
    echo '{
  "build": {
    "production": {
      "ios": {
        "buildType": "app-store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6761030587"
      }
    }
  }
}' > eas.json
fi

# بناء iOS
echo ""
echo "🔨 بناء iOS..."
eas build --platform ios --auto-submit

echo ""
echo "✅ اكتمل! تحقق من TestFlight:"
echo "https://testflight.apple.com"
