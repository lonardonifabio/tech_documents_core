#!/bin/bash

# Script to safely start Ollama service by killing any existing instances first
# This fixes the "address already in use" error

echo "🔧 Checking for existing Ollama processes..."

# Kill any existing Ollama processes
pkill -f "ollama serve" || true
pkill -f "ollama" || true

# Wait a moment for processes to terminate
sleep 2

# Check if port 11434 is still in use and kill the process using it
if lsof -Pi :11434 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🔧 Port 11434 is still in use. Killing process..."
    lsof -ti:11434 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Verify port is free
if lsof -Pi :11434 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Failed to free port 11434. Manual intervention required."
    exit 1
fi

echo "✅ Port 11434 is now available"

# Start Ollama service
echo "🚀 Starting Ollama service..."
ollama serve &

# Wait for service to start
echo "⏳ Waiting for Ollama service to start..."
sleep 5

# Check if service is running
if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Ollama service started successfully"
else
    echo "❌ Ollama service failed to start"
    exit 1
fi

echo "🎉 Ollama service is ready!"
