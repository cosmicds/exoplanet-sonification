<template>
  <v-app
    id="app"
    :style="cssVars"
  >
  <div
    id="main-content"
  ><!--@click="stopMotion" WWW-->
    <WorldWideTelescope
      :wwt-namespace="wwtNamespace"
      @pointerdown="wwtOnPointerDown"
      @pointermove="wwtOnPointerMove"
      @pointerup="wwtOnPointerUp"
    ></WorldWideTelescope>

    <wwt-hud
      v-if="false"
      :wwt-namespace="wwtNamespace"
      :location="{top: '5rem', right: '1rem'}"
      :offset-center="{x: 0, y: 0}"
      :other-variables="{position3D: position3D, position2D: position2D, mode: modeReactive}"
      text-shadow="none"
      font-size="0.8em"
    ></wwt-hud>

    <transition name="fade">
      <div
        class="modal"
        id="modal-loading"
        v-show="isLoading"
      >
        <div class="container">
          <div class="spinner"></div>
          <p>Loading …</p>
        </div>
      </div>
    </transition>

      <!-- This brings up the hamburger menu icon and the menu itself -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

      <div class="hamb-icon-container">
        <button class="menu-toggle" @click="toggleMenu">
          <i class="fas fa-sliders-h" style="font-size: 24px;"></i>
        </button>

        <ul class="hamb-menu-container" :class="{'show': isMenuOpen }">

        <li class="hamb-menu-items" @click="openIntro">
          <i class="fas fa-regular fa-info-circle"></i>
          Overview
        </li>

        <li class="hamb-menu-items" @click="toggleSearch">
          <i class="fas fa-search"></i> Search Exoplanets
        </li>
        
        <li v-if="currentTool !== 'sky-survey'" class="hamb-menu-items" @click="toggleCrossfadeSky">
          <i class="fas fa-adjust"></i> Crossfade Sky Survey (2D)
        </li>
        <li v-else class="hamb-menu-items" @click="toggleCrossfadeSky">
          <i class="fas fa-clock"></i> Discovery Timeline
        </li>

        <li class="hamb-menu-items" @click="showConstellations = !showConstellations; isMenuOpen = false">
          <i :class="showConstellations ? 'fas fa-star' : 'far fa-star'"></i>
          Constellations {{ showConstellations ? '(on)' : '(off)' }}
        </li>

        <li class="hamb-menu-items" @click="openLink('https://www.rocketcenter.com/INTUITIVEPlanetarium/InteractiveAstronomy')">
          <i class="fas fa-solid fa-rocket"></i>
          <i> INTUITIVE</i><sup>®</sup>
          Planetarium
        </li>

        <li class="hamb-menu-items" @click="openLink('https://worldwidetelescope.org/')">
          <img alt="WWT Logo" src="./assets/logo_wwt.png" width="18" height="18" style="vertical-align: middle;"/>
          WorldWide Telescope
        </li>

        <li class="hamb-menu-items" @click="openLink('https://exoplanetarchive.ipac.caltech.edu/')">
          <img alt="NASA" src="https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg" width="22" height="22" style="vertical-align: middle;"/>
          Exoplanet Archive
        </li>

      </ul>
    </div>  

      <!-- This is the intro text -->
      <transition name="intro-fade">
        <div class="intro-backdrop" v-if="showIntro" @click.self="closeIntro">
          <div class="intro-modal">

            <button class="intro-modal-close" @click="closeIntro" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>

            <!-- Logos -->
            <div class="intro-modal-logos">
              <a href="https://www.rocketcenter.com/INTUITIVEPlanetarium" target="_blank">
                <img alt="INTUITIVE Planetarium at the U.S. Space &amp; Rocket Center" src="./assets/ip-ussrc.png" class="intro-logo-ip" />
              </a>
              <div class="intro-logo-row">
                <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" class="intro-logo-attr">
                  <img alt="CosmicDS" src="https://static.wixstatic.com/media/446f6c_f07666e200744b08bb3a0a3c108887f5~mv2.png" class="intro-logo-cds" />
                  <span>Interactive developed using the CosmicDS toolkit</span>
                </a>
              </div>
              <div class="intro-logo-row">
                <a href="https://worldwidetelescope.org/home/" target="_blank" class="intro-logo-attr">
                  <img alt="WorldWide Telescope" src="./assets/logo_wwt.png" class="intro-logo-wwt" />
                  <span>Powered by WorldWide Telescope</span>
                </a>
              </div>
            </div>

            <h1 class="intro-modal-title">{{ introTitle }}</h1>

            <div class="intro-audio-notice">
              <i class="fas fa-volume-up"></i>
              <span>Turn on audio and raise your volume for the best experience.</span>
            </div>

            <div class="intro-body-wrap">
              <transition name="intro-arrow-fade">
                <div v-if="introCanScrollUp" class="intro-scroll-hint intro-scroll-up" @click="introScrollBody(-120)">
                  <i class="fas fa-chevron-up"></i>
                </div>
              </transition>

              <div class="intro-modal-body" ref="introBody" @scroll="onIntroBodyScroll">

              <p>
                Explore all 6,286 known exoplanets — planets discovered beyond our solar system — visualized in
                <a href="https://worldwidetelescope.org/home/" target="_blank" class="links">WorldWide Telescope</a>
                across a 2D all-sky map and a 3D Milky Way galaxy.
                Exoplanet data was retrieved from the
                <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" class="links">NASA Exoplanet Archive</a>.
              </p>

              <div class="intro-how-to">
                <h2 class="intro-section-title">How to Use</h2>
                <ul class="intro-instructions">
                  <li>
                    <span class="intro-icon"><i class="fas fa-music"></i></span>
                    <span><strong>Sonify:</strong> Press <em>Play</em> to hear exoplanet discoveries unfold through time — each planet's orbital period maps to a guitar note. Higher-pitched notes correspond to shorter orbital periods (fast orbits close to their star); lower-pitched notes correspond to longer orbital periods (slow orbits farther out). Single-click plays from the current year; double-click (or when the timeline is at the end) restarts from 1992.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-arrows-alt"></i></span>
                    <span><strong>Navigate:</strong> Click &amp; drag (or touch drag) to pan. Scroll wheel or pinch to zoom.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-sliders-h"></i></span>
                    <span><strong>Timeline:</strong> Drag the year slider to show only exoplanets discovered up to that year. The slider also controls where <em>Play</em> begins if you single-click it.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-rocket"></i></span>
                    <span><strong>Switch views:</strong> Press <em>View 3D Galaxy</em> / <em>View 2D Sky</em> to toggle between all-sky imagery and a 3D Milky Way.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-dot-circle"></i></span>
                    <span><strong>Identify (mobile):</strong> Use the reticle button to enable the planet reticle. Pan the sky so an exoplanet enters the reticle ring to hear its tone and see its details. Tap the button again to dismiss it.</span>
                  </li>
									<li>
                    <span class="intro-icon"><i class="fas fa-mouse-pointer"></i></span>
                    <span><strong>Identify (desktop):</strong> Hover over a dot to see its name, discovery method, and distance — and hear its orbital-period tone.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-search"></i></span>
                    <span><strong>Search:</strong> Use the <i class="fas fa-search"></i> button to find a specific exoplanet by name and jump to it on the sky.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-layer-group"></i></span>
                    <span><strong>Discovery Types:</strong> Use the <em>Discovery Types</em> menu to show or hide planets by how they were found.</span>
                  </li>
                  <li>
                    <span class="intro-icon"><i class="fas fa-adjust"></i></span>
                    <span><strong>Sky surveys (2D only):</strong> Open <em>Crossfade Sky Survey</em> from the menu to blend between optical and other wavelength views, then tap <em>Change Sky Survey</em> to pick a dataset.</span>
                  </li>
                </ul>
              </div>

              <p>
                Interactive created by
                <a href="https://bsky.app/profile/adavidweigel.bsky.social" target="_blank" class="links">A. David Weigel, </a>
								<a href="https://www.jcarifio.com/projects" target="_blank" class="links">Jon Carifio,</a>
                and Will Taylor.
              </p>

							<p>
								Sonification created by Alex Shepard.
							</p>

              <p>
                Special thanks to Faith Williams for UI suggestions and color theory advice and to the
                <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" class="links">Cosmic Data Stories</a>
                team (Pat Udomprasert, John Lewis, and Jon Carifio) for various creative advice.
              </p>

              <p>
                David would like to dedicate this exoplanet sonification explorer to celebrate the memory of Mac Motes &mdash; his kindness was apparent to everyone who crossed paths with him and he would've enjoyed this interactive more than anyone.
              </p>

              </div><!-- /.intro-modal-body -->

              <transition name="intro-arrow-fade">
                <div v-if="introCanScrollDown" class="intro-scroll-hint intro-scroll-down" @click="introScrollBody(120)">
                  <i class="fas fa-chevron-down"></i>
                </div>
              </transition>
            </div><!-- /.intro-body-wrap -->

            <button class="intro-modal-cta" @click="closeIntro">
              Start Exploring <i class="fas fa-rocket" style="margin-left: 0.4em;"></i>
            </button>

          </div><!-- /.intro-modal -->
        </div><!-- /.intro-backdrop -->
      </transition>

    <!-- Search overlay -->
    <div v-if="showSearch" class="search-overlay" @keydown.stop>
      <input
        ref="searchInput"
        class="search-input"
        type="text"
        placeholder="e.g. 51 Peg b"
        v-model="searchQuery"
        @input="onSearchInput"
        @keydown.enter="selectSearchResult(searchResults[0])"
        @keydown.escape="toggleSearch"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="search-clear-btn" @click="toggleSearch">
        <i class="fas fa-times"></i>
      </button>
      <ul v-if="searchResults.length" class="search-results">
        <li
          v-for="pt in searchResults"
          :key="pt.name"
          class="search-result-item"
          @click="selectSearchResult(pt)"
        >
          <span class="search-result-name">{{ pt.name }}</span>
          <span class="search-result-cat">{{ pt.cat }}</span>
        </li>
      </ul>
    </div>

    <!-- Hover ping overlay: a brief CSS ring fired by updateLastClosePoint
         when the cursor lands on a new dot. Timeline + search pings live in
         the world-space ring pass inside exoplanet-renderer.ts; the
         persistent search-result marker lives there too. -->
    <div class="ping-layer">
      <div
        v-for="ping in pings"
        :key="ping.id"
        class="ping-circle"
        :style="{ left: ping.x + 'px', top: ping.y + 'px', '--ping-color': ping.color }"
      ></div>
    </div>

    <!-- Reticle toggle button: 2D-only (sonification is disabled in 3D). -->
    <div v-if="mobile && modeReactive !== '3D'" class="reticle-toggle-wrap">
      <button
        class="reticle-toggle-btn"
        :class="{ 'reticle-active': reticleEnabled }"
        @click="toggleReticle"
        :title="reticleEnabled ? 'Identify mode on' : 'Identify mode off'"
      >
        <svg viewBox="0 0 28 28" class="reticle-btn-icon">
          <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.5"/>
          <circle cx="14" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/>
          <ellipse cx="14" cy="14" rx="11" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(-25 14 14)"/>
          <text x="14" y="17.5" text-anchor="middle" font-size="7.5" fill="currentColor" font-family="serif">♪</text>
        </svg>
      </button>
    </div>

    <!-- Reticle identify overlay: 2D-only (sonification is disabled in 3D). -->
    <div
      v-if="mobile && reticleEnabled && modeReactive !== '3D'"
      class="reticle-overlay"
    >
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(100,180,255,0.25)" stroke-width="1" stroke-dasharray="5 4"/>
        <circle cx="60" cy="60" r="20" fill="none" stroke="rgba(100,180,255,0.8)" stroke-width="1.5"/>
        <ellipse cx="60" cy="60" rx="42" ry="12" fill="none" stroke="rgba(100,180,255,0.6)" stroke-width="1.5" transform="rotate(-25 60 60)"/>
        <circle cx="60" cy="60" r="2" fill="rgba(100,180,255,0.9)"/>
      </svg>
    </div>

    <div
      id="circle-popover"
      v-show="lastClosePt !== null && !showSkyPicker"
      :style="popoverCssVars"
    >
      <div class="popover-name">{{ lastClosePt?.name }}</div>
      <div class="popover-details">{{ lastClosePt?.cat }}, {{ lastClosePt?.gdist.slice(0,6) }} pc<span v-if="lastClosePt?.plOrbper">, {{ lastClosePt.plOrbper.toFixed(1) }} day orbit</span></div>
    </div>
    
    <button 
      class="catalog-button" 
      @click="openCatalog" 
      v-show="showCatalogButton"
      > {{ showCatalog == true ? 'Collapse  Menu' : 'Discovery Types' }}
    </button>

    <div class="checkboxes-container" v-show="showCatalog">
        <div>
          <!--<v-checkbox 
            v-if="modeReactive == '2D'"
            :color="colorWhite"
            v-model="showConstellations"
            @keyup.enter="showConstellations = !showConstellations"
            label="Constellations"
            class="constellations"
            hide-details
          />-->
          <div class="data-label">
            <p style="color:#E3E3E3; font-size: 0.95rem;">
              Discovery Types
            </p>
          </div>

         <!-- <v-virtual-scroll
  :items="Object.keys(layersOn).sort((cat1, cat2) => Number(cat1) - Number(cat2))"
  item-height="40" 
> -->

          <v-checkbox
  v-for="(cat, index) in sortedCats"
  :key="cat"
  :color="colors[index]"
  v-model="layersOn[cat]"
  :label="(cat.charAt(0).toUpperCase() + cat.slice(1)).replace('_', ' ')"
  :label-color="colors[index]"
  hide-details
>
  <template #label>
    <span :style="{ color: colors[index] }">
      {{ (cat.charAt(0).toUpperCase() + cat.slice(1)).replace('_', ' ') }}
    </span>
  </template>
</v-checkbox>
        </div>
    </div>

    <div class="center-buttons">
      <button 
        @click="modeReactive = modeReactive == '3D' ? '2D' : '3D'" 
        v-if="true"> 
        {{ modeReactive == '3D' ? 'View 2D Sky ' : 'View 3D Galaxy ' }} <i class="fas fa-solid fa-rocket"></i>
      </button>
    </div>

    <!-- This gives the crossfade buttons and slider functionality -->
<div class="bg-slider-container" :class="{ 'sky-survey-mode': currentTool === 'sky-survey' }">
  <template v-if="currentTool == 'crossfade'"> <!--QQQ need to include "choose-background"-->
      <button
        type="button"
        class="bg-slider-text play-btn"
        @click="togglePlay"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <input
        class="opacity-range"
        type="range"
        :min="0"
        :max="totalMonths - 1"
        v-model="currentMonthIndex"
        @input="onSliderInput"
      />
      <div class="bg-slider-text month-label">
        {{ monthName }} {{ currentYear }}
      </div>
  </template>

  <template v-if="currentTool === 'sky-survey' && modeReactive === '2D'">
    <div class="crossfade-row" v-show="!showSkyPicker">
      <span class="bg-slider-text cf-label">Optical</span>
      <input class="opacity-range" type="range" min="0" max="100" v-model.number="foregroundOpacity" />
      <span class="bg-slider-text cf-label cf-label-right">{{ fgName }}</span>
    </div>
    <div class="sky-picker-wrap">
      <button class="bg-slider-text sky-picker-btn" @click="showSkyPicker = !showSkyPicker">
        <i class="fas fa-layer-group" style="margin-right:4px;"></i>
        {{ showSkyPicker ? 'Select a survey…' : 'Change Sky Survey' }}
        <i :class="showSkyPicker ? 'fas fa-chevron-down' : 'fas fa-chevron-up'" style="margin-left:4px;"></i>
      </button>
      <div v-show="showSkyPicker" class="sky-picker-dropdown">
        <div
          v-for="survey in allSkyImagesets"
          :key="survey"
          class="sky-picker-item"
          :class="{ 'sky-picker-selected': fgName === survey }"
          @click="fgName = survey; showSkyPicker = false"
        >{{ survey }}</div>
      </div>
    </div>
  </template>
