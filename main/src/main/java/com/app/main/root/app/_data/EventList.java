package com.app.main.root.app._data;
import com.app.main.root.app._service.ServiceManager;
import com.app.main.root.app.EventTracker;
import com.app.main.root.app._crypto.message_encoder.SecureMessageService;
import com.app.main.root.app.EventLog.EventDirection;
import com.app.main.root.app._server.ConnectionTracker;
import com.app.main.root.app._server.ConnectionInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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
    @Autowired @Lazy private SecureMessageService secureMessageService;

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
        /* Get Decrypted Messages */
        configs.put("get-decrypted-messages", new EventConfig(
            (sessionId, payload, headerAccessor) -> {
                try {
                    Map<String, Object> data = (Map<String, Object>) payload;
                    List<Map<String, Object>> encryptedMessages = (List<Map<String, Object>>) data.get("messages");
                    String chatId = (String) data.get("chatId");
                    List<Map<String, Object>> decryptedMessages = new ArrayList<>();
                    
                    for (Map<String, Object> encryptedMessage : encryptedMessages) {
                        Map<String, Object> decryptedMessage = new HashMap<>(encryptedMessage);
                        
                        if (encryptedMessage.containsKey("contentBytes")) {
                            Object contentBytesObj = encryptedMessage.get("contentBytes");
                            byte[] contentBytes;
                            
                            if (contentBytesObj instanceof String) {
                                String base64Content = (String) contentBytesObj;
                                contentBytes = Base64.getDecoder().decode(base64Content);
                            } else if (contentBytesObj instanceof byte[]) {
                                contentBytes = (byte[]) contentBytesObj;
                            } else {
                                throw new IllegalArgumentException("err");
                            }
                            
                            String decryptedContent = secureMessageService.decryptMessage(chatId, contentBytes);
                            decryptedMessage.put("content", decryptedContent);
                        }
                        
                        decryptedMessages.add(decryptedMessage);
                    }
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("messages", decryptedMessages);
                    return response;
                } catch(Exception err) {
                    err.printStackTrace();
                    Map<String, Object> errRes = new HashMap<>();
                    errRes.put("error", "LOAD_DECRYPTED_MESSAGES_FAILED");
                    errRes.put("message", err.getMessage());
                    socketMethods.send(sessionId, "/queue/decrypted-messages-err", errRes);
                    return Collections.emptyMap();
                }
            },
            "/queue/decrypted-messages-scss",
            false
        ));

        return configs;
    }
}