#pragma once
#include <stdbool.h>
#include <time.h>

typedef struct RateLimiter RateLimiter;

RateLimiter* rate_limiter_create(void);
void rate_limiter_destroy(RateLimiter* limiter);
void rate_limiter_record_registration_attempt(RateLimiter* limiter, const char* ip_address);
void rate_limiter_record_login_attempt(RateLimiter* limiter, const char* ip_address);
bool rate_limiter_is_registration_rate_limited(RateLimiter* limiter, const char* ip_address);
bool rate_limiter_is_login_rate_limited(RateLimiter* limiter, const char* ip_address);
bool rate_limiter_has_suspicious_activity(RateLimiter* limiter, const char* ip_address);
void rate_limiter_clear_rate_limit(RateLimiter* limiter, const char* ip_address);