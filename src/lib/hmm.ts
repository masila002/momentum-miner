/**
 * Simple Hidden Markov Model for market regime detection.
 * States: Bullish (0), Sideways (1), Bearish (2)
 * Observations are discretized from returns + volatility.
 */

export type Regime = 'bullish' | 'sideways' | 'bearish';

interface HMMParams {
  // Transition matrix (3x3)
  A: number[][];
  // Emission matrix (3 x numObs)
  B: number[][];
  // Initial probabilities
  pi: number[];
}

// Discretize returns into observation symbols
// 0: strong down, 1: down, 2: flat, 3: up, 4: strong up
function discretize(returns: number[]): number[] {
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
  if (std === 0) return returns.map(() => 2);

  return returns.map(r => {
    const z = (r - mean) / std;
    if (z < -1.5) return 0;
    if (z < -0.5) return 1;
    if (z < 0.5) return 2;
    if (z < 1.5) return 3;
    return 4;
  });
}

const NUM_OBS = 5;
const NUM_STATES = 3;

// Default HMM parameters (trained heuristic for synthetic indices)
function defaultParams(): HMMParams {
  return {
    A: [
      [0.7, 0.2, 0.1], // bullish tends to stay bullish
      [0.2, 0.6, 0.2], // sideways
      [0.1, 0.2, 0.7], // bearish tends to stay bearish
    ],
    B: [
      [0.02, 0.08, 0.20, 0.40, 0.30], // bullish: more positive returns
      [0.10, 0.20, 0.40, 0.20, 0.10], // sideways: centered
      [0.30, 0.40, 0.20, 0.08, 0.02], // bearish: more negative returns
    ],
    pi: [0.33, 0.34, 0.33],
  };
}

// Viterbi algorithm: find most likely state sequence
function viterbi(obs: number[], params: HMMParams): number[] {
  const { A, B, pi } = params;
  const T = obs.length;
  const delta: number[][] = Array.from({ length: T }, () => new Array(NUM_STATES).fill(0));
  const psi: number[][] = Array.from({ length: T }, () => new Array(NUM_STATES).fill(0));

  // Init
  for (let j = 0; j < NUM_STATES; j++) {
    delta[0][j] = Math.log(pi[j] + 1e-10) + Math.log(B[j][obs[0]] + 1e-10);
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < NUM_STATES; j++) {
      let maxVal = -Infinity;
      let maxIdx = 0;
      for (let i = 0; i < NUM_STATES; i++) {
        const val = delta[t - 1][i] + Math.log(A[i][j] + 1e-10);
        if (val > maxVal) {
          maxVal = val;
          maxIdx = i;
        }
      }
      delta[t][j] = maxVal + Math.log(B[j][obs[t]] + 1e-10);
      psi[t][j] = maxIdx;
    }
  }

  // Backtrack
  const states = new Array(T);
  let maxVal = -Infinity;
  states[T - 1] = 0;
  for (let j = 0; j < NUM_STATES; j++) {
    if (delta[T - 1][j] > maxVal) {
      maxVal = delta[T - 1][j];
      states[T - 1] = j;
    }
  }
  for (let t = T - 2; t >= 0; t--) {
    states[t] = psi[t + 1][states[t + 1]];
  }
  return states;
}

// Forward algorithm for state probabilities at time T
function forward(obs: number[], params: HMMParams): number[] {
  const { A, B, pi } = params;
  const T = obs.length;
  let alpha = pi.map((p, j) => p * B[j][obs[0]]);

  for (let t = 1; t < T; t++) {
    const newAlpha = new Array(NUM_STATES).fill(0);
    for (let j = 0; j < NUM_STATES; j++) {
      let sum = 0;
      for (let i = 0; i < NUM_STATES; i++) {
        sum += alpha[i] * A[i][j];
      }
      newAlpha[j] = sum * B[j][obs[t]];
    }
    // Normalize to prevent underflow
    const total = newAlpha.reduce((a, b) => a + b, 0);
    alpha = total > 0 ? newAlpha.map(v => v / total) : newAlpha;
  }

  return alpha;
}