</div>

    <!-- QR Code Modal (reserved for kiosk/linkless mode)
    <transition name="fade">
      <div class="qr-modal" v-if="showQRCode" @click="closeQR">
        <div class="qr-container" @click.stop>
          <div class="close-qr" @click="closeQR">
            <i class="fas fa-times"></i>
          </div>
          <h3>{{ currentQRTitle }}</h3>
          <qrcode-vue :value="currentQRUrl" :size="200" level="H"></qrcode-vue>
          <p>Scan to visit website</p>
        </div>
      </div>
    </transition>
    -->

  </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, PropType, toRaw } from 'vue';
import { csvFormatRows, csvParse } from "d3-dsv";
import { Color, Constellations, Coordinates, Folder, Grids, Layer, LayerManager, RenderContext, Settings, SpreadSheetLayer, Texture, WWTControl } from "@wwtelescope/engine"; //Grids, Poly
import { AltTypes, AltUnits, MarkerScales, PlotTypes, RAUnits, Thumbnail } from "@wwtelescope/engine-types"; //ImageSetType, PointScaleTypes
import { GotoRADecZoomParams } from "@wwtelescope/engine-pinia";
import L, { Map } from "leaflet"; //LeafletMouseEvent
import { tween } from "femtotween";
import { MiniDSBase, BackgroundImageset, skyBackgroundImagesets } from "@cosmicds/vue-toolkit";
import { ImageSetLayer, Place } from "@wwtelescope/engine"; //Imageset
import { applyImageSetLayerSetting } from "@wwtelescope/engine-helpers";
import { drawSkyOverlays, initializeConstellationNames, drawSpreadSheetLayer, layerManagerDraw, drawGalaxyImage, zoom, setConstellationFiguresTarget, notifyConstellationModeChange, prebuildFigures3D, gotoTargetFullHacked } from "./wwt-hacks"; //makeAltAzGridText
// === Galaxy3D === (procedural 3D Milky Way, see src/galaxy3d.ts)
import { installGalaxy3D } from "./galaxy3d";
// === ExoplanetCloud === custom WebGL renderer (step 1: dot pass).
// A/B-test toggle: window.__cloudDots = true in the browser console.
import {
  installExoplanetCloud,
  setCategoryEnabled as cloudSetCategoryEnabled,
  setTimeWindow as cloudSetTimeWindow,
  daysSince1990,
  startPing as cloudStartPing,
  setSearchRing as cloudSetSearchRing,
  clearSearchRing as cloudClearSearchRing,
} from "./exoplanet-renderer";

//applySpreadSheetLayerSetting

import {
  astrometry,
  diskKinematics,
  imaging,
  microlensing,
  orbitalBrightnessModulation,
  radialVelocity,
  timingVariations,
  transit,
} from "./exoplanetData";

// import qrcodeVue from 'qrcode.vue'; // reserved for kiosk mode



const soundCache: Record<string, AudioBuffer> = {};
let masterCompressor: DynamicsCompressorNode | null = null;

function getDeviceScales(twoD: boolean) {
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  if (twoD) {
    return isMobile
      ? { atnf: 10, others: 20 }
      : { atnf: 15, others: 25 };
  } else {
    return isMobile
      ? { atnf: 0.8, others: 1.5 }
      : { atnf: 2.0, others: 1.5 };
  }
}

// Guitar samples ordered from highest pitch to lowest. Index 0 plays for the
// shortest orbital periods, last index for the longest. See pitchIndexForPeriod.
const NOTES_HIGH_TO_LOW: readonly string[] = [
  'eguitar_GSharp6.wav', 'eguitar_FSharp6.wav', 'eguitar_DSharp6.wav', 'eguitar_CSharp6.wav',
  'eguitar_B5.wav',      'eguitar_GSharp5.wav', 'eguitar_FSharp5.wav', 'eguitar_DSharp5.wav',
  'eguitar_CSharp5.wav', 'eguitar_B4.wav',      'eguitar_GSharp4.wav', 'eguitar_E4.wav',
  'eguitar_DSharp4.wav', 'eguitar_B3.wav',      'eguitar_GSharp3.wav', 'eguitar_E3.wav',
  'eguitar_B2.wav',      'eguitar_E2.wav',      'eguitar_B1.wav',      'eguitar_E1.wav',
];

// Log-period range driving the pitch mapping. Hot Jupiters (~1 d) and Kepler
// short-period planets dominate the catalog; widening LO below 1 d wastes notes
// on a rare regime, while HI of 10000 d covers all but a handful of long-period
// outliers without compressing the populated range.
const PERIOD_LO_DAYS = 1;
const PERIOD_HI_DAYS = 10000;
const LOG_PERIOD_LO = Math.log(PERIOD_LO_DAYS);
const LOG_PERIOD_HI = Math.log(PERIOD_HI_DAYS);

// Per-voice base gain. Timeline playback bins planets by pitch and sums into
// one voice per bin at gain = BASE_TONE_GAIN * sqrt(count) (see
// handlePointTransitions), so the worst-case voice count is bounded by the
// number of distinct samples (NOTES_HIGH_TO_LOW.length = 20). Hover/search
// fire a single voice at BASE_TONE_GAIN.
const BASE_TONE_GAIN = 0.42;

// Parsec → AU. Used to feed real exoplanet distances into raDecTo3dAu so the
// 3D-mode ping projection picks up the correct WWT world-space direction.
const PARSEC_TO_AU = 206264.806;

// Mean obliquity of the ecliptic at J2000, in radians. SpreadSheetLayer renders
// every Sky-frame spherical point via geoTo3dRad(...).rotateX(ecliptic) in
// astronomical mode (engine source: SpreadSheetLayer._addPoint, ~line 39449),
// so 3D-mode pings must apply the same rotation or they'll be ~23° off around
// the X axis. The engine recomputes obliquity from jNow each frame, but it
// drifts < 0.01° per century — a fixed J2000 value is accurate enough.
const ECLIPTIC_RAD = 23.4392911 * Math.PI / 180;

function pitchIndexForPeriod(plOrbper: number, n: number): number {
  if (!Number.isFinite(plOrbper) || plOrbper <= 0) return 0;
  const t = (Math.log(plOrbper) - LOG_PERIOD_LO) / (LOG_PERIOD_HI - LOG_PERIOD_LO);
  const idx = Math.floor(t * n);
  return Math.min(n - 1, Math.max(0, idx));
}

function getCompressor(ctx: AudioContext): DynamicsCompressorNode {
  if (!masterCompressor || masterCompressor.context !== ctx) {
    masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-18, ctx.currentTime);
    masterCompressor.knee.setValueAtTime(30, ctx.currentTime);
    masterCompressor.ratio.setValueAtTime(12, ctx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
    masterCompressor.release.setValueAtTime(0.25, ctx.currentTime);
    masterCompressor.connect(ctx.destination);
  }
  return masterCompressor;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

async function loadGuitarSound(ctx: AudioContext, noteFile: string): Promise<AudioBuffer | null> {
  if (!noteFile) return null; // safety
  if (soundCache[noteFile]) return soundCache[noteFile];

  try {
    const response = await fetch(`./sounds/${noteFile}`);
    if (!response.ok) {
      console.error("Failed to fetch sound:", noteFile, response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);

    soundCache[noteFile] = buffer;
    return buffer;
  } catch (e) {
    console.error("Error loading sound:", noteFile, e);
    return null;
  }
}

function asyncSetTimeout<R>(func: () => R , ms: number): Promise<R> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(func()), ms);
  });
}

function asyncWaitForCondition(func: () => boolean, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (func()) {
        clearInterval(interval);
        resolve();
      }
    }, ms);
  });
}

function parseCsvTable(csv: string) {
  return csvParse(csv, (d) => {
    return {
      name: d.NAME!,  // + makes it a number - we don't want that here
      ra: +d.RA!,
      dec: +d.DEC!,
      gdist: +d.DIST!,
      cat: d.Catalog!,
      discPubdate: new Date(d.disc_pubdate),
      plOrbper: +d.pl_orbper!,   // <-- add this
      endDate: new Date(d.end_date)
    };
  });
}



let mode = "3D" as "3D" | "2D" | null; //this is where we set initial start mode?

const CSVS: Record<string, string> = {
  "astrometry": astrometry,
  "Disk Kinematics": diskKinematics,
  "imaging": imaging,
  "microlensing": microlensing,
  "Orbital Brightness Modulation": orbitalBrightnessModulation,
  "Radial Velocity": radialVelocity,
  "Timing Variations": timingVariations,
  "transit": transit,
};

const DATA_TABLES = Object.fromEntries(Object.entries(CSVS).map(([cat, csv]) => [cat, parseCsvTable(csv)]));

const DATA_STRINGS = Object.fromEntries(Object.entries(DATA_TABLES).map(([cat, table]) => [cat, formatCsvTable(table)]));

// Flattened once at module load; used for O(M) delta scanning during playback
const ALL_POINTS = Object.values(DATA_TABLES).flat();
const ALL_POINTS_BY_DATE = [...ALL_POINTS].sort(
  (a, b) => a.discPubdate.getTime() - b.discPubdate.getTime()
);

// Cached projection inputs for the 3D-mode hover/reticle hit test. Iterating
// pre-parsed numbers (no per-pointer CSV split) drops identify work from
// "6000 string splits + 6000 numeric parses per pointermove" to "6000 numeric
// reads", which is what restores snappy motion.
//
// Trig values are precomputed for the hemisphere cull and for the engine's
// raDecTo3dAu world vertex (engine source: Coordinates.raDecTo3dAu builds
// (cos α cos δ, sin δ, sin α cos δ) with α in *hours*). The rotateX(ecliptic)
// is folded in at hit-test time using ECLIPTIC_RAD's sin/cos.
type Hit3DRow = {
  name: string;
  ra: number;       // radians
  dec: number;      // radians
  raDeg: number;
  decDeg: number;
  gdist: number;    // parsecs
  cat: string;      // CSV-row Catalog value, e.g. "Transit" (title-cased)
  layerKey: string; // CSVS / layersOn key, e.g. "transit" (see catKey())
  discPubdate: Date;
  plOrbper: number;
  endDate: Date;
  sinDec: number;
  cosDec: number;
  sinRA: number;
  cosRA: number;
  // World vertex (xR, yR, zR) BEFORE we pre-swap for the engine's internal
  // Vector3d(x, z, y). Only valid if gdist is finite & positive. Distance is
  // baked in here once instead of recomputed on every move event.
  xR: number;
  yR: number;
  zR: number;
  hasDist: boolean;
};

const ALL_POINTS_3D: Hit3DRow[] = (() => {
  const cosE = Math.cos(ECLIPTIC_RAD);
  const sinE = Math.sin(ECLIPTIC_RAD);
  return ALL_POINTS.map(p => {
    const ra = p.ra * Math.PI / 180;
    const dec = p.dec * Math.PI / 180;
    const sinDec = Math.sin(dec);
    const cosDec = Math.cos(dec);
    const sinRA = Math.sin(ra);
    const cosRA = Math.cos(ra);
    const hasDist = Number.isFinite(p.gdist) && p.gdist > 0;
    const au = hasDist ? p.gdist * PARSEC_TO_AU : 1e9;
    // raDecTo3dAu in WWT's frame: (cos α cos δ, sin δ, sin α cos δ) * au
    const vx = cosRA * cosDec * au;
    const vy = sinDec * au;
    const vz = sinRA * cosDec * au;
    // rotateX(ecliptic) — same transform SpreadSheetLayer applies in
    // astronomical Sky-frame mode (see prepVertexBuffer).
    return {
      name: p.name,
      ra,
      dec,
      raDeg: p.ra,
      decDeg: p.dec,
      gdist: p.gdist,
      cat: p.cat,
      layerKey: catKey(p.cat),
      discPubdate: p.discPubdate,
      plOrbper: p.plOrbper,
      endDate: p.endDate,
      sinDec,
      cosDec,
      sinRA,
      cosRA,
      xR: vx,
      yR: vy * cosE - vz * sinE,
      zR: vy * sinE + vz * cosE,
      hasDist,
    };
  });
})();

// rowIndex → ExoplanetCloud's static-buffer index. ALL_POINTS_BY_DATE and
// search results are filtered/sorted views of ALL_POINTS that share row
// references; ALL_POINTS_3D was .map()'d from ALL_POINTS so its indexing
// matches index-for-index. This lookup turns any p ∈ ALL_POINTS into the
// renderer rowIndex needed by cloudStartPing / cloudSetSearchRing.
// (globalThis.Map because Leaflet's non-generic Map shadows the built-in.)
const ROW_INDEX_OF = new globalThis.Map<typeof ALL_POINTS[number], number>();
ALL_POINTS.forEach((p, i) => ROW_INDEX_OF.set(p, i));

type Table = typeof DATA_TABLES[144]; //IDK

function safeDateString(value: string | number | Date | undefined, fallback = "1970-01-01") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) {
    return fallback;
  }
  return d.toISOString().slice(0, 10);
}

function formatCsvTable(table: Table): string {
  const header = ["pl_name","ra","dec","sy_dist","Catalog","disc_pubdate","pl_orbper","end_date"];

  // Map rows to string[] and skip any that are invalid
  const rows: string[][] = table
    .map((d,_i) => {
      if (!d.endDate || isNaN(d.endDate.getTime())) return null; // skip rows without a valid end_date

      return [
        d.name.toString(),             // NAME
        d.ra.toString(),               // RA
        d.dec.toString(),              // DEC
        d.gdist.toString(),            // DIST
        d.cat.toString(),              // Catalog
        safeDateString(d.discPubdate), // disc_pubdate ✅ FIXED
        d.plOrbper.toString(),         // pl_orbper
        safeDateString(d.endDate)      // end_date
      ];
    })
    .filter((r): r is string[] => r !== null); // type guard ensures rows is string[][]

  return csvFormatRows([header, ...rows]).replace(/\n/g, "\r\n");
}

interface PointData {
  x: number;
  y: number;
  ra: number;
  dec: number;
  name: string;
  gdist: string;
  cat: string; 
  color: Color;
  plOrbper: number; 
  endDate: Date;
}

//interface AudioContextHolder {
//  audioCtx: AudioContext | null;
//}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type ToolType = "crossfade" | "sky-survey" | null;
type SheetType = "text" | "video" | null;

const discoveryTypeColors: Record<string, string> = {
  "transit":                       "#58cc75",
  "Radial Velocity":               "#de4d86",
  "microlensing":                  "#829be8",
  "imaging":                       "#84e6f8",
  "Orbital Brightness Modulation": "#b5f283",
  "astrometry":                    "#caffd0",
  "Disk Kinematics":               "#f29ca3",
  "Eclipse Timing Variations":     "#f7cacd",
  "Pulsar Timing":                 "#7563ab",
  "Pulsation Timing Variations":   "#7563ab",
  "Transit Timing Variations":     "#7563ab",
};

// Case-insensitive lookup. The JS keys in CSVS / discoveryTypeColors are mixed
// case ("transit", "imaging" vs. "Radial Velocity") but the CSV Catalog column
// is title-cased ("Transit", "Imaging", "Radial Velocity"). Per-point sites use
// p.cat from the CSV; layer-creation sites use the JS key. Without normalization,
// "Transit" / "Imaging" / "Microlensing" / "Astrometry" fall back to purple.
function colorForCat(cat: string | undefined | null): string {
  if (!cat) return '#7563ab';
  return discoveryTypeColors[cat]
      ?? discoveryTypeColors[cat.toLowerCase()]
      ?? '#7563ab';
}

