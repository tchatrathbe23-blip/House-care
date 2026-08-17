# 🏠 HouseCare — On-Demand Home Services & Real-Time Tracking Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose-brightgreen.svg?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-blue.svg?logo=socket.io)](https://socket.io/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps%20%26%20Routing-brightgreen.svg?logo=leaflet)](https://leafletjs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A production-grade, full-stack on-demand home service booking and management platform. Features real-time GPS provider tracking on interactive maps, bi-directional WebSocket notifications, dynamic pricing calculations, payment gateway integration, role-based admin operations, and business analytics.

---

## 🌟 Key Highlights & Features

### 👤 Customer Experience
* **Service Catalog & Booking**: Full Home Deep Cleaning, Electrician, Plumber, Pest Control with interactive checklist selections and instant estimates.
* **Live Service Tracking**: Real-time Leaflet.js map with routing machine, live GPS coordinate streams via Socket.IO, status badges, and ETA calculations.
* **Real-time Notifications**: In-app notifications with unread counts, push banners, and Web Audio API chime sounds.
* **Interactive AI Assistant**: Embedded support chatbot for instant answers on services, pricing, bookings, and policies.
* **Authentication & Security**: Secure JWT authentication, strong password policy validation, session refresh, and OTP password recovery.
* **Modern UI & Theme**: Polished glassmorphism design system with responsive layouts and persistent Light/Dark mode.

### 🛡️ Admin & Operations Management
* **Operations Command Center**: Live booking management, task checklist progress, technician dispatching, price adjustments, and bulk status updates.
* **Real-Time Technician Tracking**: Live monitoring of all active field providers on route to customer locations.
* **Business Analytics**: Chart.js visualizations covering daily booking velocity, category-wise revenue distribution, and service breakdown.
* **Security & Access Control**: Role-based access control (Super Admin / Admin), brute-force login rate limiting with IP-based cooldowns, and Helmet HTTP security headers.

---

## 🏗️ System Architecture

`	ext
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  HTML5 • CSS3 Glassmorphism • Vanilla JS • Leaflet • Chart  │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP REST API                │ WebSocket (Socket.IO)
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│                 Node.js / Express.js Server                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Middlewares: Helmet, CORS, JWT Auth, Rate Limiter     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ REST Routes: /auth, /bookings, /tracking, /analytics  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Socket.IO Server: Live GPS Broadcasts & Notifications │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
      ┌──────────────────┐           ┌──────────────────┐
      │  MongoDB Atlas   │           │ Razorpay Payment │
      │ (Mongoose ODM)   │           │ & Nodemailer OTP │
      └──────────────────┘           └──────────────────┘
`

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)
* [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster URI)

### 2. Clone and Install Dependencies
`ash
git clone https://github.com/your-username/House-care.git
cd House-care

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
`

### 3. Configure Environment Variables
Create a ackend/.env file (refer to ackend/.env.example):
`env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/housecare
JWT_SECRET=your_super_secret_jwt_key

# Admin Demo Credentials
DEMO_ADMIN_ENABLED=true
DEMO_ADMIN_USERNAME=admin
DEMO_ADMIN_PASSWORD=password123
`

### 4. Start the Application
`ash
# Start backend and static server
npm start
`
Visit **http://localhost:5000** in your browser.

---

## 🔑 Demo Access Credentials

| Role | Username / Email | Password | Access Link |
| :--- | :--- | :--- | :--- |
| **Super Admin** | dmin *(or admin@housecare.com)* | password123 | [/admin-login.html](http://localhost:5000/admin-login.html) |
| **Customer** | 	est@housecare.com | Password123 | [/login.html](http://localhost:5000/login.html) |

*(Both login portals feature a **1-Click Quick Fill** button for instant testing).*

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET | /health | Public | Service health & database connectivity check |
| POST | /api/auth/register | Public | Register new customer account |
| POST | /api/auth/login | Public | Authenticate user & return JWT |
| GET | /api/auth/me | User | Get current authenticated user profile |
| POST | /api/admin/login | Public | Authenticate admin with rate-limiting |
| POST | /api/bookings | User | Create a new service booking |
| GET | /api/bookings | Admin | Retrieve paginated bookings with filters |
| PUT | /api/bookings/:id | Admin | Update booking status & trigger notifications |
| GET | /api/tracking/:id | Public | Get tracking trail and latest GPS coordinates |
| POST | /api/tracking/update-location/:id | Provider | Broadcast live provider location via Socket.IO |
| GET | /api/analytics/daily | Admin | Fetch daily booking aggregate metrics |
| GET | /api/analytics/revenue | Admin | Fetch revenue metrics |
| POST | /api/otp/send | Public | Send password reset OTP |

---

## ☁️ Production Deployment

### Deploy on Render / Railway
1. Fork or push this repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Set **Build Command**: 
pm install --prefix backend && npm install
4. Set **Start Command**: 
pm start
5. Configure Environment Variables (MONGODB_URI, JWT_SECRET, NODE_ENV=production).

---

## 🛡️ Security Best Practices Implemented
* **HTTP Security Headers**: Enforced via helmet to mitigate XSS and clickjacking.
* **Password Hashing**: Salted cryptjs hashing with 10 rounds.
* **Brute-force Protection**: IP and credential rate limiting on authentication routes with lockout cooldowns.
* **CORS & Origin Isolation**: Configured origins for REST endpoints and Socket.IO transports.
* **Safe Error Envelopes**: Production errors sanitize internal database and stack traces.

---

## 📄 License
This project is open source and available under the [ISC License](LICENSE).
