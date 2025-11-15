# 🚀 Quick Start Guide - Truck4u MVP

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js 20+ installed
- PostgreSQL 15+ running
- Redis running

### Step 1: Installation

```bash
cd truck4u-pwa
yarn install
```

### Step 2: Database Setup

```bash
# Configure database
cd packages/database
cp .env.example .env
# Edit .env with your PostgreSQL URL

# Run migrations
yarn db:push
```

### Step 3: Backend Configuration

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with minimal config:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/truck4u"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

### Step 4: Frontend Configuration

```bash
cd apps/web
cp .env.example .env
```

Edit `.env`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

### Step 5: Run Development Servers

Terminal 1 - Backend:
```bash
cd apps/api
yarn dev
```

Terminal 2 - Frontend:
```bash
cd apps/web
yarn dev
```

### Step 6: Access the App

- 🌐 Frontend: http://localhost:3000
- 📡 Backend: http://localhost:4000
- 🏥 Health Check: http://localhost:4000/health

## 📱 Testing the Flow

### 1. Register as Customer
1. Go to http://localhost:3000
2. Click "Je suis Client"
3. Enter phone: +21612345678
4. Enter name
5. Click register

### 2. Create a Ride
1. Select pickup and dropoff on map
2. Choose vehicle type
3. Add optional photos
4. Submit ride

### 3. Register as Driver
1. Open new incognito window
2. Go to http://localhost:3000
3. Click "Je suis Chauffeur"
4. Enter phone: +21687654321
5. Select vehicle type
6. Register

### 4. Upload Documents
1. Upload CIN front/back
2. Upload driving license
3. Upload vehicle registration
4. Upload 3 vehicle photos

### 5. Approve Driver (Admin)
```bash
# In another terminal, use curl or Postman
curl -X PATCH http://localhost:4000/api/admin/drivers/DRIVER_ID/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED"}'
```

### 6. Driver Places Bid
1. Driver dashboard shows available rides
2. Click on ride
3. Enter proposed price
4. Submit bid

### 7. Customer Accepts Bid
1. Customer sees bids in real-time
2. Compare prices and ratings
3. Accept best bid

### 8. Complete Ride
1. Driver updates status step by step
2. Upload proof photos
3. Complete delivery
4. Customer pays
5. Customer rates driver

## 🔧 Common Issues

### Port Already in Use
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Start Redis
brew services start redis        # macOS
sudo systemctl start redis       # Linux
```

### Module Not Found
```bash
# Clean install
rm -rf node_modules
yarn install
```

## 📦 Project Structure

```
truck4u-pwa/
├── apps/
│   ├── api/              # Backend Express.js
│   │   ├── src/
│   │   │   ├── index.ts          # Main server
│   │   │   ├── socket.ts         # WebSocket handlers
│   │   │   ├── middleware/       # Auth, rate limit
│   │   │   └── routes/           # API endpoints
│   │   └── package.json
│   └── web/              # Frontend Next.js PWA
│       ├── app/                  # Next.js 14 app dir
│       ├── lib/                  # Utilities
│       │   ├── api.ts           # API client
│       │   ├── socket.ts        # Socket.io client
│       │   └── store.ts         # Zustand state
│       └── package.json
├── packages/
│   └── database/         # Prisma schema
│       └── prisma/
│           └── schema.prisma
├── docs/
│   ├── API.md           # API documentation
│   └── DEPLOYMENT.md    # Deployment guide
└── README.md
```

## 🎯 Next Steps

1. **Add More Features**
   - Implement OTP verification
   - Add payment integrations (Paymee, Flouci)
   - Build admin dashboard
   - Add push notifications

2. **Testing**
   - Write unit tests
   - Add E2E tests
   - Load testing

3. **Deployment**
   - Set up Railway for backend
   - Deploy to Vercel for frontend
   - Configure production environment
   - Set up monitoring

## 📚 Documentation

- [Full README](../README.md)
- [API Documentation](../docs/API.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

## 🆘 Support

If you encounter issues:
1. Check the logs in terminal
2. Review error messages
3. Verify environment variables
4. Check database/Redis connections

## 🎉 Success!

You should now have:
- ✅ Backend API running on :4000
- ✅ Frontend PWA running on :3000
- ✅ Database connected
- ✅ Redis connected
- ✅ WebSocket working

Ready to build! 🚀
