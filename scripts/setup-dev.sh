#!/bin/bash

# Setup script for development environment

echo "🚀 Setting up RAG Document Search System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm >= 9.0.0"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment files
if [ ! -f "apps/server/.env" ]; then
    echo "📝 Creating server .env file..."
    cp apps/server/.env.example apps/server/.env
    echo "⚠️  Please edit apps/server/.env with your configuration"
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo "📝 Creating web .env.local file..."
    cp apps/web/.env.example apps/web/.env.local
    echo "⚠️  Please edit apps/web/.env.local with your configuration"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker found: $(docker --version)"
    echo ""
    echo "🐳 To start supporting services (MongoDB, Qdrant, MinIO), run:"
    echo "   docker-compose up -d mongodb qdrant minio"
else
    echo "⚠️  Docker not found. You'll need to manually install:"
    echo "   - MongoDB"
    echo "   - Qdrant"
    echo "   - MinIO or configure S3"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start supporting services (if using Docker):"
echo "   docker-compose up -d mongodb qdrant minio"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000/setup to configure the system"
echo ""
echo "For Ollama support (local LLM), install Ollama from https://ollama.ai"
echo "Then run: ollama pull llama3 && ollama pull nomic-embed-text"

