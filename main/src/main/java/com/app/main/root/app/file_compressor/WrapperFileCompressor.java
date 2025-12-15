package com.app.main.root.app.file_compressor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class WrapperFileCompressor {
    private static final String DLL_PATH = "src/main/java/com/app/main/root/app/file_compressor/.build/";
    
    static {
        loadNativeLibraries();
    }
    
    private static void loadNativeLibraries() {
        try {
            Path directory = Paths.get(DLL_PATH);
            if (!Files.exists(directory)) {
                throw new RuntimeException("dll directory does not exist: " + directory.toAbsolutePath());
            }
            System.out.println("Files in dll directory:");
            try {
                Files.list(directory)
                    .filter(path -> path.toString().toLowerCase().endsWith(".dll"))
                    .forEach(path -> System.out.println("  - " + path.getFileName()));
            } catch (Exception err) {
                System.out.println("error directory" + err.getMessage());
            }

            String[] libraries = {
                "libcrypto-3-x64.dll",
                "libssl-3-x64.dll", 
                "file_compressor.dll"
            };
            
            for(String lib : libraries) {
                Path libPath = directory.resolve(lib);
                if (!Files.exists(libPath)) {
                    System.err.println("Missing required DLL: " + libPath.toAbsolutePath());
                    throw new RuntimeException("Required DLL not found: " + lib);
                }
                System.out.println("Found: " + libPath.toAbsolutePath());
            }
            for(String lib : libraries) {
                Path libPath = directory.resolve(lib);
                try {
                    System.load(libPath.toAbsolutePath().toString());
                    System.out.println("Successfully loaded: " + lib);
                } catch (UnsatisfiedLinkError e) {
                    System.err.println("Failed to load: " + lib);
                    System.err.println("Error: " + e.getMessage());
                    throw e;
                }
            }
        } catch (Exception err) {
            err.printStackTrace();
            throw new RuntimeException("Failed to load native libraries: " + err.getMessage());
        }
    }
}
