#include <jni.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "_main.c"

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app_file_1compressor_FileCompressor_compress(
    JNIEnv* env,
    jclass cls,
    jbyteArray data
) {
    jsize dataLen = (*env)->GetArrayLength(env, data);
    jbyte* dataPtr = (*env)->GetByteArrayElements(env, data, NULL);

    size_t outputSize;
    CompressionType compType;
    uint8_t* compressed = compress(
        (uint8_t*)dataPtr,
        dataLen,
        &outputSize,
        &compType
    );

    jbyteArray result = (*env)->NewByteArray(env, outputSize);
    (*env)->SetByteArrayRegion(env, result, 0, outputSize, (jbyte*)compressed);

    (*env)->ReleaseByteArrayElements(env, data, dataPtr, JNI_ABORT);
    free(compressed);

    return result;
}

JNIEXPORT jbyteArray JNICALL Java_com_app_main_root_app_file_1compressor_FileCompressor_decompress(
    JNIEnv* env,
    jclass cls,
    jbyteArray data,
    jint compressionType
) {
    jsize dataLen = (*env)->GetArrayLength(env, data);
    jbyte* dataPtr = (*env)->GetByteArrayElements(env, data, NULL);

    size_t outputSize;
    uint8_t* decompressed = decompress(
        (uint8_t*)dataPtr,
        dataLen,
        &outputSize,
        (CompressionType)compressionType
    );

    jbyteArray result = (*env)->NewByteArray(env, outputSize);
    (*env)->SetByteArrayRegion(env, result, 0, outputSize, (jbyte*)decompressed);

    (*env)->ReleaseByteArrayElements(env, data, dataPtr, JNI_ABORT);
    free(decompressed);

    return result;
}

JNIEXPORT jint JNICALL Java_com_app_main_root_app_file_1compressor_FileCompressor_compressFile(
    JNIEnv* env,
    jclass cls,
    jstring inputPath,
    jstring outputPath
) {
    const char* inPath = (*env)->GetStringUTFChars(env, inputPath, NULL);
    const char* outPath = (*env)->GetStringUTFChars(env, outputPath, NULL);

    int result = compressFile(inPath, outPath);

    (*env)->ReleaseStringUTFChars(env, inputPath, inPath);
    (*env)->ReleaseStringUTFChars(env, outputPath, outPath);

    return result;
}

JNIEXPORT jint JNICALL Java_com_app_main_root_app_file_1compressor_FileCompressor_decompressFile(
    JNIEnv* env,
    jclass cls,
    jstring inputPath,
    jstring outputPath
) {
    const char* inPath = (*env)->GetStringUTFChars(env, inputPath, NULL);
    const char* outPath = (*env)->GetStringUTFChars(env, outputPath, NULL);

    int result = decompressFile(inPath, outPath);

    (*env)->ReleaseStringUTFChars(env, inputPath, inPath);
    (*env)->ReleaseStringUTFChars(env, outputPath, outPath);

    return result;
}