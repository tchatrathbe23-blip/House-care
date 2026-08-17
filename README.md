# 🏠 HouseCare — Full Stack Home Services Platform

A full-stack web application that allows users to book home services like cleaning, plumbing, electrical work, and pest control. The system supports real-time booking management, payment integration, tracking, and advanced MongoDB analytics.

---

## 🚀 Features

### 👤 User Side

* Book services (with or without payment)
* Razorpay payment integration 💳
* Track booking using phone number 📦
* Auto-filled booking form based on selected service
* Responsive modern UI

### 🧑‍💼 Admin Dashboard

* View all bookings in real-time
* Update booking status (Pending / In Progress / Completed)
* Filter & search bookings
* Dashboard statistics (total, pending, completed)
* Revenue tracking

### 📊 Database (MongoDB Focus — Key Highlight)

* Indexed fields (`phone`, `service`) for faster queries
* Advanced aggregation pipelines:

  * Bookings per service
  * Status distribution
  * Revenue calculation
  * Category performance
  * Daily booking trends

---

## 🛠️ Tech Stack

**Frontend:**

* HTML, CSS, JavaScript (Vanilla)

**Backend:**

* Node.js, Express.js

**Database:**

* MongoDB (Mongoose)

**Payment:**

* Razorpay API

---

## 📁 Project Structure

```
Project_Housekeeping/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── server.js
│
├── index.html
├── services.html
├── admin.html
├── track.html
├── script.js
├── admin.js
├── style.css
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/housecare.git
cd housecare
```

### 2️⃣ Install backend dependencies

```bash
cd backend
npm install
```

### 3️⃣ Run backend server

```bash
node server.js
```

### 4️⃣ Run frontend

* Open `index.html` using Live Server (VS Code)

---

## 🌐 API Endpoints

### 📌 Booking APIs

* `POST /api/bookings` → Create booking
* `GET /api/bookings` → Get bookings (pagination + filter)
* `PUT /api/bookings/:id` → Update status
* `DELETE /api/bookings/:id` → Delete booking
* `GET /api/bookings/track/:phone` → Track booking

### 📊 Analytics APIs

* `/api/analytics/services`
* `/api/analytics/status`
* `/api/analytics/revenue`
* `/api/analytics/category`
* `/api/analytics/daily`

---

## 📈 Key Learning Highlights

* Implemented MongoDB indexing for optimization
* Built aggregation pipelines for real-world analytics
* Integrated third-party payment gateway (Razorpay)
* Designed full CRUD system with REST APIs
* Built responsive UI with dynamic DOM handling

---

## 🔥 Future Improvements

* User authentication (JWT)
* Admin login system
* Real-time notifications
* Map-based service tracking
* Deployment (Render / Vercel)

---

## 👨‍💻 Author

**Tarun Chatrath**
Computer Engineering Student | Full Stack Developer

---

## ⭐ If you like this project

Give it a ⭐ on GitHub and share with others!
