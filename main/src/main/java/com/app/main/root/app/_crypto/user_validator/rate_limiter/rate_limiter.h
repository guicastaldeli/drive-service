#pragma once
#include <stdbool.h>
#include <time.h>

typedef struct RateLimiter RateLimiter;

RateLimiter* rateLimiterCreate(void);
void rateLimiterDestroy(RateLimiter* limiter);
void rateLimiterRecordRegistrationAttempt(RateLimiter* limiter, const char* ipAddress);
void rateLimiterRecordLoginAttempt(RateLimiter* limiter, const char* ipAddress);
bool rateLimiterIsRegistrationRateLimited(RateLimiter* limiter, const char* ipAddress);
bool rateLimiterIsLoginRateLimited(RateLimiter* limiter, const char* ipAddress);
bool rateLimiterHasSuspiciousActivity(RateLimiter* limiter, const char* ipAddress);
void rateLimiterClearRateLimit(RateLimiter* limiter, const char* ipAddress);