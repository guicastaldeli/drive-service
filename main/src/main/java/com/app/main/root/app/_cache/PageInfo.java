package com.app.main.root.app._cache;

public class PageInfo {
    public final boolean isLoaded;
    public final boolean hasMore;
    public final int totalFiles;

    public PageInfo(
        boolean isLoaded,
        boolean hasMore,
        int totalFiles 
    ) {
        this.isLoaded = isLoaded;
        this.hasMore = hasMore;
        this.totalFiles = totalFiles;
    }
}
