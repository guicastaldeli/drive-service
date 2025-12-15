#include "password_validator.h"
#include "common_password_list.h"
#include <string.h>
#include <ctype.h>
#include <stdbool.h>

#define MIN_PASSWORD_LENGTH 8

static bool isCommonPassword(const char* password) {
    if(!password) return false;
    
    char* lower_password = malloc(strlen(password) + 1);
    if(!lower_password) return false;
    
    strcpy(lower_password, password);
    for (size_t i = 0; lower_password[i]; i++) {
        lower_password[i] = tolower(lower_password[i]);
    }
    
    for (size_t i = 0; i < COMMON_PASSWORD_LIST.count; i++) {
        if(strcmp(lower_password, COMMON_PASSWORD_LIST.passwords[i]) == 0) {
            free(lower_password);
            return true;
        }
    }
    
    free(lower_password);
    return false;
}

static bool meetsLengthRequirements(const char* password) {
    if(!password) return false;
    return strlen(password) >= MIN_PASSWORD_LENGTH;
}

static bool validate(const char* password) {
    if(!meetsLengthRequirements(password)) return false;
    return !isCommonPassword(password);
}

PasswordValidator password_validator = {
    .isCommonPassword = isCommonPassword,
    .validate = validate,
    .meetsLengthRequirements = meetsLengthRequirements
};