// CSV-row p.cat ("Transit", "Imaging", "Radial Velocity") → CSVS / layersOn
// key ("transit", "imaging", "Radial Velocity"). Multi-word title-case keys
// like "Radial Velocity" stay verbatim; single-word title-case keys collapse
// to lowercase. Used to gate timeline pings on the layer-toggle state.
//
// Catch-all: generate_exoplanet_data.py buckets every discovery method not in
// its DIRECT_MAP into the timingVariations export but preserves the original
// NASA value in the Catalog column. So rows in the "Timing Variations" layer
// arrive here as "Eclipse Timing Variations" / "Pulsar Timing" / etc. — none
// of those are CSVS keys. Mirror the Python bucketing by mapping any
// otherwise-unmatched value to "Timing Variations". Without this, the
// custom renderer never registers "Timing Variations" as one of its known
// layer names (so WWT keeps drawing stock textured dots for that layer on top
// of our renderer's), the layer-toggle watcher can't disable those points in
// the renderer, and the 2D/3D hit-tests skip them entirely.
function catKey(cat: string | undefined | null): string {
  if (!cat) return '';
  if (cat in CSVS) return cat;
  const lower = cat.toLowerCase();
  if (lower in CSVS) return lower;
  return 'Timing Variations';
}

export default defineComponent({
  components: {
    // qrcodeVue, // reserved for kiosk mode
  },

  extends: MiniDSBase,

  setup() {
    return {};
  },
 
  props: {
    wtml: {
      type: Object,
      required: true
    },
    wwtNamespace: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnailUrl: {
      type: String,
      required: true
    },
    bgWtml: {
      type: String,
      required: true
    },
    bgName: {
      type: String,
      required: true
    },
    /*fgName: {
      type: String,
      required: true
    },*/

    introText: {
      required: true
    },
    introTitle: {
      required: true
    },
    initialCameraParams: {
      type: Object as PropType<Omit<GotoRADecZoomParams, 'instant'>>,
      default() {
        return {
          raRad: 280 * D2R, //271.87846654
          decRad: -50 * D2R, //-48.42
          zoomDeg: 289555092.0 * 6
        };
      }
    }    
  },
  data()  {
    const initial2DPosition = {
      raRad: 4.64693913, //this.wwtRARad, 6
      decRad: -0.4977679, //this.wwtDecRad, 1
      zoomDeg: 360
    } as Omit<GotoRADecZoomParams,'instant'>;
    
    const idealPosition = {
      raRad: 0.6984155220905679, 
      decRad: 0.7132099678793872, 
      rollRad: 0.183,
      zoomDeg: 360,
      instant: true
    }  as GotoRADecZoomParams;

    
    const catalogs = Object.keys(DATA_STRINGS);
    

    return {
      showIntro: true,
      introCanScrollUp: false,
      introCanScrollDown: false,
      isMenuOpen: false,
      showBgButton: false,
      showBgSlider: true,
      skySurveySelectedCount: 0,
      hiddenIntro: false,
      showCatalog: true,
      showCatalogButton: true,
      userNotReady: true,

      showSplashScreen: false,
      imagesetLayers: {} as Record<string, ImageSetLayer>,
      layersLoaded: false,
      positionSet: false,
      imagesetFolder: null as Folder | null,
      backgroundImagesets: [] as BackgroundImageset[],
      cfOpacity: 0,

      playing: false,
      playCount: 0,
      hasBeen2D: false,

      showAltAzGrid: false,
      showConstellations: false,

      currentAllLayer: null as SpreadSheetLayer | null,

      minTime: new Date('1991-01-01').getTime(),

      startYear: 1991,
      currentMonthIndex: 0,

      modeKeepDotSize: "3D", // just a placeholder to track current mode for sizing

      lastHoverTime: 0,

      selectedTypes: [] as string[], // initially empty → all rows shown

      isPlaying: false,
      playTimer: null as ReturnType<typeof setInterval> | null,
      playClickTimer: null as ReturnType<typeof setTimeout> | null,



      audioCtx: null as AudioContext | null, // reactive AudioContext

      layersOn: Object.fromEntries(Object.keys(DATA_STRINGS).map(cat => [cat, true])),
      //layers: {},

      
      colorD: "#070021cc", //"#45aecb",
      colorWhite: "#ffffff",
      todayColor: "#D6B004",

      layers: catalogs.reduce(
        (obj: Record<string, SpreadSheetLayer | null>, value: string) => {
          obj[value] = null;
          return obj;
        }, {}) as { [cat: string]: SpreadSheetLayer | null }, 

      // Track previous visibility per layer (by layer id) so we can detect
      // transitions from invisible -> visible caused by the time slider.
      layerPrevVisible: {} as Record<string, boolean>,
      
      modeReactive: mode as "2D" | "3D" | null, //| "full"
      resizeObserver: null as ResizeObserver | null,
      //background2DImageset: "Deep Star Maps 2020",
      fgName: "Eckhard All Sky", //"PLANCK R2 HFI color composition 353-545-857 GHz",
      fg2DOpacity: 0,
      position3D: {
        // Initial 3D view: galactic center region (RA 280°, Dec −50°)
        raRad: 280 * D2R,
        decRad: -50 * D2R,
        zoomDeg: 289555092.0 * 6
      } as Omit<GotoRADecZoomParams,'instant'>,
      position2D: initial2DPosition as Omit<GotoRADecZoomParams,'instant'>,
      initial2DPosition,
      
      
      allSkyImagesets: [
        'Deep Star Maps 2020', 
        'Mellinger color optical survey',  // HIPS
        'Eckhard All Sky',
        "Gaia DR2",
        'Digitized Sky Survey (Color)',
        'unWISE color, from W2 and W1 bands', // HIPS
        'WISE All Sky (Infrared)',
        'Planck Thermal Dust',
        'Hydrogen Alpha Full Sky Map',
        "PLANCK R2 HFI color composition 353-545-857 GHz", // HIPS
      ],
      previousMode: mode as "2D" | "3D" | null,
      idealPosition: idealPosition, //fullwavePosition


      minZoom: 30000, //3000000,//160763995.5927744,
      maxZoom: 22328103718.39476,

      //isAnimating: true, // Animation state WWW
      //animationFrame:  null as number | null, // Reference to the animation frame WWW

      incomingItemSelect: null as Thumbnail | null,
      
      sheet: null as SheetType,
      showMapTooltip: false,
      showTextTooltip: false,
      showVideoTooltip: false,
      showPlayPauseTooltip: false,
      showLocationSelector: false,
      showControls: false,
      currentTool: "crossfade" as ToolType, //"choose-background" as ToolType,
      tab: 0,

      circle: null as L.Circle | null,
      map: null as Map | null,

      selectionProximity: 4,
      pointerMoveThreshold: 6,
      isPointerMoving: false,
      pointerStartPosition: null as { x: number; y: number } | null,
      lastClosePt: null as PointData | null,
      // rAF-throttle state for pointermove hover identify. Reactivity isn't
      // needed (these aren't rendered), but Vue 3 reactive option-API data
      // works fine for plain refs too.
      pendingHoverEvent: null as PointerEvent | null,
      hoverRafId: null as number | null,

      showQRCode: false,
      currentQRUrl: '',
      currentQRTitle: '',
      reticleEnabled: true,
      showSkyPicker: false,
      pings: [] as { id: number; x: number; y: number; color: string }[],
      pingId: 0,
      showSearch: false,
      searchQuery: '',
      searchResults: [] as (typeof ALL_POINTS),

      // Search-slew popup pinning. When the user picks a search result we want
      // the info popup + ping to stay visible *until they actually move the
      // camera*. popupPinned suppresses hover-based clearing; popupPinSnapshot
      // is filled in after the slew arrives so a subsequent pan/zoom unpins.
      popupPinned: false,
      popupPinSnapshot: null as { raRad: number; decRad: number; zoomDeg: number } | null,
      popupPinTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  mounted() {
    this.currentMonthIndex = this.totalMonths - 1;
    document.addEventListener('pointerdown', this._ensureAudio, { once: true });

    this.waitForReady().then(async () => {
      this.backgroundImagesets = [...skyBackgroundImagesets];

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.app = this;
      
      // initialize the view to black so that we don't flicker DSS
      this.applySetting(["galacticMode", true]);
      this.loadHipsWTML()
        .then(() => {
          if (mode === "3D") {
            this.set3DMode();
          }
        })
        .then(() => this.positionSet = true);

      this.applySetting(["showConstellationBoundries", false]);  // Note that the typo here is intentional
      this.applySetting(["solarSystemStars", false]);
      this.applySetting(["actualPlanetScale", true]);
      this.applySetting(["showConstellationFigures", false]);
      this.applySetting(["showCrosshairs", false]);
      this.applySetting(["solarSystemCosmos", false]);
      // this.applySetting(["solarSystemPlanets", false]);
      this.setClockSync(false);

      // Unlike the other things we're hacking here,
      // we aren't overwriting a method on a singleton instance (WWTControl)
      // or a static method (Constellations, Grids)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      SpreadSheetLayer.prototype.draw = drawSpreadSheetLayer;

      // Stage the custom exoplanet-cloud renderer's static buffer. The actual
      // GPU upload is deferred to the first frame (drawExoplanetCloud is a
      // no-op until window.__cloudDots is set in the browser console).
      installExoplanetCloud(ALL_POINTS_3D, colorForCat);

      this.setClockSync(false);

      this.imagesetFolder = await this.loadImageCollection({
        url: this.wtml.gammaraypulsar,
        loadChildFolders: false
      });
      const children = this.imagesetFolder.get_children() ?? [];
      
      const layerPromises: Promise<Layer>[] = [];
      children.forEach((item) => {
        if (!(item instanceof Place)) { return; }
        const imageset = item.get_backgroundImageset() ?? item.get_studyImageset();
        if (imageset == null) { return; }
        const name = imageset.get_name();
        layerPromises.push(this.addImageSetLayer({
          url: imageset.get_url(),
          mode: "autodetect",
          name: name,
          goto: false
        }).then((layer) => {
          this.imagesetLayers[name] = layer;
          applyImageSetLayerSetting(layer, ["opacity", 1]);
          return layer;
        }));
      });
      
      this.backgroundImagesets = [...skyBackgroundImagesets];

      /*EXOPLANET GENERATION STARTS HERE!*/

      // Ensure all checkboxes are on by default
      // Initialize all catalog checkboxes (single source of truth)
      Object.keys(DATA_STRINGS).forEach(cat => {
        console.log("layersOn initialized for:", cat); // <-- added
      });

      // Single array to hold the created layers
      const tableLayerPromises: Promise<Layer>[] = [];

      // Define header to match your CSV columns (for info)
      //const header = "NAME,RA,DEC,DIST,Catalog,disc_pubdate,pl_orbper,end_date";

      // Create one layer per catalog (no merging)
      Object.entries(DATA_STRINGS).forEach(([cat, csvString], _index) => {
        console.log("Processing catalog:", cat); // <-- added

        if (!this.layersOn[cat]) {
          console.log("  Skipping because layersOn is false");
          return;
        }

        tableLayerPromises.push(
          this.createTableLayer({
            name: cat,
            referenceFrame: "Sky",
            dataCsv: csvString,
          }).then(layer => {
            this.layers[cat] = layer; // store single layer per catalog

            // Configure columns
            layer.set_lngColumn(1); // RA
            layer.set_latColumn(2); // DEC
            layer.set_altColumn(3); // DIST
            layer.set_altUnit(AltUnits.parsecs);
            layer.set_altType(AltTypes.distance);

            layer.set_opacity(1);

            // Visual settings
            layer.set_markerScale(MarkerScales.screen);
            layer.set_showFarSide(true);

            const twoD = this.modeKeepDotSize === "2D";
            const { others: scaleFactor } = getDeviceScales(twoD);
            const plotType = twoD ? PlotTypes.circle : PlotTypes.point;

            const colorHex = discoveryTypeColors[cat] ?? '#7563ab';
            const colorObj = Color.fromHex(colorHex);

            this.applyTableLayerSettings({
              id: layer.id.toString(),
              settings: [
                ["scaleFactor", scaleFactor],
                ["plotType", plotType],
                ["color", colorObj],
                ["opacity", 1.0]
              ]
            });

            // Enable row-level time filtering
            layer.set_timeSeries(true);
            layer.set_dynamicData(true); // ensures WWT updates rows when time changes
            layer.set_startDateColumn(5); // start_date column
            layer.set_endDateColumn(7);   // end_date column

            layer.set_markerScale(MarkerScales.screen);

            console.log(
              "Layer:", cat,
              "Start column:", layer.get_startDateColumn(),
              "End column:", layer.get_endDateColumn(),
              "Time series:", layer.get_timeSeries(),
              "Dynamic:", layer.get_dynamicData()
            );

            // Optional: inspect first few rows after 2 seconds
            setTimeout(() => {
              const data = layer.getTableDataInView();
              console.log("  Points count:", data.split("\r\n").length - 1); // <-- added
            }, 2000);

            return layer;
          })
        );
      });



      // After all layers are created
      Promise.all(tableLayerPromises).then(() => {

        this.layersLoaded = true;
        this.showControls = !this.mobile;

        // Sync WWT's simulation time to the current slider position so time-series
        // layers filter correctly from the first render (prevents stale-dot artifacts).
        this.onSliderInput();

        // Re-apply correct scales after WWT finishes initializing the layers.
        // Without this, 3D mode scales are inconsistent on first load.
        this.$nextTick(() => this.updateLayerScales());

  

        // Optional splash screen handler
        const splashScreenListener = (_event: KeyboardEvent) => {
          this.showSplashScreen = false;
          window.removeEventListener('keyup', splashScreenListener);
        };
        window.addEventListener('keyup', splashScreenListener);

        // Optional video sheet escape key
        window.addEventListener('keyup', (event: KeyboardEvent) => {
          if (["Esc", "Escape"].includes(event.key) && this.showVideoSheet) {
            this.showVideoSheet = false;
          }
        });
      });

      // Load image collection as before
      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        if (mode === "2D") {
          this.set2DMode();
        }
        this.backgroundImagesets.unshift(
          new BackgroundImageset("Fermi LAT 8-Year (Gamma Ray)", "Fermi LAT 8-year (gamma)"),
          new BackgroundImageset("NASA Deep Star Maps (Optical)", "Deep Star Maps 2020")
        );
      });

      // Discovery type checkboxes
      /*const discoveryTypes: string[] = [
        "Astrometry",
        "Disk_Kinematics",
        "Eclipse_Timing_Variations",
        "Imaging",
        "Microlensing",
        "Orbital_Brightness_Modulation",
        "Pulsar_Timing",
        "Pulsation_Timing_Variations",
        "Radial_Velocity",
        "Transit",
        "Transit_Timing_Variations"
      ];*/

      // Watch checkboxes and toggle single-layer opacity
      Object.keys(this.layersOn).forEach(cat => {
        this.$watch(`layersOn.${cat}`, (on: boolean) => {
          // Route the toggle into the custom renderer's per-category bitmask
          // (no-op for categories the renderer doesn't know about). Runs
          // alongside the WWT-layer opacity update below so the two paths
          // stay in sync regardless of which one is currently authoritative.
          cloudSetCategoryEnabled(cat, on);

          const layer = this.layers[cat];
          if (!layer) return;
          this.applyTableLayerSettings({
            id: layer.id.toString(),
            settings: [["opacity", on ? 1.0 : 0.0]]
          });
        });
      });

      // Initial sync into the renderer for both filters. Categories are all
      // on at startup, and the slider is positioned at totalMonths-1 (today),
      // so this just primes the uniforms — actual updates flow through the
      // watchers above and the currentMonthIndex watcher below.
      Object.entries(this.layersOn).forEach(([cat, on]) => {
        cloudSetCategoryEnabled(cat, on as boolean);
      });
      cloudSetTimeWindow(daysSince1990(this.getSliderDate()));


      this.wwtSettings.set_localHorizonMode(false);//QQQ
      this.wwtSettings.set_showAltAzGrid(this.showAltAzGrid);
      this.wwtSettings.set_showAltAzGridText(this.showAltAzGrid);
      // This is kinda horrible, but it works!

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.wwtControl._drawSkyOverlays = drawSkyOverlays;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Constellations.initializeConstellationNames = initializeConstellationNames;
      //Grids._makeAltAzGridText = makeAltAzGridText;

      Grids._milkyWayImage = Texture.fromUrl("https://data1.wwtassets.org/packages/2025/01_gaia_milky_way/Gaia-HighContrast-MilkyWay-4k.jpg");
      // @ts-expect-error -- monkey-patching WWT Grids with custom drawGalaxyImage
      Grids.drawGalaxyImage = drawGalaxyImage;

      // === Galaxy3D === Replace the 2D-bar patch above with the 3D point cloud
      // in solar-system (3D) mode. To remove this feature: delete this block,
      // delete the matching import at the top, and delete src/galaxy3d.ts.
      installGalaxy3D();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      LayerManager._draw = layerManagerDraw;

      // Eagerly precompute the 3D constellation line vertices so the first
      // toggle in 3D fades in smoothly instead of snapping on once the async
      // figures.txt + Hipparcos loads finally land. Poll because the stars
      // file is loaded asynchronously by WWT — initStarVertexBuffer (called
      // inside prebuildFigures3D) kicks the fetch and we retry until ready.
      const prebuildTick = window.setInterval(() => {
        if (prebuildFigures3D(this.wwtRenderContext)) {
          window.clearInterval(prebuildTick);
        }
      }, 250);
      // Give up after ~30 s so we don't poll forever on a broken asset host.
      window.setTimeout(() => window.clearInterval(prebuildTick), 30000);

      // wwtZoomDeg is still 0 if we run this here
      // and it was the same in nextTick
      // so give just a bit of a delay
      /*setTimeout(() => {
        this.positionSet = true;
        this.gotoRADecZoom({
          raRad: 4.64693913, //this.wwtRARad,
          decRad: -0.4977679, //this.wwtDecRad,
          zoomDeg: 360,
          instant: true, // false this competes with the tween crossfade from optical to radio, needs troubleshooting
        });
      }, 100);*/


    });
    /*this.resizeObserver = new ResizeObserver((_entries) => {
      this.shinkWWT();
    });*/
    
    // Pin the min and max zoom in 3D mode
    WWTControl.singleton.setSolarSystemMinZoom(this.minZoom);
    WWTControl.singleton.setSolarSystemMaxZoom(this.maxZoom);

    // Patch the zoom function to account for min zoom as well
    // See upstream fix at https://github.com/WorldWideTelescope/wwt-webgl-engine/pull/292
    WWTControl.singleton.zoom = zoom.bind(WWTControl.singleton);

    /*{//WWW
      // Check if this is the user's first visit
      if (!this.hasBeen2D) {
        this.startRotation();
      }
      // Add a click event listener to stop motion
      document.addEventListener("click", this.stopMotion);
    }*/
    
  },

  computed: {

    sortedCats(): string[] {
      const order = [
        "transit",
        "Radial Velocity",
        "microlensing",
        "imaging",
        "Orbital Brightness Modulation",
        "astrometry",
        "Disk Kinematics",
      ];
      return Object.keys(this.layersOn).sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    },

    colors(): string[] {
      return this.sortedCats.map(cat => discoveryTypeColors[cat] ?? '#7563ab');
    },

    monthName(): string {
      const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return names[this.currentMonth - 1];
    },
    
    crossfadeOpacity: {
      get(): number {
        return this.cfOpacity;
      },
      set(o: number) {
        // if (this.layers.gammafermi) {
        //   applyImageSetLayerSetting(this.layers.gammafermi, ["opacity", 0.01 * o]);
        // }
        this.cfOpacity = o;
      }
    },

    

    now() {
      return new Date();
    },

    /*endYear() {
      return this.now.getFullYear();
    },*/

    endYear() {
      return new Date().getFullYear();
    },

    /*endMonth() {
      return this.now.getMonth() + 1;
    },*/

    endMonth() {
      return new Date().getMonth() + 1;
    },

    totalMonths() {
      return (this.endYear - this.startYear) * 12 + this.endMonth;
    },

    currentYear() {
      return this.startYear + Math.floor(this.currentMonthIndex / 12);
    },

    currentMonth() {
      return (this.currentMonthIndex % 12) + 1;
    },

    currentMonthLabel() {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return `${months[this.currentMonth - 1]} ${this.currentYear}`;
    },

    
    isLoading(): boolean {
      return !this.ready;
    },
    ready(): boolean {
      return this.layersLoaded && this.positionSet;
    },
    smallSize(): boolean {
      return this.$vuetify.display.smAndDown;
    },
    mobile(): boolean {
      return this.smallSize && this.touchscreen;
    },
    cssVars() {
      const css: Record<string, string> = {
        '--color-default': this.colorD,
        '--color-default2': this.colorWhite,
        '--app-content-height': this.showTextSheet ? '66%' : '100%',
      };

      for (const [index, color] of Object.entries(this.colors)) {
        css[`--color${index}`] = color;
      }
      return css;
    },
    popoverCssVars() {
      const x = this.lastClosePt?.x ?? 0;
      const y = this.lastClosePt?.y ?? 0;

      // Note that the canvas takes up the full width
      const leftPct = 100 * x / window.innerWidth;
      const topPct = 100 * (y - 50) / window.innerHeight;
      return {
        '--current-color': this.lastClosePt?.color.toString() ?? "white",
        '--current-left': `${leftPct}%`,
        '--current-top': `${topPct}%`
      };
    },
    wwtControl(): WWTControl {
      return WWTControl.singleton;
    },
    wwtRenderContext(): RenderContext {
      return this.wwtControl.renderContext;
    },
    wwtSettings(): Settings {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return Settings.get_active();
    },
  
    showTextSheet: {
      get(): boolean {
        return this.sheet === 'text';
      },
      set(_value: boolean) {
        this.selectSheet('text');
        this.showTextTooltip = false;
      }
    },
    showVideoSheet: {
      get(): boolean {
        return this.sheet === "video";
      },
      set(value: boolean) {
        this.selectSheet('video');
        if (!value) {
          const video = document.querySelector("#info-video") as HTMLVideoElement;
          video.pause();
        }
        this.showVideoTooltip = false;
      }
    },
    
    curBackgroundImagesetName: {
      get(): string {
        if (this.wwtBackgroundImageset == null) return "";
        return this.wwtBackgroundImageset.get_name();
      },
      set(name: string) {
        this.setBackgroundImageByName(name);
      }
    },
    
    curForegroundImagesetName: {
      get(): string {
        if (this.wwtForegroundImageset == null) return "";
        return this.wwtForegroundImageset.get_name();
      },
      set(name: string) {
        this.setForegroundImageByName(name);
      }
    },
    
    foregroundOpacity: {
      get(): number {
        return this.wwtForegroundOpacity;
      },
      set(o: number) {
        this.setForegroundOpacity(o); 
      }
    },
    wwtPosition(): Omit<GotoRADecZoomParams,'instant'> {
      return {
        raRad: this.wwtRARad,
        decRad: this.wwtDecRad,
        rollRad: this.wwtRollRad,
        zoomDeg: this.wwtZoomDeg,
      };
    }
  },

  methods: {

    // JC: When the "allow imagesets above spreadsheets" functionality
    // gets added into the engine,
    // remember to add something like this along with it
    setSpreadSheetLayerOrder(id: string, order: number) {
      const layer = LayerManager.get_layerList()[id];
      const layers = LayerManager.get_allMaps()[layer.get_referenceFrame()].layers;
      if (order >= 0) {
        const currentIndex = layers.indexOf(layer);
        if (currentIndex > -1) {
          layers.splice(currentIndex, 1);
        }
        LayerManager.get_allMaps()[layer.get_referenceFrame()].layers.splice(order, 0, layer);
      }
    },

    toggleReticle() {
      this.reticleEnabled = !this.reticleEnabled;
      if (!this.reticleEnabled) {
        this.unpinSearchPopup();
        this.lastClosePt = null;
      }
    },

    togglePlay() {
      if (this.isPlaying) {
        this.stopPlay();
        return;
      }
      // Double-click detection: second click within 300 ms → reset to start.
      // Single click → play from current position (or reset if already at end).
      if (this.playClickTimer !== null) {
        clearTimeout(this.playClickTimer);
        this.playClickTimer = null;
        this.startPlay(true);
        return;
      }
      this.playClickTimer = setTimeout(() => {
        this.playClickTimer = null;
        this.startPlay(this.currentMonthIndex >= this.totalMonths - 1);
      }, 300);
    },

    startPlay(reset = true) {
      this.isPlaying = true;
      this.reticleEnabled = false;
      this.unpinSearchPopup();
      this.lastClosePt = null;

      if (this.mobile) {
        this.showCatalog = false;
      }

      if (reset) {
        // restart from beginning — snap view to start with no planets visible
        this.currentMonthIndex = 0;
        this.onSliderInput();
      }

      // avoid stacking intervals
      if (this.playTimer) {
        clearInterval(this.playTimer);
        this.playTimer = null;
      }

      const speed = 200; // adjust playback speed here

      this.playTimer = setInterval(() => {
        if (this.currentMonthIndex < this.totalMonths - 1) {
          this.currentMonthIndex++;
          this.onSliderInput();
        } else {
          this.stopPlay();
        }
      }, speed);
    },

    stopPlay() {
      this.isPlaying = false;

      if (this.playTimer) {
        clearInterval(this.playTimer);
        this.playTimer = null;
      }
      if (this.playClickTimer !== null) {
        clearTimeout(this.playClickTimer);
        this.playClickTimer = null;
      }
    },


    logLayerData(kind: string) {
      const layer = this.layers[kind];
      if (!layer?.getTableDataInView) {
        console.warn(`Layer "${kind}" not found or has no data`);
        return;
      }

      const inView = layer.getTableDataInView();
      if (!inView) {
        console.log(`Layer "${kind}" has no rows currently visible`);
        return;
      }

      const rows = inView.split("\r\n");
      console.log(`Layer "${kind}" has ${rows.length - 1} points (excluding header)`);

      // Show the first few rows (you can adjust how many)
      rows.slice(1, 6).forEach((row, i) => {
        const cols = row.split("\t");
        console.log(
          `Row ${i + 1}: NAME=${cols[0]}, RA=${cols[1]}, DEC=${cols[2]}, DIST=${cols[3]}, ` +
  `Catalog=${cols[4]}, start_date=${cols[5]}, pl_orbper=${cols[6]}, end_date=${cols[7]}`
        );
      });
    },

    getSliderDate(): Date {
    // compute the year/month from the currentMonthIndex
      const year = this.startYear + Math.floor(this.currentMonthIndex / 12);
      const month = this.currentMonthIndex % 12; // 0-based
      return new Date(year, month, 1); // first day of the month
    },

    onSliderInput() {
      const date = this.getSliderDate();
      this.setTime(date);
      this.handlePointTransitions(date);
      // Drive the custom renderer's time cutoff alongside WWT's
      // SpaceTimeController-based filter so both paths stay in sync.
      cloudSetTimeWindow(daysSince1990(date));
    },

    handlePointTransitions(date: Date) {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      // Only sonify / ping points whose layer toggle is on. Without this filter,
      // disabling a discovery type in the menu still produces audio + pings for
      // points the user can no longer see, which feels broken.
      const newThisMonth = ALL_POINTS_BY_DATE.filter(p => {
        if (p.discPubdate < date || p.discPubdate >= monthEnd) return false;
        return this.layersOn[catKey(p.cat)] !== false;
      });
      if (newThisMonth.length === 0) return;

      // Pitch-binned audio: there are only NOTES_HIGH_TO_LOW.length (=20)
      // distinct samples, and dense months (e.g. ~300 planets in 2014–2015's
      // Kepler peak) cluster heavily on a handful of pitches. Summing N
      // overlapping identical samples gives +20·log10(N) dB — clip the
      // compressor at any non-trivial N. Bin first, fire ONE voice per bin
      // at gain = BASE_TONE_GAIN * sqrt(count). sqrt is acoustic-power flat
      // (perceptual loudness scales sub-linearly with amplitude), and worst
      // case voice count is ≤ 20, no stagger needed.
      const bins = new globalThis.Map<number, number>();
      for (const p of newThisMonth) {
        const v = Number(p.plOrbper);
        if (!Number.isFinite(v) || v <= 0) continue;
        const pitchIdx = pitchIndexForPeriod(v, NOTES_HIGH_TO_LOW.length);
        bins.set(pitchIdx, (bins.get(pitchIdx) ?? 0) + 1);
      }
      for (const [pitchIdx, count] of bins) {
        this._playPitchSample(pitchIdx, BASE_TONE_GAIN * Math.sqrt(count));
      }

      // Pings: every planet, fired together. The renderer's ring pass
      // animates each ring from its own t0Ms so the burst lands as a single
      // visual event (no DOM insertion cost like the old CSS path had).
      const pingNow = performance.now();
      for (const p of newThisMonth) {
        const rowIdx = ROW_INDEX_OF.get(p);
        if (rowIdx === undefined) continue;
        cloudStartPing(rowIdx, pingNow, { color: colorForCat(p.cat) });
      }
    },

    // Creates the AudioContext on first use and resumes it if the browser
    // suspended it under autoplay policy. Safe to call repeatedly. Returns the
    // ready context, or null if Web Audio is unavailable / blocked.
    async _ensureAudio(): Promise<AudioContext | null> {
      try {
        if (!this.audioCtx) {
          const audioCtx = window.AudioContext || window.webkitAudioContext;
          if (!audioCtx) return null;
          this.audioCtx = new audioCtx();
        }
        if (this.audioCtx.state === "suspended") {
          await this.audioCtx.resume();
        }
        return this.audioCtx;
      } catch (e) {
        return null;
      } finally {
        document.removeEventListener("pointerdown", this._ensureAudio);
      }
    },

    // Fire one BufferSource at the given pitch index with sample-accurate
    // scheduling on the audio thread. Shared between the timeline path
    // (already binned by pitch) and the period-driven entry point.
    async _playPitchSample(pitchIdx: number, gainValue: number) {
      try {
        const ctx = await this._ensureAudio();
        if (!ctx) return;
        const noteFile = NOTES_HIGH_TO_LOW[pitchIdx];
        const buffer = await loadGuitarSound(ctx, noteFile);
        if (!buffer) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const releaseEnd = now + 1.8;
        gain.gain.setValueAtTime(gainValue, now);
        gain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);
        source.connect(gain);
        gain.connect(getCompressor(ctx));
        source.start(now);
        source.stop(releaseEnd);
      } catch (e) { /* swallow — audio is best-effort */ }
    },

    async playPointTone(plOrbper: number, gainValue: number = BASE_TONE_GAIN) {
      // Short periods (fast orbits) → high pitch; long periods → low pitch.
      // Log-spaced via pitchIndexForPeriod so the bulk of the catalog
      // (clustered at 1–30 d) spreads across notes instead of saturating
      // one bucket.
      const idx = pitchIndexForPeriod(plOrbper, NOTES_HIGH_TO_LOW.length);
      await this._playPitchSample(idx, gainValue);
    },

    closeSplashScreen() {
      this.showSplashScreen = false;
      // Promise based wait for isLoading to be false
      asyncWaitForCondition(() => (!this.isLoading && !this.userNotReady), 100).then(() => {
        setTimeout(() => {
          //this.playing = true;
        }, 500);
      });
    },
    async loadHipsWTML () {
      return this.loadImageCollection({
        url: new URL('hips-surveys.wtml', window.location.href).href,
        loadChildFolders: true,
      });
    },

    filterCsvByType(csvString: string, selectedTypes: string[]) {
      if (selectedTypes.length === 0) return csvString;

      const rowSeparator = /\r?\n/; // ✅ support both \n and \r\n
      const colSeparator = ",";      // ✅ match your CSV

      const rows = csvString.split(rowSeparator);
      const header = rows.shift();
      if (!header) return csvString;

      const columns = header.split(colSeparator);
      const typeIndex = columns.indexOf("Catalog"); // ✅ match CSV column
      if (typeIndex === -1) return csvString;

      const filteredRows = rows.filter(row => {
        const values = row.split(colSeparator);
        return selectedTypes.includes(values[typeIndex].trim());
      });

      return [header, ...filteredRows].join("\n"); // ✅ normalized row separator
    },



    updateLayerScales() {
      const twoD = this.modeReactive === "2D";
      const scales = getDeviceScales(twoD);
      const plotType = twoD ? PlotTypes.circle : PlotTypes.point;

      Object.values(this.layers).forEach((layer, index) => {
        if (!layer) return;
        const scale = index === 0 ? scales.atnf : scales.others;
        this.applyTableLayerSettings({
          id: layer.id.toString(),
          settings: [["scaleFactor", scale], ["plotType", plotType]]
        });
      });
    },


    set2DMode() {
      this.setBackgroundImageByName(this.bgName);
      this.foregroundOpacity = this.fg2DOpacity;
      this.setForegroundImageByName(this.fgName); //AAA add function to remeber selected foreground imageset
      this.applySetting(["showSolarSystem", false]);
      this.updateLayerScales();

      /*if (!this.hasBeen2D) {
        tween(0, 70, (value) => { this.foregroundOpacity = value; }, {
          time: 7500,
          //ease: (t: number) => t * (2 * (1 - t) * 1.75 + t * 0.5),
          //done: () => { this.foregroundOpacity = 50; }
        }); 
      }
      this.hasBeen2D = true;*/

      return asyncSetTimeout(() => {
        
        this.gotoRADecZoom({
          ...this.position2D,
          instant: true
        })/*.catch((err) => {
          //console.log(err);
        
        })*/; 
      }, 10);

    },
    
    set3DMode() { 
      this.setBackgroundImageByName("Solar System");
      this.setForegroundImageByName("Solar System");
      this.updateLayerScales();

      return this.gotoRADecZoom({
        ...this.position3D,
        instant: true,
      })/*.catch((err) => {
        //console.log(err);
      })*/;

    },

    selectSheet(name: SheetType) {
      if (this.sheet == name) {
        this.sheet = null;
      } else {
        this.sheet = name;
      }
    },

    getImageSetLayerIndex(layer: ImageSetLayer): number {
      // find layer in this.wwtActiveLayers
      // this.wwtActiveLayers is a dictionary of {0:id1, 1:id2, 2:id3, ...}
      // get the key item with the value of layer.id
      for (const [key, value] of Object.entries(this.wwtActiveLayers)) {
        if (value === layer.id.toString()) {
          return Number(key);
        }
      }
      return -1;
    },

    spawnPing(raDeg: number, decDeg: number, color: string) {
      // Reject points on the opposite hemisphere from the camera.
      // transformWorldPointToPickSpace divides by vz without checking its sign,
      // so antipodal points (vz < 0) get mirror-projected through screen center
      // and pass the naive bounds check below. Dot product <= 0 means >= 90° away.
      const camRA = this.wwtRARad;
      const camDec = this.wwtDecRad;
      const ptRA = raDeg * D2R;
      const ptDec = decDeg * D2R;
      const dot = Math.sin(camDec) * Math.sin(ptDec) +
                  Math.cos(camDec) * Math.cos(ptDec) * Math.cos(ptRA - camRA);
      if (dot <= 0) return;

      const screen = this.findScreenPointForRADec({ ra: raDeg, dec: decDeg });
      if (screen.x < -50 || screen.x > window.innerWidth + 50 ||
          screen.y < -50 || screen.y > window.innerHeight + 50) return;
      const id = ++this.pingId;
      this.pings.push({ id, x: screen.x, y: screen.y, color });
      setTimeout(() => {
        const idx = this.pings.findIndex(p => p.id === id);
        if (idx !== -1) this.pings.splice(idx, 1);
      }, 450);
    },

    // 3D-mode ping. findScreenPointForRADec is sky-mode-only; in solar-system
    // mode we have to project the layer's actual world-space vertex.
    //
    // For a spherical, astronomical, Sky-frame SpreadSheetLayer the engine
    // builds each vertex (see prepVertexBuffer in @wwtelescope/engine) as:
    //     pos = geoTo3dRad(Dec, RA_deg, alt_AU)   // y = sin(Dec)·alt
    //     pos.rotateX(ecliptic)                   // tilt by ε
    // and that pos is what gets drawn at world coordinates (xR, yR, zR).
    spawnPing3D(raDeg: number, decDeg: number, distPc: number, color: string) {
      const ptRA = raDeg * D2R;
      const ptDec = decDeg * D2R;
      const dot = Math.sin(this.wwtDecRad) * Math.sin(ptDec) +
                  Math.cos(this.wwtDecRad) * Math.cos(ptDec) * Math.cos(ptRA - this.wwtRARad);
      if (dot <= 0) return;

      // Parsec → AU. Match the engine's altUnit=parsecs path so the world
      // vertex lands at the same distance the dot is drawn at.
      const au = Number.isFinite(distPc) && distPc > 0
        ? distPc * PARSEC_TO_AU
        : 1e9;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error `raDecTo3dAu` exists at runtime but isn't in the engine .d.ts
      const v = Coordinates.raDecTo3dAu(raDeg / 15, decDeg, au);

      // Apply the engine's rotateX(ecliptic), matching SpreadSheetLayer
      // prepVertexBuffer for an astronomical Sky-frame layer.
      const cosE = Math.cos(ECLIPTIC_RAD);
      const sinE = Math.sin(ECLIPTIC_RAD);
      const xR = v.x;
      const yR = v.y * cosE - v.z * sinE;
      const zR = v.y * sinE + v.z * cosE;

      const screen = WWTControl.singleton.getScreenPointForCoordinates(xR, yR, zR);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — debug knob set from browser console
      if (typeof window !== 'undefined' && window.__pingDebug) {
        // eslint-disable-next-line no-console
        console.log('[ping3D]', {
          ra: raDeg.toFixed(3), dec: decDeg.toFixed(3), distPc, au,
          v:  { x: v.x.toExponential(3), y: v.y.toExponential(3), z: v.z.toExponential(3) },
          worldVertex: { x: xR.toExponential(3), y: yR.toExponential(3), z: zR.toExponential(3) },
          screen: screen ? { x: screen.x, y: screen.y } : null,
          camRA: (this.wwtRARad * R2D).toFixed(3),
          camDec: (this.wwtDecRad * R2D).toFixed(3),
          winSize: { w: window.innerWidth, h: window.innerHeight }
        });
      }
      if (!screen ||
          screen.x < -50 || screen.x > window.innerWidth + 50 ||
          screen.y < -50 || screen.y > window.innerHeight + 50) return;
      const id = ++this.pingId;
      this.pings.push({ id, x: screen.x, y: screen.y, color });
      setTimeout(() => {
        const idx = this.pings.findIndex(p => p.id === id);
        if (idx !== -1) this.pings.splice(idx, 1);
      }, 450);
    },

    closestInView(
      point: { x: number, y: number },
      threshold?: number
    ): PointData | null {
      // Both branches iterate the module-level pre-parsed ALL_POINTS_3D cache
      // (built once at load with trig values + ecliptic-rotated world vertex
      // baked in) instead of WWT's getTableDataInView(), which used to re-split
      // the per-layer CSV strings on every pointermove and was the cause of
      // pan stutter. The cache is also the only consistent source of truth
      // once the custom exoplanet renderer is authoritative — WWT's per-layer
      // row data goes stale when we stop calling drawSpreadSheetLayer for it.
      if (this.modeReactive === '3D') {
        return this._closestInView3D(point, threshold);
      }
      return this._closestInView2D(point, threshold);
    },

    // 2D hit-test against ALL_POINTS_3D. Mirrors _closestInView3D but uses
    // WWT's 2D screen projection (findScreenPointForRADec) per row and a
    // smaller default pixel threshold (4 px vs 12 px in 3D).
    //
    // The 2D and 3D paths share: layersOn / time filtering, a hemisphere
    // pre-cull against the camera direction, screen-bounds rejection, and
    // ranking by squared-pixel distance. They differ in: projection function,
    // pixel threshold, and (cosmetic) the threshold-default constant. The
    // shapes are identical enough that a future refactor could pass a
    // project-fn callback, but inlining keeps each path readable.
    _closestInView2D(
      point: { x: number, y: number },
      threshold?: number
    ): PointData | null {
      const layersOn = this.layersOn;
      const currentMs = this.getSliderDate().getTime();
      const camRA = this.wwtRARad;
      const camDec = this.wwtDecRad;
      const sinCamDec = Math.sin(camDec);
      const cosCamDec = Math.cos(camDec);
      const px = point.x;
      const py = point.y;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      // Generous bounds: a real on-screen forward projection lands inside
      // the window; mirror projections of antipodal points often land far
      // outside. One window-dimension margin keeps near-edge targets in.
      const sxMin = -winW;
      const sxMax = 2 * winW;
      const syMin = -winH;
      const syMax = 2 * winH;
      // Adaptive angular pre-filter — same shape as the 3D path. Skip points
      // well outside the camera's view cone before paying for the per-row
      // matrix projection. Zoomed-in views cull >99% of points before they
      // hit findScreenPointForRADec.
      const fovDeg = (this.wwtRenderContext.get_fovAngle?.() ?? 60);
      const aspect = winH > 0 ? Math.max(1, winW / winH) : 1;
      const halfConeRad = Math.min(Math.PI, (fovDeg * aspect * 0.5 + 15) * D2R);
      const cullCos = Math.max(-0.35, Math.cos(halfConeRad));
      const thresh = threshold ?? 4;
      const threshSq = thresh * thresh;
      let minDistSq = Infinity;
      let bestScreenX = 0;
      let bestScreenY = 0;
      let closestRow: Hit3DRow | null = null;

      for (let i = 0; i < ALL_POINTS_3D.length; i++) {
        const r = ALL_POINTS_3D[i];
        if (!layersOn[r.layerKey]) continue;
        if (r.discPubdate.getTime() > currentMs) continue;

        const cosSep = sinCamDec * r.sinDec +
                       cosCamDec * r.cosDec * Math.cos(r.ra - camRA);
        if (cosSep < cullCos) continue;

        // 2D projection via WWT's stock helper. In sky mode this routes to
        // getScreenPointForCoordinates(ra/15, dec) → unit-sphere projection
        // through the engine's 2D view/projection matrices.
        const sp = this.findScreenPointForRADec({ ra: r.raDeg, dec: r.decDeg });
        if (!sp) continue;
        const sx = sp.x;
        const sy = sp.y;
        if (!isFinite(sx) || !isFinite(sy)) continue;
        if (sx < sxMin || sx > sxMax || sy < syMin || sy > syMax) continue;

        const dx = sx - px;
        const dy = sy - py;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          bestScreenX = sx;
          bestScreenY = sy;
          closestRow = r;
        }
      }

      if (closestRow === null || minDistSq >= threshSq) return null;

      const colorStr = colorForCat(closestRow.cat);
      return {
        x: bestScreenX,
        y: bestScreenY,
        ra: closestRow.ra,
        dec: closestRow.dec,
        name: closestRow.name,
        gdist: String(closestRow.gdist),
        cat: closestRow.cat,
        plOrbper: closestRow.plOrbper,
        endDate: closestRow.endDate,
        color: { toString: () => colorStr } as unknown as Color,
      };
    },

    // 3D hit-test. Iterates the pre-parsed ALL_POINTS_3D cache and picks the
    // point whose projected screen position is closest *in pixels* to the
    // pointer. 3D-distance (gdist) deliberately does not factor into the
    // ranking — a far Kepler-field dot and a close hot-Jupiter dot are
    // equally hittable.
    //
    // Anti-mirror guard: transformWorldPointToPickSpace divides by depth
    // without checking sign, so a point behind the camera can mirror-project
    // near the cursor. We use a *relaxed* hemisphere cull (cos sep > -0.35,
    // ~110° tolerance) plus a screen-bounds sanity check. The strict
    // dot > 0 cull was rejecting legit far points whose camera-frame
    // direction differs from the origin-frame approximation due to the
    // camera being translated in solar-system mode.
    _closestInView3D(
      point: { x: number, y: number },
      threshold?: number
    ): PointData | null {
      const layersOn = this.layersOn;
      const currentMs = this.getSliderDate().getTime();
      const camRA = this.wwtRARad;
      const camDec = this.wwtDecRad;
      const sinCamDec = Math.sin(camDec);
      const cosCamDec = Math.cos(camDec);
      const ctl = WWTControl.singleton;
      const px = point.x;
      const py = point.y;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      // Generous bounds: a real on-screen forward projection lands inside
      // the window; mirror projections of antipodal points often land far
      // outside. One window-dimension margin keeps near-edge targets in.
      const sxMin = -winW;
      const sxMax = 2 * winW;
      const syMin = -winH;
      const syMax = 2 * winH;
      // Adaptive angular pre-filter: skip points well outside the camera's
      // view cone before paying for the matrix-multiply projection. We use
      // the current vertical FOV widened by the window aspect (for horizontal
      // FOV) and an extra margin, capped at "all sky" so we never over-cull.
      // This is the big win when zoomed in — a 3° FOV culls >99% of points
      // before they hit getScreenPointForCoordinates.
      const fovDeg = (this.wwtRenderContext.get_fovAngle?.() ?? 60);
      const aspect = winH > 0 ? Math.max(1, winW / winH) : 1;
      const halfConeRad = Math.min(Math.PI, (fovDeg * aspect * 0.5 + 15) * D2R);
      // Use the tighter of (cos halfCone) and the safety floor −0.35 ≈ 110°.
      // Small FOV → cos halfCone is close to 1 → aggressive cull. Wide FOV
      // → cos halfCone drops toward −1 but we cap at −0.35 so the origin-
      // vs-camera direction approximation can't accidentally drop a legit
      // far point when the camera is translated in solar-system mode.
      const cullCos = Math.max(-0.35, Math.cos(halfConeRad));
      const thresh = threshold ?? 12;
      const threshSq = thresh * thresh;
      let minDistSq = Infinity;
      let bestScreenX = 0;
      let bestScreenY = 0;
      let closestRow: Hit3DRow | null = null;

      for (let i = 0; i < ALL_POINTS_3D.length; i++) {
        const r = ALL_POINTS_3D[i];
        if (!layersOn[r.layerKey]) continue;
        if (r.discPubdate.getTime() > currentMs) continue;

        const cosSep = sinCamDec * r.sinDec +
                       cosCamDec * r.cosDec * Math.cos(r.ra - camRA);
        if (cosSep < cullCos) continue;

        const sp = ctl.getScreenPointForCoordinates(r.xR, r.yR, r.zR);
        if (!sp) continue;
        const sx = sp.x;
        const sy = sp.y;
        if (!isFinite(sx) || !isFinite(sy)) continue;
        if (sx < sxMin || sx > sxMax || sy < syMin || sy > syMax) continue;

        const dx = sx - px;
        const dy = sy - py;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          bestScreenX = sx;
          bestScreenY = sy;
          closestRow = r;
        }
      }

      if (closestRow === null || minDistSq >= threshSq) return null;

      const colorStr = colorForCat(closestRow.cat);
      return {
        x: bestScreenX,
        y: bestScreenY,
        ra: closestRow.ra,
        dec: closestRow.dec,
        name: closestRow.name,
        gdist: String(closestRow.gdist),
        cat: closestRow.cat,
        plOrbper: closestRow.plOrbper,
        endDate: closestRow.endDate,
        color: { toString: () => colorStr } as unknown as Color,
      };
    },

    // Convert a screen-pixel point to (RA, Dec) in radians by casting a ray
    // through the camera, then undoing the rotateX(ecliptic) the engine applies
    // to spherical Sky-frame world coordinates. The ray direction is in WWT's
    // post-rotation world frame (y = ecliptic-tilted dec axis), so we rotateX
    // by -ecliptic to recover the equatorial WWT-frame (y = sin δ).
    _rayToRADec(pt: { x: number; y: number }): { ra: number; dec: number } | null {
      try {
        // findRayForScreenPoint is exposed by engine-pinia's wwtaware mixin but
        // missing from the older MiniDSBase type defs, hence the cast.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ray = (this as any).findRayForScreenPoint({ x: pt.x, y: pt.y });
        if (!ray || ray.length < 2) return null;
        const d = ray[1];
        const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
        if (!isFinite(len) || len === 0) return null;
        const dx = d.x / len, dy = d.y / len, dz = d.z / len;
        const cosE = Math.cos(ECLIPTIC_RAD);
        const sinE = Math.sin(ECLIPTIC_RAD);
        // Inverse of rotateX(+ecliptic) is rotateX(-ecliptic):
        //   y' =  y cosE + z sinE
        //   z' = -y sinE + z cosE
        const yEq =  dy * cosE + dz * sinE;
        const zEq = -dy * sinE + dz * cosE;
        const xEq = dx;
        // WWT frame: (cos α cos δ, sin δ, sin α cos δ)
        const dec = Math.asin(Math.max(-1, Math.min(1, yEq)));
        let ra = Math.atan2(zEq, xEq);
        if (ra < 0) ra += 2 * Math.PI;
        return { ra, dec };
      } catch (e) {
        return null;
      }
    },

    wwtOnPointerMove(event: PointerEvent) {
      if (!this.isPointerMoving && this.pointerStartPosition !== null) {
        const dist = Math.sqrt((event.pageX - this.pointerStartPosition.x) ** 2 + (event.pageY - this.pointerStartPosition.y) ** 2);
        if (dist > this.pointerMoveThreshold) {
          this.isPointerMoving = true;
        }
      }
      // Hover identification — rAF-throttled so we run identify at most once
      // per frame, regardless of how fast the OS fires pointermove events.
      // Without this the 3D path (projecting ~6000 cached points per call)
      // could fire 100+ times/sec on a 120Hz mouse and visibly stutter pan.
      // We stash only the most recent event; intermediate moves get dropped,
      // which is fine for hover identify.
      this.pendingHoverEvent = event;
      if (this.hoverRafId === null) {
        this.hoverRafId = requestAnimationFrame(() => {
          this.hoverRafId = null;
          const e = this.pendingHoverEvent;
          this.pendingHoverEvent = null;
          if (!e) return;
          this._runHoverIdentify(e);
        });
      }
    },

    _runHoverIdentify(event: PointerEvent) {
      const is3D = this.modeReactive === '3D';
      // Reticle sonification is 2D-only; in 3D the reticle UI is hidden and
      // any lingering reticleEnabled state must not trigger an identify.
      if (this.mobile && this.reticleEnabled && !is3D) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.updateLastClosePoint(event, { x: cx, y: cy }, 55);
      } else if (!this.mobile) {
        // Desktop hover: bigger threshold in 3D because dots are smaller
        // there and a 4-px target is unhittable. Matches point-testing-3d feel.
        this.updateLastClosePoint(event, undefined, is3D ? 12 : undefined);
      }
    },

    wwtOnPointerDown(event: PointerEvent) {
      this.isPointerMoving = false;
      this.pointerStartPosition = { x: event.pageX, y: event.pageY };
    },

    wwtOnPointerUp(event: PointerEvent) {
      if (!this.isPointerMoving && this.modeReactive !== '3D' && !this.mobile) {
        this.updateLastClosePoint(event);
      }

      this.pointerStartPosition = null;
      this.isPointerMoving = false;
    },

    updateLastClosePoint(event: PointerEvent, overridePoint?: { x: number; y: number }, overrideProximity?: number): void {
      // Keep the searched planet's popup visible until the user actually moves
      // the camera (handled by the wwt position watchers, not hover).
      if (this.popupPinned) return;
      const pt = overridePoint ?? { x: event.offsetX, y: event.offsetY };
      const proximity = overrideProximity ?? this.selectionProximity;
      const closestPt = this.closestInView(pt, proximity);
      if (closestPt == null && this.lastClosePt == null) {
        return;
      }
      const needsUpdate =
        closestPt == null ||
        this.lastClosePt == null ||
        this.lastClosePt.ra != closestPt.ra ||
        this.lastClosePt.dec != closestPt.dec;
      if (needsUpdate) {
        this.lastClosePt = closestPt;
        // Play hover sound when the closest point under the cursor changes
        if (closestPt) {
          if (!this.isPlaying) {
            try {
              if (Number.isFinite(closestPt.plOrbper) && closestPt.plOrbper > 0) {
                this.playPointTone?.(closestPt.plOrbper);
              }
              const color = colorForCat(closestPt.cat);
              if (this.modeReactive === '2D') {
                this.spawnPing(closestPt.ra * R2D, closestPt.dec * R2D, color);
              } else {
                this.spawnPing3D(closestPt.ra * R2D, closestPt.dec * R2D, Number(closestPt.gdist), color);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    },

    wwtSmallestFov(): number {
      // ignore the possibility of rotation
      const w = this.wwtRenderContext.width;
      const h = this.wwtRenderContext.height;
      const fovH = this.wwtRenderContext.get_fovAngle() * D2R;
      const fovW = fovH * w / h;
      return Math.min(fovW, fovH);
    },
    
    /*circleForLocation(latDeg: number, lonDeg: number): L.Circle<any> {
      return L.circle([latDeg, lonDeg], {
        color: "#FF0000",
        fillColor: "#FF0033",
        fillOpacity: 0.5,
        radius: 200
      });
    },*/

    /* Toggles the hamburger menu when the hamburger icon is clicked */
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      // this.showCatalog = false; //!this.showCatalog;
      // this.showCatalogButton = !this.showCatalogButton;
      if (this.isMenuOpen && this.showSearch) {
        this.showSearch = false;
        this.clearSearch();
      }
    },

    openCatalog() {
      this.showCatalog = !this.showCatalog;
    },

    openCatalogButton() {
      this.showCatalogButton = !this.showCatalogButton;
    },

    /* This is for the "Toggle description" in the hamburger menu. It opens the intro container */
    openIntro() {
      this.showIntro = !this.showIntro;
      this.showBgButton = false;
      this.showCatalog = true;
      this.showCatalogButton = true;
      this.isMenuOpen = !this.isMenuOpen;
      this.currentTool == 'crossfade';
    },
    
    toggleLink() {
      this.isMenuOpen = !this.isMenuOpen;
      this.showCatalog = true;
      this.showCatalogButton = true;
    },

    toggleBgSlider() {
      this.showBgSlider = !this.showBgSlider;
      this.showIntro = false;
      this.showBgButton = false;
      this.isMenuOpen = false;
      this.showCatalog = true;
      this.showCatalogButton = true;
      this.currentTool = 'crossfade';
    },    

    toggleSkySurveySelector() {
      this.showBgButton = !this.showBgButton;
      this.showIntro = false;
      this.showBgSlider = false;
      this.isMenuOpen = false;
      this.showCatalog = true;
      this.showCatalogButton = true;
      this.currentTool = 'sky-survey';
      this.skySurveySelectedCount = this.skySurveySelectedCount + 1;
    },

    toggleCrossfadeSky() {
      this.showIntro = false;
      this.isMenuOpen = false;
      this.showCatalog = true;
      this.showCatalogButton = true;
      this.showSkyPicker = false;
      this.modeReactive = '2D';
      const opening = this.currentTool !== 'sky-survey';
      this.currentTool = opening ? 'sky-survey' : 'crossfade';
      if (opening && this.skySurveySelectedCount === 0) {
        tween(0, 100, (v: number) => {
          this.foregroundOpacity = v;
          this.fg2DOpacity = v;
          this.setForegroundOpacity(v);
        }, { time: 3000 });
      }
      if (opening) this.skySurveySelectedCount++;
    },

    toggleSearch() {
      this.showSearch = !this.showSearch;
      this.isMenuOpen = false;
      if (this.showSearch) {
        // No longer forces 2D — selectSearchResult handles both modes via the
        // mode-aware zoomDeg in gotoRADecZoom.
        this.showCatalog = false;
        this.$nextTick(() => (this.$refs.searchInput as HTMLInputElement)?.focus());
      } else {
        this.clearSearch();
      }
    },

    onSearchInput() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) { this.searchResults = []; return; }
      this.searchResults = ALL_POINTS
        .filter(p => p.name.toLowerCase().includes(q))
        .slice(0, 10);
    },

    selectSearchResult(pt: typeof ALL_POINTS[number] | undefined) {
      if (!pt) return;
      this.searchResults = [];
      this.searchQuery = pt.name;
      const is3D = this.modeReactive === '3D';
      if (is3D) {
        this.gotoExoplanet3D(pt);
      } else {
        this.gotoRADecZoom({ raRad: pt.ra * D2R, decRad: pt.dec * D2R, zoomDeg: 8, instant: false });
      }
      if (Number.isFinite(pt.plOrbper) && pt.plOrbper > 0) {
        this.playPointTone(pt.plOrbper);
      }
      // Show info popup for the searched planet
      const colorStr = colorForCat(pt.cat);
      this.lastClosePt = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        ra: pt.ra * D2R,
        dec: pt.dec * D2R,
        name: pt.name,
        gdist: String(pt.gdist),
        cat: pt.cat,
        plOrbper: pt.plOrbper,
        endDate: pt.endDate,
        color: { toString: () => colorStr } as unknown as Color,
      };
      // Pin the popup so hover doesn't clear it; arm camera-move clearing only
      // after the slew has had time to settle.
      this.pinSearchPopup();
      // Persistent marker that tracks the planet through the slew and stays
      // visible until the user moves the view (same lifecycle as the popup).
      // Now world-space via the renderer's ring pass — the previous CSS
      // overlay re-projected on every wwt watcher tick; the ring pass anchors
      // to the planet's vertex automatically.
      // Vue 3 wraps data-bound array items in reactive proxies, so the `pt`
      // we received from the template is a Proxy, not the raw ALL_POINTS row
      // that keys ROW_INDEX_OF. toRaw() unwraps it back to the original
      // reference so the Map lookup succeeds.
      const rowIdx = ROW_INDEX_OF.get(toRaw(pt));
      if (rowIdx !== undefined) {
        cloudSetSearchRing(rowIdx, { color: colorStr });
        // Transient pulse on top of the persistent ring.
        cloudStartPing(rowIdx, performance.now(), { color: colorStr });
      }
    },

    // Pin the search-result popup, then arm "unpin on camera move" once the
    // slew has settled. We can't trust a fixed-delay timer here: ViewMoverSlew
    // duration varies with angular and zoom distance and can exceed any
    // reasonable fixed budget, which used to snapshot mid-slew and trip the
    // unpin threshold on the remaining motion. Instead, use an idle detector
    // — every wwt RA/Dec/zoom watcher tick (re)starts the timer, so the
    // snapshot is captured only after motion has been quiet for IDLE_MS.
    pinSearchPopup() {
      this.popupPinned = true;
      this.popupPinSnapshot = null;
      this.armPopupSettleTimer();
    },

    // (Re)start the idle timer that arms the post-slew camera snapshot.
    // Called from pinSearchPopup and from checkUnpinOnCameraMove on every
    // camera tick while a snapshot has not yet been captured.
    armPopupSettleTimer() {
      if (this.popupPinTimer) clearTimeout(this.popupPinTimer);
      this.popupPinTimer = setTimeout(() => {
        this.popupPinTimer = null;
        if (!this.popupPinned) return;
        this.popupPinSnapshot = {
          raRad: this.wwtRARad,
          decRad: this.wwtDecRad,
          zoomDeg: this.wwtZoomDeg,
        };
      }, 500);
    },

    unpinSearchPopup(alsoClearPoint = false) {
      if (this.popupPinTimer) {
        clearTimeout(this.popupPinTimer);
        this.popupPinTimer = null;
      }
      this.popupPinned = false;
      this.popupPinSnapshot = null;
      // The persistent search ring shares the popup's lifecycle — cleared
      // when the user moves the camera, switches modes, opens the sky
      // picker, starts playback, etc.
      cloudClearSearchRing();
      if (alsoClearPoint) this.lastClosePt = null;
    },

    checkUnpinOnCameraMove() {
      if (!this.popupPinned) return;
      // While the search bar is open, the searched planet stays circled
      // through any user pan/zoom — the ring only clears when search closes
      // or a different planet is selected.
      if (this.showSearch) return;
      const snap = this.popupPinSnapshot;
      if (!snap) {
        // Snapshot not yet armed — slew is still moving the camera. Restart
        // the idle timer so the snapshot only captures once motion stops.
        this.armPopupSettleTimer();
        return;
      }
      // Thresholds: ~0.3° for RA/Dec, 1.5% relative zoom. Loose enough that
      // residual slew-end jitter or a stationary view's float noise won't
      // trip it, tight enough that a real pan/zoom unpins immediately.
      const dRA = Math.abs(this.wwtRARad - snap.raRad);
      const dDec = Math.abs(this.wwtDecRad - snap.decRad);
      const dZoom = snap.zoomDeg > 0
        ? Math.abs(this.wwtZoomDeg - snap.zoomDeg) / snap.zoomDeg
        : 0;
      if (dRA > 5e-3 || dDec > 5e-3 || dZoom > 1.5e-2) {
        this.unpinSearchPopup(true);
      }
    },

    // 3D-mode search slew. In solar-system mode the engine hardcodes
    // lookAt = (0,0,0) (engine line 47715) — the camera always looks at the
    // world origin. Two things have to be coordinated to land the searched
    // planet at screen center against its real sky background:
    //
    //   1. viewTarget = v_ecl (the planet's ecliptic-rotated world vertex,
    //      matching SpreadSheetLayer's vertex buffer). The layer-draw branch
    //      (engine line 67391–67397) translates the world by -viewTarget
    //      before drawing layers, so the planet's vertex lands at the origin
    //      = the camera's hardcoded look-at point.
    //
    //   2. lat/lng chosen so the camera-to-origin direction matches the
    //      planet's actual sky direction +v_ecl/|v_ecl|. With cameraPosition
    //      = viewAdjust*(0,0,cameraDist), and viewAdjust = RotX(-lat)·RotY(-lng)
    //      applied as a row-vector right-multiply (engine convention), the
    //      offset direction is (-cos(lat)·sin(lng), sin(lat), cos(lat)·cos(lng)).
    //      The look direction (from cameraPos toward origin) is the negative
    //      of that. Setting it equal to v_ecl/len yields:
    //          cos(lat)·sin(lng) =  vx/len
    //          sin(lat)          = -vy/len
    //          cos(lat)·cos(lng) = -vz/len
    //      → lat = asin(-vy/len),  lng = atan2(vx, -vz).
    //
    // Note: the earlier formula (-sin lng, cos lng·sin lat, cos lng·cos lat)
    // documented in CLAUDE.md was wrong; the y-component is sin(lat), not
    // cos(lng)·sin(lat). The previous lat/lng solver matched that wrong shape
    // and landed the camera ~50–60° off (51 Peg b → Cygnus/Draco instead of
    // Pegasus; 51 Eri b → Perseus instead of Eridanus).
    gotoExoplanet3D(pt: typeof ALL_POINTS[number]) {
      const raDeg = pt.ra;
      const decDeg = pt.dec;
      const distPc = Number(pt.gdist);
      const distAU = (Number.isFinite(distPc) && distPc > 0) ? distPc * PARSEC_TO_AU : 1e9;

      // Planet world vertex (matches spawnPing3D / spreadsheet layer).
      const raHours = raDeg / 15;
      const rcra = Math.PI / 12;
      const cosD = Math.cos(decDeg * D2R);
      const sinD = Math.sin(decDeg * D2R);
      const cosR = Math.cos(raHours * rcra);
      const sinR = Math.sin(raHours * rcra);
      const vxRaw = cosR * cosD * distAU;
      const vyRaw = sinD * distAU;
      const vzRaw = sinR * cosD * distAU;
      const cosE = Math.cos(ECLIPTIC_RAD);
      const sinE = Math.sin(ECLIPTIC_RAD);
      const vx = vxRaw;
      const vy = vyRaw * cosE - vzRaw * sinE;
      const vz = vyRaw * sinE + vzRaw * cosE;
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (!(len > 0)) return;

      const sinLat = -vy / len;
      const latDeg = Math.asin(Math.max(-1, Math.min(1, sinLat))) * R2D;
      const cosLat = Math.sqrt(Math.max(0, 1 - sinLat * sinLat));
      let lngDeg: number;
      if (cosLat > 1e-12) {
        // Equivalent to atan2((vx/len)/cosLat, (-vz/len)/cosLat); cosLat cancels.
        lngDeg = Math.atan2(vx, -vz) * R2D;
      } else {
        lngDeg = 0; // degenerate pole; lng is arbitrary.
      }

      // cameraDistance = 4*zoom/9. With the planet rendered at the origin
      // (viewTarget shift), the camera-to-planet distance equals cameraDist.
      // Land the slew at ~25% of |v_ecl| so the planet is prominent but the
      // galactic context stays visible. Clamp to engine min/max-zoom.
      const targetCamDistAU = Math.max(13333, len * 0.25);
      const zoomDeg = Math.max(this.minZoom, Math.min(this.maxZoom, (9 / 4) * targetCamDistAU));

      const rc = this.wwtRenderContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = rc.viewCamera.copy();
      params.lat = latDeg;
      params.lng = lngDeg;
      params.zoom = zoomDeg;
      params.target = 20; // SolarSystemObjects.custom — engine preserves our viewTarget
      params.targetReferenceFrame = '';
      params.viewTarget.x = vx;
      params.viewTarget.y = vy;
      params.viewTarget.z = vz;

      const fg = rc.get_foregroundImageset();
      const bg = rc.get_backgroundImageset();
      gotoTargetFullHacked(this.wwtControl, false, false, params, fg, bg, 3);
    },

    clearSearch() {
      this.searchQuery = '';
      this.searchResults = [];
    },

    /* This is for the close button of the intro box */
    closeIntro() {
      this.showIntro = false;
    },

    onIntroBodyScroll() {
      const el = this.$refs.introBody as HTMLElement;
      if (!el) return;
      this.introCanScrollUp   = el.scrollTop > 2;
      this.introCanScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    },

    introScrollBody(delta: number) {
      const el = this.$refs.introBody as HTMLElement;
      if (el) el.scrollBy({ top: delta, behavior: 'smooth' });
    },
    

    // WWT does have all of this functionality built in
    // but it doesn't seem to be exposed
    // We should do that, but for now we just copy the web engine code
    // https://github.com/Carifio24/wwt-webgl-engine/blob/master/engine/wwtlib/Coordinates.cs
    altAzToHADec(altRad: number, azRad: number, latRad: number): { ra: number; dec: number; } {
      azRad = Math.PI - azRad;
      if (azRad < 0) {
        azRad += 2 * Math.PI;
      }
      let ra = Math.atan2(Math.sin(azRad), Math.cos(azRad) * Math.sin(latRad) + Math.tan(altRad) * Math.cos(latRad));
      if (ra < 0) {
        ra += 2 * Math.PI;
      }
      const dec = Math.asin(Math.sin(latRad) * Math.sin(altRad) - Math.cos(latRad) * Math.cos(altRad) * Math.cos(azRad));
      return { ra, dec };
    },

    setLayerOpacityForImageSet(name: string, opacity: number, setting_opacity_from_ui=false) {
      const layer = this.imagesetLayers[name];
      if (layer != null) {
        // update the image opacity in the WWT control
        applyImageSetLayerSetting(layer, ['opacity', opacity]);

        // update the value for the slider only if we are not setting the opacity from the UI
        if (!setting_opacity_from_ui) {
          const selector = `#items div.item[title='${name}'] input.opacity-range[type='range']`;
          const el = (document.querySelector(selector) as HTMLInputElement);
          if (el != null) {
            el.value = `${opacity * 100}`;
          }
        }

        const toggleSelector = `#items input[type='checkbox'][title='${name}']`;
        const el2 = (document.querySelector(toggleSelector) as HTMLInputElement);
        // truth table: opacity == 0 and el.checked == false => do nothing
        // truth table: opacity == 0 and el.checked == true => set el.checked = false
        // truth table: opacity > 0 and el.checked == false => set el.checked = true
        // truth table: opacity > 0 and el.checked == true => do nothing
        if (el2 != null) {
          if (opacity == 0 && el2.checked) {
            el2.checked = false;
          } else if (opacity > 0 && !el2.checked) {
            el2.checked = true;
          }
        }
        
      }
    },
    /*positionReset() {
      // since we aren't changing modes, 
      // we don't need to use set2DMode or set3DMode
      // also those are locked to only work if the mode is chaning
      // so we let's do this manually. 
      
      // only reset the current mode
      let pos = null as unknown as Omit<GotoRADecZoomParams, "instant">;
      if (this.modeReactive == "2D") {
        this.position2D = this.initial2DPosition;
        pos = this.position2D;
        
      } else if (this.modeReactive == "3D") {
        this.position3D = this.initialCameraParams;
        pos = this.position3D;
      } else if (this.modeReactive == 'full') {
        pos = this.idealPosition;
      }
      
      // we will move nicely. 
      this.gotoRADecZoom({
        ...pos,
        instant: false
      }).catch((err) => {
        console.log(err);
      });
      
      
    },
    
    shinkWWT(aspect: number = null as unknown as number) {
      // default aspect = 5.7
      if (aspect == null) {
        aspect = 5.7;
      }
      console.log('shinkWWT');
      
      const mainContent = document.querySelector(".wwtelescope-component") as HTMLElement;
      const width = mainContent.clientWidth;
      const height = width / aspect;
      mainContent.style.height = `${height}px`;
    },
    
    growWWT() {
      const mainContent = document.querySelector(".wwtelescope-component") as HTMLElement;
      mainContent.style.height = `100%`;
      this.resizeObserver?.unobserve(document.body as HTMLElement);
    },
*/
    basicLayerSetup(layer: SpreadSheetLayer) { //, timeSeries=false
      layer.set_lngColumn(1);
      layer.set_latColumn(2);
      layer.set_altColumn(3);
      layer.set_raUnits(RAUnits.degrees);
      layer.set_altUnit(AltUnits.parsecs);
      layer.set_altType(AltTypes.distance);
      layer.set_showFarSide(true);
      layer.set_markerScale(MarkerScales.screen);
      layer.set_plotType(PlotTypes.gaussian);
      layer.set_scaleFactor(30);
    
      /*if (timeSeries) {
        layer.set_startDateColumn(4);
        layer.set_endDateColumn(5);
        layer.set_timeSeries(true);
        //layer.set_decay(this.defaultClusterDecay);
      }*/
    },

    /*async toggleIdealViewingMode() {
      // to view in the full wave you need to adjust the height
      // of the window/canvas to have an W:H ration of 5.7
      let old3D = null as unknown as Omit<GotoRADecZoomParams,'instant'>;
      if (this.modeReactive == 'full') {
        this.modeReactive = this.previousMode;
        this.positionReset();
        return;
      } else if (this.modeReactive == '3D') {
        old3D = this.wwtPosition;
      }
      
      return this.set2DMode().then(() => {
        this.previousMode = this.modeReactive;
        this.modeReactive = "full";
        //phase=0;
        
        this.shinkWWT();
        this.resizeObserver?.observe(document.body);
        
        return this.gotoRADecZoom({
          ...this.idealPosition, 
          instant: false}).catch((err) => {
          console.log(err);
        }).then(() => {
          if (old3D) {this.position3D = old3D;}
        });
      });
      
    }, */
    /*animateMotion() { //WWW
      if (!this.isAnimating) return;

      // Increment RA and DEC for motion
      this.wwtRARad += 1; // Adjust increment speed as needed
      this.wwtDecRad += 0.5; // Adjust increment speed as needed

      // Apply the updated RA/DEC values
      this.gotoRADecZoom({
        raRad: this.wwtRARad,
        decRad: this.wwtDecRad,
        zoomDeg: this.wwtZoomDeg,
        instant: true, // Adjust based on your animation needs
      });

      // Continue the animation loop
      this.animationFrame = requestAnimationFrame(this.animateMotion);
    },
    startRotation() {
      // Start the rotation motion
      if (this.modeReactive == "3D") {
        this.isAnimating = true;
        this.animateMotion();
      }
    },
    stopMotion() {
      // Stop the rotation motion on user click
      this.isAnimating = false;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      console.log("Animation stopped due to user interaction.");
    },*/ //WWW
		

    openLink(url: string) {
      window.open(url, '_blank', 'noopener,noreferrer');
      this.isMenuOpen = false;
    },

    showQRForLink(url: string, title: string) {
      this.currentQRUrl = url;
      this.currentQRTitle = title;
      this.showQRCode = true;
      this.isMenuOpen = false;
    },

    closeQR() {
      this.showQRCode = false;
    },
  },

  watch: {
    showAltAzGrid(show: boolean) {
      this.wwtSettings.set_showAltAzGrid(show);
      this.wwtSettings.set_showAltAzGridText(show);
    },
    showConstellations(show: boolean) {
      setConstellationFiguresTarget(show ? 1 : 0);
    },

    modeKeepDotSize() {
      this.updateLayerScales();
    },

    showIntro(val: boolean) {
      if (val) {
        this.$nextTick(() => this.onIntroBodyScroll());
      }
    },

    showSkyPicker(val: boolean) {
      if (val) {
        this.unpinSearchPopup();
        this.lastClosePt = null;
      }
    },

    showSearch(val: boolean) {
      if (!val) {
        // Single source of truth for "search closed" cleanup — covers the X
        // button (toggleSearch), Escape key, and hamburger-menu force-close.
        // Reopening search or selecting a different result rebuilds the pin.
        this.unpinSearchPopup(true);
      }
    },

    // Unpin the search popup when the camera moves away from the post-slew
    // snapshot. popupPinSnapshot is only set after pinSearchPopup's settle
    // timer fires, so this watcher is a no-op during the slew itself.
    wwtRARad() { this.checkUnpinOnCameraMove(); },
    wwtDecRad() { this.checkUnpinOnCameraMove(); },
    wwtZoomDeg() { this.checkUnpinOnCameraMove(); },

    fgName(name: string) {
      if (this.modeReactive !== "2D") return;
      const targetOpacity = this.fg2DOpacity > 0 ? this.fg2DOpacity : 100;
      const startOpacity = this.foregroundOpacity;
      tween(startOpacity, 0, (v) => { this.setForegroundOpacity(v); }, {
        time: 1000,
        done: () => {
          this.setForegroundImageByName(name);
          tween(0, targetOpacity, (v) => {
            this.setForegroundOpacity(v);
            this.fg2DOpacity = v;
          }, { time: 3000 });
        }
      });
    },

    foregroundOpacity(opacity: number) {
      if (this.modeReactive == "2D") {
        this.fg2DOpacity = opacity;
      }
    },
    
    modeReactive(newVal, oldVal) {
      mode = newVal;
      // Clear any lingering hover/reticle selection so a stale planet label
      // from the previous mode doesn't persist after switching.
      if (newVal !== oldVal) {
        this.unpinSearchPopup();
        this.lastClosePt = null;
      }
      // Constellation figure brightness differs between 2D (full) and 3D
      // (dimmed to CONSTELLATION_3D_OPACITY). Re-apply so the displayed alpha
      // smoothly retargets on mode switch when constellations are on.
      notifyConstellationModeChange();
      // Search is now allowed in 3D — selectSearchResult handles the mode-aware
      // zoomDeg, so the auto-close on switch-to-3D is no longer needed.
      if (oldVal == newVal) {
        if (newVal == "2D") {
          this.set2DMode();
        }
        if (newVal == "3D") {
          this.set3DMode();
        }
        this.modeKeepDotSize = newVal; // "2D" or "3D"

        /*if (newVal == "full") {
          this.toggleIdealViewingMode();
        }*/
      } else {
      
        if (oldVal == "2D") {
          this.position2D = this.wwtPosition;
        } else if (oldVal == "3D") {
          this.position3D = this.wwtPosition;
        } 
        this.modeKeepDotSize = newVal; // "2D" or "3D"
      /*else if (oldVal == "full") {
          this.resizeObserver?.disconnect();
          this.growWWT();
          //this.toggleUI(); //ZZZ
        }*/
      }
      
      
      
      if (newVal == "2D") {
        this.set2DMode();
      } else if (newVal == "3D") {
        this.set3DMode();
      } else {
        // don't do anything if mode is null
        return;
      }
      
    } 
  },

  currentMonthIndex() {
    if (this.isPlaying) {
      this.stopPlay();
    }
  },

  beforeUnmount() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
    }
    if (this.hoverRafId !== null) {
      cancelAnimationFrame(this.hoverRafId);
      this.hoverRafId = null;
    }
  }
});

