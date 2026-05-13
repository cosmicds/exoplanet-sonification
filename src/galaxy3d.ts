// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable */

/* === Galaxy3D ============================================================
 * Procedural 3D point-cloud Milky Way for the WWT solar-system (3D) view.
 *
 * Replaces the flat edge-on milkywaybar.jpg quad with a real 3D star
 * distribution: thin disk + thick disk + bulge + bar + four spiral arms +
 * halo, attenuated by a 3D dust-cloud field along the arms. The star colors
 * mimic Gaia all-sky density renderings (yellow/orange bulge, blue knots in
 * spiral arms, warm interarm disk, cool faint halo).
 *
 * Structural numbers are taken from Bland-Hawthorn & Gerhard (2016), with the
 * bar position angle and "more than two arms but less prominent" guidance
 * from the ESA Gaia Milky Way page.
 *
 * To remove entirely, delete this file and the two short blocks marked
 * "=== Galaxy3D ===" in src/exo-sonification.vue.
 *
 * To disable without uninstalling, set GALAXY3D_ENABLED below to false.
 * ========================================================================*/

import {
  Color, Coordinates, Dates, Grids, PointList,
  SpaceTimeController, Vector3d
} from "@wwtelescope/engine";


// ── Master switch ─────────────────────────────────────────────────────────
export const GALAXY3D_ENABLED = false;

// ── Adaptive particle budget ──────────────────────────────────────────────
// Mirrors the (pointer: coarse) check that getDeviceScales uses elsewhere.
function targetStarCount(): number {
  const coarse = typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(pointer: coarse)").matches;
  return coarse ? 100_000 : 1_500_000;
}

// ── Galactic structure constants ──────────────────────────────────────────
// Distances are in parsecs unless otherwise marked.
const PC_TO_AU       = 206264.806;
const R0_PC          = 8200;       // Sun → Galactic Centre (Bland-Hawthorn & Gerhard 2016)
const DISK_R_INNER   = 200;        // pc, inner cutoff (bulge takes over)
const DISK_R_OUTER   = 15000;      // pc, edge of stellar disk
const HR_THIN        = 2600;       // thin-disk scale length
const HZ_THIN        = 300;        // thin-disk scale height
const HR_THICK       = 2000;       // thick-disk scale length
const HZ_THICK       = 900;        // thick-disk scale height
const BULGE_SCALE    = 700;        // bulge effective radius (pc)
const BAR_HALF_LEN   = 5000;       // half-length along bar major axis
const BAR_HALF_WID   = 1000;       // half-width
const BAR_HALF_HGT   = 500;        // half-height
// Bar position angle to Sun-GC line. Negative because the near end of the
// bar lies at positive Galactic longitude (l ≈ +27°), so in our
// "Sun at galactocentric (-R0, 0, 0)" frame the bar's near (negative-x) end
// must rotate to positive y.
const BAR_PA_RAD     = -27 * Math.PI / 180;
const HALO_SCALE     = 8000;       // halo Plummer-like radius
const HALO_R_MAX     = 30000;

// Spiral arms: 4 logarithmic arms (Sagittarius, Scutum-Centaurus, Perseus,
// Norma/Outer), pitch ≈ 12°, base radius 3 kpc.
const ARM_COUNT      = 4;
const ARM_PITCH_RAD  = 12 * Math.PI / 180;
const ARM_R0         = 3500;
const ARM_SIGMA      = 0.30;       // gaussian width in azimuth (radians)
const ARM_BOOST      = 4.0;        // multiplicative density bonus inside arms

// Population fractions of the total budget. Tuned so the disk dominates
// while the bulge and arms still read clearly from outside.
const FRAC_THIN      = 0.62;
const FRAC_THICK     = 0.12;
const FRAC_BULGE     = 0.16;
const FRAC_BAR       = 0.05;
const FRAC_HALO      = 0.05;       // (remaining = 1.0)

// ── Dust ─────────────────────────────────────────────────────────────────
// "Prominent — full dust-lane network" per design choice. Hundreds of dark
// ellipsoidal clouds in the midplane, biased onto the spiral arm tangents.
// Stars whose galactocentric position falls inside a cloud are dimmed or
// rejected, carving the visible dark veins.
const DUST_CLOUDS_DESKTOP = 320;
const DUST_CLOUDS_MOBILE  = 140;