// Baum-Welch: re-estimate parameters from observations
function baumWelch(obs: number[], params: HMMParams, iterations = 5): HMMParams {
  let { A, B, pi } = JSON.parse(JSON.stringify(params));
  const T = obs.length;
  if (T < 3) return params;

  for (let iter = 0; iter < iterations; iter++) {
    // Forward
    const alphas: number[][] = [];
    let a = pi.map((p: number, j: number) => p * B[j][obs[0]]);
    let c = a.reduce((x: number, y: number) => x + y, 0) || 1;
    a = a.map((v: number) => v / c);
    alphas.push(a);
    const scales = [c];

    for (let t = 1; t < T; t++) {
      const newA = new Array(NUM_STATES).fill(0);
      for (let j = 0; j < NUM_STATES; j++) {
        for (let i = 0; i < NUM_STATES; i++) {
          newA[j] += alphas[t - 1][i] * A[i][j];
        }
        newA[j] *= B[j][obs[t]];
      }
      c = newA.reduce((x: number, y: number) => x + y, 0) || 1;
      alphas.push(newA.map((v: number) => v / c));
      scales.push(c);
    }

    // Backward
    const betas: number[][] = Array.from({ length: T }, () => new Array(NUM_STATES).fill(0));
    betas[T - 1] = new Array(NUM_STATES).fill(1);
    for (let t = T - 2; t >= 0; t--) {
      for (let i = 0; i < NUM_STATES; i++) {
        for (let j = 0; j < NUM_STATES; j++) {
          betas[t][i] += A[i][j] * B[j][obs[t + 1]] * betas[t + 1][j];
        }
      }
      const sc = scales[t + 1] || 1;
      betas[t] = betas[t].map((v: number) => v / sc);
    }

    // Gamma and Xi
    const gamma: number[][] = [];
    for (let t = 0; t < T; t++) {
      const g = alphas[t].map((a: number, i: number) => a * betas[t][i]);
      const total = g.reduce((x: number, y: number) => x + y, 0) || 1;
      gamma.push(g.map((v: number) => v / total));
    }

    // Re-estimate
    pi = gamma[0].slice();

    for (let i = 0; i < NUM_STATES; i++) {
      const gammaSum = gamma.slice(0, T - 1).reduce((s: number, g: number[]) => s + g[i], 0) || 1;
      for (let j = 0; j < NUM_STATES; j++) {
        let xiSum = 0;
        for (let t = 0; t < T - 1; t++) {
          xiSum += alphas[t][i] * A[i][j] * B[j][obs[t + 1]] * betas[t + 1][j] / (scales[t + 1] || 1);
        }
        A[i][j] = xiSum / gammaSum;
      }
      // Normalize row
      const rowSum = A[i].reduce((x: number, y: number) => x + y, 0) || 1;
      A[i] = A[i].map((v: number) => v / rowSum);

      for (let k = 0; k < NUM_OBS; k++) {
        let num = 0, den = 0;
        for (let t = 0; t < T; t++) {
          if (obs[t] === k) num += gamma[t][i];
          den += gamma[t][i];
        }
        B[i][k] = (num + 1e-6) / (den + NUM_OBS * 1e-6); // Laplace smoothing
      }
    }
  }

  return { A, B, pi };
}

export interface HMMResult {
  regime: Regime;
  probabilities: { bullish: number; sideways: number; bearish: number };
  stateSequence: Regime[];
  confidence: number;
}

const REGIME_MAP: Regime[] = ['bullish', 'sideways', 'bearish'];

export function analyzeWithHMM(closes: number[]): HMMResult | null {
  if (closes.length < 10) return null;

  // Compute returns
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const obs = discretize(returns);
  const params = defaultParams();

  // Train with Baum-Welch
  const trained = baumWelch(obs, params, 8);

  // Get state probabilities
  const probs = forward(obs, trained);

  // Get state sequence
  const states = viterbi(obs, trained);
  const stateSequence = states.map((s: number) => REGIME_MAP[s]);

  // Current regime
  const currentState = states[states.length - 1];
  const regime = REGIME_MAP[currentState];
  const confidence = probs[currentState];

  return {
    regime,
    probabilities: {
      bullish: probs[0],
      sideways: probs[1],
      bearish: probs[2],
    },
    stateSequence,
    confidence,
  };
}
