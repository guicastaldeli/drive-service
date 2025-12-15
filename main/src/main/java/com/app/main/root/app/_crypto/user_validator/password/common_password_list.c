#include "common_password_list.h"

const char* PASSWORD_LIST[] = {
    "password",
    "123456",
    "123456789",
    "qwerty",
    "abc123",
    "monkey",
    "letmein",
    "trustno1",
    "dragon",
    "baseball",
    "111111",
    "iloveyou",
    "master",
    "sunshine",
    "ashley",
    "bailey",
    "shadow",
    "superman",
    "qazwsx",
    "michael"
};

const CommonPasswordList COMMON_PASSWORD_LIST = {
    .passwords = PASSWORD_LIST,
    .count = 20
};