interface DustCloud {
  cx: number; cy: number; cz: number;
  rx: number; ry: number; rz: number;
  cosPhi: number; sinPhi: number;
}

// ── Per-star draw size (world-space AU) ───────────────────────────────────
// Tuned so the disk fills the field nicely from a 50-kpc vantage point.
const STAR_SIZE_AU       = 1.6e7;
const STAR_SIZE_HALO_AU  = 1.0e7;
const STAR_SIZE_BULGE_AU = 1.8e7;

// ── Galactic → ICRS rotation matrix (J2000) ───────────────────────────────
// Liu et al. (2011) values, written column-major so M * (1,0,0) is the unit
// vector toward the Galactic Centre in ICRS, M * (0,0,1) the vector toward
// the NGP. Applied to heliocentric Cartesian galactic vectors (X = +toward
// GC, Y = +toward l=90°, Z = +NGP); one further rotateX(ecliptic) lands in
// WWT's solar-system world space, matching how stars3D and the 2D bar are
// oriented.
const M_GE_00 = -0.054875560; const M_GE_01 =  0.494109440; const M_GE_02 = -0.867666150;
const M_GE_10 = -0.873437090; const M_GE_11 = -0.444829620; const M_GE_12 = -0.198076380;
const M_GE_20 = -0.483835020; const M_GE_21 =  0.746982140; const M_GE_22 =  0.455983820;

function galacticToWorldAU(xPc: number, yPc: number, zPc: number, eclipticRad: number): Vector3d {
  // Translate galactocentric → heliocentric. Convention: Sun at galactocentric
  // (-R0, 0, 0), so the heliocentric +X points from the Sun toward the GC,
  // matching the IAU heliocentric galactic frame that M_GE expects.
  const xh = (xPc + R0_PC) * PC_TO_AU;
  const yh =  yPc           * PC_TO_AU;
  const zh =  zPc           * PC_TO_AU;
  // Rotate galactic → ICRS (standard math convention: y_std = cos δ sin α,
  // z_std = sin δ).
  const xe = M_GE_00 * xh + M_GE_01 * yh + M_GE_02 * zh;
  const ye = M_GE_10 * xh + M_GE_11 * yh + M_GE_12 * zh;
  const ze = M_GE_20 * xh + M_GE_21 * yh + M_GE_22 * zh;
  // WWT swaps the y/z axes: Coordinates.raDecTo3dAu emits (cos α cos δ,
  // sin δ, sin α cos δ) — Y is the declination axis, not Z. To land in the
  // same world frame as Hipparcos stars and the existing 2D bar (both of
  // which feed through that swap), we reorder ye ↔ ze before rotateX.
  const v  = Vector3d.create(xe, ze, ye);
  v.rotateX(eclipticRad);          // ICRS → WWT ecliptic-of-date world
  return v;
}

// ── Stellar palette (Gaia BP-RP-style) ────────────────────────────────────
// Each entry is [R, G, B] for a population, the colors visually inspired by
// Gaia's all-sky density renderings.
const COL_BULGE_HOT  : [number, number, number] = [255, 220, 170];
const COL_BULGE_COOL : [number, number, number] = [255, 180, 120];
const COL_BAR        : [number, number, number] = [255, 200, 140];
const COL_ARM_BLUE   : [number, number, number] = [180, 210, 255];
const COL_ARM_WHITE  : [number, number, number] = [240, 245, 255];
const COL_INTERARM   : [number, number, number] = [255, 235, 200];
const COL_THICK      : [number, number, number] = [255, 205, 160];
const COL_HALO       : [number, number, number] = [220, 225, 255];

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function makeColor(rgb: [number, number, number], att: number): Color {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * att)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * att)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * att)));
  return Color.fromArgb(255, r, g, b);
}

// ── Sampling helpers ──────────────────────────────────────────────────────
function rndExp(scale: number): number {
  // Exponential PDF, mean = scale.
  return -scale * Math.log(1 - Math.random());
}

