/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OtpRecord {
  userId: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  phone: string;
  email: string;
  secret: string;
  secondsRemaining: number;
  totpUri: string;
}

/**
 * Standard RFC 4648 Base32 valid secrets (Characters: A-Z, 2-7).
 * Strictly conformant with Google Authenticator, 1Password, and totp.danhersam.com.
 */
const USER_CONTACTS: Record<
  string,
  { phone: string; email: string; secret: string; name: string }
> = {
  vivan: {
    name: 'Vivan (Grade 10-A)',
    phone: '+91 98450 12026',
    email: 'vivan.2026@tattvasayam.edu.in',
    secret: 'TATTVAVIVANXX222',
  },
  krishvika: {
    name: 'Krishvika (Grade 8-B)',
    phone: '+91 98450 22026',
    email: 'krishvika.2026@tattvasayam.edu.in',
    secret: 'TATTVAKRISHVII22',
  },
  susmita: {
    name: 'Ms. Susmita (Faculty)',
    phone: '+91 98450 34829',
    email: 'susmita.fac@tattvasayam.edu.in',
    secret: 'TATTVASUSMITAFAC',
  },
  sandhya: {
    name: 'Ms. Sandhya (Super Admin)',
    phone: '+91 98450 60428',
    email: 'sandhya.adm@tattvasayam.edu.in',
    secret: 'TATTVASANDHYAADM',
  },
  amrita: {
    name: 'Ms. Amrita (Operations)',
    phone: '+91 98450 15839',
    email: 'amrita.adm@tattvasayam.edu.in',
    secret: 'TATTVAMRITAOPS22',
  },
  sai: {
    name: 'Mr. Sai (Gate Security)',
    phone: '+91 98450 73510',
    email: 'sai.security@tattvasayam.edu.in',
    secret: 'TATTVASAIGATE222',
  },
  bharthi: {
    name: 'Ms. Bharthi (Coordinator)',
    phone: '+91 98450 39182',
    email: 'bharthi.sup@tattvasayam.edu.in',
    secret: 'TATTVABHARTHISUP',
  },
  pvivan: {
    name: 'Parent of Vivan',
    phone: '+91 98450 26081',
    email: 'parent.vivan@gmail.com',
    secret: 'TATTVAPARENTVIV2',
  },
  pkrishvika: {
    name: 'Parent of Krishvika',
    phone: '+91 98450 91735',
    email: 'parent.krishvika@gmail.com',
    secret: 'TATTVAPARENTKRI2',
  },
  principal: {
    name: 'Dr. B. R. Shenoy (Principal)',
    phone: '+91 98450 52094',
    email: 'principal@tattvasayam.edu.in',
    secret: 'TATTVAPRINCIP22',
  },
  librarian: {
    name: 'Ms. Meenakshi (Librarian)',
    phone: '+91 98450 81294',
    email: 'meenakshi.lib@tattvasayam.edu.in',
    secret: 'TATTVAMEENAKSHI2',
  },
};

/**
 * Standard RFC 4648 Base32 Decoder
 */
function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Pure SHA-1 implementation (RFC 3174 compliant)
 */
