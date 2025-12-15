#pragma once
#include <string.h>

typedef struct {
    const char* const* domains;
    size_t count;
} DisposableEmailDomains;

extern const DisposableEmailDomains DISPOSABLE_EMAIL_DOMAINS;