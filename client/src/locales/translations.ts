export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    // Top Bar & General
    appName: 'FundWise',
    greetingMorning: 'صباح الفل يا',
    greetingEvening: 'مساء الفل يا',
    greetingGeneral: 'أهلاً يا',
    currency: 'جنيه',
    currencySymbol: 'ج.م',
    egpFull: 'جنيه مصري (EGP)',
    switchLanguage: 'English 🇬🇧',
    currentLanguageName: 'عربي (بالمصري 🇪🇬)',

    // Bottom Navigation
    navHome: 'الرئيسية',
    navTransactions: 'المصاريف',
    navVoice: 'بالصوت',
    navInsights: 'التحليلات',
    navSettings: 'الإعدادات',

    // Dashboard
    spentThisMonth: 'صرفت الشهر ده',
    spentVsLastMonth: 'مقارنة بالشهر اللي فات',
    topSpendingCategory: 'أكتر حاجة صرفت فيها',
    quickActions: 'سجّل مصروفك بسرعة',
    recentTransactions: 'آخر الحركات والمصاريف',
    viewAll: 'عرض الكل',
    noTransactionsYet: 'لسه مفيش مصاريف متسجلة، ابدأ سجّل أول حركة دلوقتي!',
    today: 'النهاردة',
    yesterday: 'امبارح',

    // Quick Action Buttons
    actionVoice: 'سجّل بالصوت',
    actionReceipt: 'صوّر فاتورة',
    actionQr: 'امسح QR',
    actionManual: 'إدخال يدوي',

    // Categories (Egyptian Natural Phrasing)
    catFoodDrink: 'أكل وشرب ومطاعم',
    catGroceries: 'طلبات البيت وسوبرماركت',
    catTransport: 'مواصلات وبنزين وأوبر',
    catBills: 'فواتير وشحن رصيد',
    catShopping: 'شوبينج ولبس',
    catEntertainment: 'خروجات وفسح',
    catHealth: 'صيدلية ودكاترة',
    catEducation: 'كورسات وتعليم',
    catOther: 'مصاريف تانية',

    // Voice Page
    voiceTitle: 'تسجيل المصروف بالصوت',
    voiceTapToSpeak: 'اضغط على المايك واتكلم',
    voiceListening: 'سامعك دلوقتي.. اتكلم براحتك',
    voiceProcessing: 'الذكاء الاصطناعي بيحلل كلامك...',
    voiceDone: 'تم فهم وتجهيز المصروف!',
    voiceMicBlocked: 'الميكروفون محظور في المتصفح',
    voiceUnsupported: 'المتصفح مش داعم تسجيل الصوت، ممكن تكتب تحت',
    voiceHint: 'قول مثلاً: "دفعت 450 جنيه في كارفور" أو "ركبت أوبر بـ 60 جنيه"',
    voiceHeardSoFar: 'اللي اتقال لحد دلوقتي:',
    voiceOrType: 'أو اكتب هنا بالعامية: دفعت كام وفين...',
    voiceConfirmBtn: 'كمّل عشان تحفظ المصروف',
    voiceRecordAnother: 'سجّل حركة تانية',
    voiceAiActiveBadge: 'الذكاء الاصطناعي بيفهم العامية المصرية',

    // Receipt Page
    receiptTitle: 'مسح وقراءة الفاتورة',
    receiptSubtitle: 'صوّر الوصل أو ارفعه وهيطلع لك اسم المحل والإجمالي والتصنيف في ثانية بالذكاء الاصطناعي',
    receiptTakePhoto: 'صوّر بالكاميرا',
    receiptUploadGallery: 'اختر من الصور',
    receiptReading: 'جاري قراءة الفاتورة...',
    receiptSuccess: 'تم مسح الفاتورة بنجاح!',
    receiptMerchant: 'اسم المحل / المتجر',
    receiptTotalAmount: 'الإجمالي المدفوع',
    receiptCategory: 'التصنيف التلقائي',
    receiptContinueBtn: 'كمّل عشان تحفظ المصروف',
    receiptScanAnother: 'صوّر فاتورة تانية',
    receiptViewRaw: 'عرض تفاصيل النص المستخرج',
    receiptAiActiveBadge: 'رؤية الذكاء الاصطناعي نشطة (+98% دقة)',
    receiptOfflineTip: 'تحب دقة 98%؟ ضيف مفتاح Gemini المجاني من الإعدادات',

    // QR Page
    qrTitle: 'مسح كود QR',
    qrSubtitle: 'وجّه الكاميرا لكود الدفع أو ارفع صورة الباركود من موبايلك',
    qrStartCamera: 'تشغيل الكاميرا',
    qrStopCamera: 'إيقاف الكاميرا',
    qrUploadImage: 'رفع صورة QR',
    qrDetected: 'تم التقاط كود الدفع بنجاح',

    // Manual Entry
    manualTitle: 'تسجيل مصروف يدوي',
    manualMerchantLabel: 'صرفت فين؟ (اسم المحل أو الخدمة)',
    manualMerchantPlaceholder: 'مثال: كارفور، أوبر، فودافون، ستاربكس...',
    manualAmountLabel: 'المبلغ (بالجنيه)',
    manualCategoryLabel: 'التصنيف',
    manualDateLabel: 'التاريخ',
    manualNotesLabel: 'ملاحظات (اختياري)',
    manualNotesPlaceholder: 'تفاصيل إضافية عن المصروف...',
    manualSaveBtn: 'حفظ المصروف دلوقتي',

    // Insights
    insightsTitle: 'ملخص وتحليلات مصاريفك',
    insightsTotalSpent: 'إجمالي المصاريف',
    insightsBreakdown: 'توزيع المصاريف حسب الفئات',
    insightsMonthlyTrend: 'حركة الصرف على مدار الشهر',
    insightsNoData: 'لسه مفيش بيانات كافية للتحليل',

    // Settings
    settingsTitle: 'الإعدادات',
    settingsAiSection: 'الذكاء الاصطناعي ومفاتيح الربط',
    settingsAiDesc: 'فعل دقة 98% لقراءة الفواتير وفهم اللهجة المصرية. المفاتيح بتتحفظ بأمان في متصفحك.',
    settingsGeminiLabel: 'مفتاح Google Gemini API',
    settingsGeminiHint: 'مجاني 100% حتى 15 طلب/دقيقة. بيفهم الفواتير والعامية بذكاء فائق.',
    settingsOpenaiLabel: 'مفتاح OpenAI API (اختياري)',
    settingsSaveKeys: 'حفظ مفاتيح الـ AI',
    settingsSavedNotice: 'تم الحفظ بنجاح! 🚀',
    settingsClearKeys: 'مسح المفاتيح',
    settingsPreferences: 'التفضيلات والشكل',
    settingsDarkMode: 'المظهر الداكن (Dark Mode)',
    settingsLanguage: 'لغة التطبيق',
    settingsAbout: 'عن التطبيق',
    settingsLogout: 'تسجيل الخروج',
    settingsAdminWorkspace: 'لوحة تحكم الإدارة',
    settingsAdminDesc: 'متابعة نشاط المستخدمين وعمليات الذكاء الاصطناعي في المنصة.',
    settingsAdminBtn: 'فتح لوحة الإدارة',
  },

  en: {
    // Top Bar & General
    appName: 'FundWise',
    greetingMorning: 'Good morning,',
    greetingEvening: 'Good evening,',
    greetingGeneral: 'Hello,',
    currency: 'EGP',
    currencySymbol: '£',
    egpFull: 'Egyptian Pound (EGP)',
    switchLanguage: 'عربي (بالمصري 🇪🇬)',
    currentLanguageName: 'English 🇬🇧',

    // Bottom Navigation
    navHome: 'Home',
    navTransactions: 'Expenses',
    navVoice: 'Voice',
    navInsights: 'Insights',
    navSettings: 'Settings',

    // Dashboard
    spentThisMonth: 'Spent This Month',
    spentVsLastMonth: 'vs last month',
    topSpendingCategory: 'Top Category',
    quickActions: 'Quick Capture',
    recentTransactions: 'Recent Transactions',
    viewAll: 'See all',
    noTransactionsYet: 'No transactions yet. Start capturing your first expense!',
    today: 'Today',
    yesterday: 'Yesterday',

    // Quick Action Buttons
    actionVoice: 'Voice',
    actionReceipt: 'Receipt',
    actionQr: 'QR Scan',
    actionManual: 'Manual',

    // Categories
    catFoodDrink: 'Food & Drink',
    catGroceries: 'Groceries',
    catTransport: 'Transport',
    catBills: 'Bills & Utilities',
    catShopping: 'Shopping',
    catEntertainment: 'Entertainment',
    catHealth: 'Health',
    catEducation: 'Education',
    catOther: 'Other',

    // Voice Page
    voiceTitle: 'Voice Expense Capture',
    voiceTapToSpeak: 'Tap to Speak',
    voiceListening: 'Listening to Egyptian / English...',
    voiceProcessing: 'AI is extracting expense...',
    voiceDone: 'Extracted successfully!',
    voiceMicBlocked: 'Microphone blocked in browser',
    voiceUnsupported: 'Voice recognition not supported in this browser',
    voiceHint: 'Say e.g. "Paid 450 at Carrefour" or "دفعت 60 جنيه في أوبر"',
    voiceHeardSoFar: 'Heard so far:',
    voiceOrType: 'Or type here in slang: how much and where...',
    voiceConfirmBtn: 'Continue to Save',
    voiceRecordAnother: 'Record Another',
    voiceAiActiveBadge: 'AI Egyptian Dialect Parser Active',

    // Receipt Page
    receiptTitle: 'Scan Receipt',
    receiptSubtitle: 'Snap or upload an Egyptian receipt — we extract store, amount, and category via AI',
    receiptTakePhoto: 'Take Photo',
    receiptUploadGallery: 'Upload from Gallery',
    receiptReading: 'Reading receipt with AI...',
    receiptSuccess: 'Receipt scanned successfully!',
    receiptMerchant: 'Merchant Name',
    receiptTotalAmount: 'Total Amount',
    receiptCategory: 'Category',
    receiptContinueBtn: 'Continue to Save',
    receiptScanAnother: 'Scan Another',
    receiptViewRaw: 'View raw scan text',
    receiptAiActiveBadge: 'AI Vision Active (+98% accuracy)',
    receiptOfflineTip: 'Want 98%+ accuracy? Add free Gemini key in Settings',

    // QR Page
    qrTitle: 'Scan QR Code',
    qrSubtitle: 'Point camera at payment QR or upload an image',
    qrStartCamera: 'Start Camera',
    qrStopCamera: 'Stop Camera',
    qrUploadImage: 'Upload QR Image',
    qrDetected: 'Payment QR captured successfully',

    // Manual Entry
    manualTitle: 'Manual Expense Entry',
    manualMerchantLabel: 'Where did you spend? (Merchant name)',
    manualMerchantPlaceholder: 'e.g. Carrefour, Uber, Starbucks, Vodafone...',
    manualAmountLabel: 'Amount (in EGP)',
    manualCategoryLabel: 'Category',
    manualDateLabel: 'Date',
    manualNotesLabel: 'Notes (Optional)',
    manualNotesPlaceholder: 'Additional details about the expense...',
    manualSaveBtn: 'Save Expense',

    // Insights
    insightsTitle: 'Expense Analytics & Insights',
    insightsTotalSpent: 'Total Spent',
    insightsBreakdown: 'Category Breakdown',
    insightsMonthlyTrend: 'Monthly Spending Trend',
    insightsNoData: 'Not enough transaction data yet',

    // Settings
    settingsTitle: 'Settings',
    settingsAiSection: 'AI Engine & Precision Keys',
    settingsAiDesc: 'Power up receipts and Egyptian slang parsing with +98% precision.',
    settingsGeminiLabel: 'Google Gemini API Key',
    settingsGeminiHint: 'Free 15 req/min from Google AI Studio. Native Egyptian receipts & slang.',
    settingsOpenaiLabel: 'OpenAI API Key (Optional)',
    settingsSaveKeys: 'Save API Keys',
    settingsSavedNotice: 'Keys saved successfully! 🚀',
    settingsClearKeys: 'Clear Keys',
    settingsPreferences: 'Preferences',
    settingsDarkMode: 'Dark Mode',
    settingsLanguage: 'App Language',
    settingsAbout: 'About',
    settingsLogout: 'Sign Out',
    settingsAdminWorkspace: 'Admin Workspace',
    settingsAdminDesc: 'Monitor platform health, AI captures, and user activity.',
    settingsAdminBtn: 'Open Admin Console',
  },
};

export function getCategoryLabel(category: string, t: typeof translations['ar']): string {
  switch (category) {
    case 'Food & Drink': return t.catFoodDrink;
    case 'Groceries': return t.catGroceries;
    case 'Transport': return t.catTransport;
    case 'Bills & Utilities': return t.catBills;
    case 'Shopping': return t.catShopping;
    case 'Entertainment': return t.catEntertainment;
    case 'Health': return t.catHealth;
    case 'Education': return t.catEducation;
    default: return t.catOther;
  }
}