</script>

<style lang="less" scoped>

.no-background {
  background-image: none!important;
}

/* ── Intro modal ─────────────────────────────────────────────── */

.intro-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 10, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.intro-modal {
  position: relative;
  width: min(92vw, 580px);
  max-height: 88vh;
  background: linear-gradient(160deg, #0a0435ee 0%, #060120f5 100%);
  color: rgb(227, 227, 227);
  border: 1px solid #2a7adb80;
  border-radius: 14px;
  box-shadow: 0 0 40px 4px #1671e044, 0 8px 32px rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: Roboto, sans-serif;
}

.intro-modal-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  color: #9bb8d8;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 4px;
  z-index: 1;
  transition: color 0.2s;
}
.intro-modal-close:hover { color: #ffffff; }

.intro-modal-logos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 1.3rem 2rem 0.8rem;
  border-bottom: 1px solid #1671e030;
}

.intro-logo-ip {
  height: 72px;
  width: auto;
  object-fit: contain;
  margin-bottom: 0.15rem;
}

.intro-logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-logo-attr {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9bb8d8;
  font-size: 0.78rem;
  text-decoration: none;
  transition: color 0.2s;
}
.intro-logo-attr:hover { color: #d0e8ff; }

.intro-logo-cds {
  height: 22px;
  width: auto;
  object-fit: contain;
}

.intro-logo-wwt {
  height: 22px;
  width: auto;
  object-fit: contain;
  filter: brightness(1.2);
}

.intro-modal-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  color: #d0e8ff;
  padding: 0.9rem 2rem 0.2rem;
  margin: 0;
}

