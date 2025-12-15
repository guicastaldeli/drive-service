package com.app.main.root.app._service;
import com.app.main.root.app._db.CommandQueryManager;
import com.app.main.root.app._db.DbManager;
import com.app.main.root.app.file_compressor.WrapperFileCompressor;
import com.app.main.root.app._cache.CacheService;
import com.app.main.root.app._crypto.file_encoder.FileEncoderWrapper;
import com.app.main.root.app._crypto.file_encoder.KeyManagerService;
import com.app.main.root.app._data.FileDownloader;
import com.app.main.root.app._data.FileUploader;
import com.app.main.root.app._data.MimeToDb;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@Service
public class FileService {
    private final Map<String, JdbcTemplate> jdbcTemplates;
    private final DbManager dbManager;
    private final ServiceManager serviceManager;
    private FileEncoderWrapper fileEncoderWrapper;
    private KeyManagerService keyManagerService;
    private WrapperFileCompressor fileCompressor;
    @Lazy @Autowired private CacheService cacheService;

    private FileUploader fileUploader;
    private FileDownloader fileDownloader;

    public static final String METADATA_DB = "files_metadata";
    public static final String IMAGE_DB = "image_data";
    public static final String VIDEO_DB = "video_data";
    public static final String AUDIO_DB = "audio_data";
    public static final String DOCUMENT_DB = "document_data";

    private static final long COMPRSSSION_MIN_SIZE = 1024 * 100;
    private static final long COMPRESSION_MAX_SIZE = 1024 * 1024 * 500;

    public FileService(
        Map<String, JdbcTemplate> jdbcTemplates,
        @Lazy ServiceManager serviceManager,
        @Lazy DbManager dbManager
    ) {
        this.jdbcTemplates = jdbcTemplates;
        this.serviceManager = serviceManager;
        this.dbManager = dbManager;
        this.fileCompressor = new WrapperFileCompressor();
        this.fileEncoderWrapper = new FileEncoderWrapper();
        this.keyManagerService = new KeyManagerService(jdbcTemplates);
        this.fileUploader = new FileUploader(
            this, 
            jdbcTemplates, 
            fileEncoderWrapper, 
            keyManagerService
        );
        this.fileDownloader = new FileDownloader(
            this, 
            jdbcTemplates, 
            fileEncoderWrapper, 
            keyManagerService
        );
    }

    /**
     * List Files
     */
    public Map<String, Object> listFiles(
        String userId,
        String parentFolderId,
        int page,
        int pageSize
    ) {
        List<Map<String, Object>> cachedFiles = cacheService.getCachedFilesPage(
            userId, 
            parentFolderId, 
            page
        );
        if(cachedFiles != null) {
            return createRes(
                cachedFiles,
                page,
                pageSize,
                userId,
                parentFolderId,
                true
            );
        }

        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        String query = CommandQueryManager.GET_ALL_FILES.get();
        int offset = page * pageSize;
        System.out.println("DEBUG FileService.listFiles():");
        System.out.println("  userId: " + userId);
        System.out.println("  parentFolderId: " + parentFolderId);
        System.out.println("  page: " + page);
        System.out.println("  pageSize: " + pageSize);
        System.out.println("  offset: " + (page * pageSize));
        
        List<Map<String, Object>> files = metadataTemplate.queryForList(
            query,
            userId,
            parentFolderId,
            pageSize,
            offset
        );
        
        System.out.println("DEBUG: Found " + files.size() + " files");
        for(Map<String, Object> file : files) {
            System.out.println("DEBUG: File: " + file);
        }
        cacheService.cacheFilesPage(
            userId, 
            parentFolderId, 
            page, 
            files
        );

        return createRes(
            files,
            page,
            pageSize,
            userId,
            parentFolderId,
            false
        );
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
    public boolean deleteFile(String userId, String fileId) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) throw new RuntimeException("files_metadata database not available");

        String getInfoQuery = CommandQueryManager.GET_FILE_INFO.get();
        try {
            keyManagerService.deleteKey(fileId, userId);
            
            List<Map<String, Object>> infoList = metadataTemplate.queryForList(
                getInfoQuery,
                fileId,
                userId
            );
            if(infoList.isEmpty()) {
                System.out.println("DEBUG: File not found - fileId: " + fileId + ", userId: " + userId);
                return false;
            }
            Map<String, Object> info = infoList.get(0);
            
            String deleteQuery = CommandQueryManager.DELETE_FILE.get();
            int rowsAffected = metadataTemplate.update(
                deleteQuery,
                fileId,
                userId
            );
            
            String parentFolderId = (String) info.get("parent_folder_id");
            boolean res = rowsAffected > 0;
            if(res) {
                cacheService.invalidateFolderCache(userId, parentFolderId);
                System.out.println("DEBUG: Cache invalidated for folder: " + parentFolderId);
            }

            return res;
        } catch (Exception err) {
            System.err.println("Error deleting file: " + err.getMessage());
            err.printStackTrace();
            return false;
        }
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

    /**
     * Create Response
     */
    private Map<String, Object> createRes(
        List<Map<String, Object>> files,
        int page,
        int pageSize,
        String userId,
        String folderId,
        boolean fromCache
    ) {
        Map<String, Object> res = new HashMap<>();
        res.put("files", files);
        res.put("pagination", Map.of(
            "page", page,
            "pageSize", pageSize,
            "total", countTotalFiles(userId, folderId),
            "hasMore", hasMoreFiles(userId, folderId, page, pageSize),
            "fromCache", fromCache
        ));
        return res;
    }

    public String getCacheKey(String userId, String folderId, int page) {
        return folderId + "_page_" + page;
    }
    
    public int countTotalFiles(String userId, String folderId) {
        JdbcTemplate metadataTemplate = jdbcTemplates.get(METADATA_DB);
        if(metadataTemplate == null) return 0;

        String query = CommandQueryManager.GET_TOTAL_FILES_FOLDER.get();
        Integer count = metadataTemplate.queryForObject(
            query,
            Integer.class,
            userId,
            folderId
        );

        Integer res = count != null ? count : 0; 
        return res;
    }

    private boolean hasMoreFiles(
        String userId,
        String folderId,
        int currentPage,
        int pageSize
    ) {
        int totalFiles = countTotalFiles(userId, folderId);
        return ((currentPage + 1) * pageSize) < totalFiles;
    }

    public WrapperFileCompressor getFileCompressor() {
        return fileCompressor;
    }

    /**
     * Should Compress
     */
    public boolean shouldCompress(long fileSize, String mimeType) {
        if(fileSize < COMPRSSSION_MIN_SIZE || fileSize > COMPRESSION_MAX_SIZE) {
            return false;
        }

        String lowerMime = mimeType.toLowerCase();
        if(lowerMime.contains("zip") || 
           lowerMime.contains("rar") ||
           lowerMime.contains("gzip") ||
           lowerMime.contains("jpeg") ||
           lowerMime.contains("png") ||
           lowerMime.contains("mp4") ||
           lowerMime.contains("mp3")) {
            return false;
        }
        
        return true;
    }
}
