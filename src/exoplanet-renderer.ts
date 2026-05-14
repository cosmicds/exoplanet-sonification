// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable */

// ── ExoplanetCloud ─────────────────────────────────────────────────────────
// A custom WebGL renderer that draws every exoplanet as a smoothstep-edged
// disc/ring in one draw call, replacing WWT's textured point-sprite path
// (drawSpreadSheetLayer → pointList.drawTextured) for visual sharpness.
//
// Step 3 adds per-vertex filtering so the renderer can be the authoritative
// dot path: a category-bit mask (driven by the layersOn[cat] checkboxes) and
// a "current date" cutoff (driven by the timeline slider). Both are uniforms
// — the vertex buffer is uploaded once and only the uniforms change as the
// user interacts.
//
// The renderer is now the default exoplanet dot path; WWT's spreadsheet
// draw is suppressed for known exoplanet layer names (see wwt-hacks.ts:
// drawSpreadSheetLayer gate). To fall back to WWT's textured points for
// debugging, set BOTH of the following in the browser console:
//     window.__cloudDots = false           // disables our draw
//     window.__cloudAuthoritative = false  // unblocks WWT's draw
//
// Hook point: wwt-hacks.ts:layerManagerDraw calls drawExoplanetCloud after
// the LayerManager has drawn its Sky-frame layers but before _drawSkyOverlays.
// At that point the world matrix has been restored to its pre-LayerMap value,
// which is identity for the Sky LayerMap (reference=0 — see CLAUDE.md WWT
// integration footgun).
//
// 2D vs 3D vertex paths: WWT's SpreadSheetLayer.prepVertexBuffer (engine
// index.js:39403–39449) rebuilds the layer's vertex buffer with bufferIsFlat
// when the draw call's `flat` argument is true (sky/2D mode). When flat:
//   - the altitude column is ignored (alt forced to 1)
//   - rotateX(ecliptic) is skipped
// so 2D vertices live on a unit celestial sphere with no ecliptic rotation,
// while 3D vertices are at real AU distances and ecliptic-rotated. WWT's 2D
// view/projection matrices are calibrated for the unit-sphere case; sending
// our real-AU vertices through them in 2D mode produces a sky-coord offset
// (RA/Dec misalignment visible against constellation overlays).
//
// We store both positions per vertex and switch which one feeds aPos at draw
// time, based on WWTControl.singleton.get_solarSystemMode().
//
// Vertex layout (per point, 40 bytes interleaved):
//   offset 0   vec3 (3×float32)  3D world pos: xR,yR,zR — real AU,
//                                rotateX(ecliptic) applied (matches
//                                Hit3DRow.{xR,yR,zR}).
//   offset 12  vec3 (3×float32)  2D unit-sphere pos: (cosRA·cosDec,
//                                sinDec, sinRA·cosDec) — no ecliptic
//                                rotation, matches WWT's flat-buffer
//                                geoTo3dRad(Dec, RA, 1).
//   offset 24  vec4 (4×uint8)    rgba color, normalized in-shader.
//   offset 28  float32           catBit — bit index (0..N-1) into the
//                                category enable mask. N ≤ ~16 in practice;
//                                a single float exactly encodes the mask.
//   offset 32  float32           startDays — discPubdate expressed as days
//                                since 1990-01-01 UTC. Using ms-since-epoch
//                                here would lose precision under float32
//                                (1.7e12 exceeds float32's 2^24 exact-int
//                                ceiling); days-since-1990 (~1.3e4) is fine.
//   offset 36  float32           endDays — endDate as days since 1990-01-01.
//                                Rows with no end date encode +Infinity (mapped
//                                to a large constant on upload so float32 can
//                                represent it safely).
//
// All vertices upload once at install time and live in a STATIC_DRAW buffer.

import { Matrix3d, WWTControl } from "@wwtelescope/engine";

type RowLike = {
  xR: number;
  yR: number;
  zR: number;
  sinRA: number;
  cosRA: number;
  sinDec: number;
  cosDec: number;
  cat: string;       // used for color lookup (e.g. "Transit")
  layerKey: string;  // used for category-bit assignment (e.g. "transit")
  discPubdate: Date;
  endDate: Date;
};

let _initialized = false;
let _gl: any = null;          // WebGLRenderingContext | WebGL2RenderingContext
let _prog: any = null;
let _vbo: any = null;
let _vertexCount = 0;
let _aPos = -1;
let _aColor = -1;
let _aCatBit = -1;
let _aStartDays = -1;
let _aEndDays = -1;
let _uMV: any = null;
let _uProj: any = null;
let _uPixelScale: any = null;
let _uOpacity: any = null;
let _uHollow: any = null;
let _uNowDays: any = null;
let _uCatMask: any = null;

