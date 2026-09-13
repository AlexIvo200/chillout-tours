// 2D simplex-шум (по Густавсону) с сидом + fBm и ridged-октавы для гор.
const GRADIENTS = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function buildPermutation(seed) {
  const table = Array.from({ length: 256 }, (_, i) => i);
  let state = seed >>> 0 || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [table[i], table[j]] = [table[j], table[i]];
  }
  return Uint8Array.from({ length: 512 }, (_, i) => table[i & 255]);
}

export function createNoise2D(seed = 1) {
  const perm = buildPermutation(seed);

  const corner = (x, y, gradientIndex) => {
    let falloff = 0.5 - x * x - y * y;
    if (falloff < 0) return 0;
    falloff *= falloff;
    const [gx, gy] = GRADIENTS[gradientIndex % 8];
    return falloff * falloff * (gx * x + gy * y);
  };

  return (xin, yin) => {
    const skew = (xin + yin) * F2;
    const i = Math.floor(xin + skew);
    const j = Math.floor(yin + skew);
    const unskew = (i + j) * G2;
    const x0 = xin - (i - unskew);
    const y0 = yin - (j - unskew);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const n0 = corner(x0, y0, perm[ii + perm[jj]]);
    const n1 = corner(x1, y1, perm[ii + i1 + perm[jj + j1]]);
    const n2 = corner(x2, y2, perm[ii + 1 + perm[jj + 1]]);
    return 70 * (n0 + n1 + n2);
  };
}

/** Фрактальный шум, результат примерно в [-1, 1]. */
export function fbm(noise, x, y, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

/** Острые хребты, результат в [0, ~1]. */
export function ridged(noise, x, y, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 1;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise(x * frequency, y * frequency));
    n *= n;
    sum += n * amplitude * weight;
    weight = Math.min(1, n * 1.6);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return sum;
}
