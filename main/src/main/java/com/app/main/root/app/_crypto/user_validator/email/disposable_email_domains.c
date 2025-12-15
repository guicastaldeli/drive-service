#include "disposable_email_domains.h"

static const char* const DOMAIN_LIST[] = {
    "tempmail.com", 
    "guerrillamail.com", 
    "mailinator.com", 
    "10minutemail.com",
    "throwawaymail.com", 
    "yopmail.com", 
    "fakeinbox.com", 
    "trashmail.com",
    "temp-mail.org", 
    "getairmail.com", 
    "sharklasers.com", 
    "grr.la"
};

static const size_t DOMAIN_COUNT = sizeof(DOMAIN_LIST) / sizeof(DOMAIN_LIST[0]);

const DisposableEmailDomains DISPOSABLE_EMAIL_DOMAINS = {
    .domains = DOMAIN_LIST,
    .count = DOMAIN_COUNT
};