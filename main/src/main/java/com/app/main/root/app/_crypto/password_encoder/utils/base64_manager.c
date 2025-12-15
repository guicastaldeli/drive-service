#include "base64_manager.h"
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static const char* base64_chars = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

static bool is_base64(unsigned char c) {
    return (isalnum(c) || (c == '+') || (c == '/'));
}

char* encode(const ByteArray* data) {
    size_t dataLen = data->size;
    const unsigned char* bytes_to_encode = data->data;
    
    size_t ret_len = 4 * ((dataLen + 2) / 3);
    char* ret = (char*)malloc(ret_len + 1);
    if(!ret) return NULL;
    
    int i = 0;
    int j = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];
    
    for(size_t idx = 0; idx < dataLen; idx++) {
        char_array_3[i++] = bytes_to_encode[idx];
        if(i == 3) {
            char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
            char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
            char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
            char_array_4[3] = char_array_3[2] & 0x3f;
            
            for(i = 0; i < 4; i++) ret[j++] = base64_chars[char_array_4[i]];
            i = 0;
        }
    }
    
    if(i) {
        for(int k = i; k < 3; k++) char_array_3[k] = '\0';
        
        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
        char_array_4[3] = char_array_3[2] & 0x3f;
        
        for(int k = 0; k < i + 1; k++) ret[j++] = base64_chars[char_array_4[k]];
        while(i++ < 3) ret[j++] = '=';
    }
    
    ret[j] = '\0';
    return ret;
}

ByteArray decode(const char* encoded_string) {
    ByteArray ret;
    ret.data = NULL;
    ret.size = 0;
    
    char* standard_encoded = strdup(encoded_string);
    if(!standard_encoded) return ret;
    
    for(size_t i = 0; standard_encoded[i] != '\0'; i++) {
        if(standard_encoded[i] == '-') standard_encoded[i] = '+';
        else if(standard_encoded[i] == '_') standard_encoded[i] = '/';
    }
    
    size_t in_len = strlen(standard_encoded);
    int i = 0;
    int j = 0;
    int in_ = 0;
    unsigned char char_array_4[4], char_array_3[3];
    
    size_t max_size = (in_len * 3) / 4 + 1;
    unsigned char* buffer = (unsigned char*)malloc(max_size);
    if(!buffer) {
        free(standard_encoded);
        return ret;
    }
    size_t buffer_pos = 0;
    
    while(in_len-- && (standard_encoded[in_] != '=') && is_base64(standard_encoded[in_])) {
        char_array_4[i++] = standard_encoded[in_]; 
        in_++;
        
        if(i == 4) {
            for(i = 0; i < 4; i++) {
                char_array_4[i] = (unsigned char)(strchr(base64_chars, char_array_4[i]) - base64_chars);
            }
            
            char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
            char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
            char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];
            
            for(i = 0; i < 3; i++) {
                buffer[buffer_pos++] = char_array_3[i];
            }
            i = 0;
        }
    }
    
    if(i > 0) {
        for(j = i; j < 4; j++) {
            char_array_4[j] = 0;
        }
        for(j = 0; j < 4; j++) {
            char_array_4[j] = (unsigned char)(strchr(base64_chars, char_array_4[j]) - base64_chars);
        }
        
        char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
        char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
        char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];
        
        for(j = 0; j < i - 1; j++) {
            buffer[buffer_pos++] = char_array_3[j];
        }
    }
    
    ret.data = buffer;
    ret.size = buffer_pos;
    free(standard_encoded);
    
    return ret;
}