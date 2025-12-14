package com.app.main.root.app._data;
import com.app.main.root.app._crypto.file_encoder.FileEncoderWrapper;
import com.app.main.root.app._crypto.file_encoder.KeyManagerService;
import com.app.main.root.app._db.CommandQueryManager;
import com.app.main.root.app._service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class FileUploader {
    private final FileService fileService;
    private final Map<String, JdbcTemplate> jdbcTemplates;
    @Autowired @Lazy private FileEncoderWrapper fileEncoderWrapper;
    @Autowired @Lazy private KeyManagerService keyManagerService;

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
            LocalDateTime uploadedAt = LocalDateTime.now();
            
            String fileType = getFileType(mimeType);
            String targetDb = fileService.getDatabaseForMimeType(mimeType);

            System.out.println("DEBUG: Uploading file:");
            System.out.println("  fileId: " + fileId);
            System.out.println("  userId: " + userId);
            System.out.println("  originalFileName: " + originalFileName);
            System.out.println("  fileSize: " + fileSize);
            System.out.println("  mimeType: " + mimeType);
            System.out.println("  fileType: " + fileType);
            System.out.println("  targetDb: " + targetDb);
            System.out.println("  parentFolderId: " + parentFolderId);
            System.out.println("  uploadedAt: " + uploadedAt);
            
            JdbcTemplate metadataTemplate = jdbcTemplates.get("files_metadata");
                if (metadataTemplate == null) {
                System.err.println("ERROR: No files_metadata database configured");
                throw new SQLException("No files_metadata database configured");
            }
            JdbcTemplate jdbcTemplate = jdbcTemplates.get(targetDb);
            if (jdbcTemplate == null) {
                System.err.println("ERROR: No database configured for type: " + targetDb);
                throw new SQLException("No database configured for type: " + targetDb);
            }

            byte[] encryptionKey = FileEncoderWrapper.generateKey(32);
            fileEncoderWrapper.initEncoder(encryptionKey, FileEncoderWrapper.EncryptionAlgorithm.AES_256_GCM);
            byte[] fileBytes = file.getBytes();
            byte[] encryptedContent = fileEncoderWrapper.encrypt(fileBytes);

            metadataTemplate.update(
                query,
                fileId,
                userId,
                originalFileName,
                fileSize,
                mimeType,
                fileType, 
                targetDb,
                parentFolderId,
                uploadedAt
            );
            insertFileContent(
                targetDb, 
                fileId, 
                encryptedContent, 
                mimeType
            );
            keyManagerService.storeKey(fileId, userId, encryptionKey);
            
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
        String query;
        switch(dbType) {
            case FileService.IMAGE_DB:
                query = CommandQueryManager.ADD_IMAGE.get();
                break;
            case FileService.VIDEO_DB:
                query = CommandQueryManager.ADD_VIDEO.get();
                break;
            case FileService.AUDIO_DB:
                query = CommandQueryManager.ADD_AUDIO.get();
                break;
            case FileService.DOCUMENT_DB:
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
    public String getFileType(String mimeType) {
        if (mimeType == null) {
            return "other";
        }

        String lowerMime = mimeType.toLowerCase();
        if (lowerMime.startsWith("image/")) {
            return "image";
        } else if (lowerMime.startsWith("video/")) {
            return "video";
        } else if (lowerMime.startsWith("audio/")) {
            return "audio";
        } else if (lowerMime.startsWith("text/")) {
            return "document";
        } else if (lowerMime.contains("pdf") || 
                lowerMime.contains("document") || 
                lowerMime.contains("msword") ||
                lowerMime.contains("officedocument")) {
            return "document";
        } else if (lowerMime.contains("zip") || 
                lowerMime.contains("rar") || 
                lowerMime.contains("compressed")) {
            return "document";
        } else {
            return "other";
        }
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
