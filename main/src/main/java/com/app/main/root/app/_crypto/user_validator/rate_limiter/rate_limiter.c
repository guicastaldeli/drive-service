#ifndef _WIN32
#define _POSIX_C_SOURCE 199309L
#endif

#include "rate_limiter.h"
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

// Platform-specific includes and types
#ifdef _WIN32
    #include <windows.h>
    typedef CRITICAL_SECTION mutex_t;
    #define MUTEX_INIT(m) InitializeCriticalSection(&(m))
    #define MUTEX_LOCK(m) EnterCriticalSection(&(m))
    #define MUTEX_UNLOCK(m) LeaveCriticalSection(&(m))
    #define MUTEX_DESTROY(m) DeleteCriticalSection(&(m))
#else
    #include <pthread.h>
    typedef pthread_mutex_t mutex_t;
    #define MUTEX_INIT(m) pthread_mutex_init(&(m), NULL)
    #define MUTEX_LOCK(m) pthread_mutex_lock(&(m))
    #define MUTEX_UNLOCK(m) pthread_mutex_unlock(&(m))
    #define MUTEX_DESTROY(m) pthread_mutex_destroy(&(m))
#endif

#define RATE_LIMIT_WINDOW_MS 3600000
#define MAX_REGISTRATION_ATTEMPTS_PER_HOUR 5
#define MAX_LOGIN_ATTEMPTS_PER_HOUR 10

typedef struct {
    long long* attempts;
    size_t count;
    size_t capacity;
} AttemptList;

struct RateLimiter {
    AttemptList* registrationAttempts;
    AttemptList* loginAttempts;
    char** ipAddresses;
    size_t ipCount;
    size_t ipCapacity;
    mutex_t mutex;
};

static long long getCurrentTimeMs(void) {
#ifdef _WIN32
    return (long long)time(NULL) * 1000LL;
#else
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (long long)ts.tv_sec * 1000LL + (long long)ts.tv_nsec / 1000000LL;
#endif
}

static void cleanOldAttempts(AttemptList* list) {
    if(!list || !list->attempts) return;
    
    long long nowMs = getCurrentTimeMs();
    long long thresholdMs = nowMs - RATE_LIMIT_WINDOW_MS;
    
    size_t j = 0;
    for(size_t i = 0; i < list->count; i++) {
        if(list->attempts[i] >= thresholdMs) {
            list->attempts[j++] = list->attempts[i];
        }
    }
    list->count = j;
}

RateLimiter* rateLimiterCreate(void) {
    RateLimiter* limiter = malloc(sizeof(RateLimiter));
    if(!limiter) return NULL;
    
    limiter->ipCount = 0;
    limiter->ipCapacity = 10;
    limiter->ipAddresses = malloc(sizeof(char*) * limiter->ipCapacity);
    limiter->registrationAttempts = malloc(sizeof(AttemptList) * limiter->ipCapacity);
    limiter->loginAttempts = malloc(sizeof(AttemptList) * limiter->ipCapacity);
    
    if(!limiter->ipAddresses || !limiter->registrationAttempts || !limiter->loginAttempts) {
        free(limiter->ipAddresses);
        free(limiter->registrationAttempts);
        free(limiter->loginAttempts);
        free(limiter);
        return NULL;
    }
    
    memset(limiter->ipAddresses, 0, sizeof(char*) * limiter->ipCapacity);
    memset(limiter->registrationAttempts, 0, sizeof(AttemptList) * limiter->ipCapacity);
    memset(limiter->loginAttempts, 0, sizeof(AttemptList) * limiter->ipCapacity);
    
    MUTEX_INIT(limiter->mutex);
    
    return limiter;
}

void rateLimiterDestroy(RateLimiter* limiter) {
    if(!limiter) return;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i]) free(limiter->ipAddresses[i]);
        if(limiter->registrationAttempts[i].attempts) free(limiter->registrationAttempts[i].attempts);
        if(limiter->loginAttempts[i].attempts) free(limiter->loginAttempts[i].attempts);
    }
    
    free(limiter->ipAddresses);
    free(limiter->registrationAttempts);
    free(limiter->loginAttempts);
    
    MUTEX_UNLOCK(limiter->mutex);
    MUTEX_DESTROY(limiter->mutex);
    free(limiter);
}

