package com.app.main.root.app._cache;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.app.main.root.app._service.ServiceManager;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.*;

@Service
public class CacheService {
    private final ServiceManager serviceManager;
    private final Map<String, UserFileCache> cache = new ConcurrentHashMap<>();
    private ScheduledExecutorService cleanupExecutor = Executors.newScheduledThreadPool(1);

    @Value("${app.fileCache.pageSize:20}")
    private int pageSize;

    @Value("${app.fileCache.evictionTimeMinutes:60}")
    private int evictionTimeMinutes;

    public CacheService(ServiceManager serviceManager) {
        this.serviceManager = serviceManager;

        cleanupExecutor.scheduleAtFixedRate(
            this::cleanupExpired,
            30,
            30,
            TimeUnit.MINUTES
        );
    }

    public void initUserFileCache(String userId, int totalFileCount) {
        cache.computeIfAbsent(userId, id -> new UserFileCache(totalFileCount));
    }

    /**
     * Cache Files Page
     */
    public void cacheFilesPage(
        String userId,
        String folderId,
        int page,
        List<Map<String, Object>> files
    ) {
        UserFileCache userCache = cache.get(userId);
        if(userCache == null) {
            userCache = new UserFileCache(0);
            cache.put(userId, userCache);
        }
        userCache.writeLock().lock();

        try {
            String cacheKey = serviceManager.getFileService().getCacheKey(userId, folderId, page);
            userCache.cachedPages.put(cacheKey, files);
            userCache.lastAccessTime = System.currentTimeMillis();
        } finally {
            userCache.writeLock().unlock();
        }
    }

    /**
     * Get Cached Files Page
     */
    public List<Map<String, Object>> getCachedFilesPage(
        String userId,
        String folderId,
        int page
    ) {
        UserFileCache userCache = cache.get(userId);
        if(userCache == null) return null;
        userCache.readLock().lock();

        try {
            String cacheKey = serviceManager.getFileService().getCacheKey(userId, folderId, page);
            userCache.lastAccessTime = System.currentTimeMillis();
            return userCache.cachedPages.get(cacheKey); 
        } finally {
            userCache.readLock().unlock();
        }
    }

    /**
     * Get Missing Pages
     */
    public List<Integer> getMissingPages(
        String userId,
        String folderId,
        int startPage,
        int endPage
    ) {
        UserFileCache userCache = cache.get(userId);
        if(userCache == null) {
            List<Integer> allPages = new ArrayList<>();
            for(int i = startPage; i <= endPage; i++) allPages.add(i);
            return allPages;
        }
        userCache.readLock().lock();

        try {
            List<Integer> missingPages = new ArrayList<>();
            for(int page = startPage; page <= endPage; page++) {
                String cacheKey = serviceManager.getFileService().getCacheKey(userId, folderId, page);
                if(!userCache.loadedPages.contains(cacheKey)) {
                    missingPages.add(page);
                }
            }
            return missingPages;
        } finally {
            userCache.readLock().unlock();
        }
    }

    public void invalidateUserCache(String userId) {
        cache.remove(userId);
    }

    public void invalidateFolderCache(String userId, String folderId) {
        UserFileCache userCache = cache.get(userId);
        if(userCache != null) {
            userCache.writeLock().lock();
            try {
                userCache.loadedPages.removeIf(k -> k.startsWith(folderId + "_page_"));
                userCache.cachedPages.keySet().removeIf(k -> k.startsWith(folderId + "_page_"));
            } finally {
                userCache.writeLock().unlock();
            }
        }
    }

    @PreDestroy
    public void destroy() {
        cleanupExecutor.shutdown();
    }

    private void cleanupExpired() {
        long cutoffTime = 
            System.currentTimeMillis() -
            TimeUnit.MINUTES.toMillis(evictionTimeMinutes);

        Iterator<Map.Entry<String, UserFileCache>> iterator = cache.entrySet().iterator();
        while(iterator.hasNext()) {
            Map.Entry<String, UserFileCache> entry = iterator.next();
            if(entry.getValue().lastAccessTime < cutoffTime) {
                iterator.remove();
            }
        }
    }

    /**
     * 
     * User File Cache
     * 
     */
    public class UserFileCache {
        public final Set<String> loadedPages = new HashSet<>();
        public final Map<String, List<Map<String, Object>>> cachedPages = new HashMap<>();

        public int totalFileCount;
        public long lastAccessTime = System.currentTimeMillis();
        public final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

        public UserFileCache(int totalFileCount) {
            this.totalFileCount = totalFileCount;
        }

        public ReentrantReadWriteLock.ReadLock readLock() {
            return lock.readLock();
        }

        public ReentrantReadWriteLock.WriteLock writeLock() {
            return lock.writeLock();
        }           
    }
}


