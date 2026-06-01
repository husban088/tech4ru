// lib/useFastSwiper.ts
// ✅ PERF: Optimized Swiper config — har slider mein paste karo
// Yeh hook Swiper ko GPU pe push karta hai, jank remove karta hai

/**
 * SWIPER PERFORMANCE SETTINGS
 * Apne har Swiper component mein yeh props lagao:
 *
 * <Swiper {...swiperPerfProps} ...yourOtherProps>
 */
export const swiperPerfProps = {
  // ✅ Virtual slides — sirf visible slides render honge (BIGGEST WIN for many slides)
  // virtual: false, // agar 10+ slides hain toh true karo

  // ✅ CSS-only transitions — JS animation nahi hogi
  // cssMode: false, // mobile pe true karo agar touch scroll buggy lag raha ho

  // NOTE: preloadImages aur lazy props Swiper v9+ mein remove ho gaye hain
  // Unki jagah native loading="eager"/"lazy" attributes use karo images pe

  // ✅ Watch slides visibility — hidden slides render nahi honge
  watchSlidesProgress: true,

  // ✅ Resistance ratio — mobile pe smooth feel
  resistanceRatio: 0.85,

  // ✅ Speed — default 300ms
  speed: 300,

  // ✅ Grab cursor — desktop pe pointer cursor
  grabCursor: true,
} as const;

/**
 * SWIPER IMAGE OPTIMIZATION
 * Apni swiper images pe yeh attributes lagao:
 *
 * <img
 *   data-src="/your-image.jpg"   ← lazy loading ke liye
 *   src="/placeholder.jpg"       ← low-quality placeholder
 *   loading="lazy"               ← native browser lazy loading
 *   decoding="async"             ← main thread block nahi karega
 *   className="swiper-lazy"      ← swiper lazy loading class
 *   width={400}
 *   height={300}
 * />
 */

/**
 * SWIPER BREAKPOINTS EXAMPLE — responsive aur performant
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
 * NEXT.JS IMAGE + SWIPER COMBO
 * next/image Swiper ke saath use karne ka sahi tarika:
 *
 * <SwiperSlide key={item.id}>
 *   <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
 *     <Image
 *       src={item.image}
 *       alt={item.name}
 *       fill
 *       sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
 *       loading="lazy"           ← first 2-3 slides pe "eager" karo
 *       quality={75}             ← 75 enough hai, 100 slow karta hai
 *       style={{ objectFit: "cover" }}
 *     />
 *   </div>
 * </SwiperSlide>
 */