void rateLimiterRecordRegistrationAttempt(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            AttemptList* list = &limiter->registrationAttempts[i];
            
            if(list->count >= list->capacity) {
                size_t newCapacity = list->capacity == 0 ? 10 : list->capacity * 2;
                long long* newAttempts = realloc(list->attempts, sizeof(long long) * newCapacity);
                if(!newAttempts) {
                    MUTEX_UNLOCK(limiter->mutex);
                    return;
                }
                list->attempts = newAttempts;
                list->capacity = newCapacity;
            }
            
            list->attempts[list->count++] = getCurrentTimeMs();
            MUTEX_UNLOCK(limiter->mutex);
            return;
        }
    }
    
    if(limiter->ipCount >= limiter->ipCapacity) {
        size_t newCapacity = limiter->ipCapacity * 2;
        char** newIpAddresses = realloc(limiter->ipAddresses, sizeof(char*) * newCapacity);
        AttemptList* newRegAttempts = realloc(limiter->registrationAttempts, sizeof(AttemptList) * newCapacity);
        AttemptList* newLoginAttempts = realloc(limiter->loginAttempts, sizeof(AttemptList) * newCapacity);
        
        if(!newIpAddresses || !newRegAttempts || !newLoginAttempts) {
            MUTEX_UNLOCK(limiter->mutex);
            return;
        }
        
        limiter->ipAddresses = newIpAddresses;
        limiter->registrationAttempts = newRegAttempts;
        limiter->loginAttempts = newLoginAttempts;
        limiter->ipCapacity = newCapacity;
        
        memset(&limiter->ipAddresses[limiter->ipCount], 0, sizeof(char*) * (newCapacity - limiter->ipCount));
        memset(&limiter->registrationAttempts[limiter->ipCount], 0, sizeof(AttemptList) * (newCapacity - limiter->ipCount));
        memset(&limiter->loginAttempts[limiter->ipCount], 0, sizeof(AttemptList) * (newCapacity - limiter->ipCount));
    }
    
    limiter->ipAddresses[limiter->ipCount] = malloc(strlen(ipAddress) + 1);
    if(!limiter->ipAddresses[limiter->ipCount]) {
        MUTEX_UNLOCK(limiter->mutex);
        return;
    }
    strcpy(limiter->ipAddresses[limiter->ipCount], ipAddress);
    
    limiter->registrationAttempts[limiter->ipCount].attempts = malloc(sizeof(long long) * 10);
    if(!limiter->registrationAttempts[limiter->ipCount].attempts) {
        free(limiter->ipAddresses[limiter->ipCount]);
        MUTEX_UNLOCK(limiter->mutex);
        return;
    }
    limiter->registrationAttempts[limiter->ipCount].attempts[0] = getCurrentTimeMs();
    limiter->registrationAttempts[limiter->ipCount].count = 1;
    limiter->registrationAttempts[limiter->ipCount].capacity = 10;
    
    limiter->loginAttempts[limiter->ipCount].attempts = NULL;
    limiter->loginAttempts[limiter->ipCount].count = 0;
    limiter->loginAttempts[limiter->ipCount].capacity = 0;
    
    limiter->ipCount++;
    
    MUTEX_UNLOCK(limiter->mutex);
}

