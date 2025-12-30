// Encryption utility functions using Web Crypto API

// Generate a random encryption key
export const generateEncryptionKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // whether the key is extractable
    ["encrypt", "decrypt"] // key usages
  );
  
  return key;
};

// Export the key to store it securely
export const exportKey = async (key) => {
  const exportedKey = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exportedKey);
};

// Import a key from stored format
export const importKey = async (keyString) => {
  const jwk = JSON.parse(keyString);
  const key = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
  
  return key;
};

// Encrypt a message
export const encryptMessage = async (message, key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...result)); // Convert to base64 string
};

// Decrypt a message
export const decryptMessage = async (encryptedMessage, key) => {
  const data = new Uint8Array(atob(encryptedMessage).split("").map(c => c.charCodeAt(0)));
  
  // Extract IV (first 12 bytes) and encrypted content
  const iv = data.slice(0, 12);
  const encryptedContent = data.slice(12);
  
  try {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedContent
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
};

// Encrypt file metadata
export const encryptFileMetadata = async (fileMetadata, key) => {
  const jsonString = JSON.stringify(fileMetadata);
  return await encryptMessage(jsonString, key);
};

// Decrypt file metadata
export const decryptFileMetadata = async (encryptedFileMetadata, key) => {
  const decryptedJson = await decryptMessage(encryptedFileMetadata, key);
  return JSON.parse(decryptedJson);
};