.intro-audio-notice {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  background: rgba(100, 180, 255, 0.12);
  border: 1px solid rgba(100, 180, 255, 0.3);
  border-radius: 6px;
  color: #a8d4ff;
  font-size: 0.8rem;
  padding: 0.45em 0.9em;
  margin: 0.4rem auto 0.2rem;
  width: fit-content;
  align-self: center;
}

.intro-audio-notice .fa-volume-up {
  flex-shrink: 0;
  font-size: 0.9em;
}

.intro-body-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.intro-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.8rem 1.8rem 0.5rem;
  font-size: 0.88rem;
  line-height: 1.6;
}

.intro-modal-body p {
  margin-bottom: 0.85em;
}

.intro-scroll-hint {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  pointer-events: auto;
  cursor: pointer;
  color: #7ab4f0;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.intro-scroll-hint:hover { color: #d0e8ff; }

.intro-scroll-up {
  top: 0;
  background: linear-gradient(to bottom, #0a0435ee 55%, transparent);
}

.intro-scroll-down {
  bottom: 0;
  background: linear-gradient(to top, #060120f5 55%, transparent);
}

.intro-arrow-fade-enter-active, .intro-arrow-fade-leave-active { transition: opacity 0.2s; }
.intro-arrow-fade-enter-from, .intro-arrow-fade-leave-to { opacity: 0; }

.intro-how-to {
  background: rgba(22, 113, 224, 0.08);
  border: 1px solid #1671e028;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1em;
}

.intro-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7ab4f0;
  margin: 0 0 0.6rem;
}

.intro-instructions {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.intro-instructions li {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.84rem;
}

.intro-icon {
  flex-shrink: 0;
  width: 1.3em;
  text-align: center;
  color: #5a9fd4;
  margin-top: 0.15em;
}

.intro-modal-cta {
  flex-shrink: 0;
  margin: 0.5rem 1.8rem 1.1rem;
  padding: 0.6rem 1.4rem;
  background: linear-gradient(90deg, #1a5fb0, #2a7adb);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: filter 0.2s;
  align-self: center;
}
.intro-modal-cta:hover { filter: brightness(1.15); }

.intro-modal-body::-webkit-scrollbar { width: 4px; }
.intro-modal-body::-webkit-scrollbar-track { background: transparent; }
.intro-modal-body::-webkit-scrollbar-thumb { background: #2a7adb60; border-radius: 2px; }

/* Transition */
.intro-fade-enter-active, .intro-fade-leave-active { transition: opacity 0.25s ease; }
.intro-fade-enter-from, .intro-fade-leave-to { opacity: 0; }

/* Where the hamburger menu icon is located */
.hamb-icon-container {
  position: absolute;
  right: 0;
  padding: 10px;
  top: 2.8rem;
  z-index: 11;
}

/* Hamburger menu */
.hamb-menu-container {
  display: none;
  padding: 20%;
  position: absolute;
  border-radius: 10px;
  color: rgb(227, 227, 227);
  top: 20%;
  right: 90%;
  background: var(--color-default); // rgba(12, 11, 56, 0.808);
  border: solid 1px #1671e07c;
  width: 13.5rem;
  list-style-type: none; /* This removes the bullet points */
  font-family: Roboto;
  z-index: 11;
}

/* Not sure what this is for, but it is needed for the menu to work */
.hamb-menu-container.show {
  display: block;
}

.hamb-menu-items:hover {
  background-color: #1671e000; /*#1671e0c0*/
  cursor: pointer;
  padding-left: 15px; /* Remove if you don't want the moving as hovering effect */
}

.hamb-menu-container:hover {
box-shadow: 0 0 3px 2px #1671e07c; 
} 


.bg-slider-container {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: "play slider label";
  align-items: center;
  gap: 5px;
  width: 90%;
  max-width: 60em;
  padding-left: 1.5em;
  padding-right: 1.5em;
  padding-top: 3px;
  border-radius: 10px;
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
}

.play-btn {
  grid-area: play;
}

.month-label {
  grid-area: label;
  white-space: nowrap;
  padding: 5px 22px;

  &:hover {
    box-shadow: none !important;
    cursor: default !important;
  }
}

@media (pointer: coarse) {
  .bg-slider-container {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "slider slider"
      "play   label";
    padding-bottom: 3px;
  }

  .month-label {
    justify-self: end;
    text-align: right;
  }
}

.bg-slider-text {
  color: rgb(227, 227, 227);
  background: var(--color-default); //rgba(12, 11, 56, 0.808);
  border: solid 1px #1671e07c;
  padding: 5px 5px;
  pointer-events: auto;
  font-size: 0.8em;
  text-align: center;
  border-radius: 10px;

  &:hover {
    box-shadow: 0 0 4px 3px #1671e07c;
    transition: all 200ms ease-out;
    cursor: pointer;
  }
}


.opacity-range {
  grid-area: slider;
  pointer-events: auto;
  width: 100%;
}

.catalog-button {
  background: var(--color-default); // rgba(12, 11, 56, 0.808);
  border: solid 1px #1671e07c;
  text-align: center;
  color: rgb(227, 227, 227);
  border-radius: 10px; //10px 10px 0 0;
  left: 0.5rem;
  height: 2rem;
  position: absolute;
  top: 0.8rem;
  width: 12rem; //10.2rem;
  cursor: pointer;
  z-index: 11;
}

.catalog-button:hover {
box-shadow: 0 0 3px 2px #1671e07c; 
} 

.center-buttons { //ok it isn't center, who are we kidding?
  //width: 90%;
  //max-width: 30em;
  //height: 120px;
  background: var(--color-default); // rgba(12, 11, 56, 0.808);
  color: rgb(227, 227, 227);
  border: solid 1px #1671e07c;
  padding-left: 1em; 
  padding-right: 1em; 
  padding-top: 4px;
  border-radius: 10px; 
  position: absolute;
  top: 0.8rem;
  height: 2rem;
  right: 0.5rem;
  //left: 50%;
  z-index: 11;
  //transform: translateX(-50%);
  display: inline-block;
  overflow: auto; /* Allow vertical scrolling */
  font-family: Roboto;
  transition: border-color 0.3s ease;
}

.center-buttons:hover {
box-shadow: 0 0 3px 2px #1671e07c; 
} 

.checkboxes-container {
  max-height: calc(65vh - 9rem);
  left: 0.75rem;
  overflow-y: scroll;
  position: absolute;
  top: 2.8rem;
  width: 11.5rem; //9.7rem;
  font-size: 0.8rem;
  text-align: left;
  border-radius: 0 0 10px 10px;
  background: var(--color-default); // rgba(12, 11, 56, 0.808);
  border: solid 1px #1671e07c;
  padding: 10px;
}

.checkboxes-container::-webkit-scrollbar {
  background-color: transparent;
  width: 0px;
}

.checkboxes-container::-moz-scrollbar {
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.checkboxes-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.checkboxes-container::-webkit-scrollbar-thumb {
  background-color: #ffffff76;
  border-radius: 4px;
}



.links {
  color: rgb(227, 227, 227);
}

@font-face {
  font-family: 'Roboto';
  src: url('./assets/Roboto.ttf')
}

#circle-popover {
  background-color: var(--color-default);
  color: var(--current-color);
  border: solid 1px var(--current-color);
  border-radius: 10px;
  position: fixed;
  bottom: 10rem;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(340px, 85vw);
  padding: 6px 14px;
  font-size: 0.85em;
  z-index: 12;
  pointer-events: none;
  text-align: center;
}

.popover-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.popover-details {
  font-size: 0.82em;
  opacity: 0.85;
}

.data-label {
  color: var(--color-default2);
  font-size: 0.8rem;
  text-align: center;
  white-space: nowrap;
}

.constellations :deep(label) {
    color: var(--color-default2);
    font-size: 0.8em;
}

.type0 :deep(label){
    color: var(--color0);
    font-size: 0.8em;
}

.type1 :deep(label) {
    color: var(--color1);
    font-size: 0.8em;
}

.type2 :deep(label) {
    color: var(--color2);
    font-size: 0.8em;
}

.type3 :deep(label) {
    color: var(--color3);
    font-size: 0.8em;
}

.type4 :deep(label) {
    color: var(--color4);
    font-size: 0.8em;
}

.type5 :deep(label) {
    color: var(--color5);
    font-size: 0.8em;
}

.type6 :deep(label) {
    color: var(--color6);
    font-size: 0.8em;
}

.type7 :deep(label) {
    color: var(--color7);
    font-size: 0.8em;
}

.type8 :deep(label) {
    color: var(--color8);
    font-size: 0.8em;
}

.type9 :deep(label) {
    color: var(--color9);
    font-size: 0.8em;
}

.type10 :deep(label) {
    color: var(--color10);
    font-size: 0.8em;
}

.type11 :deep(label) {
    color: var(--color11);
    font-size: 0.8em;
}

.type12 :deep(label) {
    color: var(--color12);
    font-size: 0.8em;
}

.type13 :deep(label) {
    color: var(--color13);
    font-size: 0.8em;
}

.type14 :deep(label) {
    color: var(--color14);
    font-size: 0.8em;
}




html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  overflow: hidden;

  ::-webkit-scrollbar {
    // display: none;
  }
  
  -ms-overflow-style: none;
  // scrollbar-width: none;
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;

  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#main-content {
  position: fixed;
  width: 100%;
  height: var(--app-content-height);
  overflow: hidden;

  transition: height 0.1s ease-in-out;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;

  .wwtelescope-component {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    border-style: none;
    border-width: 0;
    margin: 0;
    padding: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    .spinner {
      background-image: url("./assets/lunar_loader.gif");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }
    p {
      margin: 0 0 0 1rem;
      padding: 0;
      font-size: 150%;
    }
  }
}





// This prevents the tabs from having some extra space to the left when the screen is small
// (around 400px or less)
.v-tabs:not(.v-tabs--vertical).v-tabs--right>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__next, .v-tabs:not(.v-tabs--vertical):not(.v-tabs--right)>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__prev {
  display: none;
}

/* // Styling the slider

#sliderlabel {
  padding: 5px 10px;
  margin:0 5px;
  color:#fff !important;
  background-color: rgba(214, 4, 147,0.7);
  overflow: visible;
}

#slider {
  width: 100% !important;
  margin: 5px 30px;
}

.vue-slider-process {
  background-color: white !important;
}

.vue-slider-dot-tooltip-inner {
  cursor: grab;
  padding: 4px 10px !important;
  color: white !important;
  background-color: #9A2976 !important;
  border: 1px solid #9A2976 !important;

  &:active {
    cursor: grabbing;
  }
}

.vue-slider-dot-handle {
  cursor: grab;
  background-color: #9A2976 !important;
  border: 1px solid black !important;

  &:active {
    cursor: grabbing;
  }
} */

/* .mark-line {
  position: absolute;
  height: 20px;
  width: 2px;
  margin: 0;
  background-color: var(--color-default);
  transform: translateX(-50%) translateY(calc(-50% + 2px));

} */



@media(max-width: 600px) {
  .mark-line {
    display: none;
  }

  #video-container {
    display: inherit;
  }
}


#splash-overlay {
  position: fixed;
  //  vue components are flex, so we can easy center
  align-items: center;
  justify-content: center;
}


#splash-screen {
  // for some reason the view props don't work
  // for max-width and max-height
  // splash image size 1908 × 2040 px
  max-width: calc(min(90vw,1908px));
  max-height: calc(min(90vh,2040px));
  /* prevent the image from being stretched */
  object-fit: contain;
}

/* ── Reticle identify overlay ───────────────────────────────── */
@keyframes ping-expand {
  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
}

/* Absolutely positioned to share the canvas's (0,0) origin, avoiding the
   backface-visibility:hidden containing-block side-effect on .v-application__wrap */
.ping-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 20;
}

