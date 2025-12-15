#include "password_validator.h"
#include <ctype.h>
#include <string.h>

bool isPasswordStrong(const char* password) {
    if (!meetsLengthRequirement(password, 8)) return false;
    
    int requirementsMet = 0;
    if (hasUpperCase(password)) requirementsMet++;
    if (hasLowerCase(password)) requirementsMet++;
    if (hasDigits(password)) requirementsMet++;
    if (hasSpecialChars(password)) requirementsMet++;
    return requirementsMet >= 3;
}

bool meetsLengthRequirement(const char* password, int minLength) {
    return strlen(password) >= (size_t)minLength;
}

bool hasUpperCase(const char* password) {
    for (size_t i = 0; password[i] != '\0'; i++) {
        if (isupper(password[i])) return true;
    }
    return false;
}

bool hasLowerCase(const char* password) {
    for (size_t i = 0; password[i] != '\0'; i++) {
        if (islower(password[i])) return true;
    }
    return false;
}

bool hasDigits(const char* password) {
    for (size_t i = 0; password[i] != '\0'; i++) {
        if (isdigit(password[i])) return true;
    }
    return false;
}

bool hasSpecialChars(const char* password) {
    const char* specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    for (size_t i = 0; password[i] != '\0'; i++) {
        for (size_t j = 0; specialChars[j] != '\0'; j++) {
            if (password[i] == specialChars[j]) return true;
        }
    }
    return false;
}