#pragma once
#include "../hash_generator/hash_generator.h"
#include <stdbool.h>

char* generateSecurePassword(int length);
bool generateRandomBytes(ByteArray* buffer);
bool generateRandomBytesBuffer(unsigned char* buffer, size_t length);