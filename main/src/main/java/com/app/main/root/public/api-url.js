//
// Auto-generated from .env.dev - DO NOT EDIT MANUALLY
// Values are encrypted
// Generated at: 2026-02-15T06:57:32.734Z
//

window.ENCRYPTED_CONFIG = {
    apiGateway: '4ad1b2f8120f287119586a183ef0fa85:93f12e5638832fa7d008b6cb720742ded44dde1126d83558ff922dfa75f4f26f',
    serverApi: '5a0a9b81d40335d1969da929c7d8b7c6:132ce3f57d9586786f77b3a64e51f920a193373e19aca1588e789f5f8e930dcf',
    webUrl: '13c1a7f01ec2f4b5e3613652f69e9fc4:2a94b068d194f5786c1622de05011fc98f43498e4f61b13e6fc59487474265b5',
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