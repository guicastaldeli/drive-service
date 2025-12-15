#pragma once
#include <stdbool.h>

typedef struct {
    bool (*isValidFormat)(const char* email);
    bool (*isDisposableEmail)(const char* email);
    bool (*validate)(const char* email);
    bool (*meetsLengthRequirements)(const char* email);
} EmailValidator;

extern EmailValidator email_validator;