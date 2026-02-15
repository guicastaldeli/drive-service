#pragma once
#include <stdbool.h>

typedef struct {
    void* pepperManager;
} PasswordEncoder;

PasswordEncoder* createPasswordEncoder();
void destroyPasswordEncoder(PasswordEncoder* encoder);

char* encodePassword(PasswordEncoder* encoder, const char* password);
bool matchesPassword(PasswordEncoder* encoder, const char* password, const char* encodedPassword);
bool isPasswordStrongCheck(const char* password);
char* generateSecurePasswordWrapper(int length);