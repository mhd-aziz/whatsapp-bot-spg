#!/bin/bash
echo "🚀 WhatsApp Bot SPG - Quick Start"
echo "================================="

echo "1. Installing dependencies..."
npm install

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

echo "4. Starting bot..."
echo "📱 WAIT for QR code to appear..."
echo "📱 Then scan with WhatsApp on your phone:"
echo "   Settings → Linked Devices → Link a Device"
echo "================================="

npm start
