#pragma once
#include <string.h>

typedef struct {
    const char* const* patterns;
    size_t count;
} SuspiciousPatternList;

extern const SuspiciousPatternList SUSPICIOUS_PATTERN_LIST;