// Rows + colorFor are captured at installExoplanetCloud() time, but the
// actual GL upload is deferred to the first draw call (we don't have a gl
// context until the first frame fires). _pendingUpload is true between
// install and first draw, and any time install is called again.
let _stagedRows: RowLike[] | null = null;
let _stagedColorFor: ((cat: string) => string) | null = null;
// Kept alive after upload so the ring pass can look up per-row world
// positions by integer rowIndex (passed in by startPing / setSearchRing).
let _rows: RowLike[] = [];
let _colorFor: ((cat: string) => string) | null = null;

// Category-bit assignment, built from the distinct layerKey values seen at
// install time. setCategoryEnabled() looks up bits here; the renderer's
// uCatMask uniform is rebuilt from _catEnabled whenever it flips.
const _catBitByKey: Map<string, number> = new Map();
const _catEnabled: Map<string, boolean> = new Map();
// The set of layer names that this renderer is authoritative for — exposed via
// isExoplanetLayerName() so wwt-hacks.ts:drawSpreadSheetLayer can skip them.
// Layer names match CSVS keys exactly (the layer is created with name: cat).
const _knownLayerNames: Set<string> = new Set();

// Filter state. Default: all categories on, all dates visible (Infinity).
let _nowDays = 1e9;
let _catMask = 0xffffffff;  // shader extracts via mod/pow, so any wide value works

const VERT_STRIDE = 40;     // 12 pos3D + 12 pos2D + 4 rgba + 4 catBit + 4 startDays + 4 endDays
const POS3D_OFFSET = 0;
const POS2D_OFFSET = 12;
const COLOR_OFFSET = 24;
const CATBIT_OFFSET = 28;
const STARTDAYS_OFFSET = 32;
const ENDDAYS_OFFSET = 36;

const DAY_MS = 86400000;
const EPOCH_1990_MS = Date.UTC(1990, 0, 1);

// Coarse pointer = phones/tablets. Detected once at module load — the rest
// of the codebase (getDeviceScales, galaxy3d.ts) uses the same heuristic.
// Visual sizes need separate defaults per device class because mobile DPR
// is typically 2.5–3× while phones have less screen real estate, so the
// same CSS-px size reads as a much chunkier dot/ping on a phone.
const _IS_COARSE_POINTER = (typeof window !== 'undefined')
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: coarse)').matches;
// Cap for points with no real end date — far enough in the future to always
// pass the (nowDays <= endDays) cutoff under any plausible timeline use.
const ENDDAYS_MAX = 1e6;  // ~2738 years past 1990

/** Convert a Date (or ms timestamp) to days since 1990-01-01 UTC. */
export function daysSince1990(d: Date | number): number {
  const ms = (d instanceof Date) ? d.getTime() : d;
  return (ms - EPOCH_1990_MS) / DAY_MS;
}

const VERT_SRC = `\
attribute vec3 aPos;
attribute vec4 aColor;
attribute float aCatBit;
attribute float aStartDays;
attribute float aEndDays;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float uPixelScale;
uniform float uNowDays;
uniform float uCatMask;
varying vec4 vColor;
void main() {
  // Extract bit aCatBit from uCatMask.  WebGL1 lacks integer ops, so use
  // mod(floor(mask/2^bit), 2). aCatBit is a small integer-valued float and
  // float32 mantissa (24 bits) exactly represents the masks we use (<= 16 bits).
  float bitVal = mod(floor(uCatMask / pow(2.0, aCatBit)), 2.0);
  // Visible iff bit is set AND start <= now <= end.
  float visible = bitVal * step(aStartDays, uNowDays) * step(uNowDays, aEndDays);
  // gl_PointSize = 0 clips the point; the rasterizer never emits fragments.
  gl_PointSize = uPixelScale * visible;
  if (gl_PointSize <= 0.0) {
    gl_Position = vec4(2, 2, 2, 1);
  } else {
    gl_Position = uPMatrix * uMVMatrix * vec4(aPos, 1.0);
  }
  vColor = aColor;
}
`;

// uHollow > 0.5 → thin AA ring. Otherwise → smoothstep-edged filled disc.
// The 1-px AA band (smoothstep 0.46 → 0.50 in gl_PointCoord units) is what
// makes the dot read as crisp instead of the bilinear-fuzzed WWT texture.
const FRAG_SRC = `\
precision mediump float;
varying vec4 vColor;
uniform float uOpacity;
uniform float uHollow;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r = length(p);
  float a;
  if (uHollow > 0.5) {
    // Annular ring: outer AA edge at 0.50, inner AA edge at ~0.40.
    float outer = smoothstep(0.50, 0.46, r);
    float inner = smoothstep(0.40, 0.36, r);
    a = max(outer - inner, 0.0);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(vColor.rgb, a * uOpacity * vColor.a);
  } else {
    a = smoothstep(0.50, 0.46, r);
    if (a <= 0.0) discard;
    float core = smoothstep(0.50, 0.30, r);
    vec3 col = vColor.rgb * mix(0.85, 1.15, core);
    gl_FragColor = vec4(col, a * uOpacity * vColor.a);
  }
}
`;

