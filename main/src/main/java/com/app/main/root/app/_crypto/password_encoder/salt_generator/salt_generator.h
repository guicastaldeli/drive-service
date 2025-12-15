#pragma once
#include "hash_generator.h"

#define SALT_LENGTH 32

ByteArray generateSalt();
bool isSaltValid(const ByteArray* salt);