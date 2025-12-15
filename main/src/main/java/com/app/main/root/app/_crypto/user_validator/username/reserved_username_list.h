#pragma once
#include <string.h>

typedef struct {
    const char* const* usernames;
    size_t count;
} ReservedUsernameList;

extern const ReservedUsernameList RESERVED_USERNAME_LIST;