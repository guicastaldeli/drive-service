#include "rate_limiter.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>
#include <stdbool.h>

#define RATE_LIMIT_WINDOW_MS 3600000
#define MAX_REGISTRATION_ATTEMPTS_PER_HOUR 5
#define MAX_LOGIN_ATTEMPTS_PER_HOUR 10

typedef struct {
    struct timespec* attempts;
    size_t count;
    size_t capacity;
} AttemptList;

struct RateLimiter {
    AttemptList* registration_attempts;
    AttemptList* login_attempts;
    char** ip_addresses;
    size_t ip_count;
    size_t ip_capacity;
    pthread_mutex_t mutex;
};

static void clean_old_attempts(AttemptList* list) {
    if (!list || !list->attempts) return;
    
    struct timespec now;
    clock_gettime(CLOCK_MONOTONIC, &now);
    
    long long now_ms = now.tv_sec * 1000LL + now.tv_nsec / 1000000;
    long long threshold_ms = now_ms - RATE_LIMIT_WINDOW_MS;
    
    size_t j = 0;
    for (size_t i = 0; i < list->count; i++) {
        long long attempt_ms = list->attempts[i].tv_sec * 1000LL + list->attempts[i].tv_nsec / 1000000;
        if (attempt_ms >= threshold_ms) {
            list->attempts[j++] = list->attempts[i];
        }
    }
    list->count = j;
}

static bool is_rate_limited(RateLimiter* limiter, const char* ip_address, AttemptList* attempts, int max_attempts) {
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        if (strcmp(limiter->ip_addresses[i], ip_address) == 0) {
            clean_old_attempts(&attempts[i]);
            bool limited = attempts[i].count >= max_attempts;
            pthread_mutex_unlock(&limiter->mutex);
            return limited;
        }
    }
    
    pthread_mutex_unlock(&limiter->mutex);
    return false;
}

RateLimiter* rate_limiter_create(void) {
    RateLimiter* limiter = malloc(sizeof(RateLimiter));
    if (!limiter) return NULL;
    
    limiter->ip_count = 0;
    limiter->ip_capacity = 10;
    limiter->ip_addresses = malloc(sizeof(char*) * limiter->ip_capacity);
    limiter->registration_attempts = malloc(sizeof(AttemptList) * limiter->ip_capacity);
    limiter->login_attempts = malloc(sizeof(AttemptList) * limiter->ip_capacity);
    
    if (!limiter->ip_addresses || !limiter->registration_attempts || !limiter->login_attempts) {
        free(limiter->ip_addresses);
        free(limiter->registration_attempts);
        free(limiter->login_attempts);
        free(limiter);
        return NULL;
    }
    
    pthread_mutex_init(&limiter->mutex, NULL);
    
    return limiter;
}

void rate_limiter_destroy(RateLimiter* limiter) {
    if (!limiter) return;
    
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        free(limiter->ip_addresses[i]);
        free(limiter->registration_attempts[i].attempts);
        free(limiter->login_attempts[i].attempts);
    }
    
    free(limiter->ip_addresses);
    free(limiter->registration_attempts);
    free(limiter->login_attempts);
    
    pthread_mutex_unlock(&limiter->mutex);
    pthread_mutex_destroy(&limiter->mutex);
    free(limiter);
}

void rate_limiter_record_registration_attempt(RateLimiter* limiter, const char* ip_address) {
    if (!limiter || !ip_address) return;
    
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        if (strcmp(limiter->ip_addresses[i], ip_address) == 0) {
            AttemptList* list = &limiter->registration_attempts[i];
            
            if (list->count >= list->capacity) {
                list->capacity = list->capacity == 0 ? 10 : list->capacity * 2;
                list->attempts = realloc(list->attempts, sizeof(struct timespec) * list->capacity);
            }
            
            clock_gettime(CLOCK_MONOTONIC, &list->attempts[list->count++]);
            clean_old_attempts(list);
            pthread_mutex_unlock(&limiter->mutex);
            return;
        }
    }
    
    if (limiter->ip_count >= limiter->ip_capacity) {
        limiter->ip_capacity *= 2;
        limiter->ip_addresses = realloc(limiter->ip_addresses, sizeof(char*) * limiter->ip_capacity);
        limiter->registration_attempts = realloc(limiter->registration_attempts, sizeof(AttemptList) * limiter->ip_capacity);
        limiter->login_attempts = realloc(limiter->login_attempts, sizeof(AttemptList) * limiter->ip_capacity);
    }
    
    limiter->ip_addresses[limiter->ip_count] = strdup(ip_address);
    limiter->registration_attempts[limiter->ip_count].attempts = NULL;
    limiter->registration_attempts[limiter->ip_count].count = 0;
    limiter->registration_attempts[limiter->ip_count].capacity = 0;
    limiter->login_attempts[limiter->ip_count].attempts = NULL;
    limiter->login_attempts[limiter->ip_count].count = 0;
    limiter->login_attempts[limiter->ip_count].capacity = 0;
    
    AttemptList* list = &limiter->registration_attempts[limiter->ip_count];
    list->capacity = 10;
    list->attempts = malloc(sizeof(struct timespec) * list->capacity);
    clock_gettime(CLOCK_MONOTONIC, &list->attempts[0]);
    list->count = 1;
    
    limiter->ip_count++;
    
    pthread_mutex_unlock(&limiter->mutex);
}

