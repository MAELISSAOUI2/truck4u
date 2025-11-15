# 📡 Truck4u API Documentation

Base URL: `https://api.truck4u.tn` (Production) | `http://localhost:4000` (Development)

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Error Responses

```json
{
  "error": "Error message"
}
```

Status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

---

## 🔑 Auth Endpoints

### POST /api/auth/login

Login with phone number.

**Request:**
```json
{
  "phone": "+216XXXXXXXX",
  "userType": "customer" | "driver"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "phone": "+216XXXXXXXX",
    "name": "John Doe",
    "userType": "customer"
  }
}
```

### POST /api/auth/register/customer

Register new customer.

**Request:**
```json
{
  "phone": "+216XXXXXXXX",
  "name": "John Doe",
  "accountType": "INDIVIDUAL" | "BUSINESS",
  "companyName": "Optional if BUSINESS",
  "taxId": "Optional if BUSINESS",
  "email": "optional@email.com"
}
```

**Response:** Same as login

### POST /api/auth/register/driver

Register new driver.

**Request:**
```json
{
  "phone": "+216XXXXXXXX",
  "name": "Driver Name",
  "vehicleType": "CAMIONNETTE" | "FOURGON" | "CAMION_3_5T" | "CAMION_LOURD",
  "vehiclePlate": "TUN1234",
  "email": "optional@email.com"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "phone": "+216XXXXXXXX",
    "name": "Driver Name",
    "vehicleType": "CAMIONNETTE",
    "verificationStatus": "PENDING_REVIEW",
    "userType": "driver"
  }
}
```

---

## 🚗 Driver Endpoints

### POST /api/drivers/documents/upload

Upload verification documents. **Requires Driver Auth**

**Request:** `multipart/form-data`
- `cin_front`: Image file (required)
- `cin_back`: Image file (required)
- `driving_license`: Image/PDF file (required)
- `vehicle_registration`: Image/PDF file (required)
- `business_license`: Image/PDF file (optional)
- `vehicle_photos`: Image files (3-5 photos, required)

**Response:**
```json
{
  "message": "Documents uploaded successfully",
  "documents": {
    "cin_front": "https://cdn.truck4u.tn/...",
    "cin_back": "https://cdn.truck4u.tn/...",
    "driving_license": "https://cdn.truck4u.tn/...",
    "vehicle_registration": "https://cdn.truck4u.tn/...",
    "business_license": "https://cdn.truck4u.tn/...",
    "vehicle_photos": ["url1", "url2", "url3"]
  }
}
```

### GET /api/drivers/verification-status

Get driver verification status. **Requires Driver Auth**

**Response:**
```json
{
  "id": "uuid",
  "name": "Driver Name",
  "verificationStatus": "PENDING_REVIEW" | "APPROVED" | "REJECTED",
  "hasBusinessLicense": false,
  "documents": { ... }
}
```

### PATCH /api/drivers/availability

Toggle driver availability. **Requires Driver Auth**

**Request:**
```json
{
  "isAvailable": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "isAvailable": true
}
```

### GET /api/drivers/available-rides

Get rides available for bidding. **Requires Driver Auth**

**Response:**
```json
{
  "rides": [
    {
      "id": "uuid",
      "pickup": { "lat": 36.8065, "lng": 10.1815, "address": "..." },
      "dropoff": { "lat": 36.8215, "lng": 10.1655, "address": "..." },
      "distance": 5.2,
      "vehicleType": "CAMIONNETTE",
      "loadAssistance": true,
      "estimatedMinPrice": 35,
      "estimatedMaxPrice": 45,
      "customer": {
        "name": "John Doe",
        "accountType": "INDIVIDUAL"
      },
      "bids": []
    }
  ]
}
```

### GET /api/drivers/earnings/history?period=month

Get earnings history. **Requires Driver Auth**

**Query Params:**
- `period`: "week" | "month" | "year"

