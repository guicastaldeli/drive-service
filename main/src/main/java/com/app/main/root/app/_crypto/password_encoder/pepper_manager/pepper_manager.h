#pragma once
#include "../hash_generator/hash_generator.h"
#include <stdbool.h>

typedef struct {
    ByteArray pepper;
    char* filePath;
} PepperManager;

#define PEPPER_LENGTH 32

PepperManager* createPepperManager();
PepperManager* createPepperManagerWithPath(const char* path);
void destroyPepperManager(PepperManager* manager);

void loadOrGeneratePepper(PepperManager* manager);
ByteArray getPepper(const PepperManager* manager);
ByteArray applyPepper(const PepperManager* manager, const char* password);