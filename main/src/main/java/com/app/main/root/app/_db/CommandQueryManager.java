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
    ),

    /*
    * ~~~ FILES METADATA ~~~ 
    */
    UPLOAD_FILE(
        """
            INSERT INTO files_metadata(
                file_id,
                user_id,
                original_filename,
                file_size,
                mime_type,
                file_type,
                database_name,
                parent_folder_id,
                uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    ),
    DOWNLOAD_FILE(
        """
            SELECT 
                mime_type,
                file_type,
                database_name
            FROM
                files_metadata
            WHERE
                file_id = ? AND
                user_id = ? AND
                is_deleted = FALSE             
        """
    ),
    GET_ALL_FILES(
        """
            SELECT
                file_id, 
                original_filename, 
                file_size, 
                mime_type,
                file_type,
                parent_folder_id,
                uploaded_at,
                last_modified
            FROM
                files_metadata
            WHERE
                user_id = ? AND
                parent_folder_id = ? AND
                is_deleted = FALSE
            ORDER BY
                last_modified DESC
            LIMIT ? OFFSET ?     
        """
    ),
    GET_FILE_SIZE(
        "SELECT SUM(file_size) as total FROM files_metadata WHERE user_id = ? AND is_deleted = FALSE"
    ),
    GET_TOTAL_FILES(
        "SELECT COUNT(*) FROM files_metadata WHERE user_id = ? AND is_deleted = FALSE"
    ),
    GET_TOTAL_FILES_FOLDER(
        "SELECT COUNT(*) from files_metadata WHERE user_id = ? AND parent_folder_id = ? AND is_deleted = FALSE"
    ),
    DELETE_FILE(
        """
           UPDATE files_metadata
           SET is_deleted = TRUE
           WHERE file_id = ? AND user_id = ?
        """
    ),
    GET_FILE_DATABASE(
        "SELECT 1 FROM files_metadata WHERE file_id = ? AND user_id = ?"
    ),
    GET_TYPE_FILES(
        """
            SELECT file_type, SUM(file_size) as type_size, COUNT(*) as type_count
            FROM files_metadata WHERE user_id = ? AND is_deleted = FALSE
            GROUP BY file_type     
        """
    ),
    GET_DB_NAME_FILES(
        "SELECT database_name FROM files_metadata WHERE file_id = ? AND user_id = ?"
    ),
    GET_FILE_INFO(
        """
            SELECT
                file_id,
                original_filename,
                file_size,
                mime_type,
                file_type,
                parent_folder_id,
                database_name,
                uploaded_at,
                last_modified
            FROM files_metadata
            WHERE file_id = ? AND user_id = ? AND is_deleted = FALSE     
        """
    ),

    /*
    * ~~~ IMAGE DATA ~~~ 
    */
    ADD_IMAGE(
        "INSERT INTO image_data(file_id, content) VALUES (?, ?)"
    ),
    GET_IMAGE(
        "SELECT content FROM image_data WHERE file_id = ?"
    ),

    /*
    * ~~~ VIDEO DATA ~~~ 
    */
    ADD_VIDEO(
        "INSERT INTO video_data(file_id, content) VALUES (?, ?)"
    ),
    GET_VIDEO(
        "SELECT content FROM video_data WHERE file_id = ?"
    ),

    /*
    * ~~~ AUDIO DATA ~~~ 
    */
    ADD_AUDIO(
        "INSERT INTO audio_data(file_id, content) VALUES (?, ?)"
    ),
    GET_AUDIO(
        "SELECT content FROM audio_data WHERE file_id = ?"
    ),

    /*
    * ~~~ DOCUMENT DATA ~~~ 
    */
    ADD_DOCUMENT(
        "INSERT INTO document_data(file_id, content) VALUES (?, ?)"
    ),
    GET_DOCUMENT(
        "SELECT content FROM document_data WHERE file_id = ?"
    ),

    /*
    * ~~~ KEY SERVICE ~~~ 
    */
    STORE_KEY(
        """
            INSERT INTO file_encryption_keys (file_id, file_id_hash, user_id, encrypted_key, created_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE encrypted_key = ?, updated_at = NOW()
        """
    ),
    RETRIEVE_KEY(
        "SELECT encrypted_key FROM file_encryption_keys WHERE file_id = ? AND user_id = ?"
    ),
    DELETE_KEY(
        "DELETE FROM file_encryption_keys WHERE file_id = ? AND user_id = ?"
    ),
    KEY_EXISTS(
        "SELECT COUNT(*) as count FROM file_encryption_keys WHERE file_id = ? AND user_id = ?"
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