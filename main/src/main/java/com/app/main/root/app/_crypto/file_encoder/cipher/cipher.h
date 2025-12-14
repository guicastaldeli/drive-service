#pragma once
#include "../context.h"

typedef struct {
    EVP_CIPHER_CTX* encryptCtx;
    EVP_CIPHER_CTX* decryptCtx;
    int init;
} Context;

static const EVP_CIPHER* getCipher(EncryptionAlgo algo);
static size_t getTagSize(EncryptionAlgo algo);
