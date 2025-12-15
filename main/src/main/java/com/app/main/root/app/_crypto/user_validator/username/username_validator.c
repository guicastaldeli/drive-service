#include "username_validator.h"
#include "reserved_username_list.h"
#include <string.h>
#include <ctype.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX_USERNAME_LENGTH 20
#define MIN_USERNAME_LENGTH 5

static bool isValidFormat(const char* username) {
    if(!username || strlen(username) == 0) return false;
    
    for(size_t i = 0; username[i]; i++) {
        char c = username[i];
        if(!isalnum(c) && c != '_') {
            return false;
        }
    }
    
    return true;
}

static bool isReserved(const char* username) {
    if(!username) return false;
    
    char* lowerUsername = malloc(strlen(username) + 1);
    if(!lowerUsername) return false;
    
    strcpy(lowerUsername, username);
    for(size_t i = 0; lowerUsername[i]; i++) {
        lowerUsername[i] = tolower(lowerUsername[i]);
    }
    
    for(size_t i = 0; i < RESERVED_USERNAME_LIST.count; i++) {
        if(strcmp(lowerUsername, RESERVED_USERNAME_LIST.usernames[i]) == 0) {
            free(lowerUsername);
            return true;
        }
    }
    
    free(lowerUsername);
    return false;
}

static bool hasSuspiciousPatterns(const char* username) {
    if(!username) return false;
    
    size_t len = strlen(username);
    if(len >= 3) {
        for(size_t i = 0; i < len - 2; i++) {
            if(isalpha(username[i]) && isalpha(username[i + 1]) && isalpha(username[i + 2])) {
                if((username[i] + 1 == username[i + 1] && username[i + 1] + 1 == username[i + 2]) ||
                    (username[i] - 1 == username[i + 1] && username[i + 1] - 1 == username[i + 2])) {
                    return true;
                }
            }
        }
    }
    
    if(len >= 4) {
        for(size_t i = 0; i < len - 3; i++) {
            char pattern[3];
            pattern[0] = username[i];
            pattern[1] = username[i + 1];
            pattern[2] = '\0';
            
            char check[3];
            check[0] = username[i + 2];
            check[1] = username[i + 3];
            check[2] = '\0';
            
            if(strcmp(pattern, check) == 0) {
                return true;
            }
        }
    }
    
    return false;
}

static bool meetsLengthRequirements(const char* username) {
    if(!username) return false;
    size_t len = strlen(username);
    return len >= MIN_USERNAME_LENGTH && len <= MAX_USERNAME_LENGTH;
}

static bool validate(const char* username) {
    if(!meetsLengthRequirements(username)) return false;
    if(!isValidFormat(username)) return false;
    if(isReserved(username)) return false;
    return !hasSuspiciousPatterns(username);
}

UsernameValidator usernameValidator = {
    .isValidFormat = isValidFormat,
    .isReserved = isReserved,
    .hasSuspiciousPatterns = hasSuspiciousPatterns,
    .validate = validate,
    .meetsLengthRequirements = meetsLengthRequirements
};