function _hexToRGBA(hex: string): [number, number, number, number] {
  // Accepts "#rgb", "#rrggbb", "#rrggbbaa". Falls back to opaque white.
  let h = (hex || '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 6) h += 'ff';
  if (h.length !== 8) return [255, 255, 255, 255];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = parseInt(h.slice(6, 8), 16);
  if ([r, g, b, a].some(v => Number.isNaN(v))) return [255, 255, 255, 255];
  return [r, g, b, a];
}

function _compile(gl: any, type: number, src: string): any {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.error('[ExoplanetCloud] shader compile error:', gl.getShaderInfoLog(s));
    // eslint-disable-next-line no-console
    console.error(src);
  }
  return s;
}

function _init(gl: any) {
  const v = _compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const f = _compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.error('[ExoplanetCloud] program link error:', gl.getProgramInfoLog(p));
  }
  _prog = p;
  _aPos       = gl.getAttribLocation(p, 'aPos');
  _aColor     = gl.getAttribLocation(p, 'aColor');
  _aCatBit    = gl.getAttribLocation(p, 'aCatBit');
  _aStartDays = gl.getAttribLocation(p, 'aStartDays');
  _aEndDays   = gl.getAttribLocation(p, 'aEndDays');
  _uMV        = gl.getUniformLocation(p, 'uMVMatrix');
  _uProj      = gl.getUniformLocation(p, 'uPMatrix');
  _uPixelScale = gl.getUniformLocation(p, 'uPixelScale');
  _uOpacity   = gl.getUniformLocation(p, 'uOpacity');
  _uHollow    = gl.getUniformLocation(p, 'uHollow');
  _uNowDays   = gl.getUniformLocation(p, 'uNowDays');
  _uCatMask   = gl.getUniformLocation(p, 'uCatMask');
  _vbo = gl.createBuffer();
  _gl = gl;
  _initialized = true;
}

function _rebuildCatMask() {
  let mask = 0;
  for (const [key, bit] of _catBitByKey) {
    if (_catEnabled.get(key) !== false) mask |= (1 << bit);
  }
  _catMask = mask;
}

function _assignCategoryBits(rows: RowLike[]) {
  _catBitByKey.clear();
  _knownLayerNames.clear();
  let next = 0;
  for (const r of rows) {
    const key = r.layerKey || '';
    if (!key || _catBitByKey.has(key)) continue;
    _catBitByKey.set(key, next++);
    _knownLayerNames.add(key);
    if (next >= 24) {
      // Float32 mantissa is 24 bits — bail before encoding becomes lossy.
      // eslint-disable-next-line no-console
      console.warn('[ExoplanetCloud] >=24 distinct layer keys; extra ones lose precision');
      break;
    }
    // Default any newly-seen category to enabled.
    if (!_catEnabled.has(key)) _catEnabled.set(key, true);
  }
  _rebuildCatMask();
}

function _uploadRows(rows: RowLike[], colorFor: (cat: string) => string) {
  if (!_gl || !_vbo) return;
  const gl = _gl;
  const buf = new ArrayBuffer(rows.length * VERT_STRIDE);
  const f32 = new Float32Array(buf);
  const u8  = new Uint8Array(buf);
  // Stride is 40 bytes = 10 floats; per-row float-index offset is i*10.
  const F_PER_ROW = VERT_STRIDE / 4;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fo = i * F_PER_ROW;
    const bo = i * VERT_STRIDE;
    // 3D world position (real AU, ecliptic-rotated) — Hit3DRow.xR/yR/zR.
    f32[fo + 0] = r.xR;
    f32[fo + 1] = r.yR;
    f32[fo + 2] = r.zR;
    // 2D unit-sphere position — matches geoTo3dRad(Dec, RA_deg, 1) with no
    // ecliptic rotation, i.e. what WWT builds for flat=true Sky-frame layers.
    f32[fo + 3] = r.cosRA * r.cosDec;
    f32[fo + 4] = r.sinDec;
    f32[fo + 5] = r.sinRA * r.cosDec;
    // f32[fo + 6] is the float that aliases the rgba uint8s at byte 24.
    const rgba = _hexToRGBA(colorFor(r.cat));
    u8[bo + COLOR_OFFSET + 0] = rgba[0];
    u8[bo + COLOR_OFFSET + 1] = rgba[1];
    u8[bo + COLOR_OFFSET + 2] = rgba[2];
    u8[bo + COLOR_OFFSET + 3] = rgba[3];

    // catBit / startDays / endDays at byte offsets 28 / 32 / 36 → float
    // indices 7 / 8 / 9 within the row.
    const bit = _catBitByKey.get(r.layerKey || '');
    f32[fo + 7] = (bit === undefined) ? 0 : bit;

    const startMs = r.discPubdate ? r.discPubdate.getTime() : NaN;
    f32[fo + 8] = Number.isFinite(startMs)
      ? (startMs - EPOCH_1990_MS) / DAY_MS
      : -ENDDAYS_MAX;  // unknown start → treat as always-started

    const endMs = r.endDate ? r.endDate.getTime() : NaN;
    f32[fo + 9] = Number.isFinite(endMs)
      ? (endMs - EPOCH_1990_MS) / DAY_MS
      : ENDDAYS_MAX;   // unknown end → never expires
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);
  gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  _vertexCount = rows.length;
}

