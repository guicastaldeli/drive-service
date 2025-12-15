#include "crypto_generator.h"
#include <openssl/rand.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

char* generateSecurePassword(int length) {
    if(length < 12) length = 12;
    
    const char* upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const char* lower = "abcdefghjkmnpqrstuvwxyz";
    const char* digits = "23456789";
    const char* special = "!@#$%^&*";
    
    size_t upper_len = strlen(upper);
    size_t lower_len = strlen(lower);
    size_t digits_len = strlen(digits);
    size_t special_len = strlen(special);
    
    char* allChars = (char*)malloc(upper_len + lower_len + digits_len + special_len + 1);
    if(!allChars) return NULL;
    
    strcpy(allChars, upper);
    strcat(allChars, lower);
    strcat(allChars, digits);
    strcat(allChars, special);
    
    size_t allChars_len = strlen(allChars);
    
    srand((unsigned int)time(NULL));
    
    char* password = (char*)malloc(length + 1);
    if(!password) {
        free(allChars);
        return NULL;
    }
    
    password[0] = upper[rand() % upper_len];
    password[1] = lower[rand() % lower_len];
    password[2] = digits[rand() % digits_len];
    password[3] = special[rand() % special_len];
    
    for(int i = 4; i < length; i++) {
        password[i] = allChars[rand() % allChars_len];
    }
    
    password[length] = '\0';
    
    for(int i = 0; i < length; i++) {
        int j = rand() % length;
        char temp = password[i];
        password[i] = password[j];
        password[j] = temp;
    }
    
    free(allChars);
    return password;
}

bool generateRandomBytes(ByteArray* buffer) {
    return RAND_bytes(buffer->data, (int)buffer->size) == 1;
}

bool generateRandomBytesBuffer(unsigned char* buffer, size_t length) {
    return RAND_bytes(buffer, (int)length) == 1;
}