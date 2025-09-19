#!/bin/bash

echo "🔧 Testing TypeScript build after Bitcoin fixes..."
echo ""

# Clean and build
echo "📦 Running npm run build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Key files compiled:"
    echo "   • bitcoin-listener.ts → bitcoin-listener.js"
    echo "   • confirmation-tracker.ts → confirmation-tracker.js" 
    echo "   • blockchain-monitor-service.ts → blockchain-monitor-service.js"
    echo ""
    echo "🚀 Ready to restart server with Bitcoin fixes!"
else
    echo ""
    echo "❌ Build failed! Check errors above."
    exit 1
fi
