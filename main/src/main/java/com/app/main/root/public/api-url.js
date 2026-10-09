//
// Auto-generated from .env.dev - DO NOT EDIT MANUALLY
// Values are encrypted
// Generated at: 2026-10-09T15:02:08.945Z
//

window.ENCRYPTED_CONFIG = {
    apiGateway: '22937d03934f4a9a29cc58936a47da30:2e4a77c03f5af855ef942d63170960ad46d1c2eb6d254611c5964b63dd25f671',
    serverApi: 'e66243447c3f099636a663b2339059a7:7936fcc7a577ce8028ef3554a09cee0080b14b782dc595dd9aaf0e75a9441a6d',
    webUrl: 'b881efccf90d8197b0313c09259825ae:8432fcf0161ec0cd07fad3b16bc8f44b62d56696b7ce19a985f254f0d1f56ba4',
    key: 'JikwwLsQosrGiLqSQyphXqBcH/0fR/HubHjjmPQ3iZA='
};

(function() {
    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for(let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }
    
    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    
    function bytesToUtf8(bytes) {
        return new TextDecoder().decode(bytes);
    }
    
    async function decrypt(encrypted) {
        try {
            const parts = encrypted.split(':');
            const iv = hexToBytes(parts[0]);
            const encryptedText = hexToBytes(parts[1]);
            const key = base64ToBytes(window.ENCRYPTED_CONFIG.key);
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-CBC', length: 256 },
                false,
                ['decrypt']
            );
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: iv },
                cryptoKey,
                encryptedText
            );
            
            return bytesToUtf8(new Uint8Array(decrypted));
        } catch(error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }
    
    (async function() {
        try {
            window.API_URL = await decrypt(window.ENCRYPTED_CONFIG.apiGateway);
            window.SERVER_URL = await decrypt(window.ENCRYPTED_CONFIG.serverApi);
            window.WEB_URL = await decrypt(window.ENCRYPTED_CONFIG.webUrl);
            
            console.log('Config decrypted successfully');
            console.log('WEB_URL:', window.WEB_URL);
            console.log('API_URL:', window.API_URL);
            console.log('SERVER_URL:', window.SERVER_URL);
            
            if(window.configResolve) window.configResolve();
            
            delete window.ENCRYPTED_CONFIG;
        } catch(error) {
            console.error('Failed to decrypt configuration:', error);
        }
    })();
})();