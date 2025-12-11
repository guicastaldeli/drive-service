package com.app.main.root.app.__controllers;
import com.app.main.root.app._crypto.message_encoder.SecureMessageService;
import com.app.main.root.app._data.FileUploader;
import com.app.main.root.app._service.FileService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final SecureMessageService secureMessageService;
    private final FileService fileService;

    public FileController(@Lazy FileService fileService, SecureMessageService secureMessageService) {
        this.fileService = fileService;
        this.secureMessageService = secureMessageService;
    }

    /**
     * Upload
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
        @RequestParam("file") MultipartFile file,
        @RequestParam("userId") String userId,
        @RequestParam(value = "parentFolderId", defaultValue = "root") String parentFolderId
    ) {
        try {
            FileUploader res = fileService.getFileUploader().upload(
                userId, 
                file, 
                parentFolderId
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "fileId", res.getFileId(),
                "filename", res.getFileName(),
                "size", res.getSize(),
                "mimeType", res.getMimeType(),
                "fileType", res.getFileType(),
                "database", res.getDatabase(),
                "uploadedAt", res.getUploadedAt(),
                "message", "File uploaded to " + res.getDatabase() 
            ));
        } catch(Exception err) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", err.getMessage()
            ));
        }
    }

    /**
     * Download
     */
    @GetMapping("/download/{fileId}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileId, @PathVariable String userId) {
        try {
            byte[] fileContent = fileService.getFileDownloader().download(fileId, userId);
            return ResponseEntity.ok()
                .header("Content-Type", "application/octet-stream")
                .header("Content-Disposition", "attachment; filename=\"" + fileId + "\"")
                .body(fileContent);
        } catch(Exception err) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete File
     */
    public ResponseEntity<?> deleteFile(@RequestParam String fileId, @RequestParam String userId) {
        try {
            boolean deleted = fileService.deleteFile(fileId, userId);
            return ResponseEntity.ok(Map.of(
                "success", deleted,
                "message", deleted ? "file deleted!" : "file not found"
            ));
        } catch(Exception err) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", err.getMessage()
            ));
        }
    }

    /**
     * Info
     */
    @GetMapping("/info")
    public ResponseEntity<?> getFileInfo(@PathVariable String fileId, @PathVariable String userId) {
        try {
            String database = fileService.findFileDatabase(fileId, userId);
            if(database != null) {
                return ResponseEntity.ok(Map.of(
                    "fileId", fileId,
                    "database", database,
                    "location", "Stored in " + database
                ));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch(Exception err) {
            return ResponseEntity.status(500).body(Map.of(
                "error", err.getMessage()
            ));
        }
    }

    /**
     * Storage Usage
     */
    public ResponseEntity<?> getStorageUsage(@PathVariable String userId) {
        try {
            Map<String, Object> usage = fileService.getStorageUsage(userId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", usage
            ));
        } catch(Exception err) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", err.getMessage()
            ));
        }
    }

    /**
     * Search Files
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchFiles(
        @RequestParam String userId,
        @RequestParam String query,
        @RequestParam(required = false) String fileType,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        try {
            /*
                REMINDER:::
                FULL IMPLEMENTATION LATER... (if needed),
                FOR NOW LET IT LIKE THIS!!
                - for future me

            List<Map<String, Object>> res = fileService.searchFiles(
                userId,
                query,
                fileType,
                page,
                pageSize
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "results", res,
                "query", query,
                "count", res.size()
            ));
            */
           return ResponseEntity.ok(Map.of(
                "success", true,
                "results", "",
                "query", query,
                "count", 0
            ));
        } catch(Exception err) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", err.getMessage()
            ));
        }
    }
}
