package com.app.main.root.app._service;
import com.app.main.root.app._db.DbManager;
import org.springframework.stereotype.Service;
import com.app.main.root.app._data.FileDownloader;
import com.app.main.root.app._data.FileUploader;
import com.app.main.root.app._data.MimeToDb;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@Service
public class FileService {
    private final Map<String, JdbcTemplate> jdbcTemplates;
    private final DbManager dbManager;
    private final ServiceManager serviceManager;

    private FileUploader fileUploader;
    private FileDownloader fileDownloader;

    public FileService(
        Map<String, JdbcTemplate> jdbcTemplates,
        @Lazy ServiceManager serviceManager,
        @Lazy DbManager dbManager
    ) {
        this.jdbcTemplates = jdbcTemplates;
        this.serviceManager = serviceManager;
        this.dbManager = dbManager;
        
        this.fileUploader = new FileUploader(this, jdbcTemplates);
        this.fileDownloader = new FileDownloader(this, jdbcTemplates);
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
        List<Map<String, Object>> allFiles = new ArrayList<>();
        for(String dbName : jdbcTemplates.keySet()) {
            String query = "";
            List<Map<String, Object>> files = jdbcTemplates
                .get(dbName)
                .queryForList(
                    query,
                    userId,
                    parentFolderId,
                    pageSize,
                    (page - 1) * pageSize
                );

            files.forEach(f -> f.put("database", dbName));
            allFiles.addAll(files);
        }
        return allFiles;
    }

    /**
     * Get Storage Usage
     */
    public Map<String, Object> getStorageUsage(String userId) {
        Map<String, Object> usage = new HashMap<>();
        long totalSize = 0;

        for(String dbName : jdbcTemplates.keySet()) {
            String query = "";
            Long dbSize = jdbcTemplates.get(dbName).queryForObject(
                query, 
                Long.class, 
                userId
            );
            if(dbSize != null) {
                usage.put(dbName + "_size", dbSize);
                totalSize += dbSize;
            }
        }

        usage.put("total_size", totalSize);
        usage.put("total_files", countFiles(userId));
        return usage;
    }

    /**
     * Delete File
     */
    public boolean deleteFile(String fileId, String userId) {
        boolean deleted = false;
        for(String dbName : jdbcTemplates.keySet()) {
            String query = "";
            int rowsAffected = jdbcTemplates
                .get(dbName)
                .update(
                    query,
                    fileId,
                    userId
                );
            if(rowsAffected > 0) deleted = true;
        }
        return deleted;
    }

    /**
     * Count Files
     */
    private int countFiles(String userId) {
        int total = 0;
        for(String dbName : jdbcTemplates.keySet()) {
            String query = "";
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
        return MimeToDb.List.getOrDefault(type, "documents");
    }

    /* Get File Uploader */
    public FileUploader getFileUploader() {
        return fileUploader;
    }

    /* Get File Downloader */
    public FileDownloader getFileDownloader() {
        return fileDownloader;
    }
}
