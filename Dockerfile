# Start with the base image
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY . .

# Install ALL build dependencies including OpenSSL and gcc for C files
RUN apt-get update && \
    apt-get install -y \
        g++ \
        gcc \
        make \
        cmake \
        libssl-dev \
        pkg-config \
        tree \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create build directories
RUN mkdir -p \
    main/src/main/java/com/app/main/root/app/_crypto/file_encoder/.build \
    main/src/main/java/com/app/main/root/app/_crypto/password_encoder/.build \
    main/src/main/java/com/app/main/root/app/_crypto/user_validator/.build \
    main/src/main/java/com/app/main/root/app/file_compressor/.build

# Create compilation helper script that supports both C and C++
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Find Java include directory\n\
JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))\n\
JNI_INCLUDE="$JAVA_HOME/include"\n\
JNI_INCLUDE_LINUX="$JAVA_HOME/include/linux"\n\
\n\
compile_native() {\n\
    local base_dir=$1\n\
    local output=$2\n\
    local module_name=$(basename $base_dir)\n\
    \n\
    echo "=========================================="\n\
    echo "🔧 COMPILING: $module_name"\n\
    echo "=========================================="\n\
    \n\
    cd "$base_dir"\n\
    \n\
    echo "📂 Current directory: $(pwd)"\n\
    echo "📂 Directory contents:"\n\
    ls -la\n\
    echo ""\n\
    \n\
    # Find all C and C++ files\n\
    C_FILES=$(find . -type f -name "*.c" 2>/dev/null | sort || true)\n\
    CPP_FILES=$(find . -type f -name "*.cpp" 2>/dev/null | sort || true)\n\
    \n\
    if [ -z "$C_FILES" ] && [ -z "$CPP_FILES" ]; then\n\
        echo "⚠️  WARNING: No .c or .cpp files found in $module_name - SKIPPING"\n\
        echo "=========================================="\n\
        echo ""\n\
        return 0\n\
    fi\n\
    \n\
    # Display found files\n\
    if [ -n "$C_FILES" ]; then\n\
        echo "📂 Found C files:"\n\
        echo "$C_FILES" | sed "s/^/  - /"\n\
    fi\n\
    if [ -n "$CPP_FILES" ]; then\n\
        echo "📂 Found C++ files:"\n\
        echo "$CPP_FILES" | sed "s/^/  - /"\n\
    fi\n\
    echo ""\n\
    \n\
    # Clean and create build directory\n\
    rm -rf .build\n\
    mkdir -p .build\n\
    \n\
    # Compile C files\n\
    if [ -n "$C_FILES" ]; then\n\
        echo "🔨 Compiling C files..."\n\
        for c_file in $C_FILES; do\n\
            rel_path=${c_file#./}\n\
            obj_dir=".build/$(dirname $rel_path)"\n\
            obj_file=".build/${rel_path%.*}.o"\n\
            \n\
            mkdir -p "$obj_dir"\n\
            \n\
            # Check if this C file includes C++ headers (like <vector>, <string>, etc.)\n\
            if grep -qE "#include <(vector|string|map|set|unordered_map|algorithm|memory|iostream)>" "$c_file" 2>/dev/null; then\n\
                echo "  Compiling as C++ (detected C++ headers): $rel_path"\n\
                \n\
                # Compile with g++ since it has C++ dependencies\n\
                if [ "$module_name" = "password_encoder" ]; then\n\
                    g++ -c -fPIC \\\n\
                        "$c_file" \\\n\
                        -o "$obj_file" \\\n\
                        -I. \\\n\
                        -I./hash_generator \\\n\
                        -I./password_validator \\\n\
                        -I./pepper_manager \\\n\
                        -I./salt_generator \\\n\
                        -I./utils \\\n\
                        -I"$JNI_INCLUDE" \\\n\
                        -I"$JNI_INCLUDE_LINUX" \\\n\
                        -I/usr/include/openssl \\\n\
                        -std=c++17 \\\n\
                        -O2 \\\n\
                        -Wall \\\n\
                        -Wno-unused-parameter\n\
                else\n\
                    g++ -c -fPIC \\\n\
                        "$c_file" \\\n\
                        -o "$obj_file" \\\n\
                        -I. \\\n\
                        -I"$JNI_INCLUDE" \\\n\
                        -I"$JNI_INCLUDE_LINUX" \\\n\
                        -I/usr/include/openssl \\\n\
                        -std=c++17 \\\n\
                        -O2 \\\n\
                        -Wall \\\n\
                        -Wno-unused-parameter\n\
                fi\n\
            else\n\
                echo "  Compiling C: $rel_path"\n\
                \n\
                gcc -c -fPIC \\\n\
                    "$c_file" \\\n\
                    -o "$obj_file" \\\n\
                    -I. \\\n\
                    -I"$JNI_INCLUDE" \\\n\
                    -I"$JNI_INCLUDE_LINUX" \\\n\
                    -I/usr/include/openssl \\\n\
                    -std=c11 \\\n\
                    -O2 \\\n\
                    -Wall\n\
            fi\n\
            \n\
            echo "    ✅ Created ${rel_path%.*}.o"\n\
        done\n\
    fi\n\
    \n\
    # Compile C++ files\n\
    if [ -n "$CPP_FILES" ]; then\n\
        echo "🔨 Compiling C++ files..."\n\
        for cpp_file in $CPP_FILES; do\n\
            rel_path=${cpp_file#./}\n\
            obj_dir=".build/$(dirname $rel_path)"\n\
            obj_file=".build/${rel_path%.*}.o"\n\
            \n\
            mkdir -p "$obj_dir"\n\
            \n\
            echo "  Compiling C++: $rel_path"\n\
            \n\
            # Determine which include paths to use based on module\n\
            if [ "$module_name" = "message_encoder" ]; then\n\
                # Message encoder has subdirectories\n\
                g++ -c -fPIC \\\n\
                    "$cpp_file" \\\n\
                    -o "$obj_file" \\\n\
                    -I. \\\n\
                    -I./keys \\\n\
                    -I./crypto_operations \\\n\
                    -I./aes_operations \\\n\
                    -I./utils \\\n\
                    -I"$JNI_INCLUDE" \\\n\
                    -I"$JNI_INCLUDE_LINUX" \\\n\
                    -I/usr/include/openssl \\\n\
                    -std=c++17 \\\n\
                    -O2 \\\n\
                    -Wall \\\n\
                    -Wno-unused-parameter\n\
            elif [ "$module_name" = "password_encoder" ]; then\n\
                # Password encoder has subdirectories\n\
                g++ -c -fPIC \\\n\
                    "$cpp_file" \\\n\
                    -o "$obj_file" \\\n\
                    -I. \\\n\
                    -I./hash_generator \\\n\
                    -I./password_validator \\\n\
                    -I./pepper_manager \\\n\
                    -I./salt_generator \\\n\
                    -I./utils \\\n\
                    -I"$JNI_INCLUDE" \\\n\
                    -I"$JNI_INCLUDE_LINUX" \\\n\
                    -I/usr/include/openssl \\\n\
                    -std=c++17 \\\n\
                    -O2 \\\n\
                    -Wall \\\n\
                    -Wno-unused-parameter\n\
            else\n\
                # Other C++ modules might have simpler structure\n\
                g++ -c -fPIC \\\n\
                    "$cpp_file" \\\n\
                    -o "$obj_file" \\\n\
                    -I. \\\n\
                    -I"$JNI_INCLUDE" \\\n\
                    -I"$JNI_INCLUDE_LINUX" \\\n\
                    -I/usr/include/openssl \\\n\
                    -std=c++17 \\\n\
                    -O2 \\\n\
                    -Wall \\\n\
                    -Wno-unused-parameter\n\
            fi\n\
            \n\
            echo "    ✅ Created ${rel_path%.*}.o"\n\
        done\n\
    fi\n\
    \n\
    echo ""\n\
    echo "📦 Object files created:"\n\
    find .build -name "*.o" -type f | sed "s/^/  /"\n\
    \n\
    echo ""\n\
    echo "🔗 Linking shared library..."\n\
    \n\
    # Find all object files\n\
    OBJ_FILES=$(find .build -name "*.o" -type f)\n\
    OBJ_COUNT=$(echo "$OBJ_FILES" | wc -w)\n\
    echo "Linking $OBJ_COUNT object files"\n\
    \n\
    # Link all object files (use g++ for linking to handle C++ stdlib)\n\
    g++ -shared -fPIC \\\n\
        $OBJ_FILES \\\n\
        -o "$output" \\\n\
        -L/usr/lib/x86_64-linux-gnu \\\n\
        -lcrypto \\\n\
        -lssl \\\n\
        -lpthread\n\
    \n\
    echo "✅ Library created: $(basename $output)"\n\
    \n\
    # Verify library\n\
    if [ -f "$output" ]; then\n\
        echo "✅ Library size: $(ls -lh $output | awk '\''{print $5}'\'')"\n\
        \n\
        # Verify symbols for message_encoder\n\
        if [ "$module_name" = "message_encoder" ]; then\n\
            echo ""\n\
            echo "🔍 Verifying KeyDerivation symbols in message_encoder:"\n\
            if nm -C "$output" 2>/dev/null | grep -q "KeyDerivation::KDF_RK"; then\n\
                echo "✅ KeyDerivation::KDF_RK found"\n\
                nm -C "$output" 2>/dev/null | grep "KeyDerivation::" | sed "s/^/  /"\n\
            else\n\
                echo "❌ ERROR: KeyDerivation::KDF_RK not found!"\n\
                echo "Checking all symbols:"\n\
                nm -C "$output" 2>/dev/null | grep -i keyderivation || echo "  No KeyDerivation symbols at all"\n\
                exit 1\n\
            fi\n\
        fi\n\
    fi\n\
    \n\
    echo "=========================================="\n\
    echo ""\n\
}\n\
\n\
# Compile each module\n\
echo "🚀 STARTING COMPILATION OF ALL MODULES 🚀"\n\
echo ""\n\
\n\
compile_native "/app/main/src/main/java/com/app/main/root/app/_crypto/file_encoder" "/usr/local/lib/libfileencoder.so"\n\
compile_native "/app/main/src/main/java/com/app/main/root/app/_crypto/password_encoder" "/usr/local/lib/libpasswordencoder.so"\n\
compile_native "/app/main/src/main/java/com/app/main/root/app/_crypto/user_validator" "/usr/local/lib/libuser_validator.so"\n\
compile_native "/app/main/src/main/java/com/app/main/root/app/file_compressor" "/usr/local/lib/libfile_compressor.so"\n\
\n\
echo "🎉 ALL MODULES COMPILED SUCCESSFULLY 🎉"\n\
' > /usr/local/bin/compile_native.sh && chmod +x /usr/local/bin/compile_native.sh

# Run the compilation
RUN /usr/local/bin/compile_native.sh

# Build Spring Boot application
RUN cd main && mvn clean package -DskipTests && \
    echo "✅ SPRING BOOT BUILD COMPLETED"

# Final runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
        curl \
        nodejs \
        npm \
        libssl3 \
        libstdc++6 \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies for the config generation script
RUN npm install -g dotenv

# Create directories - CRITICAL: Create database directories with proper permissions
RUN mkdir -p \
    /app/lib/native/linux \
    /app/public \
    /app/db/data \
    /app/db/src \
    /app/keys && \
    chmod -R 777 /app/db && \
    chmod -R 777 /app/keys

# Copy native libraries to BOTH locations
COPY --from=build /usr/local/lib/libfileencoder.so /usr/local/lib/
COPY --from=build /usr/local/lib/libpasswordencoder.so /usr/local/lib/
COPY --from=build /usr/local/lib/libuser_validator.so /usr/local/lib/
COPY --from=build /usr/local/lib/libfile_compressor.so /usr/local/lib/

COPY --from=build /usr/local/lib/libfileencoder.so /app/lib/native/linux/
COPY --from=build /usr/local/lib/libpasswordencoder.so /app/lib/native/linux/
COPY --from=build /usr/local/lib/libuser_validator.so /app/lib/native/linux/
COPY --from=build /usr/local/lib/libfile_compressor.so /app/lib/native/linux/

# Copy SQL files to the new standardized location
COPY --from=build /app/main/src/main/java/com/app/main/root/app/_db/src/*.sql /app/db/src/

# Copy config scripts to public directory
COPY --from=build /app/main/src/main/java/com/app/main/root/public/generate-config.js /app/public/
COPY --from=build /app/main/src/main/java/com/app/main/root/public/encrypt-url.js /app/public/

# Copy the jar file
COPY --from=build /app/main/target/main-0.0.1-SNAPSHOT.jar server.jar

# Set library paths
ENV LD_LIBRARY_PATH=/usr/local/lib:/app/lib/native/linux:$LD_LIBRARY_PATH
ENV JAVA_LIBRARY_PATH=/usr/local/lib:/app/lib/native/linux

# Set database paths for Docker environment
ENV DB_DATA_DIR=/app/db/data/
ENV DB_SQL_DIR=/app/db/src/

# Set session keys path for Docker environment
ENV SESSION_KEYS_DIR=/app/keys

EXPOSE 3001

# Run config generation then start server
CMD ["/bin/sh", "-c", "\
    echo '=== Starting Application ===' && \
    echo 'Environment: $APP_ENV' && \
    echo 'Database paths:' && \
    echo '  DATA_DIR: $DB_DATA_DIR' && \
    echo '  SQL_DIR: $DB_SQL_DIR' && \
    echo 'Checking SQL files...' && \
    ls -la /app/db/src/ && \
    if [ \"$APP_ENV\" = \"prod\" ] || [ \"$APP_ENV\" = \"production\" ]; then \
        echo 'Generating production config...' && \
        cd /app && \
        node public/generate-config.js && \
        echo 'Config generated successfully'; \
    fi && \
    echo 'Starting Spring Boot server...' && \
    exec java -Djava.library.path=/usr/local/lib:/app/lib/native/linux -jar /app/server.jar \
"]