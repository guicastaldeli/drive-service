#include "password_encoder.h"
#include "pepper_manager/pepper_manager.h"
#include "salt_generator/salt_generator.h"
#include "hash_generator/hash_generator.h"
#include "password_validator/password_validator.h"
#include "utils/base64_manager.h"
#include "utils/crypto_generator.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

PasswordEncoder* createPasswordEncoder() {
    PasswordEncoder* encoder = (PasswordEncoder*)malloc(sizeof(PasswordEncoder));
    if(!encoder) return NULL;
    
    encoder->pepperManager = createPepperManager();
    if(!encoder->pepperManager) {
        free(encoder);
        return NULL;
    }
    
    return encoder;
}

void destroyPasswordEncoder(PasswordEncoder* encoder) {
    if(encoder) {
        if(encoder->pepperManager) {
            destroyPepperManager((PepperManager*)encoder->pepperManager);
        }
        free(encoder);
    }
}

char* encodePassword(PasswordEncoder* encoder, const char* password) {
    if(!password || strlen(password) == 0) {
        fprintf(stderr, "encodePassword: NULL or empty password\n");
        return NULL;
    }
    
    ByteArray salt = generateSalt();
    if(!salt.data || salt.size == 0) {
        fprintf(stderr, "encodePassword: Failed to generate salt\n");
        return NULL;
    }
    
    fprintf(stderr, "Salt (hex, first 16 bytes): ");
    for(size_t i = 0; i < 16 && i < salt.size; i++) {
        fprintf(stderr, "%02x", salt.data[i]);
    }
    fprintf(stderr, "\n");
    
    ByteArray pepperedPassword = applyPepper((PepperManager*)encoder->pepperManager, password);
    if(!pepperedPassword.data || pepperedPassword.size == 0) {
        fprintf(stderr, "encodePassword: Failed to apply pepper\n");
        freeByteArray(&salt);
        return NULL;
    }
    
    for(size_t i = 0; i < 16 && i < pepperedPassword.size; i++) {
        fprintf(stderr, "%02x", pepperedPassword.data[i]);
    }
    fprintf(stderr, "\n");
    
    ByteArray hash = generateSecureHash(&pepperedPassword, &salt);
    if(!hash.data || hash.size == 0) {
        freeByteArray(&salt);
        freeByteArray(&pepperedPassword);
        return NULL;
    }
    
    for(size_t i = 0; i < 16 && i < hash.size; i++) {
        fprintf(stderr, "%02x", hash.data[i]);
    }
    fprintf(stderr, "\n");
    
    char* saltB64 = encode(&salt);
    char* hashB64 = encode(&hash);
    
    freeByteArray(&salt);
    freeByteArray(&pepperedPassword);
    freeByteArray(&hash);
    
    if(!saltB64 || !hashB64) {
        free(saltB64);
        free(hashB64);
        return NULL;
    }
    
    size_t resultLen = strlen("2$1000$$") + strlen(saltB64) + strlen(hashB64) + 1;
    char* result = (char*)malloc(resultLen);
    if(result) {
        sprintf(result, "2$1000$%s$%s", saltB64, hashB64);
        fprintf(stderr, "Final encoded: %.60s...\n", result);
    }
    
    free(saltB64);
    free(hashB64);
    
    return result;
}

bool matchesPassword(PasswordEncoder* encoder, const char* password, const char* encodedPassword) {
    if(!password || !encodedPassword) {
        fprintf(stderr, "matchesPassword: NULL input\n");
        return false;
    }
    
    const char* firstDelim = strchr(encodedPassword, '$');
    if(!firstDelim) {
        fprintf(stderr, "matchesPassword: Invalid format - missing first $\n");
        return false;
    }
    
    const char* secondDelim = strchr(firstDelim + 1, '$');
    if(!secondDelim) {
        fprintf(stderr, "matchesPassword: Invalid format - missing second $\n");
        return false;
    }
    
    const char* thirdDelim = strchr(secondDelim + 1, '$');
    if(!thirdDelim) {
        fprintf(stderr, "matchesPassword: Invalid format - missing third $\n");
        return false;
    }
    
    size_t saltLen = thirdDelim - secondDelim - 1;
    char* saltStr = (char*)malloc(saltLen + 1);
    if(!saltStr) {
        fprintf(stderr, "matchesPassword: Failed to allocate saltStr\n");
        return false;
    }
    strncpy(saltStr, secondDelim + 1, saltLen);
    saltStr[saltLen] = '\0';
    
    const char* storedHashStr = thirdDelim + 1;
    
    ByteArray salt = decode(saltStr);
    if(!salt.data || salt.size == 0) {
        free(saltStr);
        freeByteArray(&salt);
        return false;
    }
    
    for(size_t i = 0; i < 16 && i < salt.size; i++) {
        fprintf(stderr, "%02x", salt.data[i]);
    }
    fprintf(stderr, "\n");
    
    free(saltStr);
    
    ByteArray storedHash = decode(storedHashStr);
    if(!storedHash.data || storedHash.size == 0) {
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        return false;
    }
    
    for(size_t i = 0; i < 16 && i < storedHash.size; i++) {
        fprintf(stderr, "%02x", storedHash.data[i]);
    }
    
    ByteArray peppered = applyPepper((PepperManager*)encoder->pepperManager, password);
    if(!peppered.data || peppered.size == 0) {
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        freeByteArray(&peppered);
        return false;
    }
    
    for(size_t i = 0; i < 16 && i < peppered.size; i++) {
        fprintf(stderr, "%02x", peppered.data[i]);
    }
    fprintf(stderr, "\n");
    
    ByteArray newHash = generateSecureHash(&peppered, &salt);
    if(!newHash.data || newHash.size == 0) {
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        freeByteArray(&peppered);
        freeByteArray(&newHash);
        return false;
    }
    
    for(size_t i = 0; i < 16 && i < newHash.size; i++) {
        fprintf(stderr, "%02x", newHash.data[i]);
    }

    for(size_t i = 0; i < storedHash.size; i++) {
        fprintf(stderr, "%02x", storedHash.data[i]);
    }
    fprintf(stderr, "\n");
    
    for(size_t i = 0; i < newHash.size; i++) {
        fprintf(stderr, "%02x", newHash.data[i]);
    }
    
    bool result = constantTimeEquals(&newHash, &storedHash);
    freeByteArray(&salt);
    freeByteArray(&storedHash);
    freeByteArray(&peppered);
    freeByteArray(&newHash);
    
    return result;
}

bool isPasswordStrongCheck(const char* password) {
    return isPasswordStrong(password);
}

char* generateSecurePasswordWrapper(int length) {
    return generateSecurePassword(length);
}