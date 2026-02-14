#include "jni_macros.h"
#include "user_validator.h"
#include <jni.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>

JNIEXPORT jlong JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_createNativeObject(
    JNIEnv *env,
    jobject obj
) {
    UserValidator* validator = userValidatorCreate();
    if(!validator) return 0L;
    return (jlong)(intptr_t)validator;
}

JNIEXPORT void JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_destroyNativeObject(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr
) {
    if(nativePtr == 0) return;
    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    userValidatorDestroy(validator);
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_validateRegistrationNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring username,
    jstring email,
    jstring password,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !username || !email || !password || !ipAddress) {
        return JNI_FALSE;
    }

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* usernameStr = NULL;
    const char* emailStr = NULL;
    const char* passwordStr = NULL;
    const char* ipAddressStr = NULL;
    jboolean result = JNI_FALSE;

    usernameStr = (*env)->GetStringUTFChars(env, username, NULL);
    emailStr = (*env)->GetStringUTFChars(env, email, NULL);
    passwordStr = (*env)->GetStringUTFChars(env, password, NULL);
    ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);

    if(!usernameStr || !emailStr || !passwordStr || !ipAddressStr) {
        if(usernameStr) (*env)->ReleaseStringUTFChars(env, username, usernameStr);
        if(emailStr) (*env)->ReleaseStringUTFChars(env, email, emailStr);
        if(passwordStr) (*env)->ReleaseStringUTFChars(env, password, passwordStr);
        if(ipAddressStr) (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
        return JNI_FALSE;
    }

    bool cResult = userValidatorValidateRegistration(
        validator,
        usernameStr,
        emailStr,
        passwordStr,
        ipAddressStr
    );

    result = cResult ? JNI_TRUE : JNI_FALSE;

    (*env)->ReleaseStringUTFChars(env, username, usernameStr);
    (*env)->ReleaseStringUTFChars(env, email, emailStr);
    (*env)->ReleaseStringUTFChars(env, password, passwordStr);
    (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);

    return result;
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_validateLoginNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring email,
    jstring password,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !email || !password || !ipAddress) {
        return JNI_FALSE;
    }

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* emailStr = NULL;
    const char* passwordStr = NULL;
    const char* ipAddressStr = NULL;
    jboolean result = JNI_FALSE;

    emailStr = (*env)->GetStringUTFChars(env, email, NULL);
    passwordStr = (*env)->GetStringUTFChars(env, password, NULL);
    ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);

    if(!emailStr || !passwordStr || !ipAddressStr) {
        if(emailStr) (*env)->ReleaseStringUTFChars(env, email, emailStr);
        if(passwordStr) (*env)->ReleaseStringUTFChars(env, password, passwordStr);
        if(ipAddressStr) (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
        return JNI_FALSE;
    }

    bool cResult = userValidatorValidateLogin(
        validator,
        emailStr,
        passwordStr,
        ipAddressStr
    );

    result = cResult ? JNI_TRUE : JNI_FALSE;

    (*env)->ReleaseStringUTFChars(env, email, emailStr);
    (*env)->ReleaseStringUTFChars(env, password, passwordStr);
    (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);

    return result;
}

JNIEXPORT void JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_recordRegistrationAttemptNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !ipAddress) return;

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);

    if(ipAddressStr) {
        userValidatorRecordRegistrationAttempt(validator, ipAddressStr);
        (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
    }
}

JNIEXPORT void JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_recordLoginAttemptNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !ipAddress) return;

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);

    if(ipAddressStr) {
        userValidatorRecordLoginAttempt(validator, ipAddressStr);
        (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
    }
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_isRegistrationRateLimitedNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !ipAddress) return JNI_FALSE;

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);
    jboolean result = JNI_FALSE;

    if(ipAddressStr) {
        bool cResult = userValidatorIsRegistrationRateLimited(validator, ipAddressStr);
        result = cResult ? JNI_TRUE : JNI_FALSE;
        (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
    }

    return result;
}

JNIEXPORT jboolean JNICALL Java_com_app_main_root_app__1crypto_user_1validator_UserValidatorWrapper_isLoginRateLimitedNative(
    JNIEnv *env,
    jobject obj,
    jlong nativePtr,
    jstring ipAddress
) {
    if(nativePtr == 0 || !env || !ipAddress) return JNI_FALSE;

    UserValidator* validator = (UserValidator*)(intptr_t)nativePtr;
    const char* ipAddressStr = (*env)->GetStringUTFChars(env, ipAddress, NULL);
    jboolean result = JNI_FALSE;

    if(ipAddressStr) {
        bool cResult = userValidatorIsLoginRateLimited(validator, ipAddressStr);
        result = cResult ? JNI_TRUE : JNI_FALSE;
        (*env)->ReleaseStringUTFChars(env, ipAddress, ipAddressStr);
    }

    return result;
}