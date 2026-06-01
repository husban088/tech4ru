// lib/translations.ts
export type SupportedLanguage = "en" | "ar" | "de";

export interface Translation {
  nav: {
    home: string;
    products: string;
    about: string;
    contact: string;
    search: string;
    cart: string;
    menu: string;
    language: string;
  };
  hero: {
    tagline: string;
    subtitle: string;
    shopNow: string;
    exploreAll: string;
  };
  products: {
    title: string;
    featured: string;
    addToCart: string;
    outOfStock: string;
    viewDetails: string;
    price: string;
    filterBy: string;
    sortBy: string;
    newest: string;
    priceLowHigh: string;
    priceHighLow: string;
    search: string;
    noProducts: string;
    loading: string;
    quantity: string;
    inStock: string;
    reviews: string;
    relatedProducts: string;
    description: string;
    specifications: string;
  };
  cart: {
    title: string;
    empty: string;
    total: string;
    subtotal: string;
    checkout: string;
    continueShopping: string;
    remove: string;
    quantity: string;
    orderSummary: string;
    shipping: string;
    free: string;
    discount: string;
    couponCode: string;
    apply: string;
    proceedToCheckout: string;
  };
  checkout: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
    placeOrder: string;
    orderPlaced: string;
    paymentMethod: string;
    cashOnDelivery: string;
    cardPayment: string;
    billingInfo: string;
    shippingInfo: string;
  };
  footer: {
    rights: string;
    privacyPolicy: string;
    termsOfService: string;
    contactUs: string;
    followUs: string;
    newsletter: string;
    subscribeEmail: string;
    subscribe: string;
    quickLinks: string;
    customerService: string;
    aboutUs: string;
    faq: string;
    returns: string;
    shipping: string;
  };
  common: {
    loading: string;
    error: string;
    tryAgain: string;
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    submit: string;
    close: string;
    yes: string;
    no: string;
    currency: string;
    language: string;
    selectLanguage: string;
  };
  reviews: {
    title: string;
    writeReview: string;
    rating: string;
    review: string;
    submit: string;
    verifiedPurchase: string;
    helpful: string;
    noReviews: string;
    averageRating: string;
  };
}