function rndDoubleExp(scale: number): number {
  // Symmetric double-sided exponential, mean(|x|) = scale.
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * rndExp(scale);
}

function rndGauss(): number {
  // Box-Muller, single sample.
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Spiral arm field ──────────────────────────────────────────────────────
// Returns a smooth boost in [0, ARM_BOOST] indicating how strongly the
// (x, y) galactocentric point lies on a spiral arm. Used both to bias star
// samples into arms and to decide the local color palette.
function armBoost(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r < ARM_R0 * 0.7 || r > DISK_R_OUTER) return 0;
  const phi = Math.atan2(y, x);
  const baseTheta = Math.log(r / ARM_R0) / Math.tan(ARM_PITCH_RAD);
  // Decreasing arm contrast with radius — Gaia notes arms are less prominent
  // than older models suggested, so we soften them past R ~ 10 kpc.
  const fade = r > 10000 ? Math.exp(-(r - 10000) / 4000) : 1;
  let best = 0;
  for (let n = 0; n < ARM_COUNT; n++) {
    const phiArm = baseTheta + n * (2 * Math.PI / ARM_COUNT);
    let d = (phi - phiArm) % (2 * Math.PI);
    if (d >  Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const w = Math.exp(-(d * d) / (2 * ARM_SIGMA * ARM_SIGMA));
    if (w > best) best = w;
  }
  return ARM_BOOST * fade * best;
}

// ── Dust cloud field ──────────────────────────────────────────────────────
function buildDustClouds(count: number): DustCloud[] {
  const out: DustCloud[] = new Array(count);
  for (let i = 0; i < count; i++) {
    // Place along an arm at random radius in the bright band.
    const r   = 2500 + Math.pow(Math.random(), 0.6) * 11000;     // pc
    const arm = (i % ARM_COUNT) + Math.floor(Math.random() * ARM_COUNT);
    const baseTheta = Math.log(r / ARM_R0) / Math.tan(ARM_PITCH_RAD);
    const phi = baseTheta + (arm % ARM_COUNT) * (2 * Math.PI / ARM_COUNT)
              + (Math.random() - 0.5) * 0.18;                    // radians of jitter
    const cx = r * Math.cos(phi);
    const cy = r * Math.sin(phi);
    const cz = (Math.random() - 0.5) * 110;                      // |z| up to ~55 pc
    // Major axis aligned roughly along the arm tangent direction. The
    // tangent of a logarithmic spiral makes angle (φ + π/2 - pitch) with +x.
    const tangent = phi + Math.PI / 2 - ARM_PITCH_RAD;
    const lengthPc = 250 + Math.pow(Math.random(), 0.7) * 1100;  // some long lanes
    const widthPc  = 70  + Math.random() * 220;
    const heightPc = 35  + Math.random() * 50;
    out[i] = {
      cx, cy, cz,
      rx: lengthPc, ry: widthPc, rz: heightPc,
      cosPhi: Math.cos(tangent),
      sinPhi: Math.sin(tangent),
    };
  }
  return out;
}

// Returns a multiplicative attenuation in [0, 1]. 0 = fully extinguished.
// We use the *worst* cloud (min) rather than product of all so a single
// dense cloud can carve a clean dark void.
function dustAttenuation(x: number, y: number, z: number, clouds: DustCloud[]): number {
  let att = 1;
  for (let i = 0; i < clouds.length; i++) {
    const c  = clouds[i];
    const dx = x - c.cx, dy = y - c.cy, dz = z - c.cz;
    // Quick bbox reject.
    if (Math.abs(dz) > c.rz * 1.5) continue;
    if (Math.abs(dx) > c.rx * 1.5 && Math.abs(dy) > c.rx * 1.5) continue;
    const lx =  c.cosPhi * dx + c.sinPhi * dy;
    const ly = -c.sinPhi * dx + c.cosPhi * dy;
    const d2 = (lx / c.rx) * (lx / c.rx)
             + (ly / c.ry) * (ly / c.ry)
             + (dz / c.rz) * (dz / c.rz);
    if (d2 < 1) {
      // Smooth: interior fully dark, edge gradient.
      const local = d2 * d2;          // 0 at centre, 1 at boundary
      if (local < att) att = local;
    }
  }
  return att;
}

// ── Component samplers ────────────────────────────────────────────────────
// Each returns a galactocentric Cartesian position in pc.

function sampleThinDisk(): [number, number, number] {
  // Pick radius from exponential, accept/reject window.
  let r: number;
  do { r = rndExp(HR_THIN); } while (r < DISK_R_INNER || r > DISK_R_OUTER);
  const phi = Math.random() * 2 * Math.PI;
  const z   = rndDoubleExp(HZ_THIN);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

function sampleThickDisk(): [number, number, number] {
  let r: number;
  do { r = rndExp(HR_THICK); } while (r < DISK_R_INNER || r > DISK_R_OUTER);
  const phi = Math.random() * 2 * Math.PI;
  const z   = rndDoubleExp(HZ_THICK);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

function sampleBulge(): [number, number, number] {
  // Roughly de-Vaucouleurs in radius, oblate.
  const r = BULGE_SCALE * Math.pow(-Math.log(1 - Math.random()), 1 / 4);
  const u = Math.random() * 2 - 1;
  const t = Math.random() * 2 * Math.PI;
  const sx = Math.sqrt(1 - u * u) * Math.cos(t);
  const sy = Math.sqrt(1 - u * u) * Math.sin(t);
  const sz = u;
  // Slight axial-ratio flattening.
  return [r * sx, r * sy, r * 0.7 * sz];
}

function sampleBar(): [number, number, number] {
  // Triaxial Gaussian along the bar's principal axes, then rotate by BAR_PA.
  const ax = rndGauss() * BAR_HALF_LEN * 0.5;
  const ay = rndGauss() * BAR_HALF_WID * 0.5;
  const az = rndGauss() * BAR_HALF_HGT * 0.5;
  const c = Math.cos(BAR_PA_RAD), s = Math.sin(BAR_PA_RAD);
  return [c * ax - s * ay, s * ax + c * ay, az];
}

function sampleHalo(): [number, number, number] {
  // Plummer-like, isotropic.
  let r: number;
  do {
    r = HALO_SCALE * Math.tan(Math.random() * (Math.PI / 2 - 0.05));
  } while (r > HALO_R_MAX);
  const u = Math.random() * 2 - 1;
  const t = Math.random() * 2 * Math.PI;
  const sx = Math.sqrt(1 - u * u) * Math.cos(t);
  const sy = Math.sqrt(1 - u * u) * Math.sin(t);
  const sz = u;
  return [r * sx, r * sy, r * 0.8 * sz];
}

// ── Build the PointList (cached after first build) ────────────────────────
let _galaxyList: PointList | null = null;
let _galaxyBuilding = false;

function buildGalaxy(renderContext): PointList {
  const total = targetStarCount();
  const dustCount = total >= 300_000 ? DUST_CLOUDS_DESKTOP : DUST_CLOUDS_MOBILE;
  const clouds = buildDustClouds(dustCount);

  const list = new PointList(renderContext);
  list.depthBuffered = false;
  list.showFarSide   = true;
  list.scale         = 1;
  list.minSize       = 1;
  list.timeSeries    = false;

  const ecliptic = Coordinates.meanObliquityOfEcliptic(SpaceTimeController.get_jNow()) / 180 * Math.PI;

  const N_THIN  = Math.round(total * FRAC_THIN);
  const N_THICK = Math.round(total * FRAC_THICK);
  const N_BULGE = Math.round(total * FRAC_BULGE);
  const N_BAR   = Math.round(total * FRAC_BAR);
  const N_HALO  = total - N_THIN - N_THICK - N_BULGE - N_BAR;

  const dates = new Dates(0, 1);

  // Thin disk — dust applies, arms bias colors blue-ward.
  let placed = 0, attempts = 0;
  while (placed < N_THIN && attempts < N_THIN * 4) {
    attempts++;
    const [x, y, z] = sampleThinDisk();
    const boost = armBoost(x, y);
    // Arm-density rejection: stronger boost → higher acceptance.
    if (Math.random() > (1 + boost) / (1 + ARM_BOOST)) continue;
    const att = dustAttenuation(x, y, z, clouds);
    // Very dark cloud cores cull the star outright; mid-extinction dims it.
    if (att < 0.05 && Math.random() > att * 4) continue;

    const inArm = boost > 1.2;
    let palette: [number, number, number];
    if (inArm) {
      // Arm: blue knots and white interspersed.
      palette = lerpColor(COL_ARM_WHITE, COL_ARM_BLUE, Math.random() * 0.85);
    } else {
      palette = lerpColor(COL_INTERARM, COL_ARM_WHITE, Math.random() * 0.4);
    }
    const v = galacticToWorldAU(x, y, z, ecliptic);
    list.addPoint(v, makeColor(palette, att), dates, STAR_SIZE_AU);
    placed++;
  }

  // Thick disk — slightly redder, no arm boost, partial dust.
  for (let i = 0; i < N_THICK; i++) {
    const [x, y, z] = sampleThickDisk();
    const att = 0.5 + 0.5 * dustAttenuation(x, y, z, clouds);    // dust mostly thinner
    const palette = lerpColor(COL_THICK, COL_INTERARM, Math.random() * 0.4);
    const v = galacticToWorldAU(x, y, z, ecliptic);
    list.addPoint(v, makeColor(palette, att), dates, STAR_SIZE_AU);
  }

  // Bulge — dense yellow-orange core, no dust attenuation (extinction is
  // mostly *between* the bulge and the Sun, an effect we leave to the eye).
  for (let i = 0; i < N_BULGE; i++) {
    const [x, y, z] = sampleBulge();
    const palette = lerpColor(COL_BULGE_HOT, COL_BULGE_COOL, Math.random());
    const v = galacticToWorldAU(x, y, z, ecliptic);
    list.addPoint(v, makeColor(palette, 1), dates, STAR_SIZE_BULGE_AU);
  }

  // Bar — extends the bulge along the position-angle axis.
  for (let i = 0; i < N_BAR; i++) {
    const [x, y, z] = sampleBar();
    const v = galacticToWorldAU(x, y, z, ecliptic);
    list.addPoint(v, makeColor(COL_BAR, 1), dates, STAR_SIZE_BULGE_AU);
  }

  // Halo — sparse, faint, cool.
  for (let i = 0; i < N_HALO; i++) {
    const [x, y, z] = sampleHalo();
    const v = galacticToWorldAU(x, y, z, ecliptic);
    list.addPoint(v, makeColor(COL_HALO, 0.55), dates, STAR_SIZE_HALO_AU);
  }

  return list;
}

// ── Public entry point: drop-in replacement for Grids.drawGalaxyImage ─────
// Called only from the solar-system render path (3D mode), so we can render
// the point cloud unconditionally here. The original 2D bar quad is not
// drawn; in 2D mode `drawGalaxyImage` is never called by the engine.
export function drawGalaxy3D(renderContext, _opacity: number) {
  if (!GALAXY3D_ENABLED) return;

  if (_galaxyList == null && !_galaxyBuilding) {
    _galaxyBuilding = true;
    try {
      _galaxyList = buildGalaxy(renderContext);
    } finally {
      _galaxyBuilding = false;
    }
  }
  if (_galaxyList == null) return;

  // Mild zoom-aware fade so the cloud doesn't pop in at the wrong scale.
  const zoom = renderContext.viewCamera.zoom;
  const opacity = Math.min(1, Math.max(0, (Math.log(Math.max(1, zoom)) - 14) / 6));
  if (opacity <= 0) return;

  _galaxyList.draw(renderContext, opacity, false);
}

// ── Installer ─────────────────────────────────────────────────────────────
// One-call install. Called from src/exo-sonification.vue (mounted hook).
// Replaces the WWT 2D-bar draw routine with our 3D version.
export function installGalaxy3D(): void {
  if (!GALAXY3D_ENABLED) return;
  // @ts-ignore -- monkey-patch
  Grids.drawGalaxyImage = drawGalaxy3D;
}

// ── Optional: rebuild (e.g. when the user changes mobile/desktop tier) ────
export function rebuildGalaxy3D(): void {
  _galaxyList = null;
}
