package com.app.main.root.app._data;
import com.app.main.root.app._service.ServiceManager;
import com.app.main.root.app.EventTracker;
import com.app.main.root.app.EventLog.EventDirection;
import com.app.main.root.app._server.ConnectionTracker;
import com.app.main.root.app._server.ConnectionInfo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class EventList {
    private final ServiceManager serviceManager;
    private final EventTracker eventTracker;
    private final ConnectionTracker connectionTracker;
    private final SocketMethods socketMethods;
    private final SimpMessagingTemplate messagingTemplate;

    public EventList(
        ServiceManager serviceManager,
        EventTracker eventTracker,
        SimpMessagingTemplate messagingTemplate,
        ConnectionTracker connectionTracker,
        SocketMethods socketMethods
    ) {
        this.eventTracker = eventTracker;
        this.serviceManager = serviceManager;
        this.messagingTemplate = messagingTemplate;
        this.connectionTracker = connectionTracker;
        this.socketMethods = socketMethods;
    }

    public Map<String, EventConfig> list() {
        Map<String, EventConfig> configs = new HashMap<>();

        /* Socket Id */
        configs.put("get-socket-id", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                long time = System.currentTimeMillis();

                eventTracker.track(
                    "get-socket-id",
                    payload,
                    EventDirection.RECEIVED,
                    sessionId,
                    sessionId
                );

                Map<String, Object> res = new HashMap<>();
                res.put("socketId", sessionId);
                res.put("timestamp", time);
                res.put("status", "success");
                return res;
            },
            "/queue/socket-id",
            false
        ));
        /* New User */
        configs.put("new-user", new EventConfig(
            (sessionId, payload, headerAccess) -> {
                long time = System.currentTimeMillis();
                Map<String, Object> data = (Map<String, Object>) payload;
                String username = (String) data.get("username");
                String userId = (String) data.get("userId");

                eventTracker.track(
                    "new-user",
                    username,
                    EventDirection.RECEIVED,
                    sessionId,
                    username
                );
                connectionTracker.updateUsername(sessionId, username);

                try {
                    serviceManager.getUserService().addUser(userId, username, sessionId);
                    ConnectionInfo connectionInfo = connectionTracker.getConnection(sessionId);
                    if(connectionInfo != null) connectionTracker.logUsernameSet(connectionInfo, username);
                    serviceManager.getUserService().linkUserSession(userId, sessionId);
                } catch(Exception err) {
                    System.out.println("Failed to add user: " + err.getMessage());
                }

                Map<String, Object> res = new HashMap<>();
                res.put("type", "USER_JOINED");
                res.put("userId", userId);
                res.put("username", username);
                res.put("sessionId", sessionId);
                res.put("timestamp", time);
                return res;
            },
            "/topic/user",
            true
        ));
        /* User Id */
        configs.put("get-user-id", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                long time = System.currentTimeMillis();
                String userId = serviceManager.getUserService().getUserIdBySession(sessionId);

                eventTracker.track(
                    "get-user-id",
                    payload,
                    EventDirection.RECEIVED,
                    sessionId,
                    sessionId
                );

                Map<String, Object> res = new HashMap<>();
                res.put("userId", userId);
                res.put("timestamp", time);
                res.put("status", "success");
                return res;
            },
            "/queue/user-id",
            false
        ));
        /* Get Username */
        configs.put("get-username", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                long time = System.currentTimeMillis();
                String username = serviceManager.getUserService().getUsernameBySessionId(sessionId);

                eventTracker.track(
                    "get-username",
                    payload,
                    EventDirection.RECEIVED,
                    sessionId,
                    sessionId
                );

                Map<String, Object> res = new HashMap<>();
                res.put("username", username);
                res.put("timestamp", time);
                res.put("status", "success");
                return res;
            },
            "/queue/username",
            false
        ));
        /* Get Decrypted Files */
        configs.put("get-decrypted-files", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                try {
                    return null;
                } catch(Exception err) {
                    err.printStackTrace();
                    Map<String, Object> errRes = new HashMap<>();
                    errRes.put("error", "LOAD_DECRYPTED_FILES_FAILED");
                    errRes.put("message", err.getMessage());
                    socketMethods.send(sessionId, "/queue/decrypted-files-err", errRes);
                    return Collections.emptyMap();
                }
            },
            "/queue/decrypted-files-scss",
            false
        ));
        /* Request Password Reset */
        configs.put("request-password-reset", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                try {
                    System.out.println("=== Password Reset Request Received ===");
                    System.out.println("Session ID: " + sessionId);
                    Map<String, Object> data = (Map<String, Object>) payload;
                    String email = (String) data.get("email");
                    System.out.println("Email: " + email);

                    Map<String, Object> res = serviceManager
                        .getPasswordResetService()
                        .requestPasswordReset(email);

                    System.out.println("Password Reset Service Result: " + res);
                    
                    socketMethods.send(
                        sessionId, 
                        "/queue/password-reset-request-scss", 
                        res
                    );
                    eventTracker.track(
                        "request-password-reset",
                        Map.of(
                            "email", email,
                            "success",
                            res.get("success")
                        ),
                        EventDirection.RECEIVED,
                        sessionId,
                        "system"
                    );

                    return res;
                } catch(Exception err) {
                    System.err.println("Password Reset Request Error: " + err.getMessage());
                    err.printStackTrace();
                    
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("error", "PASSWORD_RESET_REQUEST_FAILED");
                    error.put("message", err.getMessage());
                    
                    socketMethods.send(sessionId, "/queue/password-reset-request-scss", error);
                    return Collections.emptyMap();
                }
            },
            "/queue/password-reset-request-scss",
            false
        ));
        /* Validate Reset Token */
        configs.put("validate-reset-token", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                try {
                    Map<String, Object> data = (Map<String, Object>) payload;
                    String token = (String) data.get("token");

                    Map<String, Object> res = serviceManager
                        .getPasswordResetService()
                        .validateResetToken(token);

                    socketMethods.send(
                        sessionId, 
                        "/queue/token-validation-scss", 
                        res
                    );
                    eventTracker.track(
                        "validate-reset-token",
                        Map.of(
                            "token", token.substring(0, 8) + "...", 
                            "valid", 
                            res.get("valid")
                        ),
                        EventDirection.RECEIVED,
                        sessionId,
                        "system"
                    );

                    return res;
                } catch(Exception err) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "TOKEN_VALIDATION_FAILED");
                    error.put("message", err.getMessage());
                    socketMethods.send(sessionId, "/queue/token-validation-err", error);
                    return Collections.emptyMap();
                }
            },
            "/queue/token-validation-scss",
            false
        ));
        /* Reset Password */
        configs.put("reset-password", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                try {
                    Map<String, Object> data = (Map<String, Object>) payload;
                    String token = (String) data.get("token");
                    String newPassword = (String) data.get("newPassword");

                    Map<String, Object> res = serviceManager
                        .getPasswordResetService()
                        .resetPassword(token, newPassword);

                    socketMethods.send(
                        sessionId, 
                        "/queue/password-reset-scss", 
                        res
                    );
                    eventTracker.track(
                        "reset-password",
                        Map.of(
                            "token", token.substring(0, 8) + "...", 
                            "success", 
                            res.get("success")
                        ),
                        EventDirection.RECEIVED,
                        sessionId,
                        "system"
                    );

                    return res;
                } catch(Exception err) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "PASSWORD_RESET_FAILED");
                    error.put("message", err.getMessage());
                    socketMethods.send(sessionId, "/queue/password-reset-err", error);
                    return Collections.emptyMap();
                }
            },
            "/queue/password-reset-scss",
            false
        ));

        return configs;
    }
}