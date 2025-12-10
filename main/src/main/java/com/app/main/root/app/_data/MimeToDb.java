package com.app.main.root.app._data;
import java.util.Map;

public class MimeToDb {
    public static final Map<String, String> List = Map.ofEntries(
        Map.entry("image/jpeg", "images"),
        Map.entry("image/png", "images"),
        Map.entry("image/gif", "images"),
        Map.entry("image/webp", "images"),
        Map.entry("video/mp4", "videos"),
        Map.entry("video/avi", "videos"),
        Map.entry("video/mov", "videos"),
        Map.entry("audio/mp3", "audios"),
        Map.entry("audio/wav", "audios"),
        Map.entry("audio/ogg", "audios"),
        Map.entry("application/pdf", "documents"),
        Map.entry("application/msword", "documents"),
        Map.entry("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "documents"),
        Map.entry("text/plain", "documents"),
        Map.entry("text/html", "documents"),
        Map.entry("application/zip", "archives"),
        Map.entry("application/x-rar-compressed", "archives")
    );
}
