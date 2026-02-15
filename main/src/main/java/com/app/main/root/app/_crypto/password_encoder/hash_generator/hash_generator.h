#pragma once
#include <stddef.h>
#include <stdbool.h>

typedef struct {
    unsigned char* data;
    size_t size;
} ByteArray;

#define HASH_KEY_LENGTH 128
#define HASH_ITERATIONS 1000

ByteArray generateSecureHash(const ByteArray* pepperedPassword, const ByteArray* salt);
ByteArray applyMemoryHardFunction(const ByteArray* input, const ByteArray* salt);
ByteArray applyFinalHmac(const ByteArray* input, const ByteArray* salt);
bool constantTimeEquals(const ByteArray* a, const ByteArray* b);

void freeByteArray(ByteArray* array);