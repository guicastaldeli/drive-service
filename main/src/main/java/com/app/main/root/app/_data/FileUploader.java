package com.app.main.root.app._data;
import java.time.LocalDateTime;

public class FileUploader {
    private String fileId;
    private String fileName;
    private long size;
    private String mimeType;
    private String fileType;
    private String database;
    private LocalDateTime uploadedAt;

    /* File Id */
    public void setFileId(String id) {
        this.fileId = id;
    }
    public String getFileId() {
        return fileId;
    }

    /* File Name */
    public void setFileName(String name) {
        this.fileName = name;
    }
    public String getFileName() {
        return fileName;
    }

    /* Size */
    public void setSize(long size) {
        this.size = size;
    }
    public long getSize() {
        return size;
    }

    /* Mime Type */
    public void setMimeType(String type) {
        this.mimeType = type;
    }
    public String getMimeType() {
        return mimeType;
    }

    /* File Type */
    public void setFileType(String type) {
        this.fileType = type;
    }
    public String getFileType() {
        return fileType;
    }

    /* Database */
    public void setDatabase(String db) {
        this.database = db;
    }
    public String getDatabase() {
        return database;
    }

    /* Uploaded At */
    public void setUploadedAt(LocalDateTime date) {
        this.uploadedAt = date;
    }
    public LocalDateTime setUploadedAt() {
        return uploadedAt;
    }

}
