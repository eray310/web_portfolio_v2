/**
 * Minimal SHA-256 and AES-CBC decryption in plain JavaScript.
 *
 * The character model is stored encrypted and is normally decrypted with the
 * Web Crypto API, but that API only exists in secure contexts (https or
 * localhost). Opening the dev server through a network address such as
 * http://192.168.x.x:5173 (for example from a phone) is not a secure context,
 * so `crypto.subtle` is undefined there. This fallback keeps the model usable
 * in that case. It is loaded on demand and is never used when Web Crypto is
 * available.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 9 + 63) >> 6) << 6) >>> 0;
  const data = new Uint8Array(paddedLength);
  data.set(message);
  data[message.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

// ── AES tables (generated once, no big literals to mistype) ──
const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
const MUL9 = new Uint8Array(256);
const MUL11 = new Uint8Array(256);
const MUL13 = new Uint8Array(256);
const MUL14 = new Uint8Array(256);

function gmul(a: number, b: number): number {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) result ^= a;
    const high = a & 0x80;
    a = (a << 1) & 0xff;
    if (high) a ^= 0x1b;
    b >>= 1;
  }
  return result;
}

(function buildTables() {
  const rotl8 = (x: number, n: number) => ((x << n) | (x >> (8 - n))) & 0xff;
  let p = 1;
  let q = 1;
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0); // p *= 3
    q ^= q << 1; // q /= 3
    q ^= q << 2;
    q ^= q << 4;
    q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = q ^ rotl8(q, 1) ^ rotl8(q, 2) ^ rotl8(q, 3) ^ rotl8(q, 4);
    SBOX[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  SBOX[0] = 0x63;
  for (let i = 0; i < 256; i++) {
    INV_SBOX[SBOX[i]] = i;
    MUL9[i] = gmul(i, 9);
    MUL11[i] = gmul(i, 11);
    MUL13[i] = gmul(i, 13);
    MUL14[i] = gmul(i, 14);
  }
})();

/** Expands a 256-bit key into the 15 round keys (240 bytes). */
function expandKey256(key: Uint8Array): Uint8Array {
  const nk = 8;
  const nr = 14;
  const w = new Uint8Array(16 * (nr + 1));
  w.set(key);
  let rcon = 1;
  const temp = new Uint8Array(4);
  for (let i = nk; i < 4 * (nr + 1); i++) {
    temp.set(w.subarray((i - 1) * 4, i * 4));
    if (i % nk === 0) {
      const t0 = temp[0];
      temp[0] = SBOX[temp[1]] ^ rcon;
      temp[1] = SBOX[temp[2]];
      temp[2] = SBOX[temp[3]];
      temp[3] = SBOX[t0];
      rcon = gmul(rcon, 2);
    } else if (i % nk === 4) {
      for (let j = 0; j < 4; j++) temp[j] = SBOX[temp[j]];
    }
    for (let j = 0; j < 4; j++) w[i * 4 + j] = w[(i - nk) * 4 + j] ^ temp[j];
  }
  return w;
}

/** AES-256-CBC decryption with PKCS#7 padding, like crypto.subtle.decrypt. */
export function aesCbcDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array
): ArrayBuffer {
  if (key.length !== 32) throw new Error("AES fallback expects a 256-bit key");
  if (data.length === 0 || data.length % 16 !== 0) {
    throw new Error("Encrypted data length is not a multiple of 16");
  }
  const nr = 14;
  const roundKeys = expandKey256(key);
  const out = new Uint8Array(data.length);
  const s = new Uint8Array(16);
  const t = new Uint8Array(16);

  for (let offset = 0; offset < data.length; offset += 16) {
    for (let i = 0; i < 16; i++) s[i] = data[offset + i] ^ roundKeys[nr * 16 + i];

    for (let round = nr - 1; round >= 0; round--) {
      // InvShiftRows (state is column-major: s[4 * column + row])
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) t[4 * ((c + r) % 4) + r] = s[4 * c + r];
      }
      // InvSubBytes + AddRoundKey
      for (let i = 0; i < 16; i++) s[i] = INV_SBOX[t[i]] ^ roundKeys[round * 16 + i];
      if (round === 0) break;
      // InvMixColumns
      for (let c = 0; c < 4; c++) {
        const a0 = s[4 * c];
        const a1 = s[4 * c + 1];
        const a2 = s[4 * c + 2];
        const a3 = s[4 * c + 3];
        s[4 * c] = MUL14[a0] ^ MUL11[a1] ^ MUL13[a2] ^ MUL9[a3];
        s[4 * c + 1] = MUL9[a0] ^ MUL14[a1] ^ MUL11[a2] ^ MUL13[a3];
        s[4 * c + 2] = MUL13[a0] ^ MUL9[a1] ^ MUL14[a2] ^ MUL11[a3];
        s[4 * c + 3] = MUL11[a0] ^ MUL13[a1] ^ MUL9[a2] ^ MUL14[a3];
      }
    }

    // CBC: XOR with the previous ciphertext block (or the IV)
    for (let i = 0; i < 16; i++) {
      out[offset + i] = s[i] ^ (offset === 0 ? iv[i] : data[offset - 16 + i]);
    }
  }

  const pad = out[out.length - 1];
  if (pad < 1 || pad > 16) throw new Error("Invalid padding after decryption");
  return out.buffer.slice(0, out.length - pad) as ArrayBuffer;
}
