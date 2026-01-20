#include "password_validator.h"
#include "common_password_list.h"
#include <string.h>
#include <ctype.h>
#include <stdbool.h>

#define MIN_PASSWORD_LENGTH 8

static bool isCommonPassword(const char* password) {
    if(!password) return false;
    
    char* lowerPassword = malloc(strlen(password) + 1);
    if(!lowerPassword) return false;
    
    strcpy(lowerPassword, password);
    for(size_t i = 0; lowerPassword[i]; i++) {
        lowerPassword[i] = tolower(lowerPassword[i]);
    }
    
    for(size_t i = 0; i < COMMON_PASSWORD_LIST.count; i++) {
        if(strcmp(lowerPassword, COMMON_PASSWORD_LIST.passwords[i]) == 0) {
            free(lowerPassword);
            return true;
        }
    }
    
    free(lowerPassword);
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

PasswordValidator passwordValidator = {
    .isCommonPassword = isCommonPassword,
    .validate = validate,
    .meetsLengthRequirements = meetsLengthRequirements
};