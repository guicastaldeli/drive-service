#include "rate_limiter.h"
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <windows.h>

#define RATE_LIMIT_WINDOW_MS 3600000
#define MAX_REGISTRATION_ATTEMPTS_PER_HOUR 5
#define MAX_LOGIN_ATTEMPTS_PER_HOUR 10

typedef struct {
    ULONGLONG* attempts;
    size_t count;
    size_t capacity;
} AttemptList;

struct RateLimiter {
    AttemptList* registrationAttempts;
    AttemptList* loginAttempts;
    char** ipAddresses;
    size_t ipCount;
    size_t ipCapacity;
    CRITICAL_SECTION mutex;
};

static ULONGLONG getCurrentTimeMs(void) {
    ULONGLONG ticks;
    GetSystemTimeAsFileTime((FILETIME*)&ticks);
    return (ticks / 10000) - 11644473600000ULL;
}

static void cleanOldAttempts(AttemptList* list) {
    if (!list || !list->attempts) return;
    
    ULONGLONG nowMs = getCurrentTimeMs();
    ULONGLONG thresholdMs = nowMs - RATE_LIMIT_WINDOW_MS;
    
    size_t j = 0;
    for (size_t i = 0; i < list->count; i++) {
        if (list->attempts[i] >= thresholdMs) {
            list->attempts[j++] = list->attempts[i];
        }
    }
    list->count = j;
}

static bool isRateLimited(
    RateLimiter* limiter, 
    const char* ipAddress, 
    AttemptList* attempts, 
    int maxAttempts
) {
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        if (strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            cleanOldAttempts(&attempts[i]);
            bool limited = attempts[i].count >= (size_t)maxAttempts;
            LeaveCriticalSection(&limiter->mutex);
            return limited;
        }
    }
    
    LeaveCriticalSection(&limiter->mutex);
    return false;
}

RateLimiter* rateLimiterCreate(void) {
    RateLimiter* limiter = malloc(sizeof(RateLimiter));
    if (!limiter) return NULL;
    
    limiter->ipCount = 0;
    limiter->ipCapacity = 10;
    limiter->ipAddresses = malloc(sizeof(char*) * limiter->ipCapacity);
    limiter->registrationAttempts = malloc(sizeof(AttemptList) * limiter->ipCapacity);
    limiter->loginAttempts = malloc(sizeof(AttemptList) * limiter->ipCapacity);
    
    if (!limiter->ipAddresses || !limiter->registrationAttempts || !limiter->loginAttempts) {
        free(limiter->ipAddresses);
        free(limiter->registrationAttempts);
        free(limiter->loginAttempts);
        free(limiter);
        return NULL;
    }
    
    InitializeCriticalSection(&limiter->mutex);
    
    return limiter;
}

void rateLimiterDestroy(RateLimiter* limiter) {
    if (!limiter) return;
    
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        free(limiter->ipAddresses[i]);
        free(limiter->registrationAttempts[i].attempts);
        free(limiter->loginAttempts[i].attempts);
    }
    
    free(limiter->ipAddresses);
    free(limiter->registrationAttempts);
    free(limiter->loginAttempts);
    
    LeaveCriticalSection(&limiter->mutex);
    DeleteCriticalSection(&limiter->mutex);
    free(limiter);
}

void rateLimiterRecordRegistrationAttempt(RateLimiter* limiter, const char* ipAddress) {
    if (!limiter || !ipAddress) return;
    
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        if (strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            AttemptList* list = &limiter->registrationAttempts[i];
            
            if (list->count >= list->capacity) {
                list->capacity = list->capacity == 0 ? 10 : list->capacity * 2;
                list->attempts = realloc(list->attempts, sizeof(ULONGLONG) * list->capacity);
            }
            
            list->attempts[list->count++] = getCurrentTimeMs();
            cleanOldAttempts(list);
            LeaveCriticalSection(&limiter->mutex);
            return;
        }
    }
    
    if (limiter->ipCount >= limiter->ipCapacity) {
        limiter->ipCapacity *= 2;
        limiter->ipAddresses = realloc(limiter->ipAddresses, sizeof(char*) * limiter->ipCapacity);
        limiter->registrationAttempts = realloc(limiter->registrationAttempts, sizeof(AttemptList) * limiter->ipCapacity);
        limiter->loginAttempts = realloc(limiter->loginAttempts, sizeof(AttemptList) * limiter->ipCapacity);
    }
    
    limiter->ipAddresses[limiter->ipCount] = malloc(strlen(ipAddress) + 1);
    strcpy(limiter->ipAddresses[limiter->ipCount], ipAddress);
    limiter->registrationAttempts[limiter->ipCount].attempts = NULL;
    limiter->registrationAttempts[limiter->ipCount].count = 0;
    limiter->registrationAttempts[limiter->ipCount].capacity = 0;
    limiter->loginAttempts[limiter->ipCount].attempts = NULL;
    limiter->loginAttempts[limiter->ipCount].count = 0;
    limiter->loginAttempts[limiter->ipCount].capacity = 0;
    
    AttemptList* list = &limiter->registrationAttempts[limiter->ipCount];
    list->capacity = 10;
    list->attempts = malloc(sizeof(ULONGLONG) * list->capacity);
    list->attempts[0] = getCurrentTimeMs();
    list->count = 1;
    
    limiter->ipCount++;
    
    LeaveCriticalSection(&limiter->mutex);
}

