#pragma once
#include <stdbool.h>

typedef struct {
    char* (*sanitizeInput)(const char* input);
    bool (*containsSuspiciousPatterns)(const char* input);
    bool (*hasSuspiciousPatterns)(const char* input);
} InputSanitizer;

extern InputSanitizer inputSanitizer;