**Response:**
```json
{
  "summary": {
    "gross": 1250.50,
    "fees": 187.50,
    "net": 1063.00
  },
  "earnings": [
    {
      "id": "uuid",
      "rideId": "uuid",
      "grossAmount": 50.00,
      "platformFee": 7.50,
      "netEarnings": 42.50,
      "paidAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 🚙 Ride Endpoints

### POST /api/rides/estimate

Get price estimate. **Requires Customer Auth**

**Request:**
```json
{
  "pickup": {
    "lat": 36.8065,
    "lng": 10.1815,
    "address": "Tunis, Tunisia"
  },
  "dropoff": {
    "lat": 36.8215,
    "lng": 10.1655,
    "address": "La Marsa, Tunisia"
  },
  "vehicleType": "CAMIONNETTE",
  "loadAssistance": true,
  "numberOfTrips": 1
}
```

**Response:**
```json
{
  "distance": 5.2,
  "estimatedDuration": 10,
  "estimatedPrice": {
    "min": 35,
    "max": 45
  },
  "availableDriversCount": 12
}
```

### POST /api/rides

Create new ride. **Requires Customer Auth**

**Request:**
```json
{
  "pickup": {
    "lat": 36.8065,
    "lng": 10.1815,
    "address": "Tunis, Tunisia",
    "details": "Apartment 4",
    "access_notes": "2nd floor, no elevator"
  },
  "dropoff": {
    "lat": 36.8215,
    "lng": 10.1655,
    "address": "La Marsa, Tunisia",
    "details": "Villa 12"
  },
  "vehicleType": "CAMIONNETTE",
  "loadAssistance": true,
  "numberOfTrips": 1,
  "itemPhotos": ["url1", "url2"],
  "description": "Moving furniture",
  "serviceType": "IMMEDIATE" | "SCHEDULED",
  "scheduledFor": "2024-01-20T14:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "PENDING_BIDS",
  "pickup": { ... },
  "dropoff": { ... },
  "distance": 5.2,
  "estimatedDuration": 10,
  "estimatedMinPrice": 35,
  "estimatedMaxPrice": 45,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### GET /api/rides/:id

Get ride details. **Requires Auth**

**Response:**
```json
{
  "id": "uuid",
  "status": "BID_ACCEPTED",
  "pickup": { ... },
  "dropoff": { ... },
  "customer": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+216XXXXXXXX"
  },
  "driver": {
    "id": "uuid",
    "name": "Driver Name",
    "phone": "+216XXXXXXXX",
    "rating": 4.8,
    "vehiclePlate": "TUN1234"
  },
  "bids": [ ... ],
  "finalPrice": 40.00,
  "payment": { ... }
}
```

### GET /api/rides/:id/bids

Get bids for a ride. **Requires Customer Auth**

**Response:**
```json
{
  "bids": [
    {
      "id": "uuid",
      "proposedPrice": 38.00,
      "estimatedArrival": 15,
      "message": "I can be there in 15 minutes",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:35:00Z",
      "driver": {
        "id": "uuid",
        "name": "Driver Name",
        "rating": 4.8,
        "vehicleType": "CAMIONNETTE",
        "vehiclePlate": "TUN1234",
        "totalRides": 245
      }
    }
  ]
}
```

### POST /api/rides/:id/bid

Submit a bid. **Requires Driver Auth**

**Request:**
```json
{
  "proposedPrice": 38.00,
  "estimatedArrival": 15,
  "message": "Optional message"
}
```

**Response:**
```json
{
  "id": "uuid",
  "proposedPrice": 38.00,
  "estimatedArrival": 15,
  "status": "ACTIVE",
  "expiresAt": "2024-01-15T10:45:00Z",
  "driver": { ... }
}
```

### POST /api/rides/:id/accept-bid

Accept a bid. **Requires Customer Auth**

**Request:**
```json
{
  "bidId": "uuid"
}
```

**Response:**
```json
{
  "message": "Bid accepted successfully"
}
```

### PATCH /api/rides/:id/status

Update ride status. **Requires Driver Auth**

**Request:**
```json
{
  "status": "DRIVER_ARRIVING" | "PICKUP_ARRIVED" | "LOADING" | "IN_TRANSIT" | "DROPOFF_ARRIVED" | "COMPLETED"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "IN_TRANSIT",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### POST /api/rides/:id/proof-photo/:type

Upload proof photo. **Requires Driver Auth**

**Path Params:**
- `type`: "loading" | "delivery"

**Request:**
```json
{
  "photoUrl": "https://cdn.truck4u.tn/..."
}
```

**Response:**
```json
{
  "message": "Photo uploaded successfully",
  "proofPhotos": {
    "loading": "url",
    "loading_timestamp": "2024-01-15T10:50:00Z"
  }
}
```

### POST /api/rides/:id/rate

Rate a completed ride. **Requires Customer Auth**

**Request:**
```json
{
  "rating": 5,
  "review": "Excellent service!"
}
```

**Response:**
```json
{
  "message": "Rating submitted successfully"
}
```

### GET /api/rides/history

Get ride history. **Requires Auth**

**Response:**
```json
{
  "rides": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "pickup": { ... },
      "dropoff": { ... },
      "finalPrice": 40.00,
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T11:30:00Z",
      "customer": { "name": "John Doe" },
      "driver": { "name": "Driver Name", "rating": 4.8 },
      "payment": { "status": "COMPLETED" }
    }
  ]
}
```

---

## 💳 Payment Endpoints

### POST /api/payments/initiate

Initiate payment. **Requires Customer Auth**

**Request:**
```json
{
  "rideId": "uuid",
  "method": "CASH" | "CARD" | "FLOUCI"
}
```

**Response (CASH):**
```json
{
  "paymentId": "uuid",
  "method": "CASH",
  "totalAmount": 40.00,
  "message": "Please pay cash to driver"
}
```

**Response (CARD/FLOUCI):**
```json
{
  "paymentId": "uuid",
  "method": "CARD",
  "paymentUrl": "https://paymee.tn/checkout/...",
  "totalAmount": 40.00
}
```

### POST /api/payments/:id/confirm-cash

Driver confirms cash receipt. **Requires Driver Auth**

**Response:**
```json
{
  "message": "Cash payment confirmed"
}
```

### GET /api/payments/:rideId

Get payment status. **Requires Auth**

**Response:**
```json
{
  "id": "uuid",
  "rideId": "uuid",
  "method": "CARD",
  "totalAmount": 40.00,
  "platformFee": 6.00,
  "driverAmount": 34.00,
  "status": "COMPLETED",
  "completedAt": "2024-01-15T11:35:00Z"
}
```

---

## 📊 Subscription Endpoints

### GET /api/subscriptions/plans

Get available B2B plans. **No Auth Required**

**Response:**
```json
{
  "plans": [
    {
      "id": "STARTER",
      "name": "Starter",
      "monthlyFee": 299,
      "includedRides": 20,
      "extraRideCost": 10,
      "commission": "8%",
      "features": ["..."]
    }
  ]
}
```

### POST /api/subscriptions/subscribe

Subscribe to B2B plan. **Requires Customer Auth**

**Request:**
```json
{
  "planType": "STARTER" | "BUSINESS" | "ENTERPRISE"
}
```

**Response:**
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "planType": "STARTER",
  "monthlyFee": 299,
  "includedRides": 20,
  "usedRides": 0,
  "status": "ACTIVE",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-02-15T00:00:00Z"
}
```