void rateLimiterRecordLoginAttempt(RateLimiter* limiter, const char* ipAddress) {
    if (!limiter || !ipAddress) return;
    
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        if (strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            AttemptList* list = &limiter->loginAttempts[i];
            
            if (list->count >= list->capacity) {
                list->capacity = list->capacity == 0 ? 10 : list->capacity * 2;
                list->attempts = realloc(list->attempts, sizeof(ULONGLONG) * list->capacity);
            }
            
            list->attempts[list->count++] = getCurrentTimeMs();
            cleanOldAttempts(list);
            LeaveCriticalSection(&limiter->mutex);
            return;
        }
    }
    
    if (limiter->ipCount >= limiter->ipCapacity) {
        limiter->ipCapacity *= 2;
        limiter->ipAddresses = realloc(limiter->ipAddresses, sizeof(char*) * limiter->ipCapacity);
        limiter->registrationAttempts = realloc(limiter->registrationAttempts, sizeof(AttemptList) * limiter->ipCapacity);
        limiter->loginAttempts = realloc(limiter->loginAttempts, sizeof(AttemptList) * limiter->ipCapacity);
    }
    
    limiter->ipAddresses[limiter->ipCount] = malloc(strlen(ipAddress) + 1);
    strcpy(limiter->ipAddresses[limiter->ipCount], ipAddress);
    limiter->registrationAttempts[limiter->ipCount].attempts = NULL;
    limiter->registrationAttempts[limiter->ipCount].count = 0;
    limiter->registrationAttempts[limiter->ipCount].capacity = 0;
    limiter->loginAttempts[limiter->ipCount].attempts = NULL;
    limiter->loginAttempts[limiter->ipCount].count = 0;
    limiter->loginAttempts[limiter->ipCount].capacity = 0;
    
    AttemptList* list = &limiter->loginAttempts[limiter->ipCount];
    list->capacity = 10;
    list->attempts = malloc(sizeof(ULONGLONG) * list->capacity);
    list->attempts[0] = getCurrentTimeMs();
    list->count = 1;
    
    limiter->ipCount++;
    
    LeaveCriticalSection(&limiter->mutex);
}

bool rateLimiterIsRegistrationRateLimited(RateLimiter* limiter, const char* ipAddress) {
    return isRateLimited(limiter, ipAddress, limiter->registrationAttempts, MAX_REGISTRATION_ATTEMPTS_PER_HOUR);
}

bool rateLimiterIsLoginRateLimited(RateLimiter* limiter, const char* ipAddress) {
    return isRateLimited(limiter, ipAddress, limiter->loginAttempts, MAX_LOGIN_ATTEMPTS_PER_HOUR);
}

bool rateLimiterHasSuspiciousActivity(RateLimiter* limiter, const char* ipAddress) {
    if (!limiter || !ipAddress) return false;
    
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        if (strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            cleanOldAttempts(&limiter->registrationAttempts[i]);
            cleanOldAttempts(&limiter->loginAttempts[i]);
            
            int totalAttempts = limiter->registrationAttempts[i].count + limiter->loginAttempts[i].count;
            LeaveCriticalSection(&limiter->mutex);
            return totalAttempts > (MAX_REGISTRATION_ATTEMPTS_PER_HOUR + MAX_LOGIN_ATTEMPTS_PER_HOUR);
        }
    }
    
    LeaveCriticalSection(&limiter->mutex);
    return false;
}

void rateLimiterClearRateLimit(RateLimiter* limiter, const char* ipAddress) {
    if (!limiter || !ipAddress) return;
    
    EnterCriticalSection(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ipCount; i++) {
        if (strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            free(limiter->ipAddresses[i]);
            free(limiter->registrationAttempts[i].attempts);
            free(limiter->loginAttempts[i].attempts);
            
            for (size_t j = i; j < limiter->ipCount - 1; j++) {
                limiter->ipAddresses[j] = limiter->ipAddresses[j + 1];
                limiter->registrationAttempts[j] = limiter->registrationAttempts[j + 1];
                limiter->loginAttempts[j] = limiter->loginAttempts[j + 1];
            }
            
            limiter->ipCount--;
            break;
        }
    }
    
    LeaveCriticalSection(&limiter->mutex);
}