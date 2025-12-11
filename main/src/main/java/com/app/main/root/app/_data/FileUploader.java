package com.app.main.root.app._data;
import java.io.IOException;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.multipart.MultipartFile;
import com.app.main.root.app._db.CommandQueryManager;
import com.app.main.root.app._service.FileService;

public class FileUploader {
    private final FileService fileService;
    private final Map<String, JdbcTemplate> jdbcTemplates;

    private String fileId;
    private String fileName;
    private long size;
    private String mimeType;
    private String fileType;
    private String database;
    private LocalDateTime uploadedAt;

    public FileUploader(FileService fileService, Map<String, JdbcTemplate> jdbcTemplates) {
        this.fileService = fileService;
        this.jdbcTemplates = jdbcTemplates;
    } 

    /**
     * Upload File
     */
    public FileUploader upload(
        String userId,
        MultipartFile file,
        String parentFolderId
    ) throws SQLException {
        try {
            String query = CommandQueryManager.UPLOAD_FILE.get();

            String fileId = generateFileId();
            String originalFileName = file.getOriginalFilename();
            String mimeType = file.getContentType();
            long fileSize = file.getSize();
            
            String fileType = getFileType(mimeType);
            String targetDb = fileService.getDatabaseForMimeType(mimeType);
            JdbcTemplate jdbcTemplate = jdbcTemplates.get(targetDb);
            if (jdbcTemplate == null) {
                throw new SQLException("No database configured for type: " + targetDb);
            }
            jdbcTemplate.update(
                query,
                fileId,
                userId,
                originalFileName,
                fileSize,
                fileType,
                targetDb,
                parentFolderId
            );
    
            byte[] fileBytes = file.getBytes();
            insertFileContent(
                targetDb, 
                fileId, 
                fileBytes, 
                mimeType
            );
            
            /*
            generateThumbnail(targetDb, fileId, fileBytes, mimeType);
            extractDocMetadata(targetDb, fileId, fileBytes, mimeType);
            */
    
            FileUploader res = this;
            res.setFileId(fileId);
            res.setFileName(originalFileName);
            res.setSize(fileSize);
            res.setMimeType(mimeType);
            res.setFileType(fileType);
            res.setDatabase(targetDb);
            res.setUploadedAt(LocalDateTime.now());
            return res;
        } catch(IOException err) {
            err.printStackTrace();
            System.out.println(err);
            return null;
        }
    }

    /**
     * Insert File Content
     */
    private void insertFileContent(
        String dbType,
        String fileId,
        byte[] content,
        String mimeType
    ) {
        String query = "";
        switch(dbType) {
            case "image_data":
                query = CommandQueryManager.ADD_IMAGE.get();
                break;
            case "video_data":
                query = CommandQueryManager.ADD_VIDEO.get();
                break;
            case "audio_data":
                query = CommandQueryManager.ADD_AUDIO.get();
                break;
            case "document_data":
                query = CommandQueryManager.ADD_DOCUMENT.get();
                break;
            default:
                query = CommandQueryManager.ADD_DOCUMENT.get();
        }

        jdbcTemplates.get(dbType).update(query, fileId, content);
    }

    /**
     * Get File Type
     */
    public String getFileType(String type) {
        if(type.startsWith("image/")) return "image";
        if(type.startsWith("video/")) return "video";
        if(type.startsWith("audio/")) return "audio";
        if(type.startsWith("text/")) return "document";
        if(
            type.contains("pdf") ||
            type.contains("document")
        ) {
            return "document";
        }
        if(
            type.contains("zip") || 
            type.contains("rar")
        ) {
            return "archive";
        }
        return "other";
    }

    /**
     * Generate File Id
     */
    private String generateFileId() {
        String rand = UUID.randomUUID().toString();
        return rand;
    }

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
    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
}
