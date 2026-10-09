//
// Auto-generated from .env.dev - DO NOT EDIT MANUALLY
// Values are encrypted
// Generated at: 2026-10-09T14:46:18.283Z
//

window.ENCRYPTED_CONFIG = {
    apiGateway: '1e60719699ea693e028ca2ac94bd119a:aa9b56e8a30bba42730e8e4598ed7bbd3c2ba81a5d0bb0a729918323a167d741',
    serverApi: 'c17439773141f1c793a9ac4de3c56198:b3e633b182615dbce63991bb4a322accc5c733fe04db7804e61adbbd9ff563ff',
    webUrl: '5536e4e73c046ba8494f524853f7a299:b3b071f954e5cfd22d5fdeeb474950e6e2141d39504db5b85f961ad30f4ed284',
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