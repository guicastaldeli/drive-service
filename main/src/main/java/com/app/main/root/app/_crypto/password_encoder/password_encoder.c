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
        return NULL;
    }
    
    ByteArray salt = generateSalt();
    ByteArray pepperedPassword = applyPepper((PepperManager*)encoder->pepperManager, password);
    ByteArray hash = generateSecureHash(&pepperedPassword, &salt);
    
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
    }
    
    free(saltB64);
    free(hashB64);
    
    return result;
}

bool matchesPassword(PasswordEncoder* encoder, const char* password, const char* encodedPassword) {
    if(!password || !encodedPassword) {
        return false;
    }
    
    const char* firstDelim = strchr(encodedPassword, '$');
    if(!firstDelim) {
        fprintf(stderr, "Invalid encoded password format: missing first $\n");
        return false;
    }
    
    const char* secondDelim = strchr(firstDelim + 1, '$');
    if(!secondDelim) {
        fprintf(stderr, "Invalid encoded password format: missing second $\n");
        return false;
    }
    
    const char* thirdDelim = strchr(secondDelim + 1, '$');
    if(!thirdDelim) {
        fprintf(stderr, "Invalid encoded password format: missing third $\n");
        return false;
    }
    
    size_t saltLen = thirdDelim - secondDelim - 1;
    char* saltStr = (char*)malloc(saltLen + 1);
    if(!saltStr) return false;
    strncpy(saltStr, secondDelim + 1, saltLen);
    saltStr[saltLen] = '\0';
    
    const char* storedHashStr = thirdDelim + 1;
    
    // CRITICAL FIX: Check if decode returns valid data
    ByteArray salt = decode(saltStr);
    if(!salt.data || salt.size == 0) {
        fprintf(stderr, "Failed to decode salt\n");
        free(saltStr);
        freeByteArray(&salt);
        return false;
    }
    
    ByteArray storedHash = decode(storedHashStr);
    if(!storedHash.data || storedHash.size == 0) {
        fprintf(stderr, "Failed to decode stored hash\n");
        free(saltStr);
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        return false;
    }
    
    free(saltStr);
    
    ByteArray peppered = applyPepper((PepperManager*)encoder->pepperManager, password);
    if(!peppered.data || peppered.size == 0) {
        fprintf(stderr, "Failed to apply pepper\n");
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        freeByteArray(&peppered);
        return false;
    }
    
    ByteArray newHash = generateSecureHash(&peppered, &salt);
    if(!newHash.data || newHash.size == 0) {
        fprintf(stderr, "Failed to generate hash\n");
        freeByteArray(&salt);
        freeByteArray(&storedHash);
        freeByteArray(&peppered);
        freeByteArray(&newHash);
        return false;
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