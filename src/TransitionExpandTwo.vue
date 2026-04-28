<template>
  <!-- This component is based on the code from https://markus.oberlehner.net/blog/transition-to-width-auto-with-vue/
  It has been modified to use the vue-property-decorator format
  -->
  <transition
    name="expand"
    @enter="enter"
    @after-enter="afterEnter"
    @leave="leave"
  >
    <slot />
  </transition>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";


export default defineComponent({
  name: "TransitionExpandTwo",

  emits: ['enter', 'after-enter', 'leave'],

  methods: {
    enter(element: HTMLElement) {
      const height = getComputedStyle(element).height;

      element.style.height = height;
      element.style.position = "absolute";
      element.style.visibility = "hidden";
      element.style.width = "auto";

      const width = getComputedStyle(element).width;

      element.style.height = "";
      element.style.position = "";
      element.style.visibility = "visible";
      element.style.width = "0px";

      // Force repaint to make sure the
      // animation is triggered correctly.
      getComputedStyle(element).width;

      // Trigger the animation.
      // We use `requestAnimationFrame` because we need
      // to make sure the browser has finished
      // painting after setting the `width`
      // to `0` in the line above.
      requestAnimationFrame(() => {
        element.style.width = width;
      });

      this.$emit('enter');
    },

    afterEnter(element: HTMLElement) {
      element.style.width = "auto";
      this.$emit('after-enter');
    },

    leave(element: HTMLElement) {
      const width = getComputedStyle(element).width;

      element.style.width = width;

      // Force repaint to make sure the
      // animation is triggered correctly.
      getComputedStyle(element).width;

      requestAnimationFrame(() => {
        element.style.width = "0";
      });
      this.$emit('leave');
    }
  }
});
</script>

<style scoped>
* {
  will-change: width;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.expand-enter-active,
.expand-leave-active {
  transition: width 0.2s ease-out-in;
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  width: 0;
}
</style>
