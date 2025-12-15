#include "pepper_manager.h"
#include <openssl/rand.h>
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void generateNewPepper(PepperManager* manager, const char* fileName);

PepperManager* createPepperManager() {
    return createPepperManagerWithPath("src/main/java/com/app/main/root/app/_crypto/password_encoder/pepper_manager/pepper.bin");
}

PepperManager* createPepperManagerWithPath(const char* path) {
    PepperManager* manager = (PepperManager*)malloc(sizeof(PepperManager));
   if(!manager) return NULL;
    
    manager->pepper.size = PEPPER_LENGTH;
    manager->pepper.data = (unsigned char*)malloc(manager->pepper.size);
   if(!manager->pepper.data) {
        free(manager);
        return NULL;
    }
    
    size_t pathLen = strlen(path) + 1;
    manager->filePath = (char*)malloc(pathLen);
   if(!manager->filePath) {
        free(manager->pepper.data);
        free(manager);
        return NULL;
    }
    strcpy(manager->filePath, path);
    
    loadOrGeneratePepper(manager);
    return manager;
}

void destroyPepperManager(PepperManager* manager) {
   if(manager) {
       if(manager->pepper.data) {
            memset(manager->pepper.data, 0, manager->pepper.size);
            free(manager->pepper.data);
        }
       if(manager->filePath) {
            free(manager->filePath);
        }
        free(manager);
    }
}

void loadOrGeneratePepper(PepperManager* manager) {
    FILE* file = fopen(manager->filePath, "rb");
   if(file) {
        size_t bytesRead = fread(manager->pepper.data, 1, manager->pepper.size, file);
        fclose(file);
        
       if(bytesRead != (size_t)manager->pepper.size) {
            fprintf(stderr, "Warning: Pepper file corrupted, generating new one\n");
            generateNewPepper(manager, manager->filePath);
        } else {
            printf("Loading pepper from file\n");
        }
    } else {
        generateNewPepper(manager, manager->filePath);
    }
}

static void generateNewPepper(PepperManager* manager, const char* fileName) {
   if(RAND_bytes(manager->pepper.data, manager->pepper.size) != 1) {
        fprintf(stderr, "Failed to generate pepper\n");
        return;
    }
    
    FILE* outFile = fopen(fileName, "wb");
   if(outFile) {
        fwrite(manager->pepper.data, 1, manager->pepper.size, outFile);
        fclose(outFile);
        printf("Generated and saved new pepper\n");
    } else {
        fprintf(stderr, "Warning: Could not save pepper to file\n");
    }
}

ByteArray getPepper(const PepperManager* manager) {
    ByteArray result;
    result.size = manager->pepper.size;
    result.data = (unsigned char*)malloc(result.size);
   if(result.data) {
        memcpy(result.data, manager->pepper.data, result.size);
    } else {
        result.size = 0;
    }
    return result;
}

ByteArray applyPepper(const PepperManager* manager, const char* password) {
    ByteArray result;
    result.size = EVP_MAX_MD_SIZE;
    result.data = (unsigned char*)malloc(result.size);
   if(!result.data) {
        result.size = 0;
        return result;
    }
    
    unsigned int resultLen = 0;
    const EVP_MD* md = EVP_sha512();
    
    HMAC(
        md,
        manager->pepper.data,
        manager->pepper.size,
        (const unsigned char*)password,
        strlen(password),
        result.data,
        &resultLen
    );
    
    unsigned char* resized = (unsigned char*)realloc(result.data, resultLen);
   if(resized) {
        result.data = resized;
        result.size = resultLen;
    } else {
        free(result.data);
        result.data = NULL;
        result.size = 0;
    }
    
    return result;
}