### GET /api/subscriptions/current

Get current subscription. **Requires Customer Auth**

**Response:**
```json
{
  "id": "uuid",
  "planType": "STARTER",
  "monthlyFee": 299,
  "includedRides": 20,
  "usedRides": 12,
  "status": "ACTIVE",
  "endDate": "2024-02-15T00:00:00Z"
}
```

### GET /api/subscriptions/invoice/:month

Get monthly invoice. **Requires Customer Auth**

**Path Params:**
- `month`: "YYYY-MM" (e.g., "2024-01")

**Response:**
```json
{
  "month": "2024-01",
  "subscription": { ... },
  "summary": {
    "totalRides": 25,
    "includedRides": 20,
    "extraRides": 5,
    "totalAmount": 1250.00,
    "totalFees": 100.00,
    "subscriptionFee": 299.00
  },
  "rides": [ ... ]
}
```

---

## 👤 Customer Endpoints

### GET /api/customers/profile

Get customer profile. **Requires Customer Auth**

**Response:**
```json
{
  "id": "uuid",
  "phone": "+216XXXXXXXX",
  "name": "John Doe",
  "email": "john@example.com",
  "accountType": "BUSINESS",
  "companyName": "My Company",
  "taxId": "123456",
  "isB2BSubscriber": true,
  "subscription": { ... }
}
```

