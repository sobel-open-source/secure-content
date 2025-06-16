package com.sobel.filestorage.endpoint.dto;

public class ChiffrementRequest {
    private String aesKeyEncrypted; // Clé AES chiffrée en base64
    private String source; // Optionnel : nom de fichier

    public String getAesKeyEncrypted() { return aesKeyEncrypted; }
    public void setAesKeyEncrypted(String aesKeyEncrypted) { this.aesKeyEncrypted = aesKeyEncrypted; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}



//async traiterFichierBAI(): Promise<void> {
//        try {
//        // 1. Generate AES key
//        const aesKey = await window.crypto.subtle.generateKey(
//{ name: 'AES-CBC', length: 256 },
//        true,
//        ['encrypt', 'decrypt']
//        );
//
//        // 2. Export key
//        const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
//
//// 3. Get public key from backend
//        const pem = await firstValueFrom(
//            this.http.get('http://localhost:5050/api/fichier-bai/public-key',
//{ responseType: 'text' })
//        );
//
//        // 4. Import RSA public key with correct parameters
//        const publicKey = await this.importRSAPublicKey(pem);
//
//// 5. Encrypt AES key with RSA-OAEP - CORRECTED PARAMETERS
//        const encrypted = await window.crypto.subtle.encrypt(
//{
//    name: 'RSA-OAEP',
//    // This is the correct way to specify hash for RSA-OAEP in TypeScript
//    // Note: Different from your original code
//} as RsaOaepParams,  // Type assertion to ensure correct typing
//        publicKey,
//        rawKey
//        );
//
//                // 6. Convert to Base64
//                const aesKeyEncryptedBase64 = this.arrayBufferToBase64(encrypted);
//
//// 7. Send to backend
//        const res = await firstValueFrom(this.http.post(
//        'http://localhost:5050/api/fichier-bai/chiffrer',
//{ aesKeyEncrypted: aesKeyEncryptedBase64 },
//        { headers: { 'Content-Type': 'application/json' } }
//        ));
//
//        console.log('✅ Success:', res);
//    } catch (err) {
//        console.error('❌ Error:', err);
//    }
//            }
//
//private async importRSAPublicKey(pem: string): Promise<CryptoKey> {
//    const pemHeader = '-----BEGIN PUBLIC KEY-----';
//    const pemFooter = '-----END PUBLIC KEY-----';
//    const pemContents = pem.replace(pemHeader, '')
//            .replace(pemFooter, '')
//            .replace(/\s/g, '');
//    const binaryDer = this.base64ToArrayBuffer(pemContents);
//
//    return window.crypto.subtle.importKey(
//            'spki',
//            binaryDer,
//            {
//                    name: 'RSA-OAEP',
//            // Hash specification goes here during import, not during encrypt
//            hash: { name: 'SHA-256' }
//        },
//    true,
//        ['encrypt']
//    );
//}
//
//private base64ToArrayBuffer(base64: string): ArrayBuffer {
//    const binaryString = atob(base64);
//    const bytes = new Uint8Array(binaryString.length);
//    for (let i = 0; i < binaryString.length; i++) {
//        bytes[i] = binaryString.charCodeAt(i);
//    }
//    return bytes.buffer;
//}
//
//private arrayBufferToBase64(buffer: ArrayBuffer): string {
//    const bytes = new Uint8Array(buffer);
//    let binary = '';
//    bytes.forEach(b => binary += String.fromCharCode(b));
//    return btoa(binary);
//}