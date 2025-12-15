#include "email_validator.h"
#include "disposable_email_domains.h"
#include <string.h>
#include <ctype.h>
#include <stdbool.h>

#define MAX_EMAIL_LENGTH 254

static bool isValidFormat(const char* email) {
    if(!email || strlen(email) == 0) return false;
    
    const char* atPos = strchr(email, '@');
    if(!atPos) return false;
    
    if(strchr(atPos + 1, '@') != NULL) return false;
    
    int local_len = atPos - email;
    if(local_len == 0 || local_len > 64) return false;
    
    const char* domain = atPos + 1;
    if(strlen(domain) < 3) return false;
    
    for(int i = 0; i < local_len; i++) {
        char c = email[i];
        if(!isalnum(c) && c != '.' && c != '_' && c != '%' && c != '+' && c != '-') {
            return false;
        }
    }
    
    if(strchr(domain, '.') == NULL) return false;
    return true;
}

static bool isDisposableEmail(const char* email) {
    const char* atPos = strchr(email, '@');
    if(!atPos) return false;
    
    char domain[256];
    strcpy(domain, atPos + 1);
    
    for(size_t i = 0; domain[i]; i++) {
        domain[i] = tolower(domain[i]);
    }
    
    for(size_t i = 0; i < DISPOSABLE_EMAIL_DOMAINS.count; i++) {
        if(strstr(domain, DISPOSABLE_EMAIL_DOMAINS.domains[i]) != NULL) {
            return true;
        }
    }
    
    return false;
}

static bool meetsLengthRequirements(const char* email) {
    return strlen(email) <= MAX_EMAIL_LENGTH;
}

static bool validate(const char* email) {
    if(!meetsLengthRequirements(email)) return false;
    if(strlen(email) == 0) return false;
    if(!isValidFormat(email)) return false;
    return !isDisposableEmail(email);
}

EmailValidator emailValidator = {
    .isValidFormat = isValidFormat,
    .isDisposableEmail = isDisposableEmail,
    .validate = validate,
    .meetsLengthRequirements = meetsLengthRequirements
};