### PATCH /api/customers/profile

Update customer profile. **Requires Customer Auth**

**Request:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "companyName": "New Company Name",
  "taxId": "654321"
}
```

**Response:** Updated profile object

---

## 🔧 Admin Endpoints

All admin endpoints require admin authentication.

### GET /api/admin/drivers/pending

Get drivers pending verification.

**Response:**
```json
{
  "drivers": [
    {
      "id": "uuid",
      "name": "Driver Name",
      "phone": "+216XXXXXXXX",
      "vehicleType": "CAMIONNETTE",
      "documents": { ... },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### PATCH /api/admin/drivers/:id/verify

Approve or reject driver.

**Request:**
```json
{
  "status": "APPROVED" | "REJECTED",
  "reason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "message": "Driver approved",
  "driver": { ... }
}
```

### GET /api/admin/rides/active

Get all active rides.

**Response:**
```json
{
  "rides": [
    {
      "id": "uuid",
      "status": "IN_TRANSIT",
      "customer": { ... },
      "driver": { ... },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/admin/analytics?period=week

Get platform analytics.

**Query Params:**
- `period`: "week" | "month" | "year"

**Response:**
```json
{
  "period": "week",
  "summary": {
    "totalRides": 450,
    "completedRides": 420,
    "conversionRate": 93.3,
    "gmv": 18500.00,
    "platformRevenue": 2775.00,
    "activeCustomers": 234,
    "activeDrivers": 45
  },
  "breakdown": {
    "byVehicleType": [ ... ],
    "byPaymentMethod": [ ... ]
  }
}
```

---

## 🌐 WebSocket Events

Connect to: `wss://api.truck4u.tn` (with auth token)

### Customer Events

**Emit:**
```javascript
// Connect as customer
socket.emit('customer_connect', { customerId: 'uuid' });

// Track a ride
socket.emit('track_ride', { rideId: 'uuid', customerId: 'uuid' });

// Stop tracking
socket.emit('stop_tracking', { rideId: 'uuid' });
```

**Listen:**
```javascript
// New bid received
socket.on('new_bid', (bid) => { ... });

// Driver location update
socket.on('driver_moved', (location) => { ... });

// Ride status changed
socket.on('ride_status_changed', ({ rideId, status }) => { ... });
```

### Driver Events

**Emit:**
```javascript
// Go online
socket.emit('driver_online', { 
  driverId: 'uuid',
  location: { lat: 36.8065, lng: 10.1815 }
});

// Go offline
socket.emit('driver_offline', { driverId: 'uuid' });

// Update location during ride
socket.emit('driver_location_update', {
  rideId: 'uuid',
  lat: 36.8065,
  lng: 10.1815,
  speed: 50,
  heading: 180,
  timestamp: 1705320000000
});
```

**Listen:**
```javascript
// New ride request
socket.on('ride_request', (ride) => { ... });

// Bid accepted
socket.on('bid_accepted', ({ rideId, bidId }) => { ... });

// Bid rejected
socket.on('bid_rejected', ({ rideId }) => { ... });

// Ride status changed
socket.on('ride_status_changed', ({ rideId, status }) => { ... });
```

---

## 📱 Web Push Notifications

Subscribe to push notifications:

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  });
  
  // Send subscription to backend
  await api.post('/notifications/subscribe', { subscription });
}
```

---

## 🔄 Rate Limits

- Default: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP
- Uploads: 5 MB max file size

---

Last updated: 2024
