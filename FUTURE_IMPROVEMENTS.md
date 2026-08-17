# Future Improvements Roadmap

This project already has first-pass versions of JWT auth, admin login, real-time notifications, and map-based tracking. The next step is to turn those prototypes into production-ready features.

## Priority 1: User Authentication (JWT)

Current state:
- Users can register and log in through `/api/auth/register` and `/api/auth/login`.
- Passwords are hashed with bcryptjs.
- JWTs are issued and stored on the frontend.

Recommended improvements:
- Add refresh tokens so users do not need to log in again after short token expiry.
- Add password reset with OTP/email verification.
- Add profile update endpoints and email/phone uniqueness validation.
- Move JWT secrets and token expiry settings fully into environment variables.
- Add rate limiting to login and register endpoints to reduce brute-force attempts.

Suggested backend work:
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PUT /api/auth/profile`

## Priority 2: Admin Login System

Current state:
- Admins can log in through `/api/admin/login`.
- Admin roles support `admin` and `super_admin`.
- Super admins can create new admins.

Recommended improvements:
- Add a dedicated admin management screen in the dashboard.
- Add permission checks per admin action, not only role checks.
- Add audit logs for admin login, booking updates, payment changes, and deleted records.
- Disable demo admin credentials in production, unless explicitly enabled.
- Add optional two-factor authentication for super admins.

Suggested backend work:
- `GET /api/admin/users`
- `PUT /api/admin/:id/permissions`
- `PATCH /api/admin/:id/status`
- `GET /api/admin/audit-logs`

## Priority 3: Real-Time Notifications

Current state:
- Socket.IO is configured on the backend.
- Notifications are stored in MongoDB.
- Users and admins can fetch notifications.

Recommended improvements:
- Emit Socket.IO events when a notification is created through the API.
- Add unread notification counters in the navbar and admin dashboard.
- Add browser push notifications for important updates.
- Add notification preferences for email, SMS, and in-app alerts.
- Add ownership checks so users can only edit their own notifications.

Suggested socket events:
- `notification:new`
- `notification:read`
- `notification:deleted`
- `booking:status-changed`
- `payment:status-changed`

## Priority 4: Map-Based Service Tracking

Current state:
- Tracking records store provider coordinates.
- Live location updates can be sent through API and Socket.IO.
- `tracking.html` uses a map-based interface for customers.

Recommended improvements:
- Require provider/admin authentication before updating location.
- Store provider assignment on the booking record.
- Add route drawing from customer address to provider location.
- Add ETA calculation using a routing API.
- Add status milestones such as assigned, on the way, arrived, started, completed.
- Add privacy controls so live tracking is visible only to the booking owner and admins.

Suggested backend work:
- `PATCH /api/tracking/:trackingId/status`
- `POST /api/tracking/:trackingId/location`
- `GET /api/tracking/active/provider/:providerId`
- `GET /api/tracking/customer/:bookingId`

## Recommended Build Order

1. Harden auth secrets, demo admin behavior, and protected route checks.
2. Add admin audit logs and finer permission checks.
3. Connect notification creation to Socket.IO events and frontend unread badges.
4. Lock tracking updates to authenticated providers/admins.
5. Add ETA and route visualization.
6. Add tests for auth, admin permissions, notifications, and tracking APIs.

## Testing Checklist

- Register user, log in, and call `/api/auth/me` with a JWT.
- Log in as admin and verify protected admin routes reject normal user tokens.
- Create a notification as admin and confirm normal users cannot create one.
- Confirm a user cannot mark another user's notification as read.
- Start tracking for a booking and confirm map updates after a location change.
- Confirm production mode fails fast when `JWT_SECRET` is missing.