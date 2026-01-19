package com.app.main.root.app._cache;

public class CacheStats {
    public final int totalCachedChats;
    private final int totalCachedFiles;
    private final int totalLoadedPages;

    public CacheStats(
        int totalCachedChats,
        int totalCachedFiles,
        int totalLoadedPages
    ) {
        this.totalCachedChats = totalCachedChats;
        this.totalCachedFiles = totalCachedFiles;
        this.totalLoadedPages = totalLoadedPages;
    }
}