.ping-circle {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--ping-color, white);
  pointer-events: none;
  animation: ping-expand 0.35s ease-out forwards;
}

.search-overlay {
  position: absolute;
  top: 6rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 30;
  width: min(420px, 90vw);
  flex-wrap: wrap;
  pointer-events: all;
}

.search-input {
  flex: 1;
  min-width: 0;
  background: var(--color-default);
  color: var(--current-color);
  border: 1px solid var(--current-color);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.9em;
  outline: none;
}

.search-clear-btn {
  background: transparent;
  border: none;
  color: var(--current-color);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
}

.search-results {
  width: 100%;
  background: var(--color-default);
  border: 1px solid var(--current-color);
  border-radius: 8px;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  cursor: pointer;
  gap: 8px;
  pointer-events: all;
  &:hover { background: rgba(255,255,255,0.1); }
}

.search-result-name { font-size: 0.85em; }
.search-result-cat  { font-size: 0.72em; opacity: 0.65; white-space: nowrap; }

.reticle-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 110px;
  height: 110px;
  pointer-events: none;
  z-index: 10;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 4px rgba(100, 180, 255, 0.4));
  }

}

.reticle-toggle-wrap {
  position: absolute;
  bottom: 30%;
  right: 1rem;
  z-index: 25;
}

