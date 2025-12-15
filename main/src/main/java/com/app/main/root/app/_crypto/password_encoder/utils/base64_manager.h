#pragma once
#include "../hash_generator/hash_generator.h"

char* encode(const ByteArray* data);
ByteArray decode(const char* encoded_string);