/**
 * Stage the exoplanet row set for rendering. The actual GPU upload is
 * deferred until the first draw call (so we don't need a live GL context
 * at install time). Safe to call again to refresh — it triggers a re-upload.
 *
 * Also seeds the category-bit map from the rows' layerKey field, so calls
 * to setCategoryEnabled() against any of those keys work after install.
 */
export function installExoplanetCloud(
  rows: RowLike[],
  colorFor: (cat: string) => string
) {
  _stagedRows = rows;
  _stagedColorFor = colorFor;
  _assignCategoryBits(rows);
}

/**
 * Toggle visibility of all points belonging to a discovery-method layer.
 * `layerKey` matches the strings in `layersOn` / `CSVS` (e.g. "transit",
 * "Radial Velocity"). No-op for unknown keys.
 */
export function setCategoryEnabled(layerKey: string, on: boolean) {
  if (!_catBitByKey.has(layerKey)) return;
  _catEnabled.set(layerKey, !!on);
  _rebuildCatMask();
}

/**
 * Update the current timeline position so points with `discPubdate > now`
 * (or `endDate < now`) are clipped. `nowDays` is days since 1990-01-01 UTC
 * (use daysSince1990() to compute).
 */
export function setTimeWindow(nowDays: number) {
  _nowDays = nowDays;
}

/**
 * True when `name` is the WWT layer name of an exoplanet category whose
 * dots are owned by this renderer. Used by wwt-hacks.ts:drawSpreadSheetLayer
 * to short-circuit the WWT draw under window.__cloudAuthoritative.
 */
export function isExoplanetLayerName(name: string | undefined | null): boolean {
  return !!name && _knownLayerNames.has(name);
}

// ── Ring pass (step 5) ─────────────────────────────────────────────────────
// World-space ping rings replacing the previous CSS-overlay <div> path.
// Transient rings (timeline + search-result pulse) fade out over durMs;
// persistent rings (the search-result marker that stays until camera-move)
// have durMs < 0 and render at a fixed size. Both modes share one VBO and
// one draw call. Position is sourced from _rows[rowIndex] so the ring is
// anchored to the exoplanet vertex even as the camera pans/zooms.

type RingEntry = {
  rowIndex: number;
  t0Ms: number;       // performance.now() at spawn
  durMs: number;      // negative = persistent (no fade, fixed endPx size)
  rgba: [number, number, number, number];
  startPx: number;    // initial CSS-px diameter (transient only)
  endPx: number;      // final CSS-px diameter (or fixed size if persistent)
  tag: 'transient' | 'search';
};

let _rings: RingEntry[] = [];

let _ringProg: any = null;
let _ringVbo: any = null;
let _ringInitialized = false;
let _ring_aPos = -1;
let _ring_aColor = -1;
let _ring_aT0 = -1;
let _ring_aDur = -1;
let _ring_aStartPx = -1;
let _ring_aEndPx = -1;
let _ring_uMV: any = null;
let _ring_uProj: any = null;
let _ring_uNowMs: any = null;
let _ring_uPixelScale: any = null;
let _ring_uOpacity: any = null;

const RING_STRIDE = 44; // 12 pos3D + 12 pos2D + 4 rgba + 4 t0 + 4 dur + 4 startPx + 4 endPx
const RING_FLOATS = RING_STRIDE / 4;
const R_POS3D_OFFSET = 0;
const R_POS2D_OFFSET = 12;
const R_COLOR_OFFSET = 24;
const R_T0_OFFSET = 28;
const R_DUR_OFFSET = 32;
const R_STARTPX_OFFSET = 36;
const R_ENDPX_OFFSET = 40;

// Defaults tuned to roughly match the pre-renderer CSS ring sizes (14 px
// transient, 22 px persistent search marker) but expanding outward over the
// life of the ping like the old `@keyframes ping-expand`. Mobile sizes are
// noticeably smaller — phone DPR=2.5–3× would otherwise blow a 28-CSS-px
// ring up to ~70–85 physical px, dominating the dot it's marking.
const DEFAULT_PING_DUR_MS = 450;
const DEFAULT_PING_START_PX = _IS_COARSE_POINTER ? 4 : 6;
const DEFAULT_PING_END_PX = _IS_COARSE_POINTER ? 14 : 28;
// Search ring is sized noticeably larger than the ping's peak so the
// thicker-stroke persistent marker reads at a glance against any sky
// background (the transient ping's expanded ring is the visual cue at
// search-time; the persistent ring is the lingering identifier).
const DEFAULT_SEARCH_RING_PX = _IS_COARSE_POINTER ? 10 : 22;

