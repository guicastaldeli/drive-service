#pragma once
#include <stdbool.h>

typedef struct UserValidator UserValidator;

UserValidator* userValidatorCreate(void);
void userValidatorDestroy(UserValidator* validator);

bool userValidatorValidateRegistration(
    UserValidator* validator,
    const char* username,
    const char* email,
    const char* password,
    const char* ipAddress
);

bool userValidatorValidateLogin(
    UserValidator* validator,
    const char* email,
    const char* password,
    const char* ipAddress
);

bool userValidatorValidateUsername(UserValidator* validator, const char* username);
bool userValidatorValidateEmail(UserValidator* validator, const char* email);
bool userValidatorValidatePassword(UserValidator* validator, const char* password);

void userValidatorRecordRegistrationAttempt(UserValidator* validator, const char* ipAddress);
void userValidatorRecordLoginAttempt(UserValidator* validator, const char* ipAddress);
bool userValidatorIsRegistrationRateLimited(UserValidator* validator, const char* ipAddress);
bool userValidatorIsLoginRateLimited(UserValidator* validator, const char* ipAddress);
bool userValidatorHasSuspiciousActivity(UserValidator* validator, const char* ipAddress);
void userValidatorClearRateLimit(UserValidator* validator, const char* ipAddress);

char* userValidatorSanitizeInput(const char* input);
bool userValidatorContainsSuspiciousPatterns(const char* input);