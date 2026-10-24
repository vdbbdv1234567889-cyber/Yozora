import {
  Product,
  CustomerReviewImage,
  Coupon,
  GovernorateShipping,
  StoreSettings,
  Order
} from '../types';

export const INITIAL_GOVERNORATES: GovernorateShipping[] = [
  { name: 'القاهرة', cost: 45 },
  { name: 'الجيزة', cost: 45 },
  { name: 'القليوبية', cost: 50 },
  { name: 'الإسكندرية', cost: 50 },
  { name: 'المنوفية', cost: 55 },
  { name: 'الغربية', cost: 55 },
  { name: 'الشرقية', cost: 55 },
  { name: 'الدقهلية', cost: 55 },
  { name: 'البحيرة', cost: 60 },
  { name: 'كفر الشيخ', cost: 60 },
  { name: 'دمياط', cost: 60 },
  { name: 'بورسعيد', cost: 60 },
  { name: 'الإسماعيلية', cost: 60 },
  { name: 'السويس', cost: 60 },
  { name: 'الفيوم', cost: 65 },
  { name: 'بني سويف', cost: 65 },
  { name: 'المنيا', cost: 70 },
  { name: 'أسيوط', cost: 70 },
  { name: 'سوهاج', cost: 75 },
  { name: 'قنا', cost: 80 },
  { name: 'الأقصر', cost: 80 },
  { name: 'أسوان', cost: 85 },
  { name: 'البحر الأحمر', cost: 85 },
  { name: 'مطروح', cost: 85 },
  { name: 'الوادي الجديد', cost: 95 },
  { name: 'شمال سيناء', cost: 95 },
  { name: 'جنوب سيناء', cost: 95 }
];

// Start completely clean with zero products by default as requested
export const INITIAL_PRODUCTS: Product[] = [];

// Clean review images
export const INITIAL_REVIEW_IMAGES: CustomerReviewImage[] = [];

// Clean coupons
export const INITIAL_COUPONS: Coupon[] = [];

// Clean orders (no fake/demo orders)
export const INITIAL_ORDERS: Order[] = [];

// Optional sample product template for store owner if they want to add a starter product
export const SAMPLE_HOODIE_TEMPLATE: Omit<Product, 'id' | 'rating' | 'reviewsCount'> = {
  name: 'Beyond Signature Oversized',
  subtitle: 'Signature Heavyweight Oversized Hoodie',
  category: 'oversized',
  price: 890,
  originalPrice: 1150,
  description: 'هودي أوفر سايز مصنوع من أفخر أنواع القطن المصري المعالج ضد الانكماش والوبر مع بطانة صوفية فائقة النعومة وقبعة مزدوجة الطبقات.',
  fabric: 'قطن مصري 100% ميلتون تقيل 450 جرام',
  fit: 'أوفر سايز مريح (Dropped Shoulder)',
  weightRange: 'مناسب لوزن 60 حتى 115 كجم',
  careInstructions: 'غسيل آلي بماء بارد (30 درجة) مع ألوان مماثلة والكي على درجة حرارة منخفضة',
  sizesStock: { M: 15, L: 20, XL: 18, '2XL': 10 },
  sizeMeasurements: {
    M: { length: 72, width: 58 },
    L: { length: 75, width: 62 },
    XL: { length: 78, width: 66 },
    '2XL': { length: 81, width: 70 }
  },
  colors: [
    { name: 'أسود فاحم', hex: '#141414' },
    { name: 'رمادي حجري', hex: '#374151' },
    { name: 'بيج كابتشينو', hex: '#d6c7b2' }
  ],
  images: [
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=1000&auto=format&fit=crop'
  ],
  isFeatured: true,
  badge: 'الأكثر طلباً'
};

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Beyond',
  storeSubtitle: 'Beyond Signature Hoodies',
  announcementText: 'Beyond | شحن مجاني لأي طلب يتجاوز 2000 ج.م في جميع محافظات مصر',
  brandLogo: '',
  whatsappNumber: '201000000000',
  whatsappUrl: 'https://wa.me/201000000000',
  instagramUrl: 'https://instagram.com',
  tiktokUrl: 'https://tiktok.com',
  facebookUrl: 'https://facebook.com',
  freeShippingThreshold: 2000,
  quantityShippingEnabled: false,
  quantityShippingMinItems: 2,
  quantityShippingCost: 0,
  comingSoonEnabled: true,
  comingSoonTitle: 'قريباً في Beyond',
  comingSoonSubtitle: 'ترقبوا قطعاً مميزة بتصاميم حصرية',
  pushNotificationTopic: 'beyond_orders_alerts'
};
