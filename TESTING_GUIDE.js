// HouseCare Testing Guide
// Use this file to test all new features

// ============================================
// 1. TEST USER REGISTRATION & LOGIN
// ============================================

// Test 1.1: User Registration
fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123',
    phone: '1234567890',
    address: '123 Test Street'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Registration Response:', data);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
});

// Test 1.2: User Login
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'testpass123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Login Response:', data);
  localStorage.setItem('token', data.token);
});

// Test 1.3: Get Current User (Protected)
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log('Current User:', data));

// ============================================
// 2. TEST ADMIN LOGIN
// ============================================

// First create admin in MongoDB:
// db.admins.insertOne({
//   username: "admin",
//   email: "admin@housecare.com",
//   password: "hashed_password",
//   role: "super_admin",
//   permissions: ["view_bookings", "manage_bookings"]
// })

// Test 2.1: Admin Login
fetch('http://localhost:5000/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Admin Login Response:', data);
  localStorage.setItem('adminToken', data.token);
});

// ============================================
// 3. TEST NOTIFICATIONS
// ============================================

// Test 3.1: Create Notification
const userId = 'USER_ID_HERE'; // Replace with actual user ID
fetch('http://localhost:5000/api/notifications/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Your service is scheduled for tomorrow'
  })
})
.then(res => res.json())
.then(data => console.log('Notification Created:', data));

// Test 3.2: Get User Notifications (Protected)
fetch('http://localhost:5000/api/notifications/user', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log('User Notifications:', data));

// Test 3.3: Mark Notification as Read
const notificationId = 'NOTIFICATION_ID_HERE';
fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log('Notification Updated:', data));

// ============================================
// 4. TEST REAL-TIME TRACKING WITH SOCKET.IO
// ============================================

// Test 4.1: Connect Socket.io
const socket = io('http://localhost:5000');

// Join as a user
socket.emit('user-join', 'test-user-id-123');
console.log('Joined as user');

// Test 4.2: Listen for real-time updates
socket.on('location-updated', (data) => {
  console.log('Location Updated:', data);
  console.log('Latitude:', data.latitude, 'Longitude:', data.longitude);
});

socket.on('notification', (data) => {
  console.log('Real-time Notification:', data);
});

socket.on('booking-updated', (data) => {
  console.log('Booking Updated:', data);
});

// Test 4.3: Start Tracking
// First, ensure a booking exists with ID 'BOOKING_ID'
const bookingId = 'BOOKING_ID_HERE';
const providerId = 'PROVIDER_ID_HERE';

fetch(`http://localhost:5000/api/tracking/start/${bookingId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ providerId })
})
.then(res => res.json())
.then(data => {
  console.log('Tracking Started:', data);
  // Save tracking ID for location updates
  window.trackingId = data.tracking._id;
});

// Test 4.4: Send Location Update (Simulating provider movement)
function updateLocation(id, latitude, longitude, address = 'Current Location') {
  fetch(`http://localhost:5000/api/tracking/update-location/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      address,
      status: 'in_transit'
    })
  })
  .then(res => res.json())
  .then(data => console.log('Location Updated:', data));
  
  // Emit real-time update
  socket.emit('location-update', {
    trackingId: id,
    latitude,
    longitude,
    address
  });
}

// Simulate multiple location updates
setTimeout(() => updateLocation(window.trackingId, 28.6139, 77.2090, 'Starting Point'), 1000);
setTimeout(() => updateLocation(window.trackingId, 28.6200, 77.2150, 'In Transit'), 3000);
setTimeout(() => updateLocation(window.trackingId, 28.6250, 77.2200, 'Near Destination'), 5000);

// Test 4.5: Get Tracking Details
fetch(`http://localhost:5000/api/tracking/${window.trackingId}`)
.then(res => res.json())
.then(data => {
  console.log('Tracking Details:', data);
  console.log('Locations:', data.locations);
  console.log('Status:', data.status);
});

// Test 4.6: Get Tracking by Booking ID
fetch(`http://localhost:5000/api/tracking/booking/${bookingId}`)
.then(res => res.json())
.then(data => console.log('Tracking for Booking:', data));

// Test 4.7: Get All Active Trackings
fetch('http://localhost:5000/api/tracking')
.then(res => res.json())
.then(data => console.log('Active Trackings:', data));

// ============================================
// 5. TEST SOCKET.IO EVENTS
// ============================================

// Test 5.1: Broadcast Notification
socket.emit('send-notification', {
  userId: 'test-user-id-123',
  title: 'Alert',
  message: 'This is a test notification'
});

// Test 5.2: Booking Status Change
socket.emit('booking-status-change', {
  bookingId: bookingId,
  status: 'completed',
  userId: 'test-user-id-123'
});

// Test 5.3: Disconnect
socket.emit('disconnect');
console.log('Disconnected from Socket.io');

// ============================================
// 6. AUTOMATED TEST FLOW
// ============================================

async function testFullFlow() {
  console.log('Starting Full Test Flow...\n');
  
  // Step 1: Register
  console.log('Step 1: Registering user...');
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User ' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'testpass123'
    })
  });
  const regData = await regRes.json();
  const testToken = regData.token;
  console.log('✓ Registration successful\n');
  
  // Step 2: Get User Info
  console.log('Step 2: Getting user info...');
  const userRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${testToken}` }
  });
  const userData = await userRes.json();
  console.log('✓ User Info:', userData.name + '\n');
  
  // Step 3: Create Notification
  console.log('Step 3: Creating notification...');
  const notifRes = await fetch('http://localhost:5000/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userData._id,
      type: 'general',
      title: 'Welcome',
      message: 'Test notification'
    })
  });
  const notifData = await notifRes.json();
  console.log('✓ Notification created\n');
  
  console.log('✓ All tests completed successfully!');
}

// Run all tests
testFullFlow();
