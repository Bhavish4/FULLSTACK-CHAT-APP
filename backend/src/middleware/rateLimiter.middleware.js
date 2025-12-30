import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for message sending - max 10 messages per minute per user
const messageLimiter = new RateLimiterMemory({
  points: 10, // Number of messages allowed
  duration: 60, // Per 60 seconds
});

// Rate limiter for API requests - max 100 requests per minute per IP
const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of requests allowed
  duration: 60, // Per 60 seconds
});

export const messageRateLimiter = async (req, res, next) => {
  try {
    // Use user ID for rate limiting if available, otherwise use IP
    const userId = req.user ? req.user._id.toString() : req.ip;
    await messageLimiter.consume(userId);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limit exceeded. Too many messages, please try again later.' });
  }
};

export const apiRateLimiter = async (req, res, next) => {
  try {
    await apiLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limit exceeded. Too many requests, please try again later.' });
  }
};