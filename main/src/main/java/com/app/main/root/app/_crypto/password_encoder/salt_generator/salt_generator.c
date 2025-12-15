#include "salt_generator.h"
#include <openssl/rand.h>
#include <stdlib.h>

ByteArray generateSalt() {
    ByteArray salt;
    salt.size = SALT_LENGTH;
    salt.data = (unsigned char*)malloc(salt.size);
    if(!salt.data) {
        salt.size = 0;
        return salt;
    }
    
    if(RAND_bytes(salt.data, salt.size) != 1) {
        free(salt.data);
        salt.data = NULL;
        salt.size = 0;
        return salt;
    }
    
    return salt;
}

bool isSaltValid(const ByteArray* salt) {
    return salt->size == SALT_LENGTH;
}