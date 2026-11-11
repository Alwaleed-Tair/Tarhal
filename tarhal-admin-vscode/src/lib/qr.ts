/**
 * Small QR code encoder for the boarding pass (no package): byte mode, error correction level M, versions 1-10
 * (up to 213 bytes, far more than a booking reference). It follows the QR standard (ISO/IEC 18004) the same way
 * Project Nayuki's reference generator does: data codewords -> Reed-Solomon blocks -> interleave -> place -> best of 8 masks.
 * Returns a square grid of booleans (true = dark module), without the quiet zone.
 */

const ECC_PER_BLOCK_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const FORMAT_M = 0; // format bits for level M

/** Modules available for data and error correction in a version (everything except function patterns). */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}
const dataCodewords = (version: number) => Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK_M[version] * BLOCKS_M[version];

// ─── Reed-Solomon over GF(256), polynomial 0x11D ──────────
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMultiply(coef, factor); });
  }
  return result;
}

/** Splits the data into blocks, adds error correction to each, and interleaves them. */
function addEccAndInterleave(data: number[], version: number): number[] {
  const numBlocks = BLOCKS_M[version], eccLen = ECC_PER_BLOCK_M[version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0); // placeholder, skipped when interleaving
    blocks.push(dat.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => { if (i !== shortBlockLen - eccLen || j >= numShortBlocks) result.push(block[i]); });
  }
  return result;
}

// ─── Grid ────────────────────────────────────────────────
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  readonly isFunction: boolean[][];
  readonly version: number;
  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }
  set(x: number, y: number, dark: boolean) { this.modules[y][x] = dark; this.isFunction[y][x] = true; }

  drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) { this.set(6, i, i % 2 === 0); this.set(i, 6, i % 2 === 0); }
    this.drawFinder(3, 3); this.drawFinder(this.size - 4, 3); this.drawFinder(3, this.size - 4);
    const align = alignmentPositions(this.version), n = align.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0))) this.drawAlignment(align[i], align[j]);
    }
    this.drawFormatBits(0);
    this.drawVersion();
  }
  drawFinder(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) this.set(xx, yy, dist !== 2 && dist !== 4);
    }
  }
  drawAlignment(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  drawFormatBits(mask: number) {
    const data = (FORMAT_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6)); this.set(8, 8, bit(7)); this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, this.size - 15 + i, bit(i));
    this.set(8, this.size - 8, true); // dark module
  }
  drawVersion() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0, a = this.size - 11 + (i % 3), b = Math.floor(i / 3);
      this.set(a, b, dark); this.set(b, a, dark);
    }
  }
  drawCodewords(data: number[]) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }
  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) {
      const invert = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
        ((x * y) % 2) + ((x * y) % 3) === 0, (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (((x + y) % 2) + ((x * y) % 3)) % 2 === 0][mask];
      if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
    }
  }
  /** Penalty score of the standard (runs, 2x2 boxes, finder-like patterns, dark balance). Lower is better. */
  penalty(): number {
    const n = this.size, m = this.modules;
    let result = 0;
    const finderLike = (line: boolean[]) => {
      let count = 0;
      const s = line.map((d) => (d ? '1' : '0')).join('');
      for (const p of ['10111010000', '00001011101']) { let k = s.indexOf(p); while (k !== -1) { count++; k = s.indexOf(p, k + 1); } }
      return count;
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < n; a++) {
        const line = Array.from({ length: n }, (_, b) => (pass === 0 ? m[a][b] : m[b][a]));
        let run = 1;
        for (let b = 1; b <= n; b++) {
          if (b < n && line[b] === line[b - 1]) run++;
          else { if (run >= 5) result += run - 2; run = 1; }
        }
        result += finderLike([false, false, false, false, ...line, false, false, false, false]) * 40;
      }
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) result += 3;
    }
    const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0), total = n * n;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  }
}

/** Encodes text (UTF-8) as a QR code. Throws when the text is longer than version 10 can hold (213 bytes). */
export function qrMatrix(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1;
  // Byte mode: 4-bit mode + 8-bit count (versions 1-9) or 16-bit count (10+), then 8 bits per byte.
  const bitsNeeded = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (version <= 10 && bitsNeeded(version) > dataCodewords(version) * 8) version++;
  if (version > 10) throw new Error('Text too long for this QR encoder');

  const bits: number[] = [];
  const append = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) append(b, 8);
  const capacity = dataCodewords(version) * 8;
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));

  const grid = new Grid(version);
  grid.drawFunctionPatterns();
  grid.drawCodewords(addEccAndInterleave(codewords, version));
  let best = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    grid.applyMask(mask); grid.drawFormatBits(mask);
    const score = grid.penalty();
    if (score < bestScore) { best = mask; bestScore = score; }
    grid.applyMask(mask); // undo (XOR)
  }
  grid.applyMask(best); grid.drawFormatBits(best);
  return grid.modules;
}

/** SVG path ("M x y h1 v1 h-1 z" per dark module) for a QR grid with a 4-module quiet zone. */
export function qrPath(matrix: boolean[][], quiet = 4): { d: string; size: number } {
  let d = '';
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
  return { d, size: matrix.length + quiet * 2 };
}
