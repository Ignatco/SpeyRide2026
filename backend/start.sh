#!/bin/bash
set -e
echo "Starting Spey Ride backend..."

# Check Python
python3 --version || { echo "Python 3 required"; exit 1; }

# Install deps if needed
pip install -r requirements.txt -q

# Check .env
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Check MongoDB
python3 -c "
import os, asyncio
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
async def check():
    url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=3000)
    try:
        await client.admin.command('ping')
        print('✓ MongoDB connected:', url.split('@')[-1][:40])
    except Exception as e:
        print('✗ MongoDB connection failed:', str(e)[:80])
        print()
        print('  Fix options:')
        print('  1. Start local MongoDB:  mongod --dbpath /tmp/speyride-db')
        print('  2. Use Atlas free tier: https://cloud.mongodb.com')
        print('     Then update MONGO_URL in backend/.env')
        exit(1)
asyncio.run(check())
"

echo "Starting server on http://localhost:8001"
echo "API docs: http://localhost:8001/docs"
echo ""
uvicorn server:app --reload --port 8001 --host 0.0.0.0
