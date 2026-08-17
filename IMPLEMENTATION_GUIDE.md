# HouseCare - Implementation Guide

This document provides a comprehensive guide to the new features added to the HouseCare project.

## New Features Implemented

### 1. **User Authentication (JWT)**
- User registration and login system
- JWT token-based authentication
- Password hashing with bcryptjs
- Session management with localStorage

**Files Created:**
- `login.html` - User login page
- `register.html` - User registration page
- `backend/models/User.js` - User database model
- `backend/routes/authRoutes.js` - Authentication endpoints
- `backend/middleware/authMiddleware.js` - JWT verification middleware

**API Endpoints:**
```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - User login
GET    /api/auth/me             - Get current user (protected)
PUT    /api/auth/update         - Update user profile (protected)
```

### 2. **Admin Login System**
- Separate admin authentication system
- Admin role management (admin, super_admin)
- Permission-based access control

**Files Created:**
- `admin-login.html` - Admin login page
- `backend/models/Admin.js` - Admin database model
- `backend/routes/adminRoutes.js` - Admin authentication endpoints

**API Endpoints:**
```
POST   /api/admin/login         - Admin login
GET    /api/admin/me            - Get admin profile (protected)
POST   /api/admin/create        - Create new admin (super admin only)
```

### 3. **Real-Time Notifications**
- WebSocket-based real-time updates using Socket.io
- Notification system for users and admins
- Real-time booking status updates
- Push notifications for service updates

**Files Created:**
- `backend/models/Notification.js` - Notification database model
- `backend/routes/notificationRoutes.js` - Notification management endpoints
- Socket.io integration in `backend/server.js`

**API Endpoints:**
```
GET    /api/notifications/user  - Get user notifications (protected)
GET    /api/notifications/admin - Get admin notifications (protected)
PUT    /api/notifications/:id/read - Mark as read (protected)
POST   /api/notifications/create - Create notification
DELETE /api/notifications/:id    - Delete notification (protected)
```

**Socket.io Events:**
```
user-join              - User joins the connection
location-update        - Real-time location tracking
send-notification      - Send notification to user
booking-status-change  - Update booking status
location-updated       - Broadcast location updates
notification           - Receive notification
booking-updated        - Booking updated event
```

### 4. **Map-Based Service Tracking**
- Real-time GPS tracking of service providers
- Interactive map using Leaflet.js
- Location history tracking
- Live route visualization
- ETA and distance calculations

**Files Created:**
- `tracking.html` - Real-time tracking interface
- `backend/models/Tracking.js` - Tracking database model
- `backend/routes/trackingRoutes.js` - Tracking API endpoints

**API Endpoints:**
```
POST   /api/tracking/start/:bookingId      - Start tracking
POST   /api/tracking/update-location/:trackingId - Update location
GET    /api/tracking/:trackingId           - Get tracking details
GET    /api/tracking/booking/:bookingId    - Get tracking by booking
GET    /api/tracking                       - Get all active trackings
```

### 5. **Admin Dashboard**
- Real-time statistics and metrics
- Live booking management
- Active service tracking overview
- Real-time notification system
- Socket.io-based live updates

**File Created:**
- `admin-dashboard.html` - Comprehensive admin dashboard

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:
```
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/housecare
```

### 3. Start MongoDB
Ensure MongoDB is running on localhost:27017

### 4. Start the Backend Server
```bash
cd backend
node server.js
```

The server will start on `http://localhost:5000`

### 5. Access the Application
- **User Login:** http://localhost:5000/login.html
- **User Registration:** http://localhost:5000/register.html
- **Admin Login:** http://localhost:5000/admin-login.html
- **Admin Dashboard:** http://localhost:5000/admin-dashboard.html
- **Service Tracking:** http://localhost:5000/tracking.html

## User Flow

### Customer Sign Up & Login
1. Visit `register.html` and create an account
2. Fill in Name, Email, Password, Phone, and Address
3. Login with credentials at `login.html`
4. JWT token is stored in localStorage
5. Access protected features with the token

### Admin Dashboard
1. Visit `admin-login.html` with admin credentials
2. View real-time dashboard with statistics
3. Monitor active services and bookings
4. Receive real-time notifications
5. Manage bookings and admin users

### Real-Time Service Tracking
1. Login as a customer
2. Visit `tracking.html`
3. Enter booking ID to track service
4. View real-time provider location on map
5. See location history and status updates

## API Usage Examples

### Register User
```javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "address": "123 Main St"
}

Response:
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Admin Login
```javascript
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

Response:
{
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "507f1f77bcf86cd799439012",
    "username": "admin",
    "role": "admin"
  }
}
```

### Start Real-Time Tracking
```javascript
POST /api/tracking/start/BOOKING_ID
Content-Type: application/json

{
  "providerId": "507f1f77bcf86cd799439013"
}

