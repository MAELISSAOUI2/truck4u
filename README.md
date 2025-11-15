# 🚀 Truck4u MVP - On-Demand Logistics Platform

Truck4u is a Progressive Web App (PWA) marketplace connecting customers with verified commercial vehicle owners in Tunisia through a geo-localized bidding system.

## 📋 Features

### Customer Features
- **Simple Ride Creation**: Map-based pickup/dropoff selection with photo uploads
- **Service Options**: Vehicle type selection, load assistance, multi-trips
- **Live Bidding**: Real-time bid comparison with driver ratings
- **GPS Tracking**: Real-time driver location tracking during rides
- **Multi-Payment**: Cash, Card (Paymee), Mobile Wallet (Flouci)
- **Rating System**: Post-ride feedback and reviews

### Driver Features
- **Strict Verification**: CIN, driving license, vehicle registration, business license
- **Proximity Bidding**: Intelligent dispatch based on location
- **Low-Cost GPS**: Uses smartphone native geolocation
- **Proof of Service**: Mandatory photos at loading and delivery
- **Earnings Dashboard**: Transparent transaction and commission tracking

### B2B Features
- **Subscription Plans**: Starter, Business, Enterprise tiers
- **Priority Access**: Professional verified drivers
- **Reduced Commission**: 8% for B2B (vs 15% B2C)
- **Aggregated Billing**: Monthly invoices with detailed breakdown

### Admin Features
- **Driver Verification**: Manual document review and approval
- **Live Monitoring**: Real-time map of active rides
- **Analytics**: KPIs, conversion rates, GMV tracking
- **Dispute Management**: Handle customer/driver reports

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 20 + Express.js
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache**: Redis (geo-queries, real-time)
- **WebSocket**: Socket.io (live tracking & bidding)
- **Storage**: AWS S3 / Cloudflare R2
- **Auth**: JWT

### Frontend PWA
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + Shadcn/ui
- **Maps**: Mapbox GL JS
- **State**: Zustand
- **PWA**: next-pwa with Service Workers

### Payment Integrations
- **Paymee**: Card payments (Tunisian gateway)
- **Flouci**: Mobile wallet
- **Cash**: Manual confirmation workflow

## 📦 Project Structure

```
truck4u-pwa/
├── apps/
│   ├── api/              # Express.js backend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── socket.ts
│   │   │   ├── middleware/
│   │   │   └── routes/
│   │   ├── .env.example
│   │   └── package.json
│   ├── web/              # Next.js PWA
│   │   ├── app/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── .env.example
│   │   └── package.json
│   └── admin/            # Admin dashboard
├── packages/
│   ├── database/         # Prisma schema
│   ├── ui/               # Shared components
│   └── types/            # TypeScript types
└── docs/
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis
- Yarn or npm

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/truck4u-pwa.git
cd truck4u-pwa
yarn install
```

### 2. Setup Database

```bash
cd packages/database
cp .env.example .env
# Edit .env with your PostgreSQL connection string
yarn db:push
```

### 3. Configure Backend

```bash
cd apps/api
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `JWT_SECRET`: Your secret key
- `S3_*`: S3 or R2 credentials
- `PAYMEE_*`: Paymee API credentials
- `FLOUCI_*`: Flouci API credentials

### 4. Configure Frontend

```bash
cd apps/web
cp .env.example .env
# Edit .env with your configuration
```

Required:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Mapbox access token

### 5. Run Development Servers

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

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/health

## 📱 PWA Features

- **Installable**: Add to home screen on iOS and Android
- **Offline**: Service worker caches API responses and assets
- **Push Notifications**: Web Push API for ride updates
- **Geolocation**: Native browser GPS tracking
- **Camera Access**: Take photos for proof of service

## 🔐 Authentication Flow

1. User enters phone number
2. (Production) OTP sent via SMS
3. (MVP) Simple login with phone
4. JWT token issued (7-day expiry)
5. Token stored in localStorage
6. Auto-refresh on API requests

## 🗺️ Geolocation & Dispatch

### Proximity Bidding Algorithm

```
1. Customer creates ride
2. System searches for drivers in expanding radius:
   - Round 1: 5km (wait 3 min for bids)
   - Round 2: 10km (wait 2 min)
   - Round 3: 20km (wait 2 min)
   - Round 4: 30km+ (wait 1 min)
3. Drivers receive push notification
4. Drivers submit bids
5. Customer views bids in real-time
6. Customer accepts best bid
```

### GPS Tracking
- Driver location tracked only during active rides
- Updates every 10 seconds via WebSocket
- Stored in Redis with 1-hour expiry
- Broadcasted to customer in real-time

## 💳 Payment Processing

### Cash Flow
1. Customer selects Cash at checkout
2. Payment status: PENDING
3. Driver delivers and collects cash
4. Driver confirms in app
5. Admin can verify (optional)
6. Status: COMPLETED

### Card (Paymee) Flow
1. Customer selects Card
2. Redirect to Paymee gateway
3. Customer completes payment
4. Webhook updates payment status
5. Earnings released to driver

### Flouci Flow
1. Customer selects Flouci
2. Payment link generated
3. Customer confirms in Flouci app
4. Webhook updates status
5. Earnings released

## 📊 Commission Structure

- **B2C Rides**: 15% platform fee
- **B2B Rides**: 8% platform fee (with subscription)
- **Subscription Plans**:
  - Starter: 299 TND/month (20 rides included)
  - Business: 799 TND/month (60 rides)
  - Enterprise: 1999 TND/month (200 rides, 5% commission)

## 🔒 Security

- Rate limiting: 100 requests/15min per IP
- Input validation with Zod
- SQL injection protection (Prisma ORM)
- XSS prevention (Helmet.js)
- HTTPS enforced in production
- JWT token expiration
- File upload validation (size, type)

## 📈 Scaling Considerations

Current MVP handles:
- 1000 rides/day
- 5000 users
- Single region (Tunisia)

When to scale:
- **>1000 rides/day**: Separate WebSocket server
- **>5000 users**: Database read replicas
- **>10000 rides/day**: Queue system (BullMQ)

## 🧪 Testing

```bash
# Run backend tests
cd apps/api
yarn test

# Run frontend tests
cd apps/web
yarn test

# E2E tests
yarn test:e2e
```

## 📦 Deployment

### Backend (Railway)
```bash
railway login
railway init
railway add
railway up
```

### Frontend (Vercel)
```bash
vercel login
vercel
vercel --prod
```

### Database Migrations
```bash
cd packages/database
yarn db:migrate
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is proprietary and confidential.

## 🆘 Support

For issues and questions:
- Email: support@truck4u.tn
- Phone: +216 XX XXX XXX

## 🎯 Roadmap

### Phase 1 (Current MVP)
- ✅ Core ride flow
- ✅ Bidding system
- ✅ GPS tracking
- ✅ Payment integration

### Phase 2 (Q2 2024)
- [ ] Mobile native apps (React Native)
- [ ] Advanced analytics
- [ ] Driver ratings improvements
- [ ] Route optimization

### Phase 3 (Q3 2024)
- [ ] Multi-city expansion
- [ ] Corporate API access
- [ ] Scheduled recurring rides
- [ ] In-app chat

### Phase 4 (Q4 2024)
- [ ] Insurance integration
- [ ] Fleet management tools
- [ ] AI-powered pricing
- [ ] International expansion

---

Built with ❤️ in Tunisia 🇹🇳
