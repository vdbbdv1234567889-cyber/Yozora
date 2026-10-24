import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  Lock,
  LogOut,
  Package,
  ShoppingBag,
  Tag,
  MessageCircle,
  Truck,
  Settings,
  Trash2,
  Plus,
  Check,
  Upload,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  X,
  Instagram,
  Facebook,
  Pencil,
  Palette,
  Search,
  Download,
  Bell,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  Send,
  Info,
  BarChart3,
  Save,
  RotateCcw,
  MapPin,
  RefreshCw,
  Sparkles,
  Users,
  UserPlus
} from 'lucide-react';
import { authFetch } from '../lib/authFetch';
import { AdminCustomerAnalytics } from './AdminCustomerAnalytics';
import { HoodieCategory, HoodieSize, OrderStatus, Product, ProductColor, OrderItem, GovernorateShipping } from '../types';
import { INITIAL_GOVERNORATES } from '../data/initialData';
import { uploadImageFile } from '../lib/imageCompressor';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  exportOrdersToCSV,
  exportOrdersByStatus,
  ORDER_STATUS_LABELS,
} from '../lib/orderExporter';
import {
  playOrderNotificationSound,
  isSoundNotificationEnabled,
  setSoundNotificationEnabled,
  getNotificationPermission,
  testPhoneNotification,
  getPushTopic,
  setPushTopic,
  subscribeToWebPush,
  getActivePushSubscription
} from '../lib/notifications';
import { formatOrderDateTime, getOrderTimestamp } from '../utils/date';

