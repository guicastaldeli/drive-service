package com.app.main.root.app._service;
import com.app.main.root.app._db.DbService;
import com.app.main.root.app.main.email_service.EmailService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Service
@Component
public class ServiceManager {
    private final DbService dbService;
    private final UserService userService;
    private final EmailService emailService;

    public ServiceManager(
        DbService dbService,
        UserService userService,
        @Lazy EmailService emailService
    ) {
        this.dbService = dbService;
        this.userService = userService;
        this.emailService = emailService;
    }

    /*
    * Db Service 
    */
    public DbService getDbService() {
        return dbService;
    }

    /*
    * User Service 
    */
    public UserService getUserService() {
        return userService;
    }

    /*
    * Email Service 
    */
    public EmailService getEmailService() {
        return emailService;
    }
}