const RING_VERT_SRC = `\
attribute vec3 aPos;
attribute vec4 aColor;
attribute float aT0;
attribute float aDur;
attribute float aStartPx;
attribute float aEndPx;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float uNowMs;
uniform float uPixelScale;
varying vec4 vColor;
varying float vFade;
varying float vPersistent;
void main() {
  gl_Position = uPMatrix * uMVMatrix * vec4(aPos, 1.0);
  if (aDur < 0.0) {
    // Persistent ring (search marker): fixed size, no fade.
    gl_PointSize = aEndPx * uPixelScale;
    vFade = 1.0;
    vPersistent = 1.0;
  } else {
    float age = clamp((uNowMs - aT0) / aDur, 0.0, 1.0);
    // easeOut quadratic — quick initial expansion, settles at endPx.
    float ease = 1.0 - (1.0 - age) * (1.0 - age);
    gl_PointSize = mix(aStartPx, aEndPx, ease) * uPixelScale;
    vFade = 1.0 - age;
    vPersistent = 0.0;
  }
  vColor = aColor;
}
`;

// Stroke thickness: transient pings keep a thin ring (tight to the dot);
// persistent search rings get a noticeably thicker, wider band so they
// remain visible against bright sky surveys / Milky Way without relying on
// additive bloom.
const RING_FRAG_SRC = `\
precision mediump float;
varying vec4 vColor;
varying float vFade;
varying float vPersistent;
uniform float uOpacity;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r = length(p);
  float outerHi, outerLo, innerHi, innerLo;
  if (vPersistent > 0.5) {
    // Thicker band for the search marker (band ~0.20 wide vs 0.10).
    outerHi = 0.50; outerLo = 0.44;
    innerHi = 0.30; innerLo = 0.24;
  } else {
    outerHi = 0.50; outerLo = 0.46;
    innerHi = 0.40; innerLo = 0.36;
  }
  float outer = smoothstep(outerHi, outerLo, r);
  float inner = smoothstep(innerHi, innerLo, r);
  float a = max(outer - inner, 0.0);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vColor.rgb, a * uOpacity * vColor.a * vFade);
}
`;

function _initRings(gl: any) {
  const v = _compile(gl, gl.VERTEX_SHADER, RING_VERT_SRC);
  const f = _compile(gl, gl.FRAGMENT_SHADER, RING_FRAG_SRC);
  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.error('[ExoplanetCloud rings] program link error:', gl.getProgramInfoLog(p));
  }
  _ringProg = p;
  _ring_aPos     = gl.getAttribLocation(p, 'aPos');
  _ring_aColor   = gl.getAttribLocation(p, 'aColor');
  _ring_aT0      = gl.getAttribLocation(p, 'aT0');
  _ring_aDur     = gl.getAttribLocation(p, 'aDur');
  _ring_aStartPx = gl.getAttribLocation(p, 'aStartPx');
  _ring_aEndPx   = gl.getAttribLocation(p, 'aEndPx');
  _ring_uMV         = gl.getUniformLocation(p, 'uMVMatrix');
  _ring_uProj       = gl.getUniformLocation(p, 'uPMatrix');
  _ring_uNowMs      = gl.getUniformLocation(p, 'uNowMs');
  _ring_uPixelScale = gl.getUniformLocation(p, 'uPixelScale');
  _ring_uOpacity    = gl.getUniformLocation(p, 'uOpacity');
  _ringVbo = gl.createBuffer();
  _ringInitialized = true;
}

function _resolveColor(rowIndex: number, override?: string): [number, number, number, number] {
  if (override) return _hexToRGBA(override);
  const row = _rows[rowIndex];
  if (row && _colorFor) return _hexToRGBA(_colorFor(row.cat));
  return [255, 255, 255, 255];
}

/**
 * Spawn a transient ping ring at the given exoplanet row. The ring expands
 * from startPx to endPx and fades over durMs (defaults: 6 → 28 px, 450 ms),
 * tracking the exoplanet's world position so it stays anchored under camera
 * motion. Out-of-range rowIndex is silently ignored.
 */
