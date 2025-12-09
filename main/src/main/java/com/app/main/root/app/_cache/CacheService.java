package com.app.main.root.app._cache;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.*;

@Service
public class CacheService {
    private final Map<String, ChatCache> cache = new ConcurrentHashMap<>();
    private ScheduledExecutorService cleanupExecutor = Executors.newScheduledThreadPool(1);

    @Value("${app.cache.pageSize:100}")
    private int pageSize;

    @Value("${app.cache.maxPagesPerChat:20}")
    private int maxPagesPerChat;

    @Value("${app.cache.evictionTimeMinutes:60}")
    private int evictionTimeMinutes;

    public CacheService() {
        cleanupExecutor.scheduleAtFixedRate(
            this::cleanupExpired,
            30,
            30,
            TimeUnit.MINUTES
        );
    }

    public void initChatCache(String chatId, int totalMessageCount) {
        cache.computeIfAbsent(chatId, id -> new ChatCache(totalMessageCount));
        enforceSizeLimits();
    }

    public List<Integer> getMissingPages(
        String chatId,
        int startPage,
        int endPage
    ) {
        ChatCache chatCache = cache.get(chatId);
        if(chatCache == null) {
            List<Integer> allPages = new ArrayList<>();
            for(int i = startPage; i <= endPage; i++) allPages.add(i);
            return allPages;
        }
        chatCache.readLock().lock();

        try {
            List<Integer> missingPages = new ArrayList<>();
            for(int page = startPage; page <= endPage; page++) {
                if(
                    !chatCache.loadedPages.contains(page) ||
                    !isPageComplete(chatCache, page)
                ) {
                    missingPages.add(page);
                }
            }
            return missingPages;
        } finally {
            chatCache.readLock().unlock();
        }
    }

    private boolean isPageComplete(ChatCache chatCache, int page) {
        //int startIndex = page * pageSize;
        //int endIndex = Math.min(startIndex, pageSize);
        return true;
    }

    private void enforceSizeLimits() {
        List<Map.Entry<String, ChatCache>> sortedEntries = new ArrayList<>(cache.entrySet());
        sortedEntries.sort(Comparator.comparingLong(entry -> entry.getValue().lastAccessTime));
    }

    @PreDestroy
    public void destroy() {
        cleanupExecutor.shutdown();
    }

    private void cleanupExpired() {
        long cuttoffTime = 
            System.currentTimeMillis() -
            TimeUnit.MINUTES.toMillis(evictionTimeMinutes);

        Iterator<Map.Entry<String, ChatCache>> iterator = cache.entrySet().iterator();
        while(iterator.hasNext()) {
            Map.Entry<String, ChatCache> entry = iterator.next();
            if(entry.getValue().lastAccessTime < cuttoffTime) {
                iterator.remove();
            }
        }
    }
}
