#!/bin/bash

# Start supporting services with Docker Compose

echo "🐳 Starting supporting services..."

docker-compose up -d mongodb qdrant minio

echo ""
echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "✅ Services started!"
echo ""
echo "Service URLs:"
echo "  - MongoDB: mongodb://localhost:27017"
echo "  - Qdrant: http://localhost:6333"
echo "  - MinIO Console: http://localhost:9001 (admin/minioadmin)"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop services: docker-compose down"

