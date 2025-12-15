#pragma once
#include <string.h>

typedef struct {
    const char* const* passwords;
    size_t count;
} CommonPasswordList;

extern const CommonPasswordList COMMON_PASSWORD_LIST;