Response:
{
  "message": "Tracking started",
  "tracking": {
    "_id": "507f1f77bcf86cd799439014",
    "bookingId": "BOOKING_ID",
    "status": "pending",
    "locations": []
  }
}
```

### Update Location (Real-Time)
```javascript
POST /api/tracking/update-location/TRACKING_ID
Content-Type: application/json
Authorization: Bearer token

{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "address": "New Delhi, India",
  "status": "in_transit"
}

Response:
{
  "message": "Location updated",
  "tracking": {
    "_id": "507f1f77bcf86cd799439014",
    "locations": [
      {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "New Delhi, India",
        "timestamp": "2024-04-13T10:30:00.000Z"
      }
    ]
  }
}
```

## Socket.io Events

### Client Side

#### Join as User
```javascript
const socket = io('http://localhost:5000');
socket.emit('user-join', userId);
```

#### Send Location Update
```javascript
socket.emit('location-update', {
  trackingId: 'tracking_id',
  latitude: 28.6139,
  longitude: 77.2090,
  address: 'New Delhi, India'
});
```

#### Listen for Location Updates
```javascript
socket.on('location-updated', (data) => {
  console.log('New location:', data);
  // Update map with new location
});
```

#### Listen for Notifications
```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data.title, data.message);
});
```

#### Listen for Booking Updates
```javascript
socket.on('booking-updated', (data) => {
  console.log('Booking updated:', data.status);
});
```

## Database Models

### User Model
```
- name (String, required)
- email (String, required, unique)
- password (String, required, hashed)
- phone (String)
- address (String)
- bookings (Array of Booking IDs)
- createdAt (Date)
- updatedAt (Date)
```

### Admin Model
```
- username (String, required, unique)
- email (String, required, unique)
- password (String, required, hashed)
- role (String: admin, super_admin)
- permissions (Array of Strings)
- createdAt (Date)
- updatedAt (Date)
```

### Notification Model
```
- userId (User ID reference)
- adminId (Admin ID reference)
- type (String: booking, payment, tracking, alert, general)
- title (String)
- message (String)
- isRead (Boolean)
- data (Object)
- createdAt (Date)
```

### Tracking Model
```
- bookingId (Booking ID reference)
- providerId (User ID reference)
- locations (Array of coordinates with timestamp)
- status (String: pending, in_transit, arrived, in_progress, completed, cancelled)
- estimatedArrival (Date)
- actualArrival (Date)
- completionTime (Date)
- distance (Number in km)
- createdAt (Date)
- updatedAt (Date)
```

## Security Features

1. **Password Hashing:** All passwords are hashed using bcryptjs with salt rounds of 10
2. **JWT Authentication:** Secure token-based authentication with expiration
3. **Protected Routes:** Middleware validates JWT tokens for protected endpoints
4. **Admin Authorization:** Role-based access control for admin features
5. **CORS Protection:** Cross-origin requests are configured appropriately

## Frontend Features

- **Responsive Design:** All pages are mobile-friendly
- **Real-Time Updates:** Socket.io for live notifications and tracking
- **Interactive Maps:** Leaflet.js for service tracking visualization
- **Modern UI:** Gradient backgrounds and smooth animations
- **Form Validation:** Client-side validation on all forms
- **Error Handling:** Comprehensive error messages for user guidance

## Troubleshooting

### JWT Token Errors
- Ensure token is sent in Authorization header: `Bearer token`
- Check if token has expired (user needs to login again)
- Verify JWT_SECRET in .env matches backend configuration

### Socket.io Connection Issues
- Verify Socket.io is installed: `npm install socket.io`
- Check backend server is running
- Ensure CORS is properly configured

### MongoDB Connection Issues
- Verify MongoDB service is running
- Check connection string in .env file
- Ensure database name is correct

### Map Not Loading
- Verify Leaflet library is properly loaded
- Check browser console for errors
- Ensure leaflet CSS is linked in HTML head

## Future Improvements Roadmap

See `FUTURE_IMPROVEMENTS.md` for a prioritized production-hardening plan covering JWT auth, admin login, real-time notifications, and map-based service tracking.
## Next Steps & Enhancements

1. **Add Email Notifications:** Integrate email service for booking confirmations
2. **Payment Integration:** Enhanced payment processing with Razorpay
3. **Rating System:** Add customer reviews and ratings
4. **Analytics Dashboard:** Detailed analytics for admin panel
5. **Mobile App:** React Native or Flutter mobile application
6. **AI-Based Recommendations:** ML-based service recommendations
7. **Blockchain Integration:** For verification and authenticity

## Support & Documentation

For more information on the technologies used:
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [JWT Documentation](https://jwt.io/)
- [Leaflet.js Documentation](https://leafletjs.com/)

---

**Last Updated:** April 13, 2024
**Version:** 1.2.0
