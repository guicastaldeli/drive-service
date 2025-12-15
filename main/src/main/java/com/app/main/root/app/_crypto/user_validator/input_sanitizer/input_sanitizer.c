#include "input_sanitizer.h"
#include "suspicious_pattern_list.h"
#include <string.h>
#include <ctype.h>
#include <stdlib.h>
#include <stdbool.h>

static char* sanitizeInput(const char* input) {
    if(!input) return NULL;
    
    char* sanitized = malloc(strlen(input) + 1);
    if(!sanitized) return NULL;
    
    strcpy(sanitized, input);
    
    size_t len = strlen(sanitized);
    size_t j = 0;
    for(size_t i = 0; i < len; i++) {
        if(sanitized[i] != '\0') {
            sanitized[j++] = sanitized[i];
        }
    }
    sanitized[j] = '\0';
    
    while(*sanitized && isspace((unsigned char)*sanitized)) {
        memmove(sanitized, sanitized + 1, strlen(sanitized));
    }
    
    len = strlen(sanitized);
    while(len > 0 && isspace((unsigned char)sanitized[len - 1])) {
        sanitized[--len] = '\0';
    }
    
    return sanitized;
}

static bool containsSuspiciousPatterns(const char* input) {
    if(!input) return false;
    
    char* lowerInput = malloc(strlen(input) + 1);
    if(!lowerInput) return false;
    
    strcpy(lowerInput, input);
    for(size_t i = 0; lowerInput[i]; i++) {
        lowerInput[i] = tolower(lowerInput[i]);
    }
    
    for(size_t i = 0; i < SUSPICIOUS_PATTERN_LIST.count; i++) {
        if(strstr(lowerInput, SUSPICIOUS_PATTERN_LIST.patterns[i]) != NULL) {
            free(lowerInput);
            return true;
        }
    }
    
    free(lowerInput);
    return false;
}

static bool hasSuspiciousPatterns(const char* input) {
    if(!input) return false;
    
    size_t len = strlen(input);
    
    if(len >= 3) {
        for(size_t i = 0; i < len - 2; i++) {
            if(isalpha(input[i]) && isalpha(input[i + 1]) && isalpha(input[i + 2])) {
                if((input[i] + 1 == input[i + 1] && input[i + 1] + 1 == input[i + 2]) ||
                    (input[i] - 1 == input[i + 1] && input[i + 1] - 1 == input[i + 2])) {
                    return true;
                }
            }
        }
    }
    
    if(len >= 4) {
        for(size_t i = 0; i < len - 3; i++) {
            char pattern[3];
            pattern[0] = input[i];
            pattern[1] = input[i + 1];
            pattern[2] = '\0';
            
            char check[3];
            check[0] = input[i + 2];
            check[1] = input[i + 3];
            check[2] = '\0';
            
            if(strcmp(pattern, check) == 0) {
                return true;
            }
        }
    }
    
    return false;
}

InputSanitizer inputSanitizer = {
    .sanitizeInput = sanitizeInput,
    .containsSuspiciousPatterns = containsSuspiciousPatterns,
    .hasSuspiciousPatterns = hasSuspiciousPatterns
};