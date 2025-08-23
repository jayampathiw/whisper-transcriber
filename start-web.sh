#!/bin/bash

# Whisper Transcriber Web App Launcher
echo "🚀 Starting Whisper Transcriber Web Application..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

# Check if Python dependencies are installed
echo "🔍 Checking dependencies..."
node scripts/check-dependencies.js

# If dependencies check fails, offer to run setup
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Dependencies not installed properly."
    echo "Would you like to run the setup script? (y/n)"
    read -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node scripts/setup.js
    else
        echo "Please install dependencies manually and try again."
        exit 1
    fi
fi

echo ""
echo "✅ All dependencies verified!"
echo ""
echo "🌐 Starting web server..."
echo "📱 Open your browser at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the web server
npm run web