export function startPing(
  rowIndex: number,
  t0Ms?: number,
  opts?: { color?: string; durMs?: number; startPx?: number; endPx?: number }
) {
  if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= _rows.length) return;
  const t0 = (typeof t0Ms === 'number' && Number.isFinite(t0Ms))
    ? t0Ms
    : (typeof performance !== 'undefined' ? performance.now() : 0);
  const dur = (opts && Number.isFinite(opts.durMs as number)) ? (opts!.durMs as number) : DEFAULT_PING_DUR_MS;
  const startPx = (opts && Number.isFinite(opts.startPx as number)) ? (opts!.startPx as number) : DEFAULT_PING_START_PX;
  const endPx = (opts && Number.isFinite(opts.endPx as number)) ? (opts!.endPx as number) : DEFAULT_PING_END_PX;
  _rings.push({
    rowIndex,
    t0Ms: t0,
    durMs: Math.max(1, dur),
    rgba: _resolveColor(rowIndex, opts?.color),
    startPx,
    endPx,
    tag: 'transient',
  });
}

/**
 * Set (or replace) the persistent search-result marker. Stays visible until
 * clearSearchRing() is called. At most one search ring exists at a time.
 */
export function setSearchRing(
  rowIndex: number,
  opts?: { color?: string; sizePx?: number }
) {
  clearSearchRing();
  if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= _rows.length) return;
  const sizePx = (opts && Number.isFinite(opts.sizePx as number)) ? (opts!.sizePx as number) : DEFAULT_SEARCH_RING_PX;
  _rings.push({
    rowIndex,
    t0Ms: 0,
    durMs: -1,
    rgba: _resolveColor(rowIndex, opts?.color),
    startPx: sizePx,
    endPx: sizePx,
    tag: 'search',
  });
}

/** Remove the persistent search ring, if any. */
export function clearSearchRing() {
  if (!_rings.length) return;
  _rings = _rings.filter(r => r.tag !== 'search');
}

function _drawRings(renderContext: any, opacity: number, is3D: boolean) {
  if (!_rings.length) return;
  const gl = renderContext.gl;
  if (!_ringInitialized) _initRings(gl);
  if (!_ringProg || !_ringVbo) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : 0;
  // Expire transient rings whose lifetime has ended.
  // Sort survivors so transient (additive-blended) rings draw first and
  // persistent (alpha-blended) rings draw last — see two-pass draw below.
  const transient: RingEntry[] = [];
  const persistent: RingEntry[] = [];
  for (const r of _rings) {
    if (r.durMs < 0) persistent.push(r);
    else if ((now - r.t0Ms) < r.durMs) transient.push(r);
  }
  _rings = transient.concat(persistent);
  if (!_rings.length) return;
  const transientCount = transient.length;
  const persistentCount = persistent.length;

  // Pack vertex data. One vertex per ring (gl.POINTS).
  const buf = new ArrayBuffer(_rings.length * RING_STRIDE);
  const f32 = new Float32Array(buf);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < _rings.length; i++) {
    const r = _rings[i];
    const row = _rows[r.rowIndex];
    if (!row) continue;
    const fo = i * RING_FLOATS;
    const bo = i * RING_STRIDE;
    // 3D world vertex (ecliptic-rotated AU) — matches dot pass layout.
    f32[fo + 0] = row.xR;
    f32[fo + 1] = row.yR;
    f32[fo + 2] = row.zR;
    // 2D unit-sphere vertex — matches WWT flat-buffer geoTo3dRad(Dec, RA, 1).
    f32[fo + 3] = row.cosRA * row.cosDec;
    f32[fo + 4] = row.sinDec;
    f32[fo + 5] = row.sinRA * row.cosDec;
    // rgba color at byte 24 (float index 6 aliases).
    u8[bo + R_COLOR_OFFSET + 0] = r.rgba[0];
    u8[bo + R_COLOR_OFFSET + 1] = r.rgba[1];
    u8[bo + R_COLOR_OFFSET + 2] = r.rgba[2];
    u8[bo + R_COLOR_OFFSET + 3] = r.rgba[3];
    f32[fo + 7]  = r.t0Ms;
    f32[fo + 8]  = r.durMs;
    f32[fo + 9]  = r.startPx;
    f32[fo + 10] = r.endPx;
  }

  gl.useProgram(_ringProg);
  // Reuse the same MV/P matrices computed for the dot pass (caller already
  // bound them on the dot program, but uniforms are per-program).
  const mv = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  gl.uniformMatrix4fv(_ring_uMV, false, mv.floatArray());
  gl.uniformMatrix4fv(_ring_uProj, false, renderContext.get_projection().floatArray());
  gl.uniform1f(_ring_uNowMs, now);
  gl.uniform1f(_ring_uPixelScale, (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1));
  gl.uniform1f(_ring_uOpacity, opacity);

  gl.bindBuffer(gl.ARRAY_BUFFER, _ringVbo);
  gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);

  if (_ring_aPos >= 0) {
    gl.enableVertexAttribArray(_ring_aPos);
    gl.vertexAttribPointer(
      _ring_aPos, 3, gl.FLOAT, false, RING_STRIDE,
      is3D ? R_POS3D_OFFSET : R_POS2D_OFFSET
    );
  }
  if (_ring_aColor >= 0) {
    gl.enableVertexAttribArray(_ring_aColor);
    gl.vertexAttribPointer(_ring_aColor, 4, gl.UNSIGNED_BYTE, true, RING_STRIDE, R_COLOR_OFFSET);
  }
  if (_ring_aT0 >= 0) {
    gl.enableVertexAttribArray(_ring_aT0);
    gl.vertexAttribPointer(_ring_aT0, 1, gl.FLOAT, false, RING_STRIDE, R_T0_OFFSET);
  }
  if (_ring_aDur >= 0) {
    gl.enableVertexAttribArray(_ring_aDur);
    gl.vertexAttribPointer(_ring_aDur, 1, gl.FLOAT, false, RING_STRIDE, R_DUR_OFFSET);
  }
  if (_ring_aStartPx >= 0) {
    gl.enableVertexAttribArray(_ring_aStartPx);
    gl.vertexAttribPointer(_ring_aStartPx, 1, gl.FLOAT, false, RING_STRIDE, R_STARTPX_OFFSET);
  }
  if (_ring_aEndPx >= 0) {
    gl.enableVertexAttribArray(_ring_aEndPx);
    gl.vertexAttribPointer(_ring_aEndPx, 1, gl.FLOAT, false, RING_STRIDE, R_ENDPX_OFFSET);
  }

  // Two-pass draw so transient pings keep their additive glow while the
  // persistent search ring uses normal alpha compositing — additive blends
  // dark ring colors into bright backgrounds (Milky Way, HiPS sky surveys)
  // until they're invisible. Normal alpha replaces the background and stays
  // readable on any surface. DEPTH_TEST already off / depthMask already
  // false from the dot pass; outer save/restore in drawExoplanetCloud
  // resets these back to WWT's expected state.
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);

  if (transientCount > 0) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, transientCount);
  }
  if (persistentCount > 0) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, transientCount, persistentCount);
  }

  if (_ring_aPos >= 0)     gl.disableVertexAttribArray(_ring_aPos);
  if (_ring_aColor >= 0)   gl.disableVertexAttribArray(_ring_aColor);
  if (_ring_aT0 >= 0)      gl.disableVertexAttribArray(_ring_aT0);
  if (_ring_aDur >= 0)     gl.disableVertexAttribArray(_ring_aDur);
  if (_ring_aStartPx >= 0) gl.disableVertexAttribArray(_ring_aStartPx);
  if (_ring_aEndPx >= 0)   gl.disableVertexAttribArray(_ring_aEndPx);
}

