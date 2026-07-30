import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || 'foundercfo_32byte_secret_key_prod_default!';
    // Ensure key is exactly 32 bytes for AES-256
    this.secretKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plain text or numeric data using AES-256-CBC
   */
  encrypt(data: string | number): string {
    if (data === null || data === undefined) return '';
    const textToEncrypt = String(data);
    
    // Generate a random 16-byte initialization vector (IV)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    
    let encrypted = cipher.update(textToEncrypt, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV for decryption: ivHex:encryptedHex
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts encrypted string data back to plain text
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || typeof encryptedData !== 'string') return '';
    
    // If data is not encrypted (does not contain IV separator), return as-is for backward compatibility
    if (!encryptedData.includes(':')) {
      return encryptedData;
    }

    try {
      const [ivHex, encryptedText] = encryptedData.split(':');
      if (!ivHex || !encryptedText) return encryptedData;
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (err) {
      // Fallback on error to unencrypted original
      return encryptedData;
    }
  }
}
