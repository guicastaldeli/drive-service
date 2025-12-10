package com.app.main.root.app._data;
import org.springframework.jdbc.core.JdbcTemplate;
import com.app.main.root.app._service.FileService;
import java.util.Map;
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
    public byte[] download(String fileId, String userId) {
        String query = "";

        for(String dbName : jdbcTemplates.keySet()) {
            List<Map<String, Object>> res = jdbcTemplates
                .get(dbName)
                .queryForList(
                    query,
                    fileId,
                    userId
                );

            if(!res.isEmpty()) {
                Map<String, Object> metadata = res.get(0);
                String mimeType = (String) metadata.get("mime_type");
                String dbType = fileService.getDatabaseForMimeType(mimeType);

                String contentQuery = getContent(dbType);
                List<Map<String, Object>> contentRes = jdbcTemplates
                    .get(dbType)
                    .queryForList(
                        contentQuery, 
                        fileId
                    );

                if(!contentRes.isEmpty()) {
                    return (byte[]) contentRes.get(0).get("content");
                }
            }
        }

        throw new RuntimeException("File not found!");
    }

    /**
     * Get Content
     */
    public String getContent(String dbType) {
        switch(dbType) {
            case "images":
                return "IMG";
            case "videos":
                return "VID";
            case "audios":
                return "AUD";
            case "documents":
                return "DOC";
            default:
                return "";
        }
    }
}
