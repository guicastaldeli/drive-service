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

const DisposableEmailDomains DISPOSABLE_EMAIL_DOMAINS = {
    .domains = DOMAIN_LIST,
    .count = 10
};