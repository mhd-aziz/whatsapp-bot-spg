#!/bin/bash
echo "🚀 WhatsApp Bot SPG - Quick Start"
echo "================================="

echo "1. Installing dependencies..."
npm install --legacy-peer-deps || npm install

echo "2. Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "⚠️ .env already exists"
fi

echo "3. Creating data directories..."
mkdir -p data/photos
touch data/attendance.json
touch data/customers.json

echo "4. Verifying all modules..."
echo "Validating code syntax and loading..."

# Run verification
if node -e "require('./src/config'); require('./src/utils/helpers'); require('./src/services/dataService'); require('./src/handlers/commandHandler'); console.log('✅ All modules verified successfully')"; then
  echo "✅ Module verification passed"
else
  echo "❌ Module verification failed"
  exit 1
fi

echo "5. Checking critical files..."
if node --check src/app.js src/handlers/adminHandler.js src/handlers/attendanceHandler.js src/handlers/commandHandler.js; then
  echo "✅ All critical files passed syntax check"
else
  echo "❌ Syntax errors found"
  exit 1
fi

echo "================================="
echo "✅ Setup complete!"
echo "✅ Bot ready for deployment!"
echo "================================="
