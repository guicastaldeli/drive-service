#include "jni_macros.h"
#include <jni.h>
#include <stdlib.h>
#include "password_encoder.h"

JNI_EXPORT JNIEXPORT jlong JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_createNativeObject(JNIEnv *env, jobject obj) {
    PasswordEncoder* encoder = createPasswordEncoder();
    return (jlong)encoder;
}

JNI_EXPORT JNIEXPORT void JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_destroyNativeObject(
    JNIEnv *env, 
    jobject obj,
    jlong nativePtr
) {
    if(nativePtr != 0) {
        PasswordEncoder* encoder = (PasswordEncoder*)nativePtr;
        destroyPasswordEncoder(encoder);
    }
}

JNI_EXPORT JNIEXPORT jstring JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_encodeNative(
    JNIEnv *env, 
    jobject obj,
    jlong nativePtr,
    jstring password
) {
    if(nativePtr == 0 || password == NULL) {
        return NULL;
    }
    
    PasswordEncoder* encoder = (PasswordEncoder*)nativePtr;
    const char* passwordStr = (*env)->GetStringUTFChars(env, password, NULL);
    if(!passwordStr) return NULL;
    
    char* result = encodePassword(encoder, passwordStr);
    (*env)->ReleaseStringUTFChars(env, password, passwordStr);
    
    if(!result) return NULL;
    
    jstring jresult = (*env)->NewStringUTF(env, result);
    free(result);
    return jresult;
}

JNI_EXPORT JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_matchesNative(
    JNIEnv *env, 
    jobject obj,
    jlong nativePtr,
    jstring password,
    jstring encodedPassword
) {
    if(nativePtr == 0 || password == NULL || encodedPassword == NULL) {
        return JNI_FALSE;
    }
    
    PasswordEncoder* encoder = (PasswordEncoder*)nativePtr;
    const char* passwordStr = (*env)->GetStringUTFChars(env, password, NULL);
    const char* encodedPasswordStr = (*env)->GetStringUTFChars(env, encodedPassword, NULL);
    
    if(!passwordStr || !encodedPasswordStr) {
        if(passwordStr) (*env)->ReleaseStringUTFChars(env, password, passwordStr);
        if(encodedPasswordStr) (*env)->ReleaseStringUTFChars(env, encodedPassword, encodedPasswordStr);
        return JNI_FALSE;
    }
    
    bool result = matchesPassword(encoder, passwordStr, encodedPasswordStr);
    
    (*env)->ReleaseStringUTFChars(env, password, passwordStr);
    (*env)->ReleaseStringUTFChars(env, encodedPassword, encodedPasswordStr);
    
    return result ? JNI_TRUE : JNI_FALSE;
}

JNI_EXPORT JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_isPasswordStrongNative(
    JNIEnv *env, 
    jobject obj,
    jlong nativePtr,
    jstring password
) {
    if(nativePtr == 0 || password == NULL) {
        return JNI_FALSE;
    }
    
    PasswordEncoder* encoder = (PasswordEncoder*)nativePtr;
    const char* passwordStr = (*env)->GetStringUTFChars(env, password, NULL);
    if(!passwordStr) return JNI_FALSE;
    
    bool result = isPasswordStrongCheck(passwordStr);
    (*env)->ReleaseStringUTFChars(env, password, passwordStr);
    
    return result ? JNI_TRUE : JNI_FALSE;
}

JNI_EXPORT JNIEXPORT jstring JNICALL Java_com_app_main_root_app__1crypto_password_1encoder_PasswordEncoderWrapper_generateSecurePasswordNative(
    JNIEnv *env, 
    jobject obj,
    jlong nativePtr,
    jint length
) {
    if(nativePtr == 0) {
        return NULL;
    }
    
    PasswordEncoder* encoder = (PasswordEncoder*)nativePtr;
    char* result = generateSecurePasswordWrapper(length);
    if(!result) return NULL;
    
    jstring jresult = (*env)->NewStringUTF(env, result);
    free(result);
    return jresult;
}