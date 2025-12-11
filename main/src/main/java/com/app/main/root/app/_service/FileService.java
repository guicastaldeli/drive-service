package com.app.main.root.app._service;
import com.app.main.root.app._db.CommandQueryManager;
import com.app.main.root.app._db.DbManager;
import org.springframework.stereotype.Service;
import com.app.main.root.app._crypto.message_encoder.MessageEncoderWrapper;
import com.app.main.root.app._data.FileDownloader;
import com.app.main.root.app._data.FileUploader;
import com.app.main.root.app._data.MimeToDb;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@Service
public class FileService {

    private final MessageEncoderWrapper messageEncoderWrapper;
    private final Map<String, JdbcTemplate> jdbcTemplates;
    private final DbManager dbManager;
    private final ServiceManager serviceManager;

    private FileUploader fileUploader;
    private FileDownloader fileDownloader;

    private static final String METADATA_DB = "files_metadata";
    public static final String IMAGE_DB = "image_data";
    public static final String VIDEO_DB = "video_data";
    public static final String AUDIO_DB = "audio_data";
    public static final String DOCUMENT_DB = "document_data";

    public FileService(
        Map<String, JdbcTemplate> jdbcTemplates,
        @Lazy ServiceManager serviceManager,
        @Lazy DbManager dbManager
    , MessageEncoderWrapper messageEncoderWrapper) {
        this.jdbcTemplates = jdbcTemplates;
        this.serviceManager = serviceManager;
        this.dbManager = dbManager;
        
        this.fileUploader = new FileUploader(this, jdbcTemplates);
        this.fileDownloader = new FileDownloader(this, jdbcTemplates);
        this.messageEncoderWrapper = messageEncoderWrapper;
    }

    /**
     * List Files
     */
    public List<Map<String, Object>> listFiles(
        String userId,
        String parentFolderId,
        int page,
        int pageSize
    ) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        String query = CommandQueryManager.GET_ALL_FILES.get();
        List<Map<String, Object>> files = metadataTemplate.queryForList(
            query,
            userId,
            parentFolderId,
            pageSize,
            (page - 1) * pageSize
        );
        return files;
    }

    /**
     * Get Storage Usage
     */
    public Map<String, Object> getStorageUsage(String userId) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        Map<String, Object> usage = new HashMap<>();
        String totalSizeQuery = CommandQueryManager.GET_FILE_SIZE.get();
        Long totalSize = metadataTemplate.queryForObject(
            totalSizeQuery,
            Long.class,
            userId
        );

        String countQuery = CommandQueryManager.GET_TOTAL_FILES.get();
        Integer totalFiles = metadataTemplate.queryForObject(
            countQuery,
            Integer.class,
            userId
        );

        String typeQuery = CommandQueryManager.GET_TYPE_FILES.get();
        List<Map<String, Object>> types = metadataTemplate.queryForList(
            typeQuery,
            userId
        );

        usage.put("total_size", totalSize != null ? totalSize : 0);
        usage.put("total_files", totalFiles != null ? totalFiles : 0);
        usage.put("types", types);
        return usage;
    }

    /**
     * Delete File
     */
    public boolean deleteFile(String fileId, String userId) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        String query = CommandQueryManager.DELETE_FILE.get();
        int rowsAffected = metadataTemplate.update(
            query,
            fileId,
            userId
        );
        return rowsAffected > 0;
    }

    /**
     * Count Files
     */
    private int countFiles(String userId) {
        int total = 0;
        for(String dbName : jdbcTemplates.keySet()) {
            String query = CommandQueryManager.GET_TOTAL_FILES.get();
            Integer count = jdbcTemplates
                .get(dbName)
                .queryForObject(
                    query,
                    Integer.class,
                    userId
                );
            total += count != null ? count : 0;
        }
        return total;
    }

    /**
     * Get Database for Mime Type
     */
    public String getDatabaseForMimeType(String type) {
        return MimeToDb.List.getOrDefault(type, DOCUMENT_DB);
    }

    /* Get File Uploader */
    public FileUploader getFileUploader() {
        return fileUploader;
    }

    /* Get File Downloader */
    public FileDownloader getFileDownloader() {
        return fileDownloader;
    }

    /**
     * Find File Database
     */
    public String findFileDatabase(String fileId, String userId) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        String query = CommandQueryManager.GET_DB_NAME_FILES.get();
        try {
            String dbName = metadataTemplate.queryForObject(
                query,
                String.class,
                fileId,
                userId 
            );
            return dbName;
        } catch (Exception err) {
            System.out.println("Could not find database for file " + fileId + ": " + err.getMessage());
            return null;
        }
    }
}