void rate_limiter_record_login_attempt(RateLimiter* limiter, const char* ip_address) {
    if (!limiter || !ip_address) return;
    
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        if (strcmp(limiter->ip_addresses[i], ip_address) == 0) {
            AttemptList* list = &limiter->login_attempts[i];
            
            if (list->count >= list->capacity) {
                list->capacity = list->capacity == 0 ? 10 : list->capacity * 2;
                list->attempts = realloc(list->attempts, sizeof(struct timespec) * list->capacity);
            }
            
            clock_gettime(CLOCK_MONOTONIC, &list->attempts[list->count++]);
            clean_old_attempts(list);
            pthread_mutex_unlock(&limiter->mutex);
            return;
        }
    }
    
    if (limiter->ip_count >= limiter->ip_capacity) {
        limiter->ip_capacity *= 2;
        limiter->ip_addresses = realloc(limiter->ip_addresses, sizeof(char*) * limiter->ip_capacity);
        limiter->registration_attempts = realloc(limiter->registration_attempts, sizeof(AttemptList) * limiter->ip_capacity);
        limiter->login_attempts = realloc(limiter->login_attempts, sizeof(AttemptList) * limiter->ip_capacity);
    }
    
    limiter->ip_addresses[limiter->ip_count] = strdup(ip_address);
    limiter->registration_attempts[limiter->ip_count].attempts = NULL;
    limiter->registration_attempts[limiter->ip_count].count = 0;
    limiter->registration_attempts[limiter->ip_count].capacity = 0;
    limiter->login_attempts[limiter->ip_count].attempts = NULL;
    limiter->login_attempts[limiter->ip_count].count = 0;
    limiter->login_attempts[limiter->ip_count].capacity = 0;
    
    AttemptList* list = &limiter->login_attempts[limiter->ip_count];
    list->capacity = 10;
    list->attempts = malloc(sizeof(struct timespec) * list->capacity);
    clock_gettime(CLOCK_MONOTONIC, &list->attempts[0]);
    list->count = 1;
    
    limiter->ip_count++;
    
    pthread_mutex_unlock(&limiter->mutex);
}

bool rate_limiter_is_registration_rate_limited(RateLimiter* limiter, const char* ip_address) {
    return is_rate_limited(limiter, ip_address, limiter->registration_attempts, MAX_REGISTRATION_ATTEMPTS_PER_HOUR);
}

bool rate_limiter_is_login_rate_limited(RateLimiter* limiter, const char* ip_address) {
    return is_rate_limited(limiter, ip_address, limiter->login_attempts, MAX_LOGIN_ATTEMPTS_PER_HOUR);
}

bool rate_limiter_has_suspicious_activity(RateLimiter* limiter, const char* ip_address) {
    if (!limiter || !ip_address) return false;
    
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        if (strcmp(limiter->ip_addresses[i], ip_address) == 0) {
            clean_old_attempts(&limiter->registration_attempts[i]);
            clean_old_attempts(&limiter->login_attempts[i]);
            
            int total_attempts = limiter->registration_attempts[i].count + limiter->login_attempts[i].count;
            pthread_mutex_unlock(&limiter->mutex);
            return total_attempts > (MAX_REGISTRATION_ATTEMPTS_PER_HOUR + MAX_LOGIN_ATTEMPTS_PER_HOUR);
        }
    }
    
    pthread_mutex_unlock(&limiter->mutex);
    return false;
}

void rate_limiter_clear_rate_limit(RateLimiter* limiter, const char* ip_address) {
    if (!limiter || !ip_address) return;
    
    pthread_mutex_lock(&limiter->mutex);
    
    for (size_t i = 0; i < limiter->ip_count; i++) {
        if (strcmp(limiter->ip_addresses[i], ip_address) == 0) {
            free(limiter->ip_addresses[i]);
            free(limiter->registration_attempts[i].attempts);
            free(limiter->login_attempts[i].attempts);
            
            for (size_t j = i; j < limiter->ip_count - 1; j++) {
                limiter->ip_addresses[j] = limiter->ip_addresses[j + 1];
                limiter->registration_attempts[j] = limiter->registration_attempts[j + 1];
                limiter->login_attempts[j] = limiter->login_attempts[j + 1];
            }
            
            limiter->ip_count--;
            break;
        }
    }
    
    pthread_mutex_unlock(&limiter->mutex);
}