/**
 * Per-frame draw, gated by window.__cloudDots so it can be A/B-tested
 * against WWT's textured point path. Saves and restores GL state so it
 * doesn't perturb WWT's renderer.
 */
export function drawExoplanetCloud(renderContext: any, opacity: number) {
  if (typeof window === 'undefined') return;
  // Renderer is the default exoplanet dot path. Opt-out for debugging via
  // `window.__cloudDots = false` (any other value keeps it on).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).__cloudDots === false) return;
  if (!renderContext || !renderContext.gl) return;
  const gl = renderContext.gl;

  if (!_initialized) _init(gl);
  if (_stagedRows && _stagedColorFor) {
    _uploadRows(_stagedRows, _stagedColorFor);
    _rows = _stagedRows;
    _colorFor = _stagedColorFor;
    _stagedRows = null;
    _stagedColorFor = null;
  }
  if (_vertexCount === 0 || !_prog || !_vbo) return;

  // ── save the bits of GL state we touch ───────────────
  const oldProg     = gl.getParameter(gl.CURRENT_PROGRAM);
  const oldArrBuf   = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  const oldBlend    = gl.isEnabled(gl.BLEND);
  const oldBlendSrc = gl.getParameter(gl.BLEND_SRC_RGB);
  const oldBlendDst = gl.getParameter(gl.BLEND_DST_RGB);
  const oldDepth    = gl.isEnabled(gl.DEPTH_TEST);
  const oldDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);

  gl.useProgram(_prog);

  // mv = world × view (WWT's Matrix3d row order — see SimpleLineShader.use
  // in @wwtelescope/engine for the same pattern).
  const mv = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  gl.uniformMatrix4fv(_uMV, false, mv.floatArray());
  gl.uniformMatrix4fv(_uProj, false, renderContext.get_projection().floatArray());

  // Mode detection: 3D = solar-system mode, 2D = sky mode. WWT's spreadsheet
  // layer uses different per-vertex layouts in each (see file header note);
  // we mirror that by switching the aPos attrib pointer's byte offset.
  const ctl = (WWTControl as any).singleton;
  const is3D = !!(ctl && typeof ctl.get_solarSystemMode === 'function' && ctl.get_solarSystemMode());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Per-mode, per-device default sizes (CSS px; multiplied by DPR below).
  // Desktop dots are bumped slightly larger to read on big monitors; mobile
  // dots are noticeably smaller since DPR=2.5–3× already inflates each CSS
  // px on phones. __cloudDotSize is a global override (both modes/devices)
  // for quick A/B; per-mode overrides also apply to both devices.
  const DEFAULT_DOT_SIZE_2D = _IS_COARSE_POINTER ? 4 : 6;
  const DEFAULT_DOT_SIZE_3D = _IS_COARSE_POINTER ? 2 : 4;
  const sizeOverride = (w.__cloudDotSize as number | undefined);
  let sizeForMode = is3D
    ? ((w.__cloudDotSize3D as number | undefined) ?? sizeOverride ?? DEFAULT_DOT_SIZE_3D)
    : ((w.__cloudDotSize2D as number | undefined) ?? sizeOverride ?? DEFAULT_DOT_SIZE_2D);

  const sizeMin = sizeForMode;
  const sizeMax = sizeForMode * 1.5;
  const b = (sizeMax - sizeMin) / 10;
  const a = sizeMax - b * 20;
  sizeForMode = Math.round(a + b * Math.log(renderContext.viewCamera.zoom));

  const dpr = window.devicePixelRatio || 1;
  gl.uniform1f(_uPixelScale, sizeForMode * dpr);
  gl.uniform1f(_uOpacity, opacity);
  gl.uniform1f(_uNowDays, _nowDays);
  gl.uniform1f(_uCatMask, _catMask);

  // Hollow vs filled: 2D defaults to hollow rings, 3D to filled discs.
  // Both individually overridable via window.__cloudHollow2D / 3D.
  const defaultHollow = is3D ? !!w.__cloudHollow3D : (w.__cloudHollow2D !== false);
  gl.uniform1f(_uHollow, defaultHollow ? 1.0 : 0.0);

  gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // WWT's shaders leave attribs 0–3 enabled; SimpleLineShader.use disables
  // them defensively, we do the same.
  gl.disableVertexAttribArray(0);
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);

  if (_aPos >= 0) {
    gl.enableVertexAttribArray(_aPos);
    gl.vertexAttribPointer(
      _aPos, 3, gl.FLOAT, false, VERT_STRIDE,
      is3D ? POS3D_OFFSET : POS2D_OFFSET
    );
  }
  if (_aColor >= 0) {
    gl.enableVertexAttribArray(_aColor);
    gl.vertexAttribPointer(_aColor, 4, gl.UNSIGNED_BYTE, true, VERT_STRIDE, COLOR_OFFSET);
  }
  if (_aCatBit >= 0) {
    gl.enableVertexAttribArray(_aCatBit);
    gl.vertexAttribPointer(_aCatBit, 1, gl.FLOAT, false, VERT_STRIDE, CATBIT_OFFSET);
  }
  if (_aStartDays >= 0) {
    gl.enableVertexAttribArray(_aStartDays);
    gl.vertexAttribPointer(_aStartDays, 1, gl.FLOAT, false, VERT_STRIDE, STARTDAYS_OFFSET);
  }
  if (_aEndDays >= 0) {
    gl.enableVertexAttribArray(_aEndDays);
    gl.vertexAttribPointer(_aEndDays, 1, gl.FLOAT, false, VERT_STRIDE, ENDDAYS_OFFSET);
  }

  // Default to standard alpha compositing. Switch to additive via
  // window.__cloudBlend = 'additive' for cluster bloom (Kepler field glow).
  const blendMode = (w.__cloudBlend as string) || 'normal';
  gl.enable(gl.BLEND);
  if (blendMode === 'additive') {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  } else {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);

  gl.drawArrays(gl.POINTS, 0, _vertexCount);

  if (_aPos >= 0)       gl.disableVertexAttribArray(_aPos);
  if (_aColor >= 0)     gl.disableVertexAttribArray(_aColor);
  if (_aCatBit >= 0)    gl.disableVertexAttribArray(_aCatBit);
  if (_aStartDays >= 0) gl.disableVertexAttribArray(_aStartDays);
  if (_aEndDays >= 0)   gl.disableVertexAttribArray(_aEndDays);

  // Ring pass — timeline pings and the persistent search ring. Both
  // anchored to the exoplanet's world vertex so they track the dot under
  // camera motion (the CSS-overlay path they replace was screen-space and
  // didn't). Shares the dot pass's save/restore window.
  _drawRings(renderContext, opacity, is3D);

  // ── restore GL state ─────────────────────────────────
  if (oldBlend) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
  gl.blendFunc(oldBlendSrc, oldBlendDst);
  if (oldDepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
  gl.depthMask(oldDepthMask);
  gl.bindBuffer(gl.ARRAY_BUFFER, oldArrBuf);
  gl.useProgram(oldProg);
}
