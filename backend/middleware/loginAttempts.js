const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const attemptsMap = new Map();

// Cleanup expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attemptsMap.entries()) {
    if (data.lockoutUntil && data.lockoutUntil < now) {
      attemptsMap.delete(key);
    }
  }
}, 30 * 60 * 1000);

const recordFailedAttempt = (key) => {
  if (!key) return;
  const now = Date.now();
  const data = attemptsMap.get(key) || { count: 0, lockoutUntil: null };
  
  data.count += 1;
  if (data.count >= MAX_ATTEMPTS) {
    data.lockoutUntil = now + LOCKOUT_DURATION;
  }
  
  attemptsMap.set(key, data);
};

const resetAttempts = (key) => {
  if (!key) return;
  attemptsMap.delete(key);
};

const checkLoginAttempts = (keyExtractor) => {
  return (req, res, next) => {
    const key = keyExtractor(req);
    if (!key) return next();

    const data = attemptsMap.get(key);
    if (data && data.lockoutUntil) {
      const now = Date.now();
      if (now < data.lockoutUntil) {
        const retryAfter = Math.ceil((data.lockoutUntil - now) / 1000);
        return res.status(429).json({
          message: 'Too many failed login attempts. Please try again later.',
          retryAfter
        });
      } else {
        // Lockout expired
        attemptsMap.delete(key);
      }
    }
    next();
  };
};

module.exports = {
  checkLoginAttempts,
  recordFailedAttempt,
  resetAttempts
};
