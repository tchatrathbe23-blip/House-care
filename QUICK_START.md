# Quick Start Guide - HouseCare Authentication & Tracking

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- Modern web browser with JavaScript enabled

## Installation & Setup

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
Create `backend/.env`:
```
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/housecare
DEMO_ADMIN_ENABLED=true
```

### Step 3: Start MongoDB
```bash
# Windows (using MongoDB Community)
mongod

# OR using MongoDB Atlas (update connection string in .env)
```

### Step 4: Start Backend Server
```bash
cd backend
node server.js
```

You should see:
```
Server running on port 5000
MongoDB Connected
WebSocket server ready for real-time updates
```

### Step 5: Open in Browser
The application is now accessible:
- Frontend: Open any HTML file (login.html, register.html, etc.) in your browser
- Or use a local server: `npx http-server` from project root

## Quick Testing

### Test User Registration
1. Go to `register.html`
2. Fill in the form:
   - Name: John Doe
   - Email: john@example.com
   - Phone: 1234567890
   - Address: 123 Main Street
   - Password: password123
3. Click "Create Account"
4. Should redirect to home page with token saved

### Test User Login
1. Go to `login.html`
2. Enter credentials:
   - Email: john@example.com
   - Password: password123
3. Click "Login"
4. Should redirect to home page

### Test Admin Login
1. First, create an admin in MongoDB:
```javascript
db.admins.insertOne({
  username: "admin",
  email: "admin@housecare.com",
  password: "$2a$10$...", // Use bcryptjs to hash password123
  role: "super_admin",
  permissions: ["view_bookings", "manage_bookings", "view_analytics", "manage_users", "manage_payments"]
})
```

2. Go to `admin-login.html`
3. Enter:
   - Username: admin
   - Password: password123
4. Should redirect to admin dashboard

### Test Real-Time Tracking
1. Login as user
2. Go to `tracking.html`
3. To simulate tracking, use API:
```bash
# Create a booking first (ensure it exists in database)
# Then start tracking with booking ID

curl -X POST http://localhost:5000/api/tracking/start/BOOKING_ID \
  -H "Content-Type: application/json" \
  -d '{"providerId": "USER_ID"}'

# Then update location (this will trigger Socket.io event)
curl -X POST http://localhost:5000/api/tracking/update-location/TRACKING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "New Delhi",
    "status": "in_transit"
  }'
```

## API Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password456",
    "phone": "9876543210",
    "address": "456 Oak Avenue"
  }'
```

### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "password456"
  }'
```

### Get Current User (Protected)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Notification
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "type": "booking",
    "title": "Booking Confirmed",
    "message": "Your cleaning service is confirmed for tomorrow at 2 PM"
  }'
```

## Project Structure

```
Project_housekeeping/
├── backend/
│   ├── models/
│   │   ├── Booking.js
│   │   ├── User.js (NEW)
│   │   ├── Admin.js (NEW)
│   │   ├── Notification.js (NEW)
│   │   └── Tracking.js (NEW)
│   ├── routes/
│   │   ├── authRoutes.js (NEW)
│   │   ├── adminRoutes.js (NEW)
│   │   ├── notificationRoutes.js (NEW)
│   │   ├── trackingRoutes.js (NEW)
│   │   ├── bookingRoutes.js
│   │   ├── analyticsRoutes.js
│   │   └── paymentRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js (NEW)
│   ├── server.js (UPDATED)
│   ├── .env (NEW)
│   └── package.json (UPDATED)
├── login.html (NEW)
├── register.html (NEW)
├── admin-login.html (NEW)
├── admin-dashboard.html (NEW)
├── tracking.html (NEW)
├── IMPLEMENTATION_GUIDE.md (NEW)
└── index.html (UPDATED)
```

## Common Issues & Solutions

### Issue: MongoDB Connection Failed
**Solution:**
```bash
# Check if MongoDB is running
mongod

# Or verify connection string in .env
MONGODB_URI=mongodb://127.0.0.1:27017/housecare
DEMO_ADMIN_ENABLED=true
```

### Issue: JWT Token Errors
**Solution:**
- Clear localStorage: `localStorage.clear()`
- Login again to get new token
- Verify JWT_SECRET in .env is consistent

### Issue: Socket.io Not Connecting
**Solution:**
```javascript
// Check console for errors
// Verify backend is running on port 5000
// Check CORS configuration in server.js
```

### Issue: Map Not Loading in Tracking
**Solution:**
- Check browser console for errors
- Verify internet connection (Leaflet needs OSM tiles)
- Ensure valid bookingId is entered

## Development Tips

### Enable Debug Logging
Add to `backend/server.js`:
```javascript
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

### Test Socket.io Events
```javascript
// In browser console
const socket = io('http://localhost:5000');
socket.emit('user-join', 'test-user-id');
socket.on('notification', (data) => console.log('Got notification:', data));
```

### Reset Database
```bash
# Connect to MongoDB
mongo

# In mongo shell
use housecare
db.users.deleteMany({})
db.admins.deleteMany({})
db.notifications.deleteMany({})
db.trackings.deleteMany({})
```

## Production Deployment Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Set DEMO_ADMIN_ENABLED=false or remove demo credentials before production
- [ ] Update MONGODB_URI to production database
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure error logging
- [ ] Set up monitoring and alerts
- [ ] Test all authentication flows
- [ ] Load test the system

## Next Steps

1. Customize branding and styling
2. Connect to actual MongoDB Atlas
3. Integrate payment gateway
4. Set up email notifications
5. Configure admin dashboard fully
6. Add user profile management
7. Implement booking management
8. Set up analytics

## Support

For issues or questions, refer to:
- `IMPLEMENTATION_GUIDE.md` - Detailed feature documentation
- Backend logs - Check console output
- Browser console - Frontend errors
- Network tab - API calls

---

**Version:** 1.0.0
**Last Updated:** April 13, 2024
