#pragma once
#include <stdbool.h>

typedef struct {
    bool (*isCommonPassword)(const char* password);
    bool (*validate)(const char* password);
    bool (*meetsLengthRequirements)(const char* password);
} PasswordValidator;

extern PasswordValidator password_validator;