.reticle-toggle-btn {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: var(--color-default);
  border: 1px solid #1671e07c;
  color: rgb(180, 180, 180);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;

  .reticle-btn-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  &:hover {
    box-shadow: 0 0 4px 2px #1671e07c;
  }

  &.reticle-active {
    border-color: #4a9eff;
    color: #4a9eff;
    box-shadow: 0 0 6px 2px rgba(74, 158, 255, 0.4);
  }
}

/* ── Crossfade Sky Survey bottom panel ──────────────────────── */
.bg-slider-container.sky-survey-mode {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 6px;
}

.crossfade-row {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;

  .opacity-range {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}

.cf-label {
  white-space: nowrap;
  font-size: 0.75em;
  padding: 4px 8px;
  flex: 0 0 auto;
}

.cf-label-right {
  flex: 0 0 auto;
  max-width: 45%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sky-picker-wrap {
  position: relative;
  width: 100%;
}

.sky-picker-btn {
  width: 100%;
  text-align: left;
  padding: 5px 10px;
}

.sky-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--color-default);
  border: 1px solid #1671e07c;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  max-height: 220px;
  overflow-y: auto;
  z-index: 20;
}

.sky-picker-item {
  padding: 8px 14px;
  color: rgb(220, 220, 220);
  font-size: 0.8em;
  cursor: pointer;
  border-bottom: 1px solid rgba(22, 113, 224, 0.15);

  &:hover {
    background: rgba(22, 113, 224, 0.25);
  }

  &.sky-picker-selected {
    color: #4a9eff;
    background: rgba(22, 113, 224, 0.15);
  }
}

