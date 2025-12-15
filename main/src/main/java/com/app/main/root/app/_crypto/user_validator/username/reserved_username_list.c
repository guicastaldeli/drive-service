#include "reserved_username_list.h"

static const char* const USERNAME_LIST[] = {
    "admin", 
    "root", 
    "system", 
    "administrator", 
    "null", 
    "undefined"
};

static const size_t USERNAME_COUNT = sizeof(USERNAME_LIST) / sizeof(USERNAME_LIST[0]);

const ReservedUsernameList RESERVED_USERNAME_LIST = {
    .usernames = USERNAME_LIST,
    .count = USERNAME_COUNT
};