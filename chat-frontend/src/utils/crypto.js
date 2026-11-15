// Utility for End-to-End Encryption using WebCrypto API + IndexedDB Non-Extractable Key Storage

const DB_NAME = "FriendLoopSecurity";
const DB_VERSION = 1;
const STORE_NAME = "crypto_keys";

// Open or initialize IndexedDB for non-extractable cryptographic key storage
export const getIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Save a non-extractable CryptoKey directly to IndexedDB (structured clone)
export const savePrivateKeyToDB = async (privateKey) => {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(privateKey, "privateKey");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save private key to IndexedDB:", err);
  }
};

// Retrieve CryptoKey object from IndexedDB
export const getPrivateKeyFromDB = async () => {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("privateKey");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to read private key from IndexedDB:", err);
    return null;
  }
};

// Clear private key from IndexedDB upon logout
export const clearPrivateKeyFromDB = async () => {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete("privateKey");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to clear private key from IndexedDB:", err);
  }
};

// Generate RSA-OAEP key pair with non-extractable private key to prevent key extraction via XSS
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false, // extractable: false prevents malicious JS from exporting private key bytes
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

// Export public key as base64 string to publish to server
export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
};

// Export private key (only works if key is extractable, for legacy compatibility)
export const exportPrivateKey = async (privateKey) => {
  try {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return btoa(exportedAsString);
  } catch (e) {
    return null;
  }
};

// Import public key from base64 string
export const importPublicKey = async (pem) => {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// Import private key from base64 string
export const importPrivateKey = async (pem) => {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
};

// Encrypt a message using recipient's public key
export const encryptMessage = async (publicKey, message) => {
  const encoded = new TextEncoder().encode(message);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encoded
  );
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(encrypted));
  return btoa(exportedAsString);
};

// Decrypt a message using own private key
export const decryptMessage = async (privateKey, encryptedBase64) => {
  try {
    const binaryDerString = atob(encryptedBase64);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      binaryDer
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    return "[Encrypted Message]";
  }
};

// Encrypt for both self and recipient
export const encryptMessageDual = async (myPublicKeyStr, theirPublicKeyStr, message) => {
  try {
    const myPub = await importPublicKey(myPublicKeyStr);
    const theirPub = await importPublicKey(theirPublicKeyStr);

    const myEnc = await encryptMessage(myPub, message);
    const theirEnc = await encryptMessage(theirPub, message);

    return `E2EE:${myEnc}|${theirEnc}`;
  } catch (err) {
    console.error("Dual encryption failed", err);
    return message;
  }
};

// Decrypt dual-encrypted message (accepts CryptoKey or legacy string)
export const decryptMessageDual = async (privateKey, isSender, dualEncryptedStr) => {
  try {
    if (!dualEncryptedStr || !dualEncryptedStr.startsWith("E2EE:")) return dualEncryptedStr;
    const parts = dualEncryptedStr.replace("E2EE:", "").split("|");
    if (parts.length !== 2) return dualEncryptedStr;

    const targetEnc = isSender ? parts[0] : parts[1];
    let keyObj = privateKey;
    if (typeof privateKey === "string") {
      keyObj = await importPrivateKey(privateKey);
    }
    return await decryptMessage(keyObj, targetEnc);
  } catch (err) {
    console.error("Dual decryption failed", err);
    return "[Decryption Error]";
  }
};
