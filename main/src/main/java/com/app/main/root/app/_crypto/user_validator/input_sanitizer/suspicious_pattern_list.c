#include "suspicious_pattern_list.h"

static const char* const PATTERN_LIST[] = {
    "<script",
    "javascript:",
    "onerror=",
    "onclick=",
    "onload=",
    "DROP TABLE",
    "INSERT INTO",
    "DELETE FROM",
    "SELECT * FROM",
    "UNION SELECT",
    "OR 1=1",
    "../",
    "..\\",
    "%2e%2e",
    "eval(",
    "exec("
};

const SuspiciousPatternList SUSPICIOUS_PATTERN_LIST = {
    .patterns = PATTERN_LIST,
    .count = 16
};