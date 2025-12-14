#include <jni.h>
#include <string.h>
#include <stdlib.h>
#include "file_encoder.h"

#define JNI_CLASS_NAME "com/app/main/root/app/_crypto/file_encoder/FileEncoderWrapper"

static int byteArray(
    JNIEnv *env, 
    jbyteArray arr,
    uint8_t **buff, 
    size_t *length
) {
    if(!arr) {
        return ENCODER_ERROR_INVALID_PARAM;
    }
    
    jsize len = (*env)->GetArrayLength(env, arr);
    if(len <= 0) {
        return ENCODER_ERROR_INVALID_PARAM;
    }
    
    *buff = (uint8_t*)malloc(len);
    if(!*buff) {
        return ENCODER_ERROR_MEMORY;
    }
    
    jbyte *elements = (*env)->GetByteArrayElements(env, arr, NULL);
    memcpy(*buff, elements, len);
    (*env)->ReleaseByteArrayElements(env, arr, elements, 0);
    
    *length = len;
    return ENCODER_SUCCESS;
}

static jbyteArray buffer(
    JNIEnv *env, 
    const uint8_t *buff,
    size_t length
) {
    if(!buff || length == 0) {
        return NULL;
    }
    
    jbyteArray arr = (*env)->NewByteArray(env, (jsize)length);
    if(!arr) {
        return NULL;
    }
    
    (*env)->SetByteArrayRegion(
        env, 
        arr, 
        0, 
        (jsize)length,
        (const jbyte*)buff
    );
    
    return arr;
}

JNIEXPORT jlong JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_init(
    JNIEnv *env, 
    jobject obj, 
    jbyteArray key, 
    jint algorithm
) {    
    uint8_t *key = NULL;
    size_t keyLen = 0;
    
    int result = byteArray(env, key, &key, &keyLen);
    if(result != ENCODER_SUCCESS) {
        return 0;
    }
    
    EncoderContext *ctx = (EncoderContext*)malloc(sizeof(EncoderContext));
    if(!ctx) {
        free(key);
        return 0;
    }
    
    result = init(ctx, key, keyLen, (EncryptionAlgo)algorithm);
    free(key);
    
    if(result != ENCODER_SUCCESS) {
        free(ctx);
        return 0;
    }
    
    return (jlong)(intptr_t)ctx;
}