export const translations: Record<SupportedLanguage, Translation> = {
  en: {
    nav: {
      home: "Home",
      products: "Products",
      about: "About",
      contact: "Contact",
      search: "Search",
      cart: "Cart",
      menu: "Menu",
      language: "Language",
    },
    hero: {
      tagline: "Luxury in Every Detail",
      subtitle: "Discover our exclusive collection of premium tech products",
      shopNow: "Shop Now",
      exploreAll: "Explore All",
    },
    products: {
      title: "Products",
      featured: "Featured Products",
      addToCart: "Add to Cart",
      outOfStock: "Out of Stock",
      viewDetails: "View Details",
      price: "Price",
      filterBy: "Filter By",
      sortBy: "Sort By",
      newest: "Newest",
      priceLowHigh: "Price: Low to High",
      priceHighLow: "Price: High to Low",
      search: "Search products...",
      noProducts: "No products found",
      loading: "Loading products...",
      quantity: "Quantity",
      inStock: "In Stock",
      reviews: "Reviews",
      relatedProducts: "Related Products",
      description: "Description",
      specifications: "Specifications",
    },
    cart: {
      title: "Your Cart",
      empty: "Your cart is empty",
      total: "Total",
      subtotal: "Subtotal",
      checkout: "Checkout",
      continueShopping: "Continue Shopping",
      remove: "Remove",
      quantity: "Quantity",
      orderSummary: "Order Summary",
      shipping: "Shipping",
      free: "Free",
      discount: "Discount",
      couponCode: "Coupon Code",
      apply: "Apply",
      proceedToCheckout: "Proceed to Checkout",
    },
    checkout: {
      title: "Checkout",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      address: "Street Address",
      city: "City",
      country: "Country",
      postalCode: "Postal Code",
      placeOrder: "Place Order",
      orderPlaced: "Order Placed Successfully!",
      paymentMethod: "Payment Method",
      cashOnDelivery: "Cash on Delivery",
      cardPayment: "Card Payment",
      billingInfo: "Billing Information",
      shippingInfo: "Shipping Information",
    },
    footer: {
      rights: "All rights reserved",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      contactUs: "Contact Us",
      followUs: "Follow Us",
      newsletter: "Newsletter",
      subscribeEmail: "Enter your email",
      subscribe: "Subscribe",
      quickLinks: "Quick Links",
      customerService: "Customer Service",
      aboutUs: "About Us",
      faq: "FAQ",
      returns: "Returns",
      shipping: "Shipping",
    },
    common: {
      loading: "Loading...",
      error: "Something went wrong",
      tryAgain: "Try Again",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      next: "Next",
      submit: "Submit",
      close: "Close",
      yes: "Yes",
      no: "No",
      currency: "Currency",
      language: "Language",
      selectLanguage: "Select Language",
    },
    reviews: {
      title: "Customer Reviews",
      writeReview: "Write a Review",
      rating: "Rating",
      review: "Review",
      submit: "Submit Review",
      verifiedPurchase: "Verified Purchase",
      helpful: "Helpful",
      noReviews: "No reviews yet",
      averageRating: "Average Rating",
    },
  },

  ar: {
    nav: {
      home: "الرئيسية",
      products: "المنتجات",
      about: "عن الشركة",
      contact: "تواصل معنا",
      search: "بحث",
      cart: "السلة",
      menu: "القائمة",
      language: "اللغة",
    },
    hero: {
      tagline: "الفخامة في كل تفصيل",
      subtitle: "اكتشف مجموعتنا الحصرية من منتجات التكنولوجيا الفاخرة",
      shopNow: "تسوق الآن",
      exploreAll: "استكشف الكل",
    },
    products: {
      title: "المنتجات",
      featured: "المنتجات المميزة",
      addToCart: "أضف إلى السلة",
      outOfStock: "غير متوفر",
      viewDetails: "عرض التفاصيل",
      price: "السعر",
      filterBy: "تصفية حسب",
      sortBy: "ترتيب حسب",
      newest: "الأحدث",
      priceLowHigh: "السعر: من الأقل إلى الأعلى",
      priceHighLow: "السعر: من الأعلى إلى الأقل",
      search: "ابحث عن منتجات...",
      noProducts: "لا توجد منتجات",
      loading: "جاري تحميل المنتجات...",
      quantity: "الكمية",
      inStock: "متوفر في المخزون",
      reviews: "التقييمات",
      relatedProducts: "منتجات ذات صلة",
      description: "الوصف",
      specifications: "المواصفات",
    },
    cart: {
      title: "سلة التسوق",
      empty: "سلة التسوق فارغة",
      total: "الإجمالي",
      subtotal: "المجموع الفرعي",
      checkout: "الدفع",
      continueShopping: "مواصلة التسوق",
      remove: "إزالة",
      quantity: "الكمية",
      orderSummary: "ملخص الطلب",
      shipping: "الشحن",
      free: "مجاني",
      discount: "الخصم",
      couponCode: "كود الخصم",
      apply: "تطبيق",
      proceedToCheckout: "المتابعة للدفع",
    },
    checkout: {
      title: "الدفع",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      address: "العنوان",
      city: "المدينة",
      country: "الدولة",
      postalCode: "الرمز البريدي",
      placeOrder: "تأكيد الطلب",
      orderPlaced: "تم تقديم الطلب بنجاح!",
      paymentMethod: "طريقة الدفع",
      cashOnDelivery: "الدفع عند الاستلام",
      cardPayment: "الدفع بالبطاقة",
      billingInfo: "معلومات الفوترة",
      shippingInfo: "معلومات الشحن",
    },
    footer: {
      rights: "جميع الحقوق محفوظة",
      privacyPolicy: "سياسة الخصوصية",
      termsOfService: "شروط الخدمة",
      contactUs: "تواصل معنا",
      followUs: "تابعنا",
      newsletter: "النشرة الإخبارية",
      subscribeEmail: "أدخل بريدك الإلكتروني",
      subscribe: "اشتراك",
      quickLinks: "روابط سريعة",
      customerService: "خدمة العملاء",
      aboutUs: "من نحن",
      faq: "الأسئلة الشائعة",
      returns: "الإرجاع",
      shipping: "الشحن",
    },
    common: {
      loading: "جاري التحميل...",
      error: "حدث خطأ ما",
      tryAgain: "حاول مرة أخرى",
      save: "حفظ",
      cancel: "إلغاء",
      confirm: "تأكيد",
      delete: "حذف",
      edit: "تعديل",
      back: "رجوع",
      next: "التالي",
      submit: "إرسال",
      close: "إغلاق",
      yes: "نعم",
      no: "لا",
      currency: "العملة",
      language: "اللغة",
      selectLanguage: "اختر اللغة",
    },
    reviews: {
      title: "آراء العملاء",
      writeReview: "كتابة تقييم",
      rating: "التقييم",
      review: "التقييم",
      submit: "إرسال التقييم",
      verifiedPurchase: "شراء موثق",
      helpful: "مفيد",
      noReviews: "لا توجد تقييمات بعد",
      averageRating: "متوسط التقييم",
    },
  },

  de: {
    nav: {
      home: "Startseite",
      products: "Produkte",
      about: "Über uns",
      contact: "Kontakt",
      search: "Suche",
      cart: "Warenkorb",
      menu: "Menü",
      language: "Sprache",
    },
    hero: {
      tagline: "Luxus in jedem Detail",
      subtitle:
        "Entdecken Sie unsere exklusive Sammlung von Premium-Technikprodukten",
      shopNow: "Jetzt einkaufen",
      exploreAll: "Alle erkunden",
    },
    products: {
      title: "Produkte",
      featured: "Ausgewählte Produkte",
      addToCart: "In den Warenkorb",
      outOfStock: "Nicht verfügbar",
      viewDetails: "Details anzeigen",
      price: "Preis",
      filterBy: "Filtern nach",
      sortBy: "Sortieren nach",
      newest: "Neueste",
      priceLowHigh: "Preis: Aufsteigend",
      priceHighLow: "Preis: Absteigend",
      search: "Produkte suchen...",
      noProducts: "Keine Produkte gefunden",
      loading: "Produkte werden geladen...",
      quantity: "Menge",
      inStock: "Auf Lager",
      reviews: "Bewertungen",
      relatedProducts: "Ähnliche Produkte",
      description: "Beschreibung",
      specifications: "Spezifikationen",
    },
    cart: {
      title: "Ihr Warenkorb",
      empty: "Ihr Warenkorb ist leer",
      total: "Gesamt",
      subtotal: "Zwischensumme",
      checkout: "Zur Kasse",
      continueShopping: "Weiter einkaufen",
      remove: "Entfernen",
      quantity: "Menge",
      orderSummary: "Bestellübersicht",
      shipping: "Versand",
      free: "Kostenlos",
      discount: "Rabatt",
      couponCode: "Gutscheincode",
      apply: "Anwenden",
      proceedToCheckout: "Zur Kasse gehen",
    },
    checkout: {
      title: "Kasse",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail-Adresse",
      phone: "Telefonnummer",
      address: "Straße und Hausnummer",
      city: "Stadt",
      country: "Land",
      postalCode: "Postleitzahl",
      placeOrder: "Bestellung aufgeben",
      orderPlaced: "Bestellung erfolgreich aufgegeben!",
      paymentMethod: "Zahlungsmethode",
      cashOnDelivery: "Nachnahme",
      cardPayment: "Kartenzahlung",
      billingInfo: "Rechnungsinformationen",
      shippingInfo: "Versandinformationen",
    },
    footer: {
      rights: "Alle Rechte vorbehalten",
      privacyPolicy: "Datenschutzerklärung",
      termsOfService: "Nutzungsbedingungen",
      contactUs: "Kontakt",
      followUs: "Folgen Sie uns",
      newsletter: "Newsletter",
      subscribeEmail: "E-Mail eingeben",
      subscribe: "Abonnieren",
      quickLinks: "Schnelllinks",
      customerService: "Kundendienst",
      aboutUs: "Über uns",
      faq: "FAQ",
      returns: "Rückgaben",
      shipping: "Versand",
    },
    common: {
      loading: "Wird geladen...",
      error: "Etwas ist schiefgelaufen",
      tryAgain: "Erneut versuchen",
      save: "Speichern",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      delete: "Löschen",
      edit: "Bearbeiten",
      back: "Zurück",
      next: "Weiter",
      submit: "Absenden",
      close: "Schließen",
      yes: "Ja",
      no: "Nein",
      currency: "Währung",
      language: "Sprache",
      selectLanguage: "Sprache auswählen",
    },
    reviews: {
      title: "Kundenbewertungen",
      writeReview: "Bewertung schreiben",
      rating: "Bewertung",
      review: "Rezension",
      submit: "Bewertung absenden",
      verifiedPurchase: "Verifizierter Kauf",
      helpful: "Hilfreich",
      noReviews: "Noch keine Bewertungen",
      averageRating: "Durchschnittsbewertung",
    },
  },
};

export function getTranslation(lang: SupportedLanguage): Translation {
  return translations[lang] || translations.en;
}

// ✅ Country → Language mapping
export function getLanguageForCountry(countryCode: string): SupportedLanguage {
  const map: Record<string, SupportedLanguage> = {
    AE: "en", // UAE → default English (user can switch to Arabic)
    DE: "de", // Germany → German
  };
  return map[countryCode] || "en";
}

// ✅ ONLY UAE gets language dropdown
export const SHOW_LANGUAGE_DROPDOWN_COUNTRIES: string[] = ["AE"];

// ✅ UAE dropdown languages (English + Arabic only)
export const UAE_DROPDOWN_LANGUAGES = [
  { code: "en" as SupportedLanguage, name: "English", nativeName: "English" },
  { code: "ar" as SupportedLanguage, name: "Arabic", nativeName: "العربية" },
];

// ✅ RTL languages
export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export function isRTL(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(lang);
}
