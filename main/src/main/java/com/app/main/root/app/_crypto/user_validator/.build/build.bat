@echo off
setlocal EnableDelayedExpansion

echo Building with Visual Studio Compiler
echo ====================================

set JAVA_HOME=C:\Program Files\Java\jdk-22
set VCPKG_ROOT=C:\Users\casta\OneDrive\Desktop\vscode\messages\main\vcpkg
set OPENSSL_INCLUDE=%VCPKG_ROOT%\installed\x64-windows\include
set OPENSSL_LIB=%VCPKG_ROOT%\installed\x64-windows\lib
set PTHREAD_INCLUDE=%VCPKG_ROOT%\installed\x64-windows\include
set PTHREAD_LIB=%VCPKG_ROOT%\installed\x64-windows\lib

echo.
set VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build

if exist "%VS_PATH%\vcvars64.bat" (
    call "%VS_PATH%\vcvars64.bat"
    echo Visual Studio environment loaded :D
) else (
    echo ERROR: Visual Studio not found. Please install Visual Studio Build Tools.
    pause
    exit /b 1
)

echo.
echo Cleaning previous builds...
del *.obj 2>nul
del user_validator.dll 2>nul

echo.
echo Compiling with CL.EXE...
cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\user_validator.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile user_validator.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\user_validator_jni.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile user_validator_jni.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\email\email_validator.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile email_validator.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\email\disposable_email_domains.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile disposable_email_domains.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\username\username_validator.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile username_validator.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\username\reserved_username_list.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile reserved_username_list.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\password\password_validator.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile password_validator.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\password\common_password_list.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile common_password_list.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\rate_limiter\rate_limiter.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile rate_limiter.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\input_sanitizer\input_sanitizer.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile input_sanitizer.c
    pause
    exit /b 1
)

cl /nologo /c /O2 /EHsc /std:c++17 /I"%JAVA_HOME%\include" /I"%JAVA_HOME%\include\win32" /I"%OPENSSL_INCLUDE%" /I"%PTHREAD_INCLUDE%" ..\input_sanitizer\suspicious_pattern_list.c
if %errorlevel% neq 0 (
    echo ERROR: Failed to compile suspicious_pattern_list.c
    pause
    exit /b 1
)

echo.
echo Linking DLL with link.exe...
link /nologo /DLL /OUT:user_validator.dll user_validator.obj user_validator_jni.obj email_validator.obj disposable_email_domains.obj username_validator.obj reserved_username_list.obj password_validator.obj common_password_list.obj rate_limiter.obj input_sanitizer.obj suspicious_pattern_list.obj /LIBPATH:"%OPENSSL_LIB%" /LIBPATH:"%PTHREAD_LIB%" libssl.lib libcrypto.lib pthreadVC3.lib ws2_32.lib gdi32.lib crypt32.lib advapi32.lib

if %errorlevel% neq 0 (
    echo ERROR: Linking failed
    pause
    exit /b 1
)

echo.
echo Copying required runtime DLLs...
if exist "%OPENSSL_LIB%\..\bin\libcrypto-3-x64.dll" (
    copy "%OPENSSL_LIB%\..\bin\libcrypto-3-x64.dll" . >nul
    echo Copied libcrypto-3-x64.dll
)

if exist "%OPENSSL_LIB%\..\bin\libssl-3-x64.dll" (
    copy "%OPENSSL_LIB%\..\bin\libssl-3-x64.dll" . >nul
    echo Copied libssl-3-x64.dll
)

if exist "%PTHREAD_LIB%\..\bin\pthreadVC3.dll" (
    copy "%PTHREAD_LIB%\..\bin\pthreadVC3.dll" . >nul
    echo Copied pthreadVC3.dll
)

echo.
echo Final verification...
if exist user_validator.dll (
    echo BUILD SUCCESSFUL!
    echo.
    echo Created files:
    dir *.dll /B
) else (
    echo BUILD FAILED :/
)

echo.
pause