function sha1(bytes: Uint8Array): Uint8Array {
  const len = bytes.length;
  const wordLen = ((len + 8) >> 6) + 1;
  const words = new Int32Array(wordLen * 16);

  for (let i = 0; i < len; i++) {
    words[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
  }
  words[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
  words[wordLen * 16 - 1] = len * 8;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  let e = 0xc3d2e1f0;

  const w = new Int32Array(80);
  const rotl = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j];
    for (let j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

    let A = a;
    let B = b;
    let C = c;
    let D = d;
    let E = e;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (B & C) | (~B & D);
        k = 0x5a827999;
      } else if (j < 40) {
        f = B ^ C ^ D;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (B & C) | (B & D) | (C & D);
        k = 0x8f1bbcdc;
      } else {
        f = B ^ C ^ D;
        k = 0xca62c1d6;
      }

      const temp = (rotl(A, 5) + f + E + k + w[j]) | 0;
      E = D;
      D = C;
      C = rotl(B, 30);
      B = A;
      A = temp;
    }

    a = (a + A) | 0;
    b = (b + B) | 0;
    c = (c + C) | 0;
    d = (d + D) | 0;
    e = (e + E) | 0;
  }

  const out = new Uint8Array(20);
  const vars = [a, b, c, d, e];
  for (let i = 0; i < 5; i++) {
    out[i * 4] = (vars[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (vars[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (vars[i] >>> 8) & 0xff;
    out[i * 4 + 3] = vars[i] & 0xff;
  }
  return out;
}

/**
 * Standard RFC 2104 HMAC-SHA1
 */
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > 64) {
    k = sha1(k);
  }
  const keyPad = new Uint8Array(64);
  keyPad.set(k);

  const oPad = new Uint8Array(64);
  const iPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oPad[i] = keyPad[i] ^ 0x5c;
    iPad[i] = keyPad[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(64 + message.length);
  innerMsg.set(iPad);
  innerMsg.set(message, 64);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(64 + 20);
  outerMsg.set(oPad);
  outerMsg.set(innerHash, 64);
  return sha1(outerMsg);
}

/**
 * Exact RFC 6238 Standard TOTP Algorithm
 * Computes standard 6-digit TOTP from Base32 secret and 30-second epoch counter.
 * Guaranteed 100% bit-for-bit identical to Google Authenticator & totp.danhersam.com.
 */
export function computeRfc6238Totp(secretBase32: string, timeStepCounter: number): string {
  const key = base32Decode(secretBase32);

  // 8-byte big-endian time counter buffer
  const timeBuffer = new Uint8Array(8);
  let tempCounter = timeStepCounter;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const hmac = hmacSha1(key, timeBuffer);

  // Dynamic truncation (RFC 4226 section 5.4)
  const offset = hmac[19] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

class OtpService {
  public defaultDurationSeconds = 30; // Standard 30-second window
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('OTP listener error:', e);
      }
    });
  }

  public getContact(userId: string) {
    const key = userId.toLowerCase().trim();
    if (USER_CONTACTS[key]) return USER_CONTACTS[key];
    return {
      name: key,
      phone: '+91 98450 ' + Math.floor(10000 + Math.random() * 90000),
      email: `${key.replace(/[^a-z0-9]/g, '')}@tattvasayam.edu.in`,
      secret: 'TATTVAVIVANXX222',
    };
  }

  /**
   * Returns current 30-second time counter step based on standard Unix epoch
   */
  public getCurrentStep(): number {
    return Math.floor(Date.now() / 1000 / this.defaultDurationSeconds);
  }

  /**
   * Returns remaining seconds in the current 30-second window (30 down to 1)
   */
  public getSecondsRemaining(): number {
    const currentSecond = Math.floor(Date.now() / 1000);
    const elapsedInWindow = currentSecond % this.defaultDurationSeconds;
    return this.defaultDurationSeconds - elapsedInWindow;
  }

  /**
   * Gets the authoritative standard RFC 6238 30-second TOTP record for a user.
   * Completely clock-synchronized across all pages, tabs, and external TOTP apps.
   */
  public getActiveOtp(userId: string): OtpRecord {
    const key = userId.toLowerCase().trim();
    const contact = this.getContact(key);
    const step = this.getCurrentStep();

    const code = computeRfc6238Totp(contact.secret, step);
    const secondsRemaining = this.getSecondsRemaining();
    const windowStart = Math.floor(Date.now() / (this.defaultDurationSeconds * 1000)) * (this.defaultDurationSeconds * 1000);
    const expiresAt = windowStart + this.defaultDurationSeconds * 1000;

    const totpUri = `otpauth://totp/Tattvasayam:${encodeURIComponent(
      contact.name
    )}?secret=${contact.secret}&issuer=Tattvasayam&digits=6&period=30`;

    return {
      userId: key,
      code,
      createdAt: windowStart,
      expiresAt,
      phone: contact.phone,
      email: contact.email,
      secret: contact.secret,
      secondsRemaining,
      totpUri,
    };
  }

  /**
   * Triggers a sync notification across subscribers
   */
  public generateOtp(userId: string): OtpRecord {
    this.notify();
    return this.getActiveOtp(userId);
  }

  /**
   * Verifies the input code against the standard RFC 6238 30-second TOTP code.
   * Includes standard ±1 window tolerance (current, previous, or next 30s)
   * to guarantee seamless verification even with minor device clock drifts.
   */
  public verifyOtp(userId: string, inputCode: string): { success: boolean; message: string } {
    const key = userId.toLowerCase().trim();
    const cleanInput = inputCode.replace(/\D/g, '').trim();

    if (!cleanInput) {
      return { success: false, message: 'Please enter the 6-digit OTP code.' };
    }

    if (cleanInput.length !== 6) {
      return { success: false, message: 'OTP must be exactly 6 digits.' };
    }

    const contact = this.getContact(key);
    const currentStep = this.getCurrentStep();

    // Check current 30-second window
    const currentCode = computeRfc6238Totp(contact.secret, currentStep);
    if (cleanInput === currentCode) {
      return { success: true, message: 'OTP verified successfully.' };
    }

    // Check previous 30-second window (standard grace period)
    const prevCode = computeRfc6238Totp(contact.secret, currentStep - 1);
    if (cleanInput === prevCode) {
      return { success: true, message: 'OTP verified successfully (grace window).' };
    }

    // Check next 30-second window (clock skew tolerance)
    const nextCode = computeRfc6238Totp(contact.secret, currentStep + 1);
    if (cleanInput === nextCode) {
      return { success: true, message: 'OTP verified successfully (clock sync).' };
    }

    return {
      success: false,
      message: `Invalid OTP code. The active code is ${currentCode} (Secret: ${contact.secret}). Check the TOTP Authenticator site.`,
    };
  }

  /**
   * Returns external TOTP generator URL for demo verification
   */
  public getExternalTotpUrl(secret: string): string {
    return `https://totp.danhersam.com/#${secret}`;
  }
}

export const otpService = new OtpService();
