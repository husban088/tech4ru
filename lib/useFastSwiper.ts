// lib/useFastSwiper.ts
// ✅ PERF: Fully optimized Swiper config — har slider mein paste karo

/**
 * SWIPER PERFORMANCE PROPS
 * Apne har Swiper component mein spread karo:
 *
 * <Swiper {...swiperPerfProps} ...yourOtherProps>
 */
export const swiperPerfProps = {
  // ✅ FIX: watchSlidesProgress REMOVED — ye har scroll frame pe
  // sabhi slides ka progress calculate karta tha = expensive JS work on every frame.
  // Sirf tab use karo jab tujhe literally slide progress values chahiye ho (parallax etc).

  // ✅ Resistance on drag edges
  resistanceRatio: 0.85,

  // ✅ Animation speed — 300ms = fast enough, smooth enough
  speed: 300,

  // ✅ Grab cursor on desktop
  grabCursor: true,

  // ✅ FIX: touchStartPreventDefault:false — page scroll block nahi hoga
  // Swiper pehle check karta hai swipe direction, tab decide karta hai
  touchStartPreventDefault: false,

  // ✅ FIX: threshold:5 — 5px move ke baad hi swipe register hota hai
  // Accidental swipes reduce, scroll jank bhi kam
  threshold: 5,

  // ✅ FIX: longSwipesMs:200 — short swipe jaldi register = snappy feel
  longSwipesMs: 200,

  // ✅ FIX: simulateTouch:true — mouse drag works like touch
  simulateTouch: true,

  // ✅ FIX: preventInteractionOnTransition — animation ke doran click block
  preventInteractionOnTransition: true,

  // ✅ FIX: observer + observeParents — Swiper auto-resize karta hai
  // agar parent container resize ho (prevents broken layouts)
  observer: true,
  observeParents: true,

  // ✅ FIX: updateOnWindowResize — viewport change pe Swiper recalculates
  updateOnWindowResize: true,

  // ✅ FIX: lazyPreloadPrevNext:1 — sirf 1 slide aage peeche preload
  // Heavy images wale swipers ke liye — memory aur bandwidth dono save
  lazyPreloadPrevNext: 1,
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
