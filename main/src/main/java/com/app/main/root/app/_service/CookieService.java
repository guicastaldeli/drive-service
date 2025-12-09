package com.app.main.root.app._service;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.Optional;
import com.app.main.root.EnvConfig;

@Service
public class CookieService {
    private String webUrl = EnvConfig.get("WEB_URL");
    public String sessionIdKey = "SESSION_ID";
    public String userInfoKey = "USER_INFO";
    public String sessionStatusKey = "SESSION_STATUS";

    @Value("${cookie.domain:localhost}")
    private String cookieDomain;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    /*
    ** Get Cookie Value
    */
    public Optional<String> getCookieValue(HttpServletRequest request, String name) {
        if(request.getCookies() == null) return Optional.empty();

        return Arrays.stream(request.getCookies())
            .filter(cookie -> name.equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst();
    }

    /*
    ** Create Cookie
    */
    public Cookie createCookie(String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        if(!cookieDomain.equals(webUrl)) {
            cookie.setDomain(cookieDomain);
        }
        return cookie;
    }

    public Cookie createClientCookie(String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(false);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        if(!cookieDomain.equals(webUrl)) {
            cookie.setDomain(cookieDomain);
        } 
        return cookie;
    }

    /*
    ** Delete Cookie
    */
    public void deleteCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, null);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        if(!cookieDomain.equals(webUrl)) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    public void deleteClientCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, null);
        cookie.setHttpOnly(false);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        if(!cookieDomain.equals(webUrl)) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    /*
    **
    *** Auth Cookies
    **
    */
    public void setAuthCookies(
        HttpServletResponse response,
        String sessionId,
        String userId,
        String username,
        boolean remember
    ) {
        int rememberRes = remember ? 7 * 24 * 60 * 60 : 30 * 60;
        String userRes = String.format("{\"userId\":\"%s\",\"username\":\"%s\"}", userId, username);

        Cookie sessionCookie = createCookie(
            sessionIdKey,
            sessionId,
            rememberRes
        );
        response.addCookie(sessionCookie);

        Cookie userCookie = createClientCookie(
            userInfoKey,
            userRes,
            rememberRes
        );
        response.addCookie(userCookie);

        Cookie statusCookie = createClientCookie(
            sessionStatusKey,
            "active",
            rememberRes
        );
        response.addCookie(statusCookie);
    }

    public void clearAuthCookies(HttpServletResponse response) {
        deleteCookie(response, "SESSION_ID");
        deleteCookie(response, "USER_INFO");
        deleteClientCookie(response, "SESSION_STATUS");
    }
}
