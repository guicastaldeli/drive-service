#include "common_password_list.h"

static const char* const PASSWORD_LIST[] = {
    "password", 
    "123456", 
    "12345678", 
    "123456789", 
    "qwerty",
    "abc123", 
    "password1",
    "password2",
    "12345", 
    "1234567", 
    "111111",
    "1234567890", 
    "admin", 
    "welcome"
};

static const size_t PASSWORD_COUNT = sizeof(PASSWORD_LIST) / sizeof(PASSWORD_LIST[0]);

const CommonPasswordList COMMON_PASSWORD_LIST = {
    .passwords = PASSWORD_LIST,
    .count = PASSWORD_COUNT
};