JNIEXPORT void JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_cleanup(
    JNIEnv *env, 
    jobject obj, 
    jlong handle
) {
    
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(ctx) {
        cleanup(ctx);
        free(ctx);
    }
}

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_encryptData(
    JNIEnv *env, 
    jobject obj, 
    jlong handle, 
    jbyteArray input
) {
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(!ctx) {
        return NULL;
    }
    
    uint8_t *input = NULL;
    size_t inputLen = 0;
    
    int result = byteArray(env, input, &input, &inputLen);
    if(result != ENCODER_SUCCESS) {
        return NULL;
    }
    
    size_t maxOutputLen = getEncryptedSize(inputLen, ctx->algo);
    uint8_t *output = (uint8_t*)malloc(maxOutputLen);
    if(!output) {
        free(input);
        return NULL;
    }
    
    size_t outputLen = 0;
    result = encryptData(ctx, input, inputLen, output, &outputLen);
    free(input);
    
    if(result != ENCODER_SUCCESS) {
        free(output);
        return NULL;
    }
    
    jbyteArray output = buffer(env, output, outputLen);
    free(output);
    
    return output;
}

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_decryptData(
    JNIEnv *env, 
    jobject obj, 
    jlong handle, 
    jbyteArray input
) {    
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(!ctx) {
        return NULL;
    }
    
    uint8_t *input = NULL;
    size_t inputLen = 0;
    
    int result = byteArray(env, input, &input, &inputLen);
    if(result != ENCODER_SUCCESS) {
        return NULL;
    }
    
    uint8_t *output = (uint8_t*)malloc(inputLen);
    if(!output) {
        free(input);
        return NULL;
    }
    
    size_t outputLen = 0;
    result = decryptData(ctx, input, inputLen, output, &outputLen);
    free(input);
    
    if(result != ENCODER_SUCCESS) {
        free(output);
        return NULL;
    }
    
    jbyteArray output = buffer(env, output, outputLen);
    free(output);
    
    return output;
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_encryptFile(
    JNIEnv *env, 
    jobject obj, 
    jlong handle, 
    jstring inputPath,
    jstring outputPath
) {    
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(!ctx) {
        return JNI_FALSE;
    }
    
    const char *inputPath = (*env)->GetStringUTFChars(env, inputPath, NULL);
    const char *outputPath = (*env)->GetStringUTFChars(env, outputPath, NULL);
    
    if(!inputPath || !outputPath) {
        if(inputPath) (*env)->ReleaseStringUTFChars(env, inputPath, inputPath);
        if(outputPath) (*env)->ReleaseStringUTFChars(env, outputPath, outputPath);
        return JNI_FALSE;
    }
    
    int result = encryptFile(inputPath, outputPath, ctx);
    
    (*env)->ReleaseStringUTFChars(env, inputPath, inputPath);
    (*env)->ReleaseStringUTFChars(env, outputPath, outputPath);
    
    return (result == ENCODER_SUCCESS) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_decryptFile(
    JNIEnv *env, 
    jobject obj, 
    jlong handle, 
    jstring inputPath,
    jstring outputPath
) {    
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(!ctx) {
        return JNI_FALSE;
    }
    
    const char *inputPath = (*env)->GetStringUTFChars(env, inputPath, NULL);
    const char *outputPath = (*env)->GetStringUTFChars(env, outputPath, NULL);
    
    if(!inputPath || !outputPath) {
        if(inputPath) (*env)->ReleaseStringUTFChars(env, inputPath, inputPath);
        if(outputPath) (*env)->ReleaseStringUTFChars(env, outputPath, outputPath);
        return JNI_FALSE;
    }
    
    int result = decryptFile(inputPath, outputPath, ctx);
    
    (*env)->ReleaseStringUTFChars(env, inputPath, inputPath);
    (*env)->ReleaseStringUTFChars(env, outputPath, outputPath);
    
    return (result == ENCODER_SUCCESS) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_generateIV(
    JNIEnv *env, 
    jobject obj, 
    jlong handle
) {    
    EncoderContext *ctx = (EncoderContext*)(intptr_t)handle;
    if(!ctx) {
        return NULL;
    }
    
    if(generateIV(ctx) != ENCODER_SUCCESS) {
        return NULL;
    }
    
    return buffer(env, ctx->iv, ctx->ivLength);
}

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_deriveKey(
    JNIEnv *env, 
    jobject obj, 
    jstring password, 
    jbyteArray salt,
    jint keyLength
) {
    const char *password = (*env)->GetStringUTFChars(env, password, NULL);
    if(!password) {
        return NULL;
    }
    
    uint8_t *salt = NULL;
    size_t saltLen = 0;
    
    int result = byteArray(env, salt, &salt, &saltLen);
    if(result != ENCODER_SUCCESS) {
        (*env)->ReleaseStringUTFChars(env, password, password);
        return NULL;
    }
    
    uint8_t *key = (uint8_t*)malloc(keyLength);
    if(!key) {
        (*env)->ReleaseStringUTFChars(env, password, password);
        free(salt);
        return NULL;
    }
    
    result = deriveKey(password, saltLen, key, keyLength);
    
    (*env)->ReleaseStringUTFChars(env, password, password);
    free(salt);
    
    if(result != ENCODER_SUCCESS) {
        free(key);
        return NULL;
    }
    
    jbyteArray key = buffer(env, key, keyLength);
    free(key);
    
    return key;
}

JNIEXPORT jint JNICALL Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_getEncryptedSize(
    JNIEnv *env, 
    jobject obj, 
    jint input_size, 
    jint algorithm
) {
    return (jint)getEncryptedSize(
        input_size,
        (EncryptionAlgo)algorithm);
}

static JNINativeMethod methods[] = {
    { "init", "([BI)J", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_init },
    { "cleanup", "(J)V", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_cleanup },
    { "encryptData", "(J[B)[B", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_encryptData },
    { "decryptData", "(J[B)[B", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_decryptData },
    { "encryptFile", "(JLjava/lang/String;Ljava/lang/String;)Z", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_encryptFile },
    { "decryptFile", "(JLjava/lang/String;Ljava/lang/String;)Z", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_decryptFile },
    { "generateIV", "(J)[B", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_generateIV },
    { "deriveKey", "(Ljava/lang/String;[BI)[B", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_deriveKey },
    { "getEncryptedSize", "(II)I", (void*)Java_com_app_main_root_app__1crypto_file_1encoder_FileEncoderWrapper_getEncryptedSize }
};

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *reserved) {
    JNIEnv *env = NULL;
    
    if((*vm)->GetEnv(vm, (void**)&env, JNI_VERSION_1_8) != JNI_OK) {
        return JNI_ERR;
    }
    
    jclass clazz = (*env)->FindClass(env, JNI_CLASS_NAME);
    if(!clazz) {
        return JNI_ERR;
    }
    
    if((*env)->RegisterNatives(
        env, 
        clazz, 
        methods,
        sizeof(methods) / sizeof(methods[0])) != JNI_OK) {
        return JNI_ERR;
    }
    
    return JNI_VERSION_1_8;
}