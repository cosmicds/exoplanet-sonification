import Vue, { createApp } from "vue";

import { FundingAcknowledgment, IconButton, CreditLogos, wwtHUD } from "@cosmicds/vue-toolkit";
import exoSonification from "./exo-sonification.vue";
import TransitionExpand from "./TransitionExpand.vue";
import TransitionExpandTwo from "./TransitionExpandTwo.vue";
import "./assets/common.less";

import vuetify from "../plugins/vuetify";

import VueSlider from "vue-slider-component";
import 'vue-slider-component/theme/default.css';

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faPause,
  faPlay,
  faTimes,
  faVideo,
  faChevronDown,
  faChevronUp,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
//import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome';
library.add(faChevronDown);
library.add(faChevronUp);
library.add(faGear);
library.add(faBookOpen);
library.add(faPause);
library.add(faPlay);
library.add(faTimes);
library.add(faVideo);

/** v-hide directive taken from https://www.ryansouthgate.com/2020/01/30/vue-js-v-hide-element-whilst-keeping-occupied-space/ */
// Extract the function out, up here, so I'm not writing it twice
const update = (el: HTMLElement, binding: Vue.DirectiveBinding) => el.style.visibility = (binding.value) ? "hidden" : "";

createApp(exoSonification, {
  wwtNamespace: "wwt-minids-exo-sonification",
  wtml: { // images are listed in chronological order earliest to latest
    gammaraypulsar: "https://data1.wwtassets.org/packages/2023/04_gammaray/grb_backgrounds.wtml",
  },
  //url: "https://web.wwtassets.org/specials/2023/cosmicds-carina/",
  //thumbnailUrl: "https://cdn.worldwidetelescope.org/thumbnails/jwst.jpg",
  bgWtml: "https://data1.wwtassets.org/packages/2023/04_gammaray/grb_backgrounds.wtml",
  //fgName: "PLANCK R2 HFI color composition 353-545-857 GHz", //"Fermi LAT 8-year (gamma)",
  bgName: "Deep Star Maps 2020", //"Eckhard All Sky",
  introTitle: "Exoplanet Sonification",
  introText: `zzz`,
})
 
  // Plugins
  .use(wwtPinia)
  .use(vuetify)

  // Directives
  .directive(
    /**
    * Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
    */
    "hide", {
      // Run on initialisation (first render) of the directive on the element
      beforeMount(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      },
      // Run on subsequent updates to the value supplied to the directive
      updated(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      }
    })

  // Components
  .component("WorldWideTelescope", WWTComponent)
  .component('font-awesome-icon', FontAwesomeIcon)
  .component('vue-slider', VueSlider)
  .component('transition-expand', TransitionExpand)
  .component('transition-expand-two', TransitionExpandTwo)
  .component('icon-button', IconButton)
  .component('funding-acknowledgement', FundingAcknowledgment)
  .component('credit-logos', CreditLogos)
  .component('wwt-hud', wwtHUD)

  // Mount
  .mount("#app");
