#include "user_validator.h"
#include "email/email_validator.h"
#include "username/username_validator.h"
#include "password/password_validator.h"
#include "rate_limiter/rate_limiter.h"
#include "input_sanitizer/input_sanitizer.h"
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

struct UserValidator {
    RateLimiter* rateLimiter;
};

UserValidator* userValidatorCreate(void) {
    UserValidator* validator = malloc(sizeof(UserValidator));
    if(!validator) return NULL;
    
    validator->rateLimiter = rateLimiterCreate();
    if(!validator->rateLimiter) {
        free(validator);
        return NULL;
    }
    
    return validator;
}

void userValidatorDestroy(UserValidator* validator) {
    if(!validator) return;
    
    rateLimiterDestroy(validator->rateLimiter);
    free(validator);
}

bool userValidatorValidateRegistration(
    UserValidator* validator,
    const char* username,
    const char* email,
    const char* password,
    const char* ipAddress
) {
    if(!validator || !username || !email || !password || !ipAddress) return false;
    
    if(rateLimiterIsRegistrationRateLimited(validator->rateLimiter, ipAddress)) return false;
    if(!usernameValidator.validate(username)) return false;
    if(!emailValidator.validate(email)) return false;
    if(!passwordValidator.validate(password)) return false;
    if(inputSanitizer.hasSuspiciousPatterns(username) || 
        inputSanitizer.hasSuspiciousPatterns(email)
    ) {
        return false;
    }
    if(emailValidator.isDisposableEmail(email)) return false;
    
    return true;
}

bool userValidatorValidateLogin(
    UserValidator* validator,
    const char* email,
    const char* password,
    const char* ipAddress
) {
    if(!validator || !email || !password || !ipAddress) return false;
    
    if(rateLimiterIsLoginRateLimited(validator->rateLimiter, ipAddress)) return false;
    if(!emailValidator.validate(email)) return false;
    if(strlen(password) == 0) return false;
    
    return true;
}

bool userValidatorValidateUsername(UserValidator* validator, const char* username) {
    if(!validator || !username) return false;
    return usernameValidator.validate(username);
}

bool userValidatorValidateEmail(UserValidator* validator, const char* email) {
    if(!validator || !email) return false;
    return emailValidator.validate(email);
}

bool userValidatorValidatePassword(UserValidator* validator, const char* password) {
    if(!validator || !password) return false;
    return passwordValidator.validate(password);
}

void userValidatorRecordRegistrationAttempt(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return;
    rateLimiterRecordRegistrationAttempt(validator->rateLimiter, ipAddress);
}

void userValidatorRecordLoginAttempt(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return;
    rateLimiterRecordLoginAttempt(validator->rateLimiter, ipAddress);
}

bool userValidatorIsRegistrationRateLimited(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return false;
    return rateLimiterIsRegistrationRateLimited(validator->rateLimiter, ipAddress);
}

bool userValidatorIsLoginRateLimited(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return false;
    return rateLimiterIsLoginRateLimited(validator->rateLimiter, ipAddress);
}

bool userValidatorHasSuspiciousActivity(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return false;
    return rateLimiterHasSuspiciousActivity(validator->rateLimiter, ipAddress);
}

void userValidatorClearRateLimit(UserValidator* validator, const char* ipAddress) {
    if(!validator || !ipAddress) return;
    rateLimiterClearRateLimit(validator->rateLimiter, ipAddress);
}

char* userValidatorSanitizeInput(const char* input) {
    return inputSanitizer.sanitizeInput(input);
}

bool userValidatorContainsSuspiciousPatterns(const char* input) {
    return inputSanitizer.containsSuspiciousPatterns(input);
}