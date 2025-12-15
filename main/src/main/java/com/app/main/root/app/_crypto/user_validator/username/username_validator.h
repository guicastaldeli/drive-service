#pragma once
#include <stdbool.h>

typedef struct {
    bool (*isValidFormat)(const char* username);
    bool (*isReserved)(const char* username);
    bool (*hasSuspiciousPatterns)(const char* username);
    bool (*validate)(const char* username);
    bool (*meetsLengthRequirements)(const char* username);
} UsernameValidator;

extern UsernameValidator usernameValidator;