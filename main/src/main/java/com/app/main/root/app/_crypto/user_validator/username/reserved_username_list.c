#include "reserved_username_list.h"

static const char* const USERNAME_LIST[] = {
    "admin",
    "root",
    "system",
    "user",
    "guest",
    "test",
    "support",
    "help",
    "info",
    "noreply",
    "security",
    "abuse",
    "postmaster"
};

const ReservedUsernameList RESERVED_USERNAME_LIST = {
    .usernames = USERNAME_LIST,
    .count = 13
};