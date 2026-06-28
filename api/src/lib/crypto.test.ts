import { describe, it, expect } from 'vitest';
import {
  b64urlEncode,
  b64urlDecode,
  timingSafeEqual,
  hashPassword,
  verifyPassword,
  signQrToken,
  verifyQrToken,
  newId,
  newAccessCode
} from './crypto';

describe('crypto utils', () => {
  describe('base64url', () => {
    it('should encode and decode correctly', () => {
      const data = new Uint8Array([255, 0, 127, 254]);
      const encoded = b64urlEncode(data);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');

      const decoded = b64urlDecode(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('timingSafeEqual', () => {
    it('should return true for identical strings', () => {
      expect(timingSafeEqual('hello', 'hello')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeEqual('hello', 'world')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(timingSafeEqual('hello', 'hello ')).toBe(false);
    });
  });

  describe('password hashing', () => {
    it('should hash password and verify correctly', async () => {
      const password = 'mySecretPassword!123';
      const hash = await hashPassword(password);
      
      expect(hash).toContain('pbkdf2$');
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('QR token signing', () => {
    it('should sign and verify QR tokens', async () => {
      const ticketId = 'ticket-1234';
      const secret = 'super-secret-key';
      
      const token = await signQrToken(ticketId, secret);
      expect(token).toContain(`${ticketId}.`);
      
      const verifiedId = await verifyQrToken(token, secret);
      expect(verifiedId).toBe(ticketId);
      
      const wrongSecretId = await verifyQrToken(token, 'wrong-secret');
      expect(wrongSecretId).toBeNull();
      
      const invalidToken = await verifyQrToken('fake-token', secret);
      expect(invalidToken).toBeNull();
    });
  });

  describe('generators', () => {
    it('should generate valid UUIDs', () => {
      const id = newId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate access codes of correct length', () => {
      const code6 = newAccessCode();
      expect(code6).toHaveLength(6);
      expect(code6).toMatch(/^[A-Z2-9]+$/);

      const code8 = newAccessCode(8);
      expect(code8).toHaveLength(8);
    });
  });
});
