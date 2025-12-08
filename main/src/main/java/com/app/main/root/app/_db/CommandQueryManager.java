package com.app.main.root.app._db;

public enum CommandQueryManager {
    /*
    * ~~~ CONFIG ~~~ 
    */
    VALIDATE_DATABASE(
        "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1"
    ),

    /*
    * ~~~ USER SERVICE ~~~ 
    */
    ADD_USER(
        "INSERT OR IGNORE INTO users (id, username, session_id) VALUES (?, ?, ?)"
    ),
    GET_USER_BY_ID(
        "SELECT * FROM users WHERE id = ?"
    ),
    GET_USER_BY_USERNAME(
        "SELECT * FROM users WHERE username = ?"
    ),
    GET_USERNAME(
        "SELECT username FROM users WHERE id = ?"
    ),
    GET_USER_BY_EMAIL(
        "SELECT * FROM users WHERE email = ?"
    ),
    GET_ALL_USERS(
        "SELECT * FROM users ORDER BY created_at DESC"
    ),
    REGISTER_USER(
        """
            INSERT INTO users (id, username, email, password_hash, session_id)
            VALUES (?, ?, ?, ?, ?)        
        """
    ),
    CREATE_USER_PROFILE(
        "INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)"
    ),
    LOGIN_USER(
        """
            SELECT id, username, email, password_hash, is_active FROM users
            WHERE (email = ?) AND is_active = TRUE
        """
    ),
    UPDATE_USER_SESSION(
        "UPDATE users SET session_id = ?, last_login = ? WHERE id = ?"
    ),
    UPDATE_LAST_LOGIN(
        "UPDATE users SET last_login = ? WHERE id = ?"
    ),
    GET_USER_PROFILE(
        "SELECT * FROM user_profiles where user_id = ?"
    );

    /* Main */
    private String query;

    CommandQueryManager(String query) {
        this.query = query;
    }

    public String get() {
        return query;
    }
}