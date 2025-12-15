#include "suspicious_pattern_list.h"

static const char* const PATTERN_LIST[] = {
    "<script", 
    "javascript:", 
    "onload=", 
    "onerror=", 
    "onclick=",
    "eval(", 
    "exec(", 
    "union select", 
    "drop table", 
    "insert into",
    "1=1", 
    "or 1=1",
    "--", 
    "/*", 
    "*/", 
    "waitfor delay"
};

static const size_t PATTERN_COUNT = sizeof(PATTERN_LIST) / sizeof(PATTERN_LIST[0]);

const SuspiciousPatternList SUSPICIOUS_PATTERN_LIST = {
    .patterns = PATTERN_LIST,
    .count = PATTERN_COUNT
};