void rateLimiterRecordLoginAttempt(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            AttemptList* list = &limiter->loginAttempts[i];
            
            if(list->count >= list->capacity) {
                size_t newCapacity = list->capacity == 0 ? 10 : list->capacity * 2;
                long long* newAttempts = realloc(list->attempts, sizeof(long long) * newCapacity);
                if(!newAttempts) {
                    MUTEX_UNLOCK(limiter->mutex);
                    return;
                }
                list->attempts = newAttempts;
                list->capacity = newCapacity;
            }
            
            list->attempts[list->count++] = getCurrentTimeMs();
            MUTEX_UNLOCK(limiter->mutex);
            return;
        }
    }
    
    if(limiter->ipCount >= limiter->ipCapacity) {
        size_t newCapacity = limiter->ipCapacity * 2;
        char** newIpAddresses = realloc(limiter->ipAddresses, sizeof(char*) * newCapacity);
        AttemptList* newRegAttempts = realloc(limiter->registrationAttempts, sizeof(AttemptList) * newCapacity);
        AttemptList* newLoginAttempts = realloc(limiter->loginAttempts, sizeof(AttemptList) * newCapacity);
        
        if(!newIpAddresses || !newRegAttempts || !newLoginAttempts) {
            MUTEX_UNLOCK(limiter->mutex);
            return;
        }
        
        limiter->ipAddresses = newIpAddresses;
        limiter->registrationAttempts = newRegAttempts;
        limiter->loginAttempts = newLoginAttempts;
        limiter->ipCapacity = newCapacity;
        
        memset(&limiter->ipAddresses[limiter->ipCount], 0, sizeof(char*) * (newCapacity - limiter->ipCount));
        memset(&limiter->registrationAttempts[limiter->ipCount], 0, sizeof(AttemptList) * (newCapacity - limiter->ipCount));
        memset(&limiter->loginAttempts[limiter->ipCount], 0, sizeof(AttemptList) * (newCapacity - limiter->ipCount));
    }
    
    limiter->ipAddresses[limiter->ipCount] = malloc(strlen(ipAddress) + 1);
    if(!limiter->ipAddresses[limiter->ipCount]) {
        MUTEX_UNLOCK(limiter->mutex);
        return;
    }
    strcpy(limiter->ipAddresses[limiter->ipCount], ipAddress);
    
    limiter->loginAttempts[limiter->ipCount].attempts = malloc(sizeof(long long) * 10);
    if(!limiter->loginAttempts[limiter->ipCount].attempts) {
        free(limiter->ipAddresses[limiter->ipCount]);
        MUTEX_UNLOCK(limiter->mutex);
        return;
    }
    limiter->loginAttempts[limiter->ipCount].attempts[0] = getCurrentTimeMs();
    limiter->loginAttempts[limiter->ipCount].count = 1;
    limiter->loginAttempts[limiter->ipCount].capacity = 10;
    
    limiter->registrationAttempts[limiter->ipCount].attempts = NULL;
    limiter->registrationAttempts[limiter->ipCount].count = 0;
    limiter->registrationAttempts[limiter->ipCount].capacity = 0;
    
    limiter->ipCount++;
    
    MUTEX_UNLOCK(limiter->mutex);
}

bool rateLimiterIsRegistrationRateLimited(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return false;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            cleanOldAttempts(&limiter->registrationAttempts[i]);
            bool limited = limiter->registrationAttempts[i].count >= MAX_REGISTRATION_ATTEMPTS_PER_HOUR;
            MUTEX_UNLOCK(limiter->mutex);
            return limited;
        }
    }
    
    MUTEX_UNLOCK(limiter->mutex);
    return false;
}

bool rateLimiterIsLoginRateLimited(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return false;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            cleanOldAttempts(&limiter->loginAttempts[i]);
            bool limited = limiter->loginAttempts[i].count >= MAX_LOGIN_ATTEMPTS_PER_HOUR;
            MUTEX_UNLOCK(limiter->mutex);
            return limited;
        }
    }
    
    MUTEX_UNLOCK(limiter->mutex);
    return false;
}

bool rateLimiterHasSuspiciousActivity(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return false;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            cleanOldAttempts(&limiter->registrationAttempts[i]);
            cleanOldAttempts(&limiter->loginAttempts[i]);
            
            int totalAttempts = limiter->registrationAttempts[i].count + limiter->loginAttempts[i].count;
            MUTEX_UNLOCK(limiter->mutex);
            return totalAttempts > (MAX_REGISTRATION_ATTEMPTS_PER_HOUR + MAX_LOGIN_ATTEMPTS_PER_HOUR);
        }
    }
    
    MUTEX_UNLOCK(limiter->mutex);
    return false;
}

void rateLimiterClearRateLimit(RateLimiter* limiter, const char* ipAddress) {
    if(!limiter || !ipAddress) return;
    
    MUTEX_LOCK(limiter->mutex);
    
    for(size_t i = 0; i < limiter->ipCount; i++) {
        if(limiter->ipAddresses[i] && strcmp(limiter->ipAddresses[i], ipAddress) == 0) {
            free(limiter->ipAddresses[i]);
            if(limiter->registrationAttempts[i].attempts) free(limiter->registrationAttempts[i].attempts);
            if(limiter->loginAttempts[i].attempts) free(limiter->loginAttempts[i].attempts);
            
            for(size_t j = i; j < limiter->ipCount - 1; j++) {
                limiter->ipAddresses[j] = limiter->ipAddresses[j + 1];
                limiter->registrationAttempts[j] = limiter->registrationAttempts[j + 1];
                limiter->loginAttempts[j] = limiter->loginAttempts[j + 1];
            }
            
            limiter->ipCount--;
            break;
        }
    }
    
    MUTEX_UNLOCK(limiter->mutex);
}