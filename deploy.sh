#!/bin/bash
echo "🚀 Starting automated sync and build..."

# 1. Ask for a commit message to keep Git clean
read -p "Enter a brief commit message: " commit_msg

# 2. Push to Git
git add .
git commit -m "$commit_msg"
git push

# 3. Rebuild and restart the Docker containers
echo "🐳 Rebuilding Docker containers..."
docker compose up -d --build

echo "✅ Done! Your changes are live."