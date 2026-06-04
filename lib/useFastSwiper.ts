// lib/useFastSwiper.ts
// ✅ PERF: Fully optimized Swiper config — har slider mein paste karo

/**
 * SWIPER PERFORMANCE PROPS
 * Apne har Swiper component mein spread karo:
 *
 * <Swiper {...swiperPerfProps} ...yourOtherProps>
 */
export const swiperPerfProps = {
  // ✅ Smooth GPU transition — JS animation nahi, CSS transform use hoti hai
  // cssMode: true, // Mobile pe enable karo agar touch scroll laggy lage

  // ✅ Watch slides visibility — only visible slides are rendered
  watchSlidesProgress: true,

  // ✅ Resistance on drag edges
  resistanceRatio: 0.85,

  // ✅ Animation speed in ms
  speed: 300,

  // ✅ Grab cursor on desktop
  grabCursor: true,

  // ✅ FIX: Prevent swiper from blocking page scroll on touch
  // passiveListeners aur touchStartPreventDefault combined se scroll jank fix hoti hai
  touchStartPreventDefault: false,

  // ✅ FIX: Reduce mouse/touch event computation
  threshold: 5,

  // ✅ FIX: longSwipesMs — short swipe is registered faster = feels snappier
  longSwipesMs: 200,

  // ✅ FIX: Disable unnecessary event listeners when not sliding
  simulateTouch: true,

  // ✅ FIX: preventInteractionOnTransition — prevents click events during animation
  preventInteractionOnTransition: true,
} as const;

/**
 * SWIPER IMAGE OPTIMIZATION
 * Native lazy loading — Swiper v9+ mein built-in lazy removed hai
 *
 * First 2-3 slides pe loading="eager" lagao (LCP ke liye)
 * Rest pe loading="lazy" lagao
 *
 * <Image
 *   src="/your-image.jpg"
 *   alt="description"
 *   fill
 *   loading="eager"    ← sirf first 2-3 slides pe
 *   decoding="async"   ← main thread block nahi hoga
 *   quality={75}       ← 75 enough hai, 100 = slow
 *   sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
 *   style={{ objectFit: "cover" }}
 * />
 */

/**
 * SWIPER BREAKPOINTS — Responsive aur performant
 */
export const swiperBreakpoints = {
  0: {
    slidesPerView: 1,
    spaceBetween: 10,
  },
  480: {
    slidesPerView: 1.5,
    spaceBetween: 12,
  },
  768: {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  1024: {
    slidesPerView: 3,
    spaceBetween: 20,
  },
  1280: {
    slidesPerView: 4,
    spaceBetween: 24,
  },
} as const;

/**
 * COMPLETE SWIPER EXAMPLE — Copy-paste ready
 *
 * import { Swiper, SwiperSlide } from "swiper/react";
 * import { swiperPerfProps, swiperBreakpoints } from "@/lib/useFastSwiper";
 *
 * <Swiper
 *   {...swiperPerfProps}
 *   breakpoints={swiperBreakpoints}
 *   loop={false}          ← loop:true slides copy karta hai = slower
 *   modules={[Navigation, Pagination]}
 * >
 *   {items.map((item, index) => (
 *     <SwiperSlide key={item.id}>
 *       <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
 *         <Image
 *           src={item.image}
 *           alt={item.name}
 *           fill
 *           loading={index < 3 ? "eager" : "lazy"}
 *           decoding="async"
 *           quality={75}
 *           sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
 *           style={{ objectFit: "cover" }}
 *         />
 *       </div>
 *     </SwiperSlide>
 *   ))}
 * </Swiper>
 */
