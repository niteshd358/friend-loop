// Utility for End-to-End Encryption using WebCrypto API

// Generate RSA key pair for the user
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

// Export public key as a base64 string to send to server
export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
};

// Export private key as a base64 string to store locally
export const exportPrivateKey = async (privateKey) => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
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
    true,
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

// Decrypt dual-encrypted message
export const decryptMessageDual = async (privateKeyStr, isSender, dualEncryptedStr) => {
  try {
    if (!dualEncryptedStr.startsWith("E2EE:")) return dualEncryptedStr;
    const parts = dualEncryptedStr.replace("E2EE:", "").split("|");
    if (parts.length !== 2) return dualEncryptedStr;
    
    const targetEnc = isSender ? parts[0] : parts[1];
    const privKey = await importPrivateKey(privateKeyStr);
    return await decryptMessage(privKey, targetEnc);
  } catch (err) {
    console.error("Dual decryption failed", err);
    return "[Decryption Error]";
  }
};
