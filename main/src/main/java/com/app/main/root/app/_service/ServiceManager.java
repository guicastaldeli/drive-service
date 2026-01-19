package com.app.main.root.app._service;
import com.app.main.root.app._auth.TokenService;
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
    private final SessionService sessionService;
    private final TokenService tokenService;
    private final CookieService cookieService;
    private final FileService fileService;
    private final PasswordResetService passwordResetService;

    public ServiceManager(
        DbService dbService,
        UserService userService,
        @Lazy EmailService emailService,
        @Lazy SessionService sessionService,
        @Lazy TokenService tokenService,
        @Lazy CookieService cookieService,
        @Lazy FileService fileService,
        @Lazy PasswordResetService passwordResetService
    ) {
        this.dbService = dbService;
        this.userService = userService;
        this.emailService = emailService;
        this.sessionService = sessionService;
        this.tokenService = tokenService;
        this.cookieService = cookieService;
        this.fileService = fileService;
        this.passwordResetService = passwordResetService;
    }

    /**
     * Db Service
     */
    public DbService getDbService() {
        return dbService;
    }

    /**
     * User Service
     */
    public UserService getUserService() {
        return userService;
    }

    /**
     * Email Service
     */
    public EmailService getEmailService() {
        return emailService;
    }

    /**
     * Session Service
     */
    public SessionService getSessionService() {
        return sessionService;
    }

    /**
     * Token Service
     */
    public TokenService getTokenService() {
        return tokenService;
    }

    /**
     * Cookie Service
     */
    public CookieService getCookieService() {
        return cookieService;
    }

    /**
     * File Service
     */
    public FileService getFileService() {
        return fileService;
    }

    /**
     * Password Reset
     */
    public PasswordResetService getPasswordResetService() {
        return passwordResetService;
    }
}