export const AdminDashboard: React.FC = () => {
  const {
    isAdminLoggedIn,
    setActiveView,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    deleteOrder,
    coupons,
    addCoupon,
    deleteCoupon,
    toggleCouponActive,
    reviewImages,
    addReviewImage,
    deleteReviewImage,
    governorates,
    updateGovernorateCost,
    saveAllGovernorates,
    settings,
    updateSettings,
    openDeleteModal,
    adminCredentials,
    updateAdminCredentials,
    verifyAdminLogin,
    logoutAdmin,
    seedSampleProduct,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'products' | 'orders' | 'analytics' | 'coupons' | 'reviews' | 'shipping' | 'settings' | 'security'
  >('products');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change Credentials States
  const [, setNewUsername] = useState(adminCredentials.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // Admin Team Management States
  interface AdminAccount {
    uid: string;
    email: string;
    displayName: string;
    creationTime?: string;
    isOwner?: boolean;
  }
  const [adminUsers, setAdminUsers] = useState<AdminAccount[]>([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [addAdminError, setAddAdminError] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminTeamSuccess, setAdminTeamSuccess] = useState('');

  // Order Search State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Order Item Inspection Modal (for verifying image, color, size, and print)
  const [inspectingOrderItem, setInspectingOrderItem] = useState<{
    item: OrderItem;
    orderNumber: string;
    customerName: string;
    orderDate: string;
  } | null>(null);
  const [inspectingImageIndex, setInspectingImageIndex] = useState(0);

  // Image Processing & Product Submitting States
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Add Product Form States
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pName, setPName] = useState('');
  const [pSubtitle, setPSubtitle] = useState('');
  const [pCategory, setPCategory] = useState<HoodieCategory>('oversized');
  const [pPrice, setPPrice] = useState<number | string>(890);
  const [pOriginalPrice, setPOriginalPrice] = useState<number | string>('');
  const [pDescription, setPDescription] = useState('');
  const [pFabric, setPFabric] = useState('قطن مصري 100% ميلتون تقيل 450 جرام');
  const [pFit, setPFit] = useState('أوفر سايز مريح (Dropped Shoulder)');
  const [pWeightRange, setPWeightRange] = useState('مناسب لوزن 60 حتى 110 كجم');
  const [pCare, setPCare] = useState('غسيل آلي بماء بارد (30 درجة)');
  const [pStockM] = useState(15);
  const [pStockL] = useState(25);
  const [pStockXL] = useState(20);
  const [pStock2XL] = useState(10);
  const [pComingSoon, setPComingSoon] = useState(false);

  // Add Product Colors & Sizes Stock per color
  const [pColors, setPColors] = useState<ProductColor[]>([
    { name: 'أسود فاحم', hex: '#171717', sizesStock: { M: 10, L: 15, XL: 12, '2XL': 5 } },
    { name: 'رمادي حجري', hex: '#374151', sizesStock: { M: 5, L: 10, XL: 8, '2XL': 5 } }
  ]);
  const [pNewColorName, setPNewColorName] = useState('');
  const [pNewColorHex, setPNewColorHex] = useState('#171717');
  const [pNewColorStockM, setPNewColorStockM] = useState(10);
  const [pNewColorStockL, setPNewColorStockL] = useState(15);
  const [pNewColorStockXL, setPNewColorStockXL] = useState(10);
  const [pNewColorStock2XL, setPNewColorStock2XL] = useState(5);
  const [uploadedProductImages, setUploadedProductImages] = useState<string[]>([]);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Product States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCategory, setEditCategory] = useState<HoodieCategory>('oversized');
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | string>('');
  const [editDescription, setEditDescription] = useState('');
  const [editFabric, setEditFabric] = useState('');
  const [editFit, setEditFit] = useState('');
  const [editWeightRange, setEditWeightRange] = useState('');
  const [editCare, setEditCare] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editComingSoon, setEditComingSoon] = useState(false);
  const [editStockM, setEditStockM] = useState<number>(0);
  const [editStockL, setEditStockL] = useState<number>(0);
  const [editStockXL, setEditStockXL] = useState<number>(0);
  const [editStock2XL, setEditStock2XL] = useState<number>(0);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editColors, setEditColors] = useState<ProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#171717');
  const [newColorStockM, setNewColorStockM] = useState(10);
  const [newColorStockL, setNewColorStockL] = useState(15);
  const [newColorStockXL, setNewColorStockXL] = useState(10);
  const [newColorStock2XL, setNewColorStock2XL] = useState(5);
  const editProductFileInputRef = useRef<HTMLInputElement>(null);

  // Review Image Upload States
  const [reviewCaption, setReviewCaption] = useState('');
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // Add Coupon Form States
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cDiscount, setCDiscount] = useState(15);
  const [cMinOrder, setCMinOrder] = useState(600);
  const [cTargetScope, setCTargetScope] = useState<'all' | 'specific'>('all');
  const [cTargetProductId, setCTargetProductId] = useState<string>('');

  // Orders Classification & Notification States
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [visibleOrdersCount, setVisibleOrdersCount] = useState<number>(30);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [soundNotificationOn, setSoundNotificationOn] = useState<boolean>(isSoundNotificationEnabled());
  const [notificationPerm, setNotificationPerm] = useState<string>(getNotificationPermission());
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);

  useEffect(() => {
    getActivePushSubscription().then((sub) => {
      if (sub) {
        setIsPushActive(true);
      }
    });
  }, []);

  // Settings state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [brandLogo, setBrandLogo] = useState(settings.brandLogo || '');
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [announcementText, setAnnouncementText] = useState(settings.announcementText);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [comingSoonEnabled, setComingSoonEnabled] = useState(settings.comingSoonEnabled !== false);
  const [comingSoonTitle, setComingSoonTitle] = useState(settings.comingSoonTitle || '');
  const [comingSoonSubtitle, setComingSoonSubtitle] = useState(settings.comingSoonSubtitle || '');
  const [whatsappUrl, setWhatsappUrl] = useState(settings.whatsappUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(settings.instagramUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktokUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl || '');
  const [pushTopic, setPushTopicState] = useState(settings.pushNotificationTopic || getPushTopic());
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || '');
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState('');

  // Manual Shipping Rates States
  const [editableGovernorates, setEditableGovernorates] = useState<GovernorateShipping[]>(governorates);
  const [shippingSearch, setShippingSearch] = useState('');
  const [bulkRateInput, setBulkRateInput] = useState<string>('');
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [hasUnsavedShippingChanges, setHasUnsavedShippingChanges] = useState(false);
  const [newGovName, setNewGovName] = useState('');
  const [newGovCost, setNewGovCost] = useState('60');
  const [quantityShippingEnabled, setQuantityShippingEnabled] = useState<boolean>(Boolean(settings.quantityShippingEnabled));
  const [quantityShippingMinItems, setQuantityShippingMinItems] = useState<string>(String(settings.quantityShippingMinItems ?? 2));
  const [quantityShippingCost, setQuantityShippingCost] = useState<string>(String(settings.quantityShippingCost ?? 0));
  const [isSavingQtyShipping, setIsSavingQtyShipping] = useState<boolean>(false);

  useEffect(() => {
    setEditableGovernorates(governorates);
  }, [governorates]);

  // Synchronize form states when settings or credentials load/update from Firestore
  useEffect(() => {
    setStoreName(settings.storeName || '');
    setBrandLogo(settings.brandLogo || '');
    setAnnouncementText(settings.announcementText || '');
    setWhatsappNumber(settings.whatsappNumber || '');
    setComingSoonEnabled(settings.comingSoonEnabled !== false);
    setComingSoonTitle(settings.comingSoonTitle || '');
    setComingSoonSubtitle(settings.comingSoonSubtitle || '');
    setWhatsappUrl(settings.whatsappUrl || '');
    setInstagramUrl(settings.instagramUrl || '');
    setTiktokUrl(settings.tiktokUrl || '');
    setFacebookUrl(settings.facebookUrl || '');
    setQuantityShippingEnabled(Boolean(settings.quantityShippingEnabled));
    setQuantityShippingMinItems(String(settings.quantityShippingMinItems ?? 2));
    setQuantityShippingCost(String(settings.quantityShippingCost ?? 0));
  }, [settings]);

  // Load private notification settings securely from private_settings/notifications
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const fetchPrivateSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'private_settings', 'notifications'));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.telegramBotToken) setTelegramBotToken(data.telegramBotToken);
          if (data?.telegramChatId) setTelegramChatId(data.telegramChatId);
          if (data?.pushNotificationTopic) setPushTopicState(data.pushNotificationTopic);
        }
      } catch (err) {
        console.warn('Failed to load private notification settings:', err);
      }
    };
    fetchPrivateSettings();
  }, [isAdminLoggedIn]);

  useEffect(() => {
    setNewUsername(adminCredentials.username || 'admin');
  }, [adminCredentials.username]);

  const fetchAdminUsers = async () => {
    setIsLoadingAdminUsers(true);
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setAdminUsers(data.users);
      }
    } catch (err) {
      console.warn('Failed to load admin users:', err);
    } finally {
      setIsLoadingAdminUsers(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'security') {
      fetchAdminUsers();
    }
  }, [isAdminLoggedIn, activeTab]);

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminError('');
    setAdminTeamSuccess('');
    setIsSubmittingAdmin(true);
    try {
      const res = await authFetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          password: newAdminPassword.trim(),
          displayName: newAdminDisplayName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }
      setAdminTeamSuccess(`تمت إضافة المسؤول (${data.user?.email}) بنجاح.`);
      setShowAddAdminModal(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminDisplayName('');
      fetchAdminUsers();
    } catch (err: any) {
      setAddAdminError(err.message || 'فشل إنشاء الحساب');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDeleteAdminPrompt = (uid: string, email: string) => {
    openDeleteModal({
      title: 'حذف مسؤول من الفريق',
      description: 'سيتم حذف حساب هذا المسؤول من Firebase Auth.',
      itemLabel: `البريد: ${email}`,
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setAddAdminError(data.error || 'فشل حذف الحساب');
            return;
          }
          setAdminTeamSuccess(`تم حذف المسؤول (${email}) بنجاح`);
          fetchAdminUsers();
        } catch (err: any) {
          console.error('Delete admin error:', err);
        }
      }
    });
  };

  // Stats calculation
  const totalRevenue = (orders || [])
    .filter((o) => o && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrdersCount = (orders || []).length;
  const pendingOrdersCount = (orders || []).filter(
    (o) => o && (o.status === 'pending' || o.status === 'processing')
  ).length;
  const totalStockCount = (products || []).reduce((acc: number, p) => {
    const stockObj = (p?.sizesStock || {}) as Record<string, number>;
    const stockSum = Object.values(stockObj).reduce((s: number, v) => s + (Number(v) || 0), 0);
    return acc + stockSum;
  }, 0);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const success = await verifyAdminLogin(username, password);
      if (success) {
        setLoginError('');
      } else {
        setLoginError('بيانات الدخول غير صحيحة.');
      }
    } catch {
      setLoginError('حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');
    if (!newPassword.trim()) {
      setSecurityError('كلمة المرور مطلوبة');
      return;
    }
    if (newPassword.trim().length < 6) {
      setSecurityError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setSecurityError('كلمتا المرور غير متطابقتين');
      return;
    }
    setIsUpdatingCreds(true);
    const success = await updateAdminCredentials('', newPassword.trim());
    setIsUpdatingCreds(false);
    if (success) {
      setSecuritySuccess('تم تحديث كلمة المرور بنجاح.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setSecurityError('فشل التحديث، يرجى المحاولة لاحقاً.');
    }
  };

  // Device file upload handler for product images
  const handleProductImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingImages(true);
    try {
      const fileList = Array.from(files) as File[];
      const uploadedList = await Promise.all(fileList.map((f) => uploadImageFile(f, 1440, 0.82)));
      setUploadedProductImages((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      console.error('Failed to process product image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const removeUploadedProductImage = (indexToRemove: number) => {
    setUploadedProductImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdatePColorSizeStock = (colorIdx: number, size: HoodieSize, val: number) => {
    setPColors((prev) =>
      prev.map((clr, i) => {
        if (i !== colorIdx) return clr;
        return {
          ...clr,
          sizesStock: {
            ...(clr.sizesStock || { M: 0, L: 0, XL: 0, '2XL': 0 }),
            [size]: Math.max(0, val)
          }
        };
      })
    );
  };

  const handleAddPColor = () => {
    if (!pNewColorName.trim()) return;
    setPColors((prev) => [
      ...prev,
      {
        name: pNewColorName.trim(),
        hex: pNewColorHex || '#171717',
        sizesStock: {
          M: Math.max(0, Number(pNewColorStockM) || 0),
          L: Math.max(0, Number(pNewColorStockL) || 0),
          XL: Math.max(0, Number(pNewColorStockXL) || 0),
          '2XL': Math.max(0, Number(pNewColorStock2XL) || 0)
        }
      }
    ]);
    setPNewColorName('');
    setPNewColorHex('#171717');
    setPNewColorStockM(10);
    setPNewColorStockL(15);
    setPNewColorStockXL(10);
    setPNewColorStock2XL(5);
  };

  const handleRemovePColor = (indexToRemove: number) => {
    setPColors((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Device file upload handler for review screenshots
  const handleReviewImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingImages(true);
    try {
      const fileList = Array.from(files) as File[];
      const uploadedList = await Promise.all(fileList.map((f) => uploadImageFile(f, 1440, 0.82)));
      for (const uploaded of uploadedList) {
        await addReviewImage(uploaded, reviewCaption.trim() || undefined);
      }
      setReviewCaption('');
    } catch (err) {
      console.error('Failed to process review image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pDescription.trim()) return;
    setIsSavingProduct(true);
    try {
      const imagesToUse =
        uploadedProductImages.length > 0
          ? uploadedProductImages
          : ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop'];
      const numOriginalPrice = pOriginalPrice !== '' && Number(pOriginalPrice) > 0 ? Number(pOriginalPrice) : undefined;
      const finalSizesStock: Record<HoodieSize, number> =
        pColors.length > 0 && pColors.some((c) => c.sizesStock)
          ? {
              M: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.M) || 0), 0),
              L: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.L) || 0), 0),
              XL: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.XL) || 0), 0),
              '2XL': pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.['2XL']) || 0), 0)
            }
          : {
              M: Number(pStockM) || 0,
              L: Number(pStockL) || 0,
              XL: Number(pStockXL) || 0,
              '2XL': Number(pStock2XL) || 0
            };

      await addProduct({
        name: pName.trim(),
        subtitle: pSubtitle.trim() || 'Beyond Oversized Hoodie',
        category: pCategory,
        price: Number(pPrice),
        originalPrice: numOriginalPrice,
        description: pDescription.trim(),
        fabric: pFabric.trim(),
        fit: pFit.trim(),
        weightRange: pWeightRange.trim(),
        careInstructions: pCare.trim(),
        sizesStock: finalSizesStock,
        colors: pColors.length > 0 ? pColors : [
          { name: 'أسود فاحم', hex: '#171717', sizesStock: finalSizesStock }
        ],
        images: imagesToUse,
        isFeatured: true,
        badge: pComingSoon ? 'قريباً' : 'الأكثر طلباً',
        comingSoon: pComingSoon
      });

      setPName('');
      setPSubtitle('');
      setPDescription('');
      setPOriginalPrice('');
      setUploadedProductImages([]);
      setPComingSoon(false);
      setShowAddProduct(false);
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSubtitle(product.subtitle || '');
    setEditCategory(product.category);
    setEditPrice(product.price);
    setEditOriginalPrice(product.originalPrice ? product.originalPrice : '');
    setEditDescription(product.description || '');
    setEditFabric(product.fabric || '');
    setEditFit(product.fit || '');
    setEditWeightRange(product.weightRange || '');
    setEditCare(product.careInstructions || '');
    setEditBadge(product.badge || '');
    setEditIsFeatured(Boolean(product.isFeatured));
    setEditComingSoon(product.comingSoon === true);
    setEditStockM(product.sizesStock?.M ?? 0);
    setEditStockL(product.sizesStock?.L ?? 0);
    setEditStockXL(product.sizesStock?.XL ?? 0);
    setEditStock2XL(product.sizesStock?.['2XL'] ?? 0);
    setEditImages(product.images ? [...product.images] : []);

    const initialColors = (product.colors || []).map((c) => ({
      ...c,
      sizesStock: c.sizesStock || {
        M: Number(product.sizesStock?.M) || 0,
        L: Number(product.sizesStock?.L) || 0,
        XL: Number(product.sizesStock?.XL) || 0,
        '2XL': Number(product.sizesStock?.['2XL']) || 0,
      }
    }));
    setEditColors(initialColors);
    setNewColorName('');
    setNewColorHex('#171717');
    setNewColorStockM(10);
    setNewColorStockL(15);
    setNewColorStockXL(10);
    setNewColorStock2XL(5);
  };

  const handleEditProductImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingImages(true);
    try {
      const fileList = Array.from(files) as File[];
      const uploadedList = await Promise.all(fileList.map((f) => uploadImageFile(f, 1440, 0.82)));
      setEditImages((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      console.error('Failed to process edit product image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const removeEditImage = (indexToRemove: number) => {
    setEditImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateEditColorSizeStock = (colorIdx: number, size: HoodieSize, val: number) => {
    setEditColors((prev) =>
      prev.map((clr, i) => {
        if (i !== colorIdx) return clr;
        return {
          ...clr,
          sizesStock: {
            ...(clr.sizesStock || { M: 0, L: 0, XL: 0, '2XL': 0 }),
            [size]: Math.max(0, val)
          }
        };
      })
    );
  };

  const handleAddEditColor = () => {
    if (!newColorName.trim()) return;
    setEditColors((prev) => [
      ...prev,
      {
        name: newColorName.trim(),
        hex: newColorHex || '#171717',
        sizesStock: {
          M: Math.max(0, Number(newColorStockM) || 0),
          L: Math.max(0, Number(newColorStockL) || 0),
          XL: Math.max(0, Number(newColorStockXL) || 0),
          '2XL': Math.max(0, Number(newColorStock2XL) || 0)
        }
      }
    ]);
    setNewColorName('');
    setNewColorHex('#171717');
    setNewColorStockM(10);
    setNewColorStockL(15);
    setNewColorStockXL(10);
    setNewColorStock2XL(5);
  };

  const handleRemoveEditColor = (indexToRemove: number) => {
    setEditColors((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) return;

    setIsSavingProduct(true);
    try {
      const numOriginalPrice = editOriginalPrice !== '' && Number(editOriginalPrice) > 0 ? Number(editOriginalPrice) : undefined;
      const finalSizesStock: Record<HoodieSize, number> =
        editColors.length > 0 && editColors.some((c) => c.sizesStock)
          ? {
              M: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.M) || 0), 0),
              L: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.L) || 0), 0),
              XL: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.XL) || 0), 0),
              '2XL': editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.['2XL']) || 0), 0)
            }
          : {
              M: Number(editStockM) || 0,
              L: Number(editStockL) || 0,
              XL: Number(editStockXL) || 0,
              '2XL': Number(editStock2XL) || 0
            };

      await updateProduct(editingProduct.id, {
        name: editName.trim(),
        subtitle: editSubtitle.trim(),
        category: editCategory,
        price: Number(editPrice),
        originalPrice: numOriginalPrice,
        description: editDescription.trim(),
        fabric: editFabric.trim(),
        fit: editFit.trim(),
        weightRange: editWeightRange.trim(),
        careInstructions: editCare.trim(),
        badge: editBadge.trim() || undefined,
        isFeatured: editIsFeatured,
        comingSoon: editComingSoon,
        sizesStock: finalSizesStock,
        images: editImages.length > 0 ? editImages : editingProduct.images,
        colors: editColors.length > 0 ? editColors : editingProduct.colors
      });
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product edit:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim()) return;

    const targetProduct =
      cTargetScope === 'specific' && cTargetProductId
        ? products.find((p) => p.id === cTargetProductId)
        : null;

    addCoupon({
      code: cCode.trim().toUpperCase(),
      discountPercent: Number(cDiscount),
      active: true,
      minOrderAmount: Number(cMinOrder),
      targetProductId: targetProduct ? targetProduct.id : undefined,
      targetProductName: targetProduct ? targetProduct.name : undefined
    });

    setCCode('');
    setCTargetScope('all');
    setCTargetProductId('');
    setShowAddCoupon(false);
  };

  // Explicit Deletion Triggers with Confirmation Dialogs
  const handleDeleteProductPrompt = (productId: string, productName: string) => {
    openDeleteModal({
      title: 'حذف الهودي نهائياً',
      description: 'هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المتجر وقاعدة البيانات؟',
      itemLabel: productName,
      onConfirm: () => {
        deleteProduct(productId);
      }
    });
  };

  const handleDeleteOrderPrompt = (orderId: string, orderNumber: string) => {
    openDeleteModal({
      title: 'حذف سجل الطلب',
      description: 'هل أنت متأكد من حذف هذا الطلب نهائياً؟',
      itemLabel: `طلب رقم: ${orderNumber}`,
      onConfirm: () => {
        deleteOrder(orderId);
      }
    });
  };

  const handleDeleteCouponPrompt = (couponId: string, couponCode: string) => {
    openDeleteModal({
      title: 'حذف كوبون الخصم',
      description: 'هل أنت متأكد من رغبتك في إزالة كود الخصم هذا نهائياً؟',
      itemLabel: `كوبون: ${couponCode}`,
      onConfirm: () => {
        deleteCoupon(couponId);
      }
    });
  };

  const handleDeleteReviewPrompt = (reviewId: string) => {
    openDeleteModal({
      title: 'حذف لقطة التقييم',
      description: 'هل أنت متأكد من حذف صورة التقييم هذه؟',
      itemLabel: 'رأي العميل المصور',
      onConfirm: () => {
        deleteReviewImage(reviewId);
      }
    });
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImages(true);
    try {
      const uploaded = await uploadImageFile(file, 800, 0.85);
      setBrandLogo(uploaded);
    } catch (err) {
      console.error('Failed to compress logo:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLogo = brandLogo.trim() || '/beyond-logo.jpg';
    const cleanTopic = pushTopic.trim();
    const cleanToken = telegramBotToken.trim();
    const cleanChatId = telegramChatId.trim();

    setIsSavingSettings(true);
    try {
      await updateSettings({
        storeName,
        brandLogo: cleanLogo,
        notificationLogoUrl: cleanLogo,
        announcementText,
        comingSoonEnabled,
        comingSoonTitle: comingSoonTitle.trim(),
        comingSoonSubtitle: comingSoonSubtitle.trim(),
        whatsappNumber,
        whatsappUrl,
        instagramUrl,
        tiktokUrl,
        facebookUrl,
        quantityShippingEnabled,
        quantityShippingMinItems: Math.max(1, Number(quantityShippingMinItems) || 2),
        quantityShippingCost: Math.max(0, Number(quantityShippingCost) || 0),
        pushNotificationTopic: cleanTopic,
        telegramBotToken: cleanToken,
        telegramChatId: cleanChatId
      });
      if (cleanTopic) {
        setPushTopic(cleanTopic);
      }
    } catch (err) {
      console.error('Failed to save store settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // If not logged in, show secure login box
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-stone-400 to-amber-500" />
          <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-stone-100 text-center">لوحة تحكم المتجر</h2>
          <p className="text-xs text-stone-400 text-center mt-1 mb-6">
            تسجيل دخول آمن لإدارة المنتجات، الطلبات، الأسعار والإشعارات
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                البريد الإلكتروني للمسؤول
              </label>
              <input
                id="admin-username-input"
                type="email"
                required
                placeholder="البريد الإلكتروني (مثال: admin@example.com)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                كلمة المرور
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-900/30 rounded-xl">
              <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <span>نظام حماية موثق عبر خوادم Firebase المشفرة.</span>
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
                {loginError}
              </p>
            )}

            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-extrabold text-xs transition-colors shadow-md shadow-amber-950/40 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <span>دخول لوحة التحكم</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pComputedStock = {
    M: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.M) || 0), 0),
    L: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.L) || 0), 0),
    XL: pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.XL) || 0), 0),
    '2XL': pColors.reduce((sum, c) => sum + (Number(c.sizesStock?.['2XL']) || 0), 0)
  };
  const pTotalStock = pComputedStock.M + pComputedStock.L + pComputedStock.XL + pComputedStock['2XL'];

  const editComputedStock = {
    M: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.M) || 0), 0),
    L: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.L) || 0), 0),
    XL: editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.XL) || 0), 0),
    '2XL': editColors.reduce((sum, c) => sum + (Number(c.sizesStock?.['2XL']) || 0), 0)
  };
  const editTotalStock = editComputedStock.M + editComputedStock.L + editComputedStock.XL + editComputedStock['2XL'];

  // Logged-in Admin Dashboard View
  return (
    <div id="admin-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header with Realtime Cloud Sync Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">لوحة الإدارة متصلة</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-mono">
                مزامنة حية لحظية
              </span>
            </div>
            <p className="text-[11px] text-stone-400">أي تعديل يظهر فوراً لجميع الزوار والمشترين</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-right hidden sm:flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              مدير موثق
            </span>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 block">المسؤول الحالي</span>
              <span className="text-xs font-mono font-bold text-amber-400">{adminCredentials.username}</span>
            </div>
          </div>
          <button
            id="admin-logout-btn"
            type="button"
            onClick={async () => {
              await logoutAdmin();
              setActiveView('home');
            }}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>إجمالي المبيعات</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {totalRevenue.toLocaleString()} ج.م
          </p>
          <span className="text-[10px] text-stone-500">من الطلبات المؤكدة</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>إجمالي الطلبات</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {totalOrdersCount}
          </p>
          <span className="text-[10px] text-amber-500 font-semibold">{pendingOrdersCount} طلب قيد المعالجة</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>المنتجات المعروضة</span>
            <Package className="w-4 h-4 text-stone-300" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {products.length}
          </p>
          <span className="text-[10px] text-stone-500">{totalStockCount} قطعة في المخزون</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>لقطات آراء العملاء</span>
            <ImageIcon className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {reviewImages.length}
          </p>
          <span className="text-[10px] text-stone-500">معروضة في الصفحة الرئيسية</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800/80">
        <button
          id="admin-tab-products"
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'products'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>المنتجات ({products.length})</span>
        </button>

        <button
          id="admin-tab-orders"
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>الطلبات ({orders.length})</span>
        </button>

        <button
          id="admin-tab-analytics"
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>تحليلات العملاء والسلات</span>
        </button>

        <button
          id="admin-tab-coupons"
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'coupons'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>الكوبونات ({coupons.length})</span>
        </button>

        <button
          id="admin-tab-reviews"
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'reviews'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>آراء العملاء ({reviewImages.length})</span>
        </button>

        <button
          id="admin-tab-shipping"
          type="button"
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'shipping'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>أسعار الشحن</span>
        </button>

        <button
          id="admin-tab-settings"
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>الإعدادات واللوجو</span>
        </button>

        <button
          id="admin-tab-security"
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'security'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>الأمان والمسؤولين</span>
        </button>
      </div>

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">إدارة المنتجات والهوديز</h3>
            <button
              id="admin-add-product-toggle-btn"
              type="button"
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة هودي جديد</span>
            </button>
          </div>

          {/* Add Product Form with Local Device Upload */}
          {showAddProduct && (
            <form
              onSubmit={handleCreateProduct}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-amber-400">إضافة قطعة هودي جديدة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">اسم الهودي</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Beyond Vintage Boxy Hoodie"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">الوصف الفرعي (العنوان الترويجي)</label>
                  <input
                    type="text"
                    placeholder="Beyond Charcoal Boxy"
                    value={pSubtitle}
                    onChange={(e) => setPSubtitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">السعر قبل الخصم (ج.م - اختياري)</label>
                  <input
                    type="number"
                    placeholder="اتركه فارغاً إذا لا يوجد خصم"
                    value={pOriginalPrice}
                    onChange={(e) => setPOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">القصة والتصنيف</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value as HoodieCategory)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  >
                    <option value="oversized">أوفر سايز (Oversized)</option>
                    <option value="basic">بيزك كلاسيك (Basic)</option>
                    <option value="zipup">سوستة كاملة (Zip-Up)</option>
                  </select>
                </div>

                {/* Local Device Image Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-300 font-bold mb-1.5">
                    صور المنتج (رفع مباشر من جهازك بجودة عالية)
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      ref={productFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProductImageUploadFromDevice}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isProcessingImages}
                      onClick={() => productFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 disabled:opacity-50 border border-dashed border-amber-500/50 hover:border-amber-400 text-stone-200 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      {isProcessingImages ? (
                        <>
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>جاري المعالجة بدقة FHD (1080p)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span>اختر صوراً من جهازك (دقة Full HD)</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-stone-400">
                      يتم ضغط الصور وحفظها بأعلى جودة Full HD (1080p) فائقة الوضوح
                    </span>
                  </div>

                  {/* Uploaded Images Preview Strip */}
                  {uploadedProductImages.length > 0 && (
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {uploadedProductImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-24 rounded-xl overflow-hidden border border-stone-700 bg-stone-950 group"
                        >
                          <img
                            src={img}
                            alt={`صورة الهودي ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedProductImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                            title="حذف هذه الصورة"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-400 mb-1">وصف الهودي</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="وصف مميزات القماش، التطريز، والبطانة..."
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">الخامة</label>
                  <input
                    type="text"
                    value={pFabric}
                    onChange={(e) => setPFabric(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">القصة</label>
                  <input
                    type="text"
                    value={pFit}
                    onChange={(e) => setPFit(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                {/* Stock & Colors Management in Add Form */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                        <Palette className="w-4 h-4" />
                        <span>ألوان ومقاسات الهودي:</span>
                      </label>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        حدد الكمية المتاحة لكل مقاس (M, L, XL, 2XL) داخل كل لون على حدة
                      </p>
                    </div>
                    {pColors.length > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        إجمالي المخزون: {pTotalStock} قطعة
                      </span>
                    )}
                  </div>

                  {/* Summary of computed totals per size across all colors */}
                  {pColors.length > 0 && (
                    <div className="bg-stone-900/80 border border-stone-800/90 rounded-xl p-2.5">
                      <span className="text-[11px] text-stone-400 block mb-1">
                        إجمالي المخزون التراكمي لجميع الألوان حسب المقاس:
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center font-mono">
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس M</span>
                          <span className="text-xs font-bold text-stone-200">{pComputedStock.M}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس L</span>
                          <span className="text-xs font-bold text-stone-200">{pComputedStock.L}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس XL</span>
                          <span className="text-xs font-bold text-stone-200">{pComputedStock.XL}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس 2XL</span>
                          <span className="text-xs font-bold text-stone-200">{pComputedStock['2XL']}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of colors with per-color size stock inputs */}
                  {pColors.length > 0 ? (
                    <div className="space-y-3">
                      {pColors.map((clr, idx) => {
                        const colorTotal = Object.values(clr.sizesStock || {}).reduce(
                          (a, b) => Number(a) + (Number(b) || 0),
                          0
                        );
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-stone-700 inline-block shrink-0 shadow-inner"
                                  style={{ backgroundColor: clr.hex }}
                                />
                                <span className="font-bold text-xs text-stone-100">{clr.name}</span>
                                <span className="text-[10px] text-stone-500 font-mono">({clr.hex})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  مخزون اللون: {colorTotal}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePColor(idx)}
                                  className="text-stone-500 hover:text-rose-400 p-1 rounded-lg hover:bg-stone-800 transition-colors"
                                  title="حذف هذا اللون"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Quantity per size for this color */}
                            <div className="pt-2 border-t border-stone-800/80">
                              <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
                                حدد مخزون كل مقاس لهذا اللون ({clr.name})
                              </span>
                              <div className="grid grid-cols-4 gap-2">
                                {(['M', 'L', 'XL', '2XL'] as HoodieSize[]).map((sz) => (
                                  <div
                                    key={sz}
                                    className="bg-stone-950/80 border border-stone-800 rounded-lg p-1.5 text-center"
                                  >
                                    <span className="text-[10px] text-stone-400 block font-bold mb-0.5">
                                      مقاس {sz}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={clr.sizesStock?.[sz] ?? 0}
                                      onChange={(e) =>
                                        handleUpdatePColorSizeStock(idx, sz, Number(e.target.value))
                                      }
                                      className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">لم تقم بإضافة أي ألوان بعد.</p>
                  )}

                  {/* Add New Color Section */}
                  <div className="pt-3 border-t border-stone-800/80 space-y-2.5">
                    <span className="text-xs text-amber-400 font-bold block">
                      + إضافة لون جديد للهودي:
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="اسم اللون (مثال: أزرق بترولي)"
                        value={pNewColorName}
                        onChange={(e) => setPNewColorName(e.target.value)}
                        className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1">
                          <input
                            type="color"
                            value={pNewColorHex}
                            onChange={(e) => setPNewColorHex(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-[11px] font-mono text-stone-400">{pNewColorHex}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end gap-2">
                      <div className="grid grid-cols-4 gap-2 flex-1 w-full">
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون M:</span>
                          <input
                            type="number"
                            min="0"
                            value={pNewColorStockM}
                            onChange={(e) => setPNewColorStockM(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون L:</span>
                          <input
                            type="number"
                            min="0"
                            value={pNewColorStockL}
                            onChange={(e) => setPNewColorStockL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون XL:</span>
                          <input
                            type="number"
                            min="0"
                            value={pNewColorStockXL}
                            onChange={(e) => setPNewColorStockXL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون 2XL:</span>
                          <input
                            type="number"
                            min="0"
                            value={pNewColorStock2XL}
                            onChange={(e) => setPNewColorStock2XL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPColor}
                        disabled={!pNewColorName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-black transition-colors shrink-0"
                      >
                        + أضف هذا اللون
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  id="new-product-coming-soon"
                  type="checkbox"
                  checked={pComingSoon}
                  onChange={(e) => setPComingSoon(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-800 bg-stone-950 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="new-product-coming-soon" className="text-xs text-stone-300 cursor-pointer">
                  عرض كـ &quot;قريباً&quot; (لا يمكن شراؤه حالياً)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="admin-submit-new-product-btn"
                  type="submit"
                  disabled={isSavingProduct || isProcessingImages}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>نشر الهودي</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Products Table or Empty State */}
          {products.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-10 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-400 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-stone-200">لا توجد منتجات معروضة حالياً</h4>
                <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                  المتجر يبدأ نظيفاً بدون منتجات تجريبية. يمكنك إضافة هودي جديد بنفسك أو إضافة منتج تجريبي بنقرة واحدة.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول هودي</span>
                </button>
                <button
                  type="button"
                  onClick={() => seedSampleProduct()}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs border border-stone-700 transition-colors"
                >
                  <span>إضافة منتج تجريبي تلقائياً</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 uppercase text-[11px] border-b border-stone-800">
                    <tr>
                      <th className="p-3.5">المنتج</th>
                      <th className="p-3.5">القصة</th>
                      <th className="p-3.5">السعر</th>
                      <th className="p-3.5">المخزون (M/L/XL/2XL)</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {products.map((p) => {
                      const totalStock = Object.values(p?.sizesStock || {}).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
                      return (
                        <tr key={p.id} className="hover:bg-stone-900/90 transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-14 rounded-lg object-cover border border-stone-800 bg-stone-950 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-stone-200">
                                {p.name}
                                {(p.comingSoon === true || totalStock <= 0) && (
                                  <span className="mr-2 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold align-middle">
                                    قريباً
                                  </span>
                                )}
                              </p>
                              <p className="text-stone-500 text-[11px]">{p.subtitle}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 text-[11px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {p.price} ج.م
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className={p.sizesStock.M === 0 ? 'text-rose-400/80 line-through' : 'text-stone-300'}>{p.sizesStock.M}</span>
                              <span className="text-stone-600">/</span>
                              <span className={p.sizesStock.L === 0 ? 'text-rose-400/80 line-through' : 'text-stone-300'}>{p.sizesStock.L}</span>
                              <span className="text-stone-600">/</span>
                              <span className={p.sizesStock.XL === 0 ? 'text-rose-400/80 line-through' : 'text-stone-300'}>{p.sizesStock.XL}</span>
                              <span className="text-stone-600">/</span>
                              <span className={p.sizesStock['2XL'] === 0 ? 'text-rose-400/80 line-through' : 'text-stone-300'}>{p.sizesStock['2XL']}</span>
                              <span className="text-stone-500 text-[10px] mr-1">
                                (إجمالي {totalStock})
                              </span>
                            </div>
                            {totalStock === 0 ? (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
                                نفد المخزون
                              </span>
                            ) : totalStock < 5 ? (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                                متبقي {totalStock} قطع فقط
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-2 justify-center">
                              <button
                                id={`admin-edit-product-btn-${p.id}`}
                                type="button"
                                onClick={() => handleStartEditProduct(p)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 transition-colors text-xs font-semibold"
                                title="تعديل الهودي"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                id={`admin-delete-product-btn-${p.id}`}
                                type="button"
                                onClick={() => handleDeleteProductPrompt(p.id, p.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-900/50 hover:border-rose-700 transition-colors text-xs font-semibold"
                                title="حذف الهودي نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (() => {
        const statusCounts = {
          all: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          processing: orders.filter((o) => o.status === 'processing').length,
          shipped: orders.filter((o) => o.status === 'shipped').length,
          delivered: orders.filter((o) => o.status === 'delivered').length,
          cancelled: orders.filter((o) => o.status === 'cancelled').length
        };

        const filteredByStatus =
          orderStatusFilter === 'all'
            ? orders
            : orders.filter((o) => o.status === orderStatusFilter);

        const cleanQuery = orderSearchQuery.trim().toLowerCase();
        const queryNum = cleanQuery.replace(/^#/, '');
        const isNumeric = /^\d+$/.test(queryNum);

        const filteredOrders = filteredByStatus.filter((order) => {
          if (!cleanQuery) return true;
          const num = (order.orderNumber || '').toLowerCase();
          if (isNumeric) {
            // Exact match for order number (e.g. "1" matches order #1 only)
            if (num === queryNum || `#${num}` === cleanQuery) {
              return true;
            }
            // Only match phone if query has 6+ digits (actual phone query)
            if (queryNum.length >= 6) {
              return (order.phone || '').includes(queryNum) || (order.alternatePhone || '').includes(queryNum);
            }
            return false;
          }
          const matchName = (order.customerName || '').toLowerCase().includes(cleanQuery);
          const matchGov = (order.governorate || '').toLowerCase().includes(cleanQuery);
          const matchCenter = (order.center || '').toLowerCase().includes(cleanQuery);
          const matchAddress = (order.address || '').toLowerCase().includes(cleanQuery);
          return matchName || matchGov || matchCenter || matchAddress;
        }).sort((a, b) => {
          const timeA = getOrderTimestamp(a.createdAt, a.createdAtMs);
          const timeB = getOrderTimestamp(b.createdAt, b.createdAtMs);
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
          if (numB !== numA) {
            return numB - numA;
          }
          return String(b.id || '').localeCompare(String(a.id || ''));
        });

        const statusTabs: Array<{ id: 'all' | OrderStatus; label: string; count: number }> = [
          { id: 'all', label: 'جميع الطلبات', count: statusCounts.all },
          { id: 'pending', label: 'قيد المراجعة', count: statusCounts.pending },
          { id: 'processing', label: 'جاري التجهيز', count: statusCounts.processing },
          { id: 'shipped', label: 'تم الشحن', count: statusCounts.shipped },
          { id: 'delivered', label: 'تم التوصيل', count: statusCounts.delivered },
          { id: 'cancelled', label: 'ملغية', count: statusCounts.cancelled }
        ];

        return (
          <div className="space-y-6">
            {/* Top Bar with Title and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-200">إدارة ومتابعة طلبات العملاء</h3>
                <p className="text-xs text-stone-400">إجمالي الطلبات: {orders.length} طلب</p>
              </div>

              {/* Order Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-search-orders-input"
                  type="text"
                  placeholder="ابحث برقم الطلب (مثال: 1 أو 2) أو الهاتف..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pr-9 pl-8 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Direct Order Notification Controls - Clean & Minimal */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <span>إشعارات الطلبات الفورية</span>
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    صوت كاشير شوبيفاي ورنة فورية فور وصول أي طلب جديد
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Sound Toggle */}
                <button
                  id="admin-toggle-sound-btn"
                  type="button"
                  onClick={() => {
                    const next = !soundNotificationOn;
                    setSoundNotificationOn(next);
                    setSoundNotificationEnabled(next);
                    if (next) {
                      playOrderNotificationSound();
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                    soundNotificationOn
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:bg-stone-800'
                  }`}
                  title={soundNotificationOn ? 'صوت الإشعار مفعل' : 'صوت الإشعار مكتوم'}
                >
                  {soundNotificationOn ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>صوت الكاشير مفعل</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>الصوت مكتوم</span>
                    </>
                  )}
                </button>

                {/* Web Push Permission & Subscription Button */}
                {notificationPerm !== 'granted' || !isPushActive ? (
                  <button
                    id="admin-enable-browser-notifications-btn"
                    type="button"
                    disabled={isSubscribingPush}
                    onClick={async () => {
                      setIsSubscribingPush(true);
                      try {
                        const res = await subscribeToWebPush();
                        if (res.success) {
                          setNotificationPerm('granted');
                          setIsPushActive(true);
                          setTestPushMessage('تم تفعيل إشعارات المتصفح بنجاح.');
                        } else if (res.isInIframe) {
                          setTestPushMessage('المتصفح يمنع الإشعارات في المعاينة المصغرة.');
                        } else if (res.isIosBrowser) {
                          setTestPushMessage('على أجهزة آيفون يرجى إضافة المتجر للشاشة الرئيسية (Add to Home Screen) لتفعيل الإشعارات.');
                        } else {
                          setTestPushMessage(res.error || 'تعذر تفعيل الإشعارات.');
                        }
                      } catch (err: any) {
                        setTestPushMessage(err?.message || 'حدث خطأ.');
                      } finally {
                        setIsSubscribingPush(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{isSubscribingPush ? 'جاري التفعيل...' : 'تفعيل إشعارات الهاتف'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-2 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>الإشعارات مفعلة</span>
                    </span>
                    <button
                      type="button"
                      disabled={isSubscribingPush}
                      onClick={async () => {
                        setIsSubscribingPush(true);
                        try {
                          const res = await subscribeToWebPush();
                          if (res.success) {
                            setTestPushMessage('تم تجديد تفعيل الإشعارات بنجاح');
                          }
                        } finally {
                          setIsSubscribingPush(false);
                        }
                      }}
                      title="تجديد الاشتراك"
                      className="px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition-colors"
                    >
                      {isSubscribingPush ? '...' : 'تجديد'}
                    </button>
                  </div>
                )}

                {/* Test Notification Button */}
                <button
                  id="admin-test-phone-notification-btn"
                  type="button"
                  disabled={isSendingTestPush}
                  onClick={async () => {
                    setIsSendingTestPush(true);
                    if (soundNotificationOn) {
                      try {
                        playOrderNotificationSound();
                      } catch {}
                    }
                    try {
                      const activeLogo = brandLogo || settings.notificationLogoUrl || settings.brandLogo || '/beyond-logo.jpg';
                      const res = await testPhoneNotification(pushTopic, activeLogo);
                      if (res.sentCount > 0) {
                        setTestPushMessage(`تم إرسال إشعار تجريبي لـ ${res.sentCount} أجهزة (من إجمالي ${res.totalSubscribers} مشتركين)`);
                      } else if (res.totalSubscribers === 0) {
                        setTestPushMessage('لا توجد أجهزة مشتركة حالياً. اضغط "تفعيل إشعارات الهاتف" أولاً.');
                      } else {
                        setTestPushMessage(`تم إرسال إشعار التجربة بنجاح.`);
                      }
                    } catch {
                      setTestPushMessage('تعذر إرسال الإشعار التجريبي');
                    } finally {
                      setIsSendingTestPush(false);
                      setTimeout(() => setTestPushMessage(''), 8000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-stone-700"
                >
                  <span>تجربة الإشعار الآن</span>
                </button>
              </div>
            </div>

            {testPushMessage && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{testPushMessage}</span>
              </div>
            )}

            {/* Order Classification Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-800 pb-3">
              {statusTabs.map((tab) => {
                const isActive = orderStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`admin-order-status-tab-${tab.id}`}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-black/20 text-stone-950'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Export and Summary Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-2xl">
              <div className="text-xs text-stone-300 flex flex-wrap items-center gap-2">
                <span className="font-bold text-stone-100">
                  {orderStatusFilter === 'all'
                    ? 'جميع الطلبات'
                    : `الطلبات: ${ORDER_STATUS_LABELS[orderStatusFilter]}`}
                </span>
                <span className="text-stone-600">|</span>
                <span>
                  عدد الطلبات: <strong className="text-amber-400 font-mono">{filteredByStatus.length}</strong>
                </span>
                <span className="text-stone-600">|</span>
                <span>
                  القيمة الإجمالية:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {(filteredByStatus || []).reduce((sum, o) => sum + (o && o.status !== 'cancelled' ? (o.total || 0) : 0), 0)} ج.م
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Download Current View File */}
                <button
                  id="admin-export-current-file-btn"
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (orderStatusFilter === 'all') {
                      exportOrdersToCSV(orders, `طلبات_Beyond_الكل_${today}`);
                    } else {
                      exportOrdersByStatus(orders, orderStatusFilter);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="تنزيل كملف Excel / CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    {orderStatusFilter === 'all'
                      ? 'تصدير الكل (Excel)'
                      : `تصدير (${ORDER_STATUS_LABELS[orderStatusFilter]})`}
                  </span>
                </button>

                {/* Dropdown to download separate file for each status */}
                <div className="relative">
                  <button
                    id="admin-export-dropdown-toggle-btn"
                    type="button"
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>تصدير مخصص</span>
                  </button>

                  {showExportDropdown && (
                    <div
                      id="admin-export-dropdown-menu"
                      className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-30 space-y-1"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 border-b border-stone-800">
                        تنزيل ملف منفصل حسب الحالة:
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          exportOrdersToCSV(orders, `طلبات_Beyond_الكل_${today}`);
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-stone-200 hover:bg-stone-800 flex items-center justify-between"
                      >
                        <span>تصدير الكل (شامل)</span>
                        <span className="font-mono text-stone-400 text-[10px]">({orders.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'pending');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-amber-400 hover:bg-amber-950/40 flex items-center justify-between"
                      >
                        <span>تصدير قيد المراجعة</span>
                        <span className="font-mono text-[10px]">({statusCounts.pending})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'processing');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-blue-400 hover:bg-blue-950/40 flex items-center justify-between"
                      >
                        <span>تصدير جاري التجهيز</span>
                        <span className="font-mono text-[10px]">({statusCounts.processing})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'shipped');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-purple-400 hover:bg-purple-950/40 flex items-center justify-between"
                      >
                        <span>تصدير تم الشحن</span>
                        <span className="font-mono text-[10px]">({statusCounts.shipped})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'delivered');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-emerald-400 hover:bg-emerald-950/40 flex items-center justify-between"
                      >
                        <span>تصدير تم التوصيل</span>
                        <span className="font-mono text-[10px]">({statusCounts.delivered})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'cancelled');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 flex items-center justify-between"
                      >
                        <span>تصدير الملغية</span>
                        <span className="font-mono text-[10px]">({statusCounts.cancelled})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-stone-900/40 border border-stone-800 rounded-2xl">
                  <p className="text-xs text-stone-400">
                    {orderSearchQuery
                      ? `لا توجد نتائج مطابقة لبحثك "${orderSearchQuery}"`
                      : 'لا توجد طلبات في هذا القسم'}
                  </p>
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="mt-2 text-xs text-amber-400 hover:underline"
                    >
                      إلغاء تصفية البحث
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredOrders.slice(0, visibleOrdersCount).map((order) => (
                    <div
                      key={order.id}
                      className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                          <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs sm:text-sm">
                            #{order.orderNumber}
                          </span>
                          {(() => {
                            const dt = formatOrderDateTime(order.createdAt, order.createdAtMs);
                            return (
                              <div className="flex items-center gap-1.5 text-xs" title={dt.full}>
                                <Clock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                                <span className="font-semibold text-stone-200 bg-stone-950/60 px-2 py-0.5 rounded-md border border-stone-800/80">
                                  {dt.relative}
                                </span>
                                {dt.full && (
                                  <span className="text-[11px] text-stone-500 hidden md:inline">
                                    ({dt.full})
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            id={`order-status-select-${order.id}`}
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:border-amber-500"
                          >
                            <option value="pending">قيد المراجعة</option>
                            <option value="processing">جاري التجهيز</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="cancelled">ملغي</option>
                          </select>
                          {/* Working Delete Order Button */}
                          <button
                            id={`admin-delete-order-btn-${order.id}`}
                            type="button"
                            onClick={() => handleDeleteOrderPrompt(order.id, order.orderNumber)}
                            className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-900/50 transition-colors"
                            title="حذف سجل الطلب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Info & Items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-stone-200">{order.customerName}</p>
                          <p className="text-stone-400 font-mono mt-0.5">الهاتف: {order.phone}</p>
                          {order.alternatePhone && (
                            <p className="text-stone-400 font-mono text-[11px] mt-0.5">رقم بديل: {order.alternatePhone}</p>
                          )}
                          <p className="text-stone-400 mt-1">
                            <span>المحافظة: <strong className="text-stone-200 font-medium">{order.governorate}</strong></span>
                            {order.center && (
                              <span className="mr-2"> | المركز/الحي: <strong className="text-amber-400 font-medium">{order.center}</strong></span>
                            )}
                          </p>
                          <p className="text-stone-400 mt-1">العنوان: <span className="text-stone-200">{order.address}</span></p>
                          {order.notes && (
                            <p className="text-amber-400/90 text-[11px] mt-1.5 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                              ملاحظة العميل: {order.notes}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-stone-300 font-bold text-xs flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-amber-500" />
                              <span>القطع المطلوبة ({((order.items || []).reduce((s, it) => s + (it?.quantity || 1), 0))} قطع):</span>
                            </p>
                            <span className="text-[10px] text-stone-500 hidden sm:inline">اضغط لفحص الصورة والمقاس</span>
                          </div>

                          <div className="space-y-2">
                            {(order.items || []).map((item, idx) => {
                              const matchingProduct = products.find((p) => p.id === item.productId);
                              const printSubtitle = item.subtitle || matchingProduct?.subtitle;
                              const itemImg = item.image || item.images?.[0] || matchingProduct?.images?.[0] || '';
                              const colorName = item.colorName || (matchingProduct?.colors && matchingProduct.colors[0]?.name);
                              const colorHex = item.colorHex || (matchingProduct?.colors && matchingProduct.colors[0]?.hex) || '#171717';

                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-stone-950/90 border border-stone-800/90 hover:border-stone-700 transition-all text-xs"
                                >
                                  {/* Thumbnail & Title/Print/Color/Size */}
                                  <div className="flex items-start sm:items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectingOrderItem({
                                          item: {
                                            ...item,
                                            subtitle: printSubtitle,
                                            image: itemImg,
                                            images: item.images && item.images.length > 0 ? item.images : (matchingProduct?.images || [itemImg]),
                                            colorName: colorName,
                                            colorHex: colorHex
                                          },
                                          orderNumber: order.orderNumber,
                                          customerName: order.customerName,
                                          orderDate: order.createdAt
                                        });
                                        setInspectingImageIndex(0);
                                      }}
                                      className="relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden border border-stone-700/80 bg-stone-900 shrink-0 group/img focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      title="فحص صورة القطعة والمقاس"
                                    >
                                      {itemImg ? (
                                        <img
                                          src={itemImg}
                                          alt={item.productName}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-600">
                                          <ImageIcon className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                                      </div>
                                    </button>

                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-stone-100 text-xs sm:text-sm">{item.productName}</span>
                                        {printSubtitle && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                                            الطبعة: {printSubtitle}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-200 font-bold font-mono">
                                          المقاس: <strong className="text-amber-400">{item.size}</strong>
                                        </span>
                                        {colorName && (
                                          <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300 flex items-center gap-1">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-stone-600 shadow-sm shrink-0 inline-block"
                                              style={{ backgroundColor: colorHex }}
                                            />
                                            <span>اللون: <strong className="text-stone-200">{colorName}</strong></span>
                                          </span>
                                        )}
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-300 font-bold font-mono">
                                          {item.quantity} {item.quantity > 1 ? 'قطع' : 'قطعة'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Price & Action */}
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-stone-850">
                                    <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm">
                                      {item.price * item.quantity} ج.م
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectingOrderItem({
                                          item: {
                                            ...item,
                                            subtitle: printSubtitle,
                                            image: itemImg,
                                            images: item.images && item.images.length > 0 ? item.images : (matchingProduct?.images || [itemImg]),
                                            colorName: colorName,
                                            colorHex: colorHex
                                          },
                                          orderNumber: order.orderNumber,
                                          customerName: order.customerName,
                                          orderDate: order.createdAt
                                        });
                                        setInspectingImageIndex(0);
                                      }}
                                      className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                                    >
                                      <Eye className="w-3 h-3 text-amber-500" />
                                      <span>فحص</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold text-stone-200 pt-2 border-t border-stone-800">
                            <span>الإجمالي المطلوب:</span>
                            <span className="font-mono text-amber-400 text-sm font-black">{order.total} ج.م</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredOrders.length > visibleOrdersCount && (
                    <div className="text-center pt-3 pb-2">
                      <button
                        id="admin-load-more-orders-btn"
                        type="button"
                        onClick={() => setVisibleOrdersCount((prev) => prev + 30)}
                        className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold transition-all shadow-md hover:border-amber-500/50"
                      >
                        عرض المزيد ({visibleOrdersCount} من {filteredOrders.length} طلب)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB CONTENT: CUSTOMER ANALYTICS */}
      {activeTab === 'analytics' && (
        <AdminCustomerAnalytics />
      )}

      {/* TAB CONTENT: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">إدارة كوبونات الخصم</h3>
            <button
              id="admin-add-coupon-toggle-btn"
              type="button"
              onClick={() => setShowAddCoupon(!showAddCoupon)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة كوبون جديد</span>
            </button>
          </div>

          {showAddCoupon && (
            <form
              onSubmit={handleCreateCoupon}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 max-w-xl animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-amber-400">إضافة كوبون خصم جديد</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">كود الكوبون</label>
                  <input
                    type="text"
                    required
                    placeholder="WINTER25"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={cDiscount}
                    onChange={(e) => setCDiscount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    value={cMinOrder}
                    onChange={(e) => setCMinOrder(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
                  />
                </div>
              </div>

              {/* Product Target Option */}
              <div className="space-y-2 pt-2 border-t border-stone-800/80">
                <label className="block text-xs font-bold text-stone-300">
                  نطاق تطبيق الكوبون:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCTargetScope('all');
                      setCTargetProductId('');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      cTargetScope === 'all'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    يطبق على كامل السلة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCTargetScope('specific');
                      if (!cTargetProductId && products.length > 0) {
                        setCTargetProductId(products[0].id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      cTargetScope === 'specific'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    مخصص لمنتج محدد فقط
                  </button>
                </div>

                {cTargetScope === 'specific' && (
                  <div className="mt-2 space-y-1.5 bg-stone-950/80 border border-amber-500/20 p-3 rounded-xl">
                    <label className="block text-xs font-bold text-amber-400">
                      اختر المنتج المخصص له هذا الكوبون:
                    </label>
                    <select
                      id="admin-coupon-target-product-select"
                      value={cTargetProductId}
                      onChange={(e) => setCTargetProductId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price} ج.م)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-stone-400">
                      سيتم خصم {cDiscount}% فقط على سعر هذا المنتج تحديداً، حتى لو كانت السلة تحتوي على منتجات أخرى.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCoupon(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="admin-submit-new-coupon-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                >
                  حفظ الكوبون
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-amber-400 text-lg">
                      {coupon.code}
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">
                      قيمة الخصم: {coupon.discountPercent}%
                    </p>
                    {coupon.targetProductId && coupon.targetProductName ? (
                      <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400">
                        مخصص لمنتج: {coupon.targetProductName}
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-stone-800 text-[11px] text-stone-400">
                        شامل جميع الهوديز
                      </span>
                    )}
                  </div>
                  {/* Working Delete Coupon Button */}
                  <button
                    id={`admin-delete-coupon-btn-${coupon.id}`}
                    type="button"
                    onClick={() => handleDeleteCouponPrompt(coupon.id, coupon.code)}
                    className="text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/80 p-1.5 rounded-lg border border-rose-900/50 transition-colors"
                    title="حذف الكوبون"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-stone-800/80 pt-3">
                  <span className="text-xs text-stone-400">الحالة:</span>
                  <button
                    type="button"
                    onClick={() => toggleCouponActive(coupon.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      coupon.active
                        ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {coupon.active ? 'نشط ومفعل' : 'معطل'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMER REVIEW IMAGES */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-200">
                لقطات آراء العملاء وتجارب الشراء ({reviewImages.length})
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                تظهر في الصفحة الرئيسية على شكل شريط صور دوار بدون نصوص
              </p>
            </div>
            {/* Device file upload for review screenshots */}
            <div>
              <input
                ref={reviewFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleReviewImageUploadFromDevice}
                className="hidden"
              />
              <button
                id="admin-upload-review-image-btn"
                type="button"
                onClick={() => reviewFileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>رفع لقطات من جهازك</span>
              </button>
            </div>
          </div>

          {/* Grid of review images with delete button */}
          {reviewImages.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-10">
              لا توجد لقطات تقييمات حالياً، اضغط على زر الرفع لإضافة أول تقييم.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {reviewImages.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden group relative flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] bg-stone-950 overflow-hidden">
                    <img
                      src={rev.imageUrl}
                      alt={rev.caption || 'رأي عميل'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-400 truncate">
                      {rev.caption || 'رأي موثق'}
                    </span>
                    {/* Working Delete Review Image Button */}
                    <button
                      id={`admin-delete-review-btn-${rev.id}`}
                      type="button"
                      onClick={() => handleDeleteReviewPrompt(rev.id)}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-900/40 transition-colors shrink-0"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SHIPPING RATES */}
      {activeTab === 'shipping' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-stone-100">
                  إدارة أسعار الشحن لكافة المحافظات ({editableGovernorates.length} محافظة)
                </h3>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                عدل سعر الشحن لأي محافظة مباشرة، أو طبق سعراً موحداً بنقرة واحدة
              </p>
            </div>
            {/* Bulk Save Button */}
            <div className="flex items-center gap-2 shrink-0">
              {hasUnsavedShippingChanges && (
                <button
                  type="button"
                  onClick={() => {
                    setEditableGovernorates(governorates);
                    setHasUnsavedShippingChanges(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تراجع</span>
                </button>
              )}
              <button
                id="admin-save-all-shipping-btn"
                type="button"
                disabled={isSavingShipping}
                onClick={async () => {
                  setIsSavingShipping(true);
                  try {
                    await saveAllGovernorates(editableGovernorates);
                    await updateSettings({
                      quantityShippingEnabled,
                      quantityShippingMinItems: Math.max(1, Number(quantityShippingMinItems) || 2),
                      quantityShippingCost: Math.max(0, Number(quantityShippingCost) || 0)
                    });
                    setHasUnsavedShippingChanges(false);
                  } catch (err) {
                    console.error('Error saving shipping:', err);
                  } finally {
                    setIsSavingShipping(false);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                  hasUnsavedShippingChanges
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSavingShipping
                    ? 'جاري الحفظ...'
                    : hasUnsavedShippingChanges
                    ? 'حفظ التعديلات'
                    : 'الأسعار محفوظة'}
                </span>
              </button>
            </div>
          </div>

          {/* Quantity-Based Shipping Offer Control */}
          <div className="bg-stone-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-stone-100">
                    عرض الشحن حسب عدد القطع (تحفيز زيادة المشتريات)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      quantityShippingEnabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {quantityShippingEnabled ? 'مفعل حالياً' : 'معطل'}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  مثال: عند شراء قطعتين أو أكثر، يحصل العميل على شحن مجاني (0 ج.م) أو شحن مخفض
                </p>
              </div>

              <button
                id="toggle-quantity-shipping-btn"
                type="button"
                onClick={async () => {
                  const nextState = !quantityShippingEnabled;
                  setQuantityShippingEnabled(nextState);
                  setIsSavingQtyShipping(true);
                  try {
                    await updateSettings({
                      quantityShippingEnabled: nextState,
                      quantityShippingMinItems: Math.max(1, Number(quantityShippingMinItems) || 2),
                      quantityShippingCost: Math.max(0, Number(quantityShippingCost) || 0)
                    });
                  } finally {
                    setIsSavingQtyShipping(false);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  quantityShippingEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                }`}
              >
                {quantityShippingEnabled ? 'تعطيل العرض (إيقاف)' : 'تفعيل العرض الآن'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-800/80">
              {/* Minimum Quantity Input */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-stone-300">
                  الحد الأدنى لعدد القطع
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, (Number(quantityShippingMinItems) || 2) - 1);
                      setQuantityShippingMinItems(String(next));
                    }}
                    className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    id="quantity-shipping-min-items-input"
                    type="number"
                    min="1"
                    value={quantityShippingMinItems}
                    onChange={(e) => setQuantityShippingMinItems(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-amber-400 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, (Number(quantityShippingMinItems) || 2) + 1);
                      setQuantityShippingMinItems(String(next));
                    }}
                    className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">الموصى به: 2 قطع فأكثر</p>
              </div>

              {/* Shipping Cost Input */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-stone-300">
                  سعر الشحن المطبق (ج.م)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="quantity-shipping-cost-input"
                    type="number"
                    min="0"
                    value={quantityShippingCost}
                    onChange={(e) => setQuantityShippingCost(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantityShippingCost('0')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 text-[11px] font-bold shrink-0"
                  >
                    0 (مجاني)
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">اجعلها 0 ليكون الشحن مجانياً بالكامل</p>
              </div>

              {/* Save & Quick Apply */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                <div className="text-xs text-stone-300">
                  <span className="text-stone-400">ملخص العرض: </span>
                  <span className="font-bold text-amber-400">
                    عند طلب {Math.max(1, Number(quantityShippingMinItems) || 2)} قطع فأكثر، يكون الشحن{' '}
                    {Number(quantityShippingCost) === 0 ? 'مجاني (0 ج.م)' : `${Number(quantityShippingCost) || 0} ج.م`}
                  </span>
                </div>
                <button
                  id="save-quantity-shipping-btn"
                  type="button"
                  disabled={isSavingQtyShipping}
                  onClick={async () => {
                    setIsSavingQtyShipping(true);
                    try {
                      await updateSettings({
                        quantityShippingEnabled: true,
                        quantityShippingMinItems: Math.max(1, Number(quantityShippingMinItems) || 2),
                        quantityShippingCost: Math.max(0, Number(quantityShippingCost) || 0)
                      });
                      setQuantityShippingEnabled(true);
                    } finally {
                      setIsSavingQtyShipping(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingQtyShipping ? 'جاري الحفظ...' : 'حفظ وتفعيل العرض'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Bulk Tools */}
          <div className="bg-stone-900/60 border border-stone-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>أدوات الضبط السريع:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Uniform rate tool */}
              <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl p-1.5">
                <span className="text-xs text-stone-400 pr-2">سعر موحد:</span>
                <input
                  id="bulk-shipping-rate-input"
                  type="number"
                  placeholder="مثال: 60"
                  value={bulkRateInput}
                  onChange={(e) => setBulkRateInput(e.target.value)}
                  className="w-20 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-mono text-center focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const rate = Number(bulkRateInput);
                    if (isNaN(rate) || rate < 0) return;
                    setEditableGovernorates((prev) =>
                      prev.map((g) => ({ ...g, cost: rate }))
                    );
                    setHasUnsavedShippingChanges(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
                >
                  تطبيق للكل
                </button>
              </div>

              {/* Preset 1: Cairo & Giza 45 / Rest 65 */}
              <button
                type="button"
                onClick={() => {
                  setEditableGovernorates((prev) =>
                    prev.map((g) => {
                      if (g.name.includes('القاهرة') || g.name.includes('الجيزة')) {
                        return { ...g, cost: 45 };
                      }
                      if (g.name.includes('القليوبية') || g.name.includes('الإسكندرية')) {
                        return { ...g, cost: 50 };
                      }
                      return { ...g, cost: 65 };
                    })
                  );
                  setHasUnsavedShippingChanges(true);
                }}
                className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs border border-stone-800 transition-colors"
              >
                القاهرة والجيزة (45) / المحافظات (65)
              </button>

              {/* Preset 2: Free Shipping */}
              <button
                type="button"
                onClick={() => {
                  setEditableGovernorates((prev) =>
                    prev.map((g) => ({ ...g, cost: 0 }))
                  );
                  setHasUnsavedShippingChanges(true);
                }}
                className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-emerald-400 text-xs border border-stone-800 transition-colors"
              >
                شحن مجاني لكل مصر (0 ج.م)
              </button>

              {/* Reset to Default */}
              <button
                type="button"
                onClick={() => {
                  setEditableGovernorates(INITIAL_GOVERNORATES);
                  setHasUnsavedShippingChanges(true);
                }}
                className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-rose-400 text-xs border border-stone-800 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط المصنع</span>
              </button>
            </div>
          </div>

          {/* Search & Add New Area */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search filter */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="shipping-search-input"
                type="text"
                placeholder="ابحث عن محافظة (مثال: الإسكندرية...)"
                value={shippingSearch}
                onChange={(e) => setShippingSearch(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl pr-9 pl-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:border-amber-500"
              />
            </div>

            {/* Add custom shipping zone */}
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl p-1.5">
              <input
                type="text"
                placeholder="اسم المنطقة..."
                value={newGovName}
                onChange={(e) => setNewGovName(e.target.value)}
                className="w-32 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500"
              />
              <input
                type="number"
                placeholder="السعر"
                value={newGovCost}
                onChange={(e) => setNewGovCost(e.target.value)}
                className="w-16 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono text-center focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newGovName.trim();
                  if (!trimmed) return;
                  if (editableGovernorates.some((g) => g.name === trimmed)) {
                    alert('هذه المنطقة موجودة بالفعل في القائمة.');
                    return;
                  }
                  setEditableGovernorates((prev) => [
                    ...prev,
                    { name: trimmed, cost: Number(newGovCost) || 60 }
                  ]);
                  setNewGovName('');
                  setHasUnsavedShippingChanges(true);
                }}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة منطقة</span>
              </button>
            </div>
          </div>

          {/* Governorates Table */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-right text-xs text-stone-300">
                <thead className="sticky top-0 bg-stone-950 text-stone-400 uppercase text-[11px] border-b border-stone-800 z-10">
                  <tr>
                    <th className="p-3.5">المحافظة / المنطقة</th>
                    <th className="p-3.5 text-center">تكلفة الشحن (ج.م)</th>
                    <th className="p-3.5 text-center">حفظ فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {editableGovernorates
                    .filter((gov) =>
                      shippingSearch.trim()
                        ? gov.name.toLowerCase().includes(shippingSearch.toLowerCase().trim())
                        : true
                    )
                    .map((gov) => (
                      <tr key={gov.name} className="hover:bg-stone-900/90 transition-colors">
                        <td className="p-3.5 font-bold text-stone-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{gov.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {/* -10 button */}
                            <button
                              type="button"
                              onClick={() => {
                                const newCost = Math.max(0, gov.cost - 10);
                                setEditableGovernorates((prev) =>
                                  prev.map((g) => (g.name === gov.name ? { ...g, cost: newCost } : g))
                                );
                                setHasUnsavedShippingChanges(true);
                              }}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center transition-colors"
                              title="تقليل 10 ج.م"
                            >
                              -
                            </button>
                            {/* Manual Number Input */}
                            <input
                              id={`shipping-rate-${gov.name}`}
                              type="number"
                              min="0"
                              value={gov.cost}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditableGovernorates((prev) =>
                                  prev.map((g) =>
                                    g.name === gov.name ? { ...g, cost: isNaN(val) ? 0 : val } : g
                                  )
                                );
                                setHasUnsavedShippingChanges(true);
                              }}
                              className="w-20 bg-stone-950 border border-stone-700 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-bold text-center"
                            />
                            {/* +10 button */}
                            <button
                              type="button"
                              onClick={() => {
                                const newCost = gov.cost + 10;
                                setEditableGovernorates((prev) =>
                                  prev.map((g) => (g.name === gov.name ? { ...g, cost: newCost } : g))
                                );
                                setHasUnsavedShippingChanges(true);
                              }}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center transition-colors"
                              title="زيادة 10 ج.م"
                            >
                              +
                            </button>
                            <span className="text-[11px] text-stone-500">ج.م</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              await updateGovernorateCost(gov.name, gov.cost, gov.deliveryDays);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-[11px] font-bold border border-stone-700 transition-colors"
                            title="حفظ سعر هذه المحافظة فوراً"
                          >
                            حفظ
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STORE & SOCIAL MEDIA SETTINGS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6 max-w-3xl"
        >
          <div>
            <h3 className="text-base font-bold text-stone-100">إعدادات وهوية المتجر</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              تحكم باسم المتجر، الشعار المعتمد، وروابط السوشيال ميديا
            </p>
          </div>

          <div className="space-y-5">
            {/* Brand & Notification Logo Upload Section */}
            <div className="p-5 rounded-2xl bg-stone-950/90 border border-stone-800 space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-amber-400">
                    شعار المتجر وإشعارات الهاتف (Brand & Notification Logo)
                  </label>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    هذا الشعار يظهر في أعلى المتجر وفي شريط التنقل، وأيضاً يظهر في إشعارات طلبات الموبايل كشعار رسمي لـ Beyond
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Logo Preview */}
                <div className="w-20 h-20 rounded-2xl bg-stone-900 border-2 border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative group">
                  <img
                    src={brandLogo || '/beyond-logo.jpg'}
                    alt="Brand Logo Preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/beyond-logo.jpg';
                    }}
                  />
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] shadow font-black">
                    ✓
                  </span>
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <button
                      id="admin-upload-brand-logo-btn"
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع لوجو من جهازك</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandLogo('/beyond-logo.jpg')}
                      className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="استعادة لوجو Beyond الأصلي"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>لوجو Beyond الأصلي</span>
                    </button>
                    {brandLogo && (
                      <button
                        type="button"
                        onClick={() => setBrandLogo('')}
                        className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف اللوجو</span>
                      </button>
                    )}
                  </div>
                  {/* Image URL input */}
                  <div>
                    <input
                      id="brand-logo-url-input"
                      type="url"
                      placeholder="أو أدخل رابط اللوجو مباشرة (URL)..."
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Realistic Notification Mockup with this logo */}
              <div className="mt-3 pt-3 border-t border-stone-800/80">
                <p className="text-[11px] font-bold text-stone-300 mb-2 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>معاينة الإشعار على شاشة قفل الموبايل بهذا الشعار:</span>
                </p>

                <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 shadow-md max-w-md">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-amber-500/40 shrink-0 flex items-center justify-center">
                    <img
                      src={brandLogo || '/beyond-logo.jpg'}
                      alt="Notification Logo"
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/beyond-logo.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-amber-400 truncate">
                        {storeName || 'Beyond'} • متجر بيوند
                      </span>
                      <span className="text-[10px] text-stone-500 shrink-0">الآن</span>
                    </div>
                    <p className="text-xs text-stone-100 font-bold mt-0.5">
                      طلب جديد وارد! 🔔 • أحمد محمود
                    </p>
                    <p className="text-[11px] text-amber-400 font-bold">
                      الإجمالي: 890 ج.م
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSendingTestPush}
                    onClick={async () => {
                      setIsSendingTestPush(true);
                      if (soundNotificationOn) {
                        try {
                          playOrderNotificationSound();
                        } catch {}
                      }
                      try {
                        const activeLogo = brandLogo || '/beyond-logo.jpg';
                        await testPhoneNotification(pushTopic, activeLogo);
                        setTestPushMessage(`تم إرسال إشعار التجربة بنجاح بالشعار المحدد!`);
                      } catch {
                        setTestPushMessage('تعذر إرسال الإشعار التجريبي');
                      } finally {
                        setIsSendingTestPush(false);
                        setTimeout(() => setTestPushMessage(''), 7000);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>إرسال إشعار تجريبي للشاشة الآن</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">اسم المتجر</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">نص الشريط الإعلاني العلوي</label>
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="coming-soon-enabled"
                  type="checkbox"
                  checked={comingSoonEnabled}
                  onChange={(e) => setComingSoonEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-800 bg-stone-950 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="coming-soon-enabled" className="text-xs text-stone-200 font-bold cursor-pointer">
                  تفعيل قسم &quot;قريباً في المتجر&quot; بالصفحة الرئيسية
                </label>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">عنوان قسم قريباً</label>
                <input
                  type="text"
                  value={comingSoonTitle}
                  onChange={(e) => setComingSoonTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">الوصف الفرعي لقسم قريباً</label>
                <input
                  type="text"
                  value={comingSoonSubtitle}
                  onChange={(e) => setComingSoonSubtitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">
                رقم الواتساب لاستقبال الاستفسارات (مثال: 201012345678)
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
              />
            </div>

            {/* Social Media Links Section */}
            <div className="pt-3 border-t border-stone-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400">
                روابط حسابات التواصل الاجتماعي (تظهر في الفوتر)
              </h4>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-rose-400" />
                  <span>رابط إنستغرام (Instagram URL)</span>
                </label>
                <input
                  id="settings-instagram-input"
                  type="url"
                  placeholder="https://instagram.com/your_account"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط واتساب (WhatsApp URL)</span>
                </label>
                <input
                  id="settings-whatsapp-input"
                  type="url"
                  placeholder="https://wa.me/201012345678"
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-cyan-400 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.87-4.47V8.52a8.27 8.27 0 0 0 4.9 1.62V6.69z" />
                  </svg>
                  <span>رابط تيك توك (TikTok URL)</span>
                </label>
                <input
                  id="settings-tiktok-input"
                  type="url"
                  placeholder="https://tiktok.com/@your_account"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-400" />
                  <span>رابط فيسبوك (Facebook URL)</span>
                </label>
                <input
                  id="settings-facebook-input"
                  type="url"
                  placeholder="https://facebook.com/your_page"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Mobile Push & Lock-Screen Notifications Configuration */}
            <div className="pt-3 border-t border-stone-800 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-400">
                  إعدادات إشعارات الطلبات على شاشة القفل وتطبيق الهاتف
                </h4>
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center justify-between">
                  <span>اسم قناة الإشعارات (ntfy Topic)</span>
                  <span className="text-[10px] text-stone-500">للاستقبال عبر تطبيق ntfy المجاني</span>
                </label>
                <input
                  id="settings-push-topic-input"
                  type="text"
                  placeholder="beyond_orders_alerts"
                  value={pushTopic}
                  onChange={(e) => setPushTopicState(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono focus:border-amber-500"
                  dir="ltr"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  يمكنك الاشتراك في هذا الاسم من تطبيق ntfy على آيفون أو أندرويد لتصلك رنة عالية فور كل طلب.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Telegram Bot Token (اختياري)</span>
                  </label>
                  <input
                    id="settings-telegram-token-input"
                    type="text"
                    placeholder="مثال: 123456789:ABCdef..."
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:border-amber-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                    <span>Telegram Chat ID (اختياري)</span>
                  </label>
                  <input
                    id="settings-telegram-chatid-input"
                    type="text"
                    placeholder="مثال: 987654321"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:border-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              id="save-settings-btn"
              type="submit"
              disabled={isSavingSettings || isProcessingImages}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs shadow-md shadow-amber-950/40 flex items-center gap-2"
            >
              {isSavingSettings ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>حفظ التعديلات</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: SECURITY & CREDENTIALS */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-4xl animate-in fade-in">
          {/* Section 1: Admin Team Management */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>فريق مسؤولي المتجر</span>
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  الحسابات المصرح لها بدخول لوحة التحكم وإدارة الطلبات والمنتجات
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddAdminError('');
                  setShowAddAdminModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-950/40 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مسؤول جديد</span>
              </button>
            </div>

            {adminTeamSuccess && (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adminTeamSuccess}</span>
              </p>
            )}

            {isLoadingAdminUsers ? (
              <div className="py-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>جاري تحميل الحسابات...</span>
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-950/40 rounded-xl border border-stone-800/60">
                لا توجد حسابات مسؤولين مسجلة بعد.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adminUsers.map((u) => {
                  const isOwner = u.isOwner;
                  return (
                    <div
                      key={u.uid}
                      className="bg-stone-950/80 border border-stone-800/80 hover:border-stone-700 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-stone-100 truncate">
                            {u.displayName || 'مسؤول متجر'}
                          </span>
                          {isOwner ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold shrink-0">
                              المالك الرئيسي
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                              مسؤول معتمد
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-stone-300 truncate" dir="ltr">
                          {u.email}
                        </p>
                        {u.creationTime && (
                          <p className="text-[10px] text-stone-500">
                            تاريخ الإنشاء: {new Date(u.creationTime).toLocaleDateString('ar-EG')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-stone-900 text-[11px]">
                        {!isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAdminPrompt(u.uid, u.email)}
                            className="text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-950/40 transition-colors flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف المسؤول</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Change Password */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>تغيير كلمة مرور الحساب الحالي</span>
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                تحديث بيانات تسجيل الدخول المشفرة الخاصة بحسابك في Firebase Auth
              </p>
            </div>

            <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">الحساب الحالي:</span>
                <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
                  {adminCredentials.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">حالة التشفير:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مشفر ومحمي عبر خوادم Firebase الرسمية
                </span>
              </div>
            </div>

            <form onSubmit={handleChangeCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  id="security-new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة (6 أحرف فأكثر)"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  id="security-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور للتأكيد"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {securityError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/40">
                  {securityError}
                </p>
              )}

              {securitySuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40">
                  {securitySuccess}
                </p>
              )}

              <div className="pt-2">
                <button
                  id="save-security-credentials-btn"
                  type="submit"
                  disabled={isUpdatingCreds}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs transition-colors shadow-md shadow-amber-950/40 disabled:opacity-50"
                >
                  {isUpdatingCreds ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-sm text-stone-100">إضافة مسؤول جديد للمتجر</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAdminModal(false)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              سيتم إنشاء الحساب في Firebase Auth ومنحه صلاحية الإدارة (Admin Claim) للوصول للوحة التحكم.
            </p>

            <form onSubmit={handleCreateAdminUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  الاسم المعروض للمسؤول
                </label>
                <input
                  type="text"
                  required
                  value={newAdminDisplayName}
                  onChange={(e) => setNewAdminDisplayName(e.target.value)}
                  placeholder="مثال: محمد أحمد"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {addAdminError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/40">
                  {addAdminError}
                </p>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs transition-colors shadow-lg shadow-amber-950/40 disabled:opacity-50"
                >
                  {isSubmittingAdmin ? 'جاري الإنشاء...' : 'إضافة المسؤول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div
            id="admin-edit-product-modal"
            className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl relative my-6 max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-100">
                    تعديل بيانات الهودي: {editingProduct.name}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    تحديث السعر، الصور، والمخزون لكل مقاس ولون
                  </p>
                </div>
              </div>
              <button
                id="close-edit-product-modal-btn"
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
                title="إلغاء التعديل"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleSaveProductEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">اسم الهودي</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Product Subtitle */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الوصف الفرعي (العنوان الترويجي)</label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">السعر الحالي (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">
                    السعر قبل الخصم (ج.م - اختياري)
                  </label>
                  <input
                    type="number"
                    placeholder="بدون خصم"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">التصنيف</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as HoodieCategory)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="oversized">أوفر سايز (Oversized)</option>
                    <option value="basic">بيزك كلاسيك (Basic)</option>
                    <option value="zipup">سوستة كاملة (Zip-Up)</option>
                  </select>
                </div>

                {/* Badge */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">شارة مميزة (Badge اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: خصم 20%"
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Featured Checkbox */}
                <div className="sm:col-span-2 flex items-center gap-2 py-1">
                  <input
                    id="edit-is-featured"
                    type="checkbox"
                    checked={editIsFeatured}
                    onChange={(e) => setEditIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-800 bg-stone-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="edit-is-featured" className="text-xs text-stone-300 cursor-pointer">
                    تمييز القطعة في المجموعة الرئيسية (Featured)
                  </label>
                </div>

                {/* Coming Soon Checkbox */}
                <div className="sm:col-span-2 flex items-center gap-2 py-1">
                  <input
                    id="edit-coming-soon"
                    type="checkbox"
                    checked={editComingSoon}
                    onChange={(e) => setEditComingSoon(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-800 bg-stone-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="edit-coming-soon" className="text-xs text-stone-300 cursor-pointer">
                    عرض كـ &quot;قريباً&quot; (لا يمكن شراؤه حالياً)
                  </label>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-300 font-medium mb-1">الوصف</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Fabric */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الخامة</label>
                  <input
                    type="text"
                    value={editFabric}
                    onChange={(e) => setEditFabric(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Fit */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">القصة (Fit)</label>
                  <input
                    type="text"
                    value={editFit}
                    onChange={(e) => setEditFit(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Weight Range */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الوزن المناسب</label>
                  <input
                    type="text"
                    value={editWeightRange}
                    onChange={(e) => setEditWeightRange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Care Instructions */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">تعليمات الغسيل</label>
                  <input
                    type="text"
                    value={editCare}
                    onChange={(e) => setEditCare(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Stock & Colors Management in Edit Form */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                        <Palette className="w-4 h-4" />
                        <span>ألوان ومقاسات الهودي:</span>
                      </label>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        حدد الكمية المتاحة لكل مقاس (M, L, XL, 2XL) داخل كل لون على حدة
                      </p>
                    </div>
                    {editColors.length > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        إجمالي المخزون: {editTotalStock} قطعة
                      </span>
                    )}
                  </div>

                  {/* Summary of computed totals per size across all colors */}
                  {editColors.length > 0 && (
                    <div className="bg-stone-900/80 border border-stone-800/90 rounded-xl p-2.5">
                      <span className="text-[11px] text-stone-400 block mb-1">
                        إجمالي المخزون التراكمي لجميع الألوان حسب المقاس:
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center font-mono">
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس M</span>
                          <span className="text-xs font-bold text-stone-200">{editComputedStock.M}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس L</span>
                          <span className="text-xs font-bold text-stone-200">{editComputedStock.L}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس XL</span>
                          <span className="text-xs font-bold text-stone-200">{editComputedStock.XL}</span>
                        </div>
                        <div className="bg-stone-950/80 border border-stone-800 rounded p-1">
                          <span className="text-[10px] text-stone-500 block">مقاس 2XL</span>
                          <span className="text-xs font-bold text-stone-200">{editComputedStock['2XL']}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of current colors */}
                  {editColors.length > 0 ? (
                    <div className="space-y-3">
                      {editColors.map((clr, idx) => {
                        const colorTotal = Object.values(clr.sizesStock || {}).reduce(
                          (a, b) => Number(a) + (Number(b) || 0),
                          0
                        );
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-stone-700 inline-block shrink-0 shadow-inner"
                                  style={{ backgroundColor: clr.hex }}
                                />
                                <span className="font-bold text-xs text-stone-100">{clr.name}</span>
                                <span className="text-[10px] text-stone-500 font-mono">({clr.hex})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  مخزون اللون: {colorTotal}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditColor(idx)}
                                  className="text-stone-500 hover:text-rose-400 p-1 rounded-lg hover:bg-stone-800 transition-colors"
                                  title="حذف هذا اللون"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Quantity per size for this color */}
                            <div className="pt-2 border-t border-stone-800/80">
                              <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
                                حدد مخزون كل مقاس لهذا اللون ({clr.name})
                              </span>
                              <div className="grid grid-cols-4 gap-2">
                                {(['M', 'L', 'XL', '2XL'] as HoodieSize[]).map((sz) => (
                                  <div
                                    key={sz}
                                    className="bg-stone-950/80 border border-stone-800 rounded-lg p-1.5 text-center"
                                  >
                                    <span className="text-[10px] text-stone-400 block font-bold mb-0.5">
                                      مقاس {sz}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={clr.sizesStock?.[sz] ?? 0}
                                      onChange={(e) =>
                                        handleUpdateEditColorSizeStock(idx, sz, Number(e.target.value))
                                      }
                                      className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">لا توجد ألوان محددة لهذا الهودي.</p>
                  )}

                  {/* Add New Color Section */}
                  <div className="pt-3 border-t border-stone-800/80 space-y-2.5">
                    <span className="text-xs text-amber-400 font-bold block">
                      + إضافة لون جديد للهودي:
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="اسم اللون الجديد"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1">
                          <input
                            type="color"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-[11px] font-mono text-stone-400">{newColorHex}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end gap-2">
                      <div className="grid grid-cols-4 gap-2 flex-1 w-full">
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون M:</span>
                          <input
                            type="number"
                            min="0"
                            value={newColorStockM}
                            onChange={(e) => setNewColorStockM(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون L:</span>
                          <input
                            type="number"
                            min="0"
                            value={newColorStockL}
                            onChange={(e) => setNewColorStockL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون XL:</span>
                          <input
                            type="number"
                            min="0"
                            value={newColorStockXL}
                            onChange={(e) => setNewColorStockXL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block mb-0.5">مخزون 2XL:</span>
                          <input
                            type="number"
                            min="0"
                            value={newColorStock2XL}
                            onChange={(e) => setNewColorStock2XL(Number(e.target.value))}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-1.5 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditColor}
                        disabled={!newColorName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-black flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Images Management */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>صور الهودي ({editImages.length} صور):</span>
                    </label>
                    <button
                      type="button"
                      disabled={isProcessingImages}
                      onClick={() => editProductFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 border border-dashed border-amber-500/50 hover:border-amber-400 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isProcessingImages ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>جاري الرفع...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>إضافة صور من جهازك</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    ref={editProductFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditProductImageUploadFromDevice}
                    className="hidden"
                  />

                  {/* Thumbnails grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                    {editImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] rounded-xl overflow-hidden border border-stone-800 bg-stone-950 group shadow-sm"
                      >
                        <img
                          src={img}
                          alt={`صورة الهودي ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow transition-all opacity-90 hover:opacity-100"
                          title="حذف الصورة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-amber-400 font-bold">
                            الرئيسية
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold transition-colors"
                >
                  إلغاء التراجع
                </button>
                <button
                  id="save-edit-product-btn"
                  type="submit"
                  disabled={isSavingProduct || isProcessingImages}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold transition-colors shadow-md shadow-amber-950/40 flex items-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER ITEM INSPECTION & PRINT VERIFICATION MODAL */}
      {inspectingOrderItem && (() => {
        const item = inspectingOrderItem.item;
        const matchingProduct = products.find((p) => p.id === item.productId);
        const imagesList = Array.from(
          new Set([
            ...(item.images && item.images.length > 0 ? item.images : []),
            item.image,
            ...(matchingProduct?.images || [])
          ])
        ).filter(Boolean) as string[];
        const currentImg = imagesList[inspectingImageIndex] || imagesList[0] || '';
        const printSubtitle = item.subtitle || matchingProduct?.subtitle;
        const colorName = item.colorName || (matchingProduct?.colors && matchingProduct.colors[0]?.name);
        const colorHex = item.colorHex || (matchingProduct?.colors && matchingProduct.colors[0]?.hex) || '#171717';
        const currentStock = matchingProduct?.sizesStock?.[item.size];

        return (
          <div
            id="order-item-inspection-modal"
            className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setInspectingOrderItem(null)}
          >
            <div
              className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                      <span>تفاصيل القطعة والطلب</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        #{inspectingOrderItem.orderNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      العميل: <strong className="text-stone-200">{inspectingOrderItem.customerName}</strong> • {inspectingOrderItem.orderDate}
                    </p>
                  </div>
                </div>
                <button
                  id="close-order-inspection-modal-btn"
                  type="button"
                  onClick={() => setInspectingOrderItem(null)}
                  className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Image with gallery switcher */}
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner group">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-600">
                          <ImageIcon className="w-12 h-12 mb-2" />
                          <span className="text-xs">لا توجد صورة متوفرة</span>
                        </div>
                      )}

                      {/* Print Overlay Badge */}
                      {printSubtitle && (
                        <div className="absolute bottom-2 inset-x-2 bg-stone-950/90 backdrop-blur-md border border-stone-800 p-2 rounded-xl text-center shadow-lg">
                          <span className="text-[10px] text-stone-400 block">طبعة الهودي:</span>
                          <span className="text-xs font-bold text-amber-400">{printSubtitle}</span>
                        </div>
                      )}
                    </div>

                    {/* Image thumbnails if multiple */}
                    {imagesList.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {imagesList.map((imgUrl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setInspectingImageIndex(i)}
                            className={`w-14 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                              (inspectingImageIndex === i || (!imagesList[inspectingImageIndex] && i === 0))
                                ? 'border-amber-500 scale-105 shadow-md shadow-amber-950/50'
                                : 'border-stone-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`صورة ${i + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Exact Specifications */}
                  <div className="space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Product Name & Subtitle */}
                      <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-2xl space-y-1.5">
                        <div className="text-[11px] text-stone-400 font-semibold">اسم الموديل:</div>
                        <h4 className="text-base font-black text-stone-100">{item.productName}</h4>
                        {printSubtitle ? (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-2">
                            <span>طبعة خاصة:</span>
                            <span>طبعة <strong>{printSubtitle}</strong></span>
                          </div>
                        ) : (
                          <div className="text-xs text-stone-400">
                            قصة كلاسيكية بدون طبعة خاصة
                          </div>
                        )}
                      </div>

                      {/* Color & Size & Quantity Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Chosen Color */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">اللون المختار:</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-stone-600 shadow-sm shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                            <span className="font-bold text-xs text-stone-100">
                              {colorName || 'افتراضي'}
                            </span>
                          </div>
                        </div>

                        {/* Chosen Size */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">المقاس المطلوب:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 font-black font-mono text-xs">
                              {item.size}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {item.size === 'M' ? 'وسط' : item.size === 'L' ? 'كبير' : item.size === 'XL' ? 'كبير جداً' : '2 إكس'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">الكمية:</span>
                          <div className="font-mono font-black text-sm text-amber-400">
                            {item.quantity} {item.quantity > 1 ? 'قطع' : 'قطعة'}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">الإجمالي للقطعة:</span>
                          <div className="font-mono font-black text-sm text-emerald-400">
                            {item.price * item.quantity} ج.م
                          </div>
                        </div>
                      </div>

                      {/* Catalog Inventory Match Status */}
                      {matchingProduct && (
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                            <span>المخزون الحالي بالمستودع ({item.size}):</span>
                            <strong className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                              (currentStock ?? 0) > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            }`}>
                              {currentStock ?? 0} قطع متبقية
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Close Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setInspectingOrderItem(null)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-950/30"
                      >
                        <Check className="w-4 h-4" />
                        <span>تمت مراجعة القطعة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
