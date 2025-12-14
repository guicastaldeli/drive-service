package com.app.main.root.app._crypto.file_encoder;
import com.app.main.root.app._db.CommandQueryManager;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.util.Map;
import java.util.List;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

@Service
public class KeyManagerService {
    private final Map<String, JdbcTemplate> jdbcTemplates;
    private final SecretKey masterKey;
    private static final String CIPHER_ALGO = "AES";
    private static final String CIPHER_MODE = "AES";
    private static final int KEY_SIZE = 256;

    @Value("${encryption.master-key:}")
    private String masterKeyEnv;

    public KeyManagerService(Map<String, JdbcTemplate> jdbcTemplates) {
        this.jdbcTemplates = jdbcTemplates;
        this.masterKey = initMasterKey();
    }

    /**
     * Init Master Key
     */
    private SecretKey initMasterKey() {
        try {
            String masterKeyStr = masterKeyEnv != null && !masterKeyEnv.isEmpty()
                ? masterKeyEnv
                : System.getenv("ENCRYPTION_MASTER_KEY");

            if(masterKeyStr == null || masterKeyStr.isEmpty()) {
                System.err.println("No master key configured");
                return generateMasterKey();
            }

            byte[] decodedKey = Base64.getDecoder().decode(masterKeyStr);
            return new SecretKeySpec(decodedKey, 0, decodedKey.length, CIPHER_ALGO);
        } catch(Exception err) {
            System.err.println("Error initializing master key: " + err.getMessage());
            throw new RuntimeException("Failed to initialize master key", err);
        }
    }

    /**
     * Generate Master Key
     */
    public static String generateMasterKeyStr() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(CIPHER_ALGO);
            keyGen.init(KEY_SIZE);
            SecretKey key = keyGen.generateKey();
            return Base64.getEncoder().encodeToString(key.getEncoded());
        } catch(Exception err) {
            throw new RuntimeException("Failed to generate master key**", err);
        }
    }

    private SecretKey generateMasterKey() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(CIPHER_ALGO);
            keyGen.init(KEY_SIZE);
            return keyGen.generateKey();
        } catch(Exception err) {
            throw new RuntimeException("Failed to generate master key", err);
        }
    }

    /**
     * Store Key
     */
    public void storeKey(String fileId, String userId, byte[] encryptionKey) {
        try {
            String encryptedKey = encryptKey(encryptionKey);
            String hashedFileId = hashString(fileId);
            
            String query = CommandQueryManager.STORE_KEY.get();
            JdbcTemplate metadataDb = jdbcTemplates.get("files_metadata");
            if(metadataDb == null) throw new RuntimeException("Files metadata err");
            metadataDb.update(
                query,
                fileId,
                hashedFileId,
                userId,
                encryptedKey,
                encryptedKey
            );
            System.out.println("Key stored for fileId: " + fileId);
        } catch (Exception err) {
            System.err.println("Error storing encryption key: " + err.getMessage());
            throw new RuntimeException("Failed to store encryption key", err);
        }
    }

    /**
     * Retrieve Key
     */
    public byte[] retrieveKey(String fileId, String userId) {
        try {
            String query = CommandQueryManager.RETRIEVE_KEY.get();

            JdbcTemplate metadataDb = jdbcTemplates.get("files_metadata");
            if(metadataDb == null) throw new RuntimeException("files_metadata database not configured");

            List<Map<String, Object>> result = metadataDb.queryForList(query, fileId, userId);
            if(result.isEmpty()) {
                System.err.println("No encryption key found for fileId: " + fileId + ", userId: " + userId);
                return null;
            }

            String encryptedKey = (String) result.get(0).get("encrypted_key");
            return decryptKey(encryptedKey);
        } catch (Exception err) {
            System.err.println("Error retrieving encryption key: " + err.getMessage());
            throw new RuntimeException("Failed to retrieve encryption key", err);
        }
    }

    /**
     * Delete Key
     */
    public void deleteKey(String fileId, String userId) {
        try {
            String query = CommandQueryManager.DELETE_KEY.get();

            JdbcTemplate metadataDb = jdbcTemplates.get("files_metadata");
            if(metadataDb == null) throw new RuntimeException("files_metadata database not configured");

            metadataDb.update(query, fileId, userId);
            System.out.println("Key deleted for fileId: " + fileId);
        } catch (Exception e) {
            System.err.println("Error deleting encryption key: " + e.getMessage());
            throw new RuntimeException("Failed to delete encryption key", e);
        }
    }

    public boolean keyExists(String fileId, String userId) {
        try {
            String query = CommandQueryManager.KEY_EXISTS.get();

            JdbcTemplate metadataDb = jdbcTemplates.get("files_metadata");
            if(metadataDb == null) throw new RuntimeException("files_metadata database not configured");

            List<Map<String, Object>> result = metadataDb.queryForList(query, fileId, userId);
            Integer count = ((Number) result.get(0).get("count")).intValue();
            return count > 0;
        } catch (Exception err) {
            System.err.println("Error checking key existence: " + err.getMessage());
            return false;
        }
    }

    public String getMasterKeyStr() {
        return Base64.getEncoder().encodeToString(masterKey.getEncoded());
    }

    /**
     * Encrypt Key
     */
    private String encryptKey(byte[] key) {
        try {
            Cipher cipher = Cipher.getInstance(CIPHER_MODE);
            cipher.init(Cipher.ENCRYPT_MODE, masterKey);
            byte[] encryptedBytes = cipher.doFinal(key);

            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch(Exception err) {
            throw new RuntimeException("Failed to encrypt key", err);
        }
    }

    /**
     * Decrypt Key
     */
    private byte[] decryptKey(String key) {
        try {
            byte[] encryptedBytes = Base64.getDecoder().decode(key);
            Cipher cipher = Cipher.getInstance(CIPHER_MODE);
            cipher.init(Cipher.DECRYPT_MODE, masterKey);

            return cipher.doFinal(encryptedBytes);
        } catch (Exception err) {
            throw new RuntimeException("Failed to decrypt key", err);
        }
    }

    private String hashString(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes());

            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception err) {
            throw new RuntimeException("Failed to hash string", err);
        }
    }
}