.sky-picker-dropdown::-webkit-scrollbar { width: 4px; }
.sky-picker-dropdown::-webkit-scrollbar-track { background: transparent; }
.sky-picker-dropdown::-webkit-scrollbar-thumb { background: #2a7adb60; border-radius: 2px; }

/* ── QR code modal ──────────────────────────────────────────── */
.qr-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.qr-container {
  position: relative;
  background: var(--color-default);
  border: 1px solid #1671e07c;
  border-radius: 12px;
  padding: 2rem 2.5rem;
  text-align: center;
  color: rgb(227, 227, 227);
  box-shadow: 0 0 24px rgba(22, 113, 224, 0.3);

  h3 {
    margin-bottom: 1rem;
    font-size: 1.05rem;
    font-weight: 600;
  }

  p {
    margin-top: 0.8rem;
    font-size: 0.8rem;
    opacity: 0.65;
  }
}

.close-qr {
  position: absolute;
  top: 0.6rem;
  right: 0.9rem;
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.6;
  color: rgb(227, 227, 227);
  transition: opacity 0.15s;

  &:hover { opacity: 1; }
}

#splash-close {
  // outline: 1px solid rgba(255, 255, 255, 0.094);
  position: absolute;
  width: 7%;
  height: 8%;
  top: 4%;
  left: 84%;

  &:hover {
    cursor: pointer;
  }
}

#overlays {
  margin: 5px;
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
}

ul.text-list {
  margin-left:1em;
  margin-top: 0.5em;
}

div.credits {
  font-size: 0.8em;
}

// For styling the time picker
// See more info here:
// https://vue3datepicker.com/customization/theming/

* {
  --v-input-control-height: 40px;
}


/* from https://www.smashingmagazine.com/2021/12/create-custom-range-input-consistent-browsers/ */
input[type="range"] {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    margin: 2px;
    --track-height: 1em;
    --thumb-radius: 1.5em;
    --thumb-color: rgb(227, 227, 227);
    // --thumb-color: #444;
    --track-color: rgba(4, 147, 214, .1);
    // --thumb-border: 1px solid #899499;
    --thumb-border-width: 1px;
    --thumb-border: var(--thumb-border-width) solid rgb(227, 227, 227);
    --track-border-width: 1px;
    --track-border: var(--track-border-width) solid rgb(227, 227, 227);
    --thumb-margin-top: calc((var(--track-height) - 2*var(--track-border-width)) / 2 - (var(--thumb-radius)) / 2);
    
    &:hover {
      opacity: 1;
      --track-color: rgba(217, 234, 242,0.2);
      --thumb-color: rgb(227, 227, 227);
    }

    &:focus {
      border-radius: calc(var(--track-height) / 2);
    }
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    width: var(--thumb-radius);
    height: var(--thumb-radius);
    margin-top: var(--thumb-margin-top);
    border-radius: 50%;
    background: var(--thumb-color);
    border: var(--thumb-border);
  }
  
  input[type="range"]::-moz-range-thumb {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    width: var(--thumb-radius);
    height: var(--thumb-radius);
    margin-top: var(--thumb-margin-top);
    border-radius: 50%;
    background: var(--thumb-color);
    cursor: pointer;
    border: var(--thumb-border)
  }
  
  input[type="range"]::-webkit-slider-runnable-track {
    background: var(--track-color);
    /* outline: 1px solid white; */
    border-radius: calc(var(--track-height) / 2);
    border: var(--track-border);
    height: var(--track-height);
    margin-top: 0;
    padding: 0 calc((var(--track-height) - var(--thumb-radius))/2);
  }
  
  
input[type="range"]::-moz-range-track {
    background: var(--track-color);
    /* outline: 1px solid white; */
    border-radius: calc(var(--track-height) / 2);
    border: var(--track-border);
    height:var(--track-height);
    margin-top: 0;
    padding: 0 calc((var(--track-height) - var(--thumb-radius))/2);
  }

</style>
