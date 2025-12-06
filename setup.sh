#!/bin/bash

echo "🚀 Truck4u - Complete Setup Script"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
echo -e "\n${YELLOW}1. Checking environment files...${NC}"
if [ ! -f "apps/api/.env" ]; then
    echo -e "${RED}❌ apps/api/.env not found!${NC}"
    echo "   Please create it from apps/api/.env.example"
    exit 1
fi
echo -e "${GREEN}✅ Environment files OK${NC}"

# Clean install
echo -e "\n${YELLOW}2. Cleaning old installations...${NC}"
rm -rf node_modules package-lock.json
rm -rf apps/web/node_modules apps/web/package-lock.json
rm -rf apps/api/node_modules apps/api/package-lock.json
rm -rf packages/database/node_modules packages/database/package-lock.json
echo -e "${GREEN}✅ Cleaned${NC}"

# Install dependencies
echo -e "\n${YELLOW}3. Installing dependencies...${NC}"
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Generate Prisma Client
echo -e "\n${YELLOW}4. Generating Prisma Client...${NC}"
cd packages/database
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma generate failed${NC}"
    exit 1
fi
cd ../..
echo -e "${GREEN}✅ Prisma Client generated${NC}"

# Check database connection
echo -e "\n${YELLOW}5. Checking database connection...${NC}"
cd packages/database
npx prisma db pull --force 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connected${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection failed (check DATABASE_URL)${NC}"
fi
cd ../..

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNext steps:"
echo "  1. Start API:  npm run dev:api"
echo "  2. Start Web:  npm run dev:web"
echo ""
