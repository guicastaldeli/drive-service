#pragma once
#include "../context.h"

static size_t getIVSize(EncryptionAlgo algo);
int generateIV(EncoderContext* ctx);

