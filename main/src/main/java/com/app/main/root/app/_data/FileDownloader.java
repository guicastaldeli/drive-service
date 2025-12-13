package com.app.main.root.app._data;
import org.springframework.jdbc.core.JdbcTemplate;

import com.app.main.root.app._db.CommandQueryManager;
import com.app.main.root.app._service.FileService;

import java.util.*;

public class FileDownloader {  
    private final FileService fileService;
    private final Map<String, JdbcTemplate> jdbcTemplates;

    private String downloadUrl;

    public FileDownloader(FileService fileService, Map<String, JdbcTemplate> jdbcTemplates) {
        this.fileService = fileService;
        this.jdbcTemplates = jdbcTemplates;
    }

    public void setDownloadUrl(String url) {
        this.downloadUrl = url;
    }
    public String getDownloadUrl() {
        return downloadUrl;
    }

    /**
     * Download File
     */
    public Map<String, Object> download(String userId, String fileId) {
        String query = CommandQueryManager.GET_FILE_INFO.get();
        System.out.println("DOWNLOADING WITH METADATA fileId: " + fileId + ", userId: " + userId);
        String metadataDb = FileService.METADATA_DB;
        
        try {
            List<Map<String, Object>> metadataTemplate = jdbcTemplates
                .get(metadataDb)
                .queryForList(
                    query,
                    fileId,
                    userId
                );

            if(!metadataTemplate.isEmpty()) {
                Map<String, Object> metadata = metadataTemplate.get(0);
                String originalFilename = (String) metadata.get("original_filename");
                String mimeType = (String) metadata.get("mime_type");
                String dbType = (String) metadata.get("database_name");
                if(dbType == null || dbType.isEmpty()) {
                    dbType = fileService.getDatabaseForMimeType(mimeType);
                }
                
                String contentQuery = getContent(dbType);
                List<Map<String, Object>> contentRes = jdbcTemplates
                    .get(dbType)
                    .queryForList(contentQuery, fileId);

                if(!contentRes.isEmpty()) {
                    byte[] content = (byte[]) contentRes.get(0).get("content");
                    System.out.println("Download successful, size: " + content.length + " bytes");
                    
                    Map<String, Object> res = new HashMap<>();
                    res.put("content", content);
                    res.put("filename", originalFilename);
                    res.put("mimeType", mimeType);
                    res.put("fileSize", content.length);
                    return res;
                } else {
                    throw new RuntimeException("File content not found in " + dbType);
                }
            } else {
                throw new RuntimeException("File not found for fileId: " + fileId + ", userId: " + userId);
            }
        } catch(Exception e) {
            System.err.println("Download error: " + e.getMessage());
            throw new RuntimeException("Download failed: " + e.getMessage());
        }
    }

    /**
     * Get Content
     */
    public String getContent(String dbType) {
        switch(dbType) {
            case FileService.IMAGE_DB:
                return CommandQueryManager.GET_IMAGE.get();
            case FileService.VIDEO_DB:
                return CommandQueryManager.GET_VIDEO.get();
            case FileService.AUDIO_DB:
                return CommandQueryManager.GET_AUDIO.get();
            case FileService.DOCUMENT_DB:
                return CommandQueryManager.GET_DOCUMENT.get();
            default:
                return CommandQueryManager.GET_DOCUMENT.get();
        }
    }
}
