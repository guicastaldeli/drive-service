#include "hash_generator.h"
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

static size_t min_size(size_t a, size_t b) {
    return a < b ? a : b;
}

ByteArray generateSecureHash(const ByteArray* pepperedPassword, const ByteArray* salt) {
    ByteArray key;
    key.size = HASH_KEY_LENGTH / 8;
    key.data = (unsigned char*)malloc(key.size);
    if(!key.data) {
        key.size = 0;
        return key;
    }
    
    if(PKCS5_PBKDF2_HMAC(
        (const char*)pepperedPassword->data,
        (int)pepperedPassword->size,
        salt->data,
        (int)salt->size,
        HASH_ITERATIONS,
        EVP_sha512(),
        (int)key.size,
        key.data) != 1) {
        free(key.data);
        key.data = NULL;
        key.size = 0;
        return key;
    }
    
    ByteArray memoryHardResult = applyMemoryHardFunction(&key, salt);
    freeByteArray(&key);
    
    ByteArray result = applyFinalHmac(&memoryHardResult, salt);
    freeByteArray(&memoryHardResult);
    
    return result;
}

ByteArray applyMemoryHardFunction(const ByteArray* input, const ByteArray* salt) {
    EVP_MD_CTX* ctx = NULL;
    ByteArray result;
    result.data = NULL;
    result.size = 0;
    
    const size_t MEMORY_SIZE = 8192;
    unsigned char* memoryBuffer = (unsigned char*)malloc(MEMORY_SIZE);
    if(!memoryBuffer) {
        return result;
    }
    
    memset(memoryBuffer, 0, MEMORY_SIZE);
    
    size_t blockSize = EVP_MAX_MD_SIZE;
    unsigned char* block = (unsigned char*)malloc(blockSize);
    if(!block) {
        free(memoryBuffer);
        return result;
    }
    
    unsigned int blockLen = 0;
    
    ctx = EVP_MD_CTX_new();
    if(!ctx) {
        free(memoryBuffer);
        free(block);
        return result;
    }
    
    size_t combinedSize = input->size + salt->size;
    unsigned char* combined = (unsigned char*)malloc(combinedSize);
    if(!combined) {
        EVP_MD_CTX_free(ctx);
        free(memoryBuffer);
        free(block);
        return result;
    }
    
    memcpy(combined, input->data, input->size);
    memcpy(combined + input->size, salt->data, salt->size);
    
    EVP_DigestInit_ex(ctx, EVP_sha512(), NULL);
    EVP_DigestUpdate(ctx, combined, combinedSize);
    EVP_DigestFinal_ex(ctx, block, &blockLen);
    
    free(combined);
    
    const int ITERATIONS = 1000;
    for(int i = 0; i < ITERATIONS; i++) {
        size_t writePos = (i * blockLen) % MEMORY_SIZE;
        
        size_t remainingSpace = MEMORY_SIZE - writePos;
        size_t bytesToWrite = blockLen < remainingSpace ? blockLen : remainingSpace;
        memcpy(memoryBuffer + writePos, block, bytesToWrite);
        
        if(bytesToWrite < blockLen) {
            memcpy(memoryBuffer, block + bytesToWrite, blockLen - bytesToWrite);
        }
        
        if(EVP_DigestInit_ex(ctx, EVP_sha512(), NULL) != 1) {
            EVP_MD_CTX_free(ctx);
            free(memoryBuffer);
            free(block);
            return result;
        }
        if(EVP_DigestUpdate(ctx, block, blockLen) != 1) {
            EVP_MD_CTX_free(ctx);
            free(memoryBuffer);
            free(block);
            return result;
        }
        if(EVP_DigestFinal_ex(ctx, block, &blockLen) != 1) {
            EVP_MD_CTX_free(ctx);
            free(memoryBuffer);
            free(block);
            return result;
        }
    }
    
    result.size = 64;
    result.data = (unsigned char*)malloc(result.size);
    if(!result.data) {
        EVP_MD_CTX_free(ctx);
        free(memoryBuffer);
        free(block);
        return result;
    }
    
    if(EVP_DigestInit_ex(ctx, EVP_sha512(), NULL) != 1) {
        EVP_MD_CTX_free(ctx);
        free(memoryBuffer);
        free(block);
        free(result.data);
        result.data = NULL;
        result.size = 0;
        return result;
    }
    if(EVP_DigestUpdate(ctx, memoryBuffer, MEMORY_SIZE) != 1) {
        EVP_MD_CTX_free(ctx);
        free(memoryBuffer);
        free(block);
        free(result.data);
        result.data = NULL;
        result.size = 0;
        return result;
    }
    if(EVP_DigestFinal_ex(ctx, result.data, &blockLen) != 1) {
        EVP_MD_CTX_free(ctx);
        free(memoryBuffer);
        free(block);
        free(result.data);
        result.data = NULL;
        result.size = 0;
        return result;
    }
    
    result.size = blockLen;
    
    EVP_MD_CTX_free(ctx);
    free(memoryBuffer);
    free(block);
    
    return result;
}

ByteArray applyFinalHmac(const ByteArray* input, const ByteArray* salt) {
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
        salt->data,
        salt->size,
        input->data,
        input->size,
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

bool constantTimeEquals(const ByteArray* a, const ByteArray* b) {
    if(a->size != b->size) return false;
    unsigned char result = 0;
    for(size_t i = 0; i < a->size; i++) {
        result |= a->data[i] ^ b->data[i];
    } 
    return result == 0;
}

void freeByteArray(ByteArray* array) {
    if(array && array->data) {
        free(array->data);
        array->data = NULL;
        array->size = 0;
    }
}