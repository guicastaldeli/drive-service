#pragma once
#include <stdbool.h>

bool isPasswordStrong(const char* password);
bool meetsLengthRequirement(const char* password, int minLength);
bool hasUpperCase(const char* password);
bool hasLowerCase(const char* password);
bool hasDigits(const char* password);
bool hasSpecialChars(const char* password);