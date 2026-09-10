import { useAppContext } from '../contexts/AppContext';
import {
  Moon, Sun, MessageSquare, LogOut, Info, ShieldCheck, ArrowRight,
  Sparkles, Key, Check, ExternalLink, Eye, EyeOff, Bot, Languages
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { ConfirmationCard, ExtractedData } from '../components/ConfirmationCard';
import { toast } from 'sonner';

export default function SettingsPage() {
  const {
    user, logout, isDarkMode, toggleDarkMode, addTransaction,
    geminiApiKey, setGeminiApiKey, openaiApiKey, setOpenaiApiKey, serpApiKey, setSerpApiKey,
    serverAiStatus, language, setLanguage, t, isRtl
  } = useAppContext();
  const [, setLocation] = useLocation();

  const [showSmsConfirmation, setShowSmsConfirmation] = useState(false);
  
  // Local state for API keys input
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [localOpenaiKey, setLocalOpenaiKey] = useState(openaiApiKey);
  const [localSerpApiKey, setLocalSerpApiKey] = useState(serpApiKey);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showSerpApiKey, setShowSerpApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const handleSaveKeys = () => {
    setGeminiApiKey(localGeminiKey);
    setOpenaiApiKey(localOpenaiKey);
    setSerpApiKey(localSerpApiKey);
    setIsSaved(true);
    toast.success(isRtl ? "تم حفظ وتحديث مفاتيح الذكاء الاصطناعي بنجاح! 🚀" : "AI API keys updated successfully! 🚀");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearKeys = () => {
    setLocalGeminiKey('');
    setLocalOpenaiKey('');
    setLocalSerpApiKey('');
    setGeminiApiKey('');
    setOpenaiApiKey('');
    setSerpApiKey('');
    toast.info(isRtl ? "تم مسح المفاتيح، والرجوع للوضع المحلي الاحتياطي." : "AI keys cleared. Using local offline fallback.");
  };

  const simulateSms = () => {
    toast(isRtl ? "رسالة بنكية جديدة 📩" : "New transaction detected from SMS 📩", {
      action: {
        label: isRtl ? "مراجعة ←" : "Review →",
        onClick: () => setShowSmsConfirmation(true)
      },
      duration: 5000,
      className: "bg-card border-border text-foreground"
    });
  };

  const handleSmsConfirm = (data: ExtractedData) => {
    addTransaction({
      merchant: data.merchant,
      amount: Number(data.amount),
      category: data.category,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      notes: data.notes,
      captureChannel: 'sms'
    });
    toast.success(isRtl ? "تم تسجيل حركة الرسالة البنكية بنجاح" : "SMS Transaction saved");
  };

  if (!user) return null;

  // Active AI Provider Label
  let activeProviderLabel = isRtl ? "الوضع المحلي الاحتياطي" : "Local Offline Fallback";
  let activeProviderBadge = "bg-muted text-muted-foreground";
  if (localGeminiKey || serverAiStatus?.hasServerGemini) {
    activeProviderLabel = isRtl ? "Gemini Flash (الذكاء الفائق)" : "Gemini Flash (Recommended)";
    activeProviderBadge = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
  } else if (localOpenaiKey || serverAiStatus?.hasServerOpenAI) {
    activeProviderLabel = "OpenAI GPT-4o-mini";
    activeProviderBadge = "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30";
  }

  return (
    <div className="pb-24 min-h-[100dvh] bg-background">
      <div className="max-w-md mx-auto w-full p-4 flex flex-col gap-6">
        
        <h1 className="text-2xl font-bold text-foreground mt-2">{t.settingsTitle}</h1>

        {/* User Card */}
        <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-foreground">{user.name}</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>

        {/* Admin workspace */}
        <div className="bg-primary rounded-2xl p-4 shadow-sm text-primary-foreground relative overflow-hidden">
          <ShieldCheck size={72} className="absolute -right-3 -bottom-3 opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold">{t.settingsAdminWorkspace}</h3>
              {user.role === 'admin' && <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">Admin</span>}
            </div>
            <p className="text-xs text-white/70 leading-relaxed max-w-xs">
              {t.settingsAdminDesc}
            </p>
            <button
              type="button"
              onClick={() => user.role === 'admin' && setLocation('/admin')}
              disabled={user.role !== 'admin'}
              className={`mt-3 flex items-center gap-1.5 text-sm font-semibold text-white transition-colors ${user.role === 'admin' ? 'hover:text-accent' : 'opacity-60 cursor-not-allowed'}`}
            >
              {user.role === 'admin' ? t.settingsAdminBtn : (isRtl ? 'صلاحيات الإدارة مطلوبة' : 'Admin access required')} {user.role === 'admin' && <ArrowRight size={15} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />}
            </button>
          </div>
        </div>

        {/* 🤖 AI Engine & API Keys Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between ml-2 mr-1">
            <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> {t.settingsAiSection}
            </h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${activeProviderBadge}`}>
              {activeProviderLabel}
            </span>
          </div>

          <div className="bg-card border border-card-border rounded-2xl shadow-sm p-4 flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.settingsAiDesc}
            </p>

            {/* Google Gemini Key */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bot size={14} className="text-emerald-500" /> {t.settingsGeminiLabel}
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                    {isRtl ? 'مجاني تماماً' : 'Free Tier'}
                  </span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
                >
                  {isRtl ? 'احصل على مفتاح مجاني' : 'Get free key'} <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  value={localGeminiKey}
                  onChange={(e) => setLocalGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs font-mono bg-muted/40 border border-card-border rounded-xl px-3 py-2.5 pr-9 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {t.settingsGeminiHint}
              </span>
            </div>

            {/* OpenAI Key */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-card-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Key size={14} className="text-blue-500" /> {t.settingsOpenaiLabel}
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
                >
                  OpenAI Portal <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  value={localOpenaiKey}
                  onChange={(e) => setLocalOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full text-xs font-mono bg-muted/40 border border-card-border rounded-xl px-3 py-2.5 pr-9 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {isRtl ? 'اختياري: استخدام GPT-4o-mini وWhisper لتسجيل الصوت.' : 'Optional: Uses GPT-4o-mini Vision and Whisper speech transcription.'}
              </span>
            </div>

            {/* SerpAPI Key — used only by the authenticated alternatives search */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-card-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Key size={14} className="text-violet-500" /> {t.settingsSerpApiLabel}
                </label>
                <a
                  href="https://serpapi.com/manage-api-key"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
                >
                  SerpAPI <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showSerpApiKey ? "text" : "password"}
                  value={localSerpApiKey}
                  onChange={(e) => setLocalSerpApiKey(e.target.value)}
                  placeholder="SerpAPI key"
                  className="w-full text-xs font-mono bg-muted/40 border border-card-border rounded-xl px-3 py-2.5 pr-9 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowSerpApiKey(!showSerpApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSerpApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {t.settingsSerpApiHint}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveKeys}
                className="flex-1 bg-accent text-accent-foreground font-semibold text-xs py-2.5 rounded-xl hover:bg-accent/90 transition-colors flex items-center justify-center gap-1.5"
              >
                {isSaved ? <Check size={14} /> : <Sparkles size={14} />}
                {isSaved ? t.settingsSavedNotice : t.settingsSaveKeys}
              </button>
              {(localGeminiKey || localOpenaiKey || localSerpApiKey) && (
                <button
                  type="button"
                  onClick={handleClearKeys}
                  className="px-3 py-2.5 rounded-xl border border-card-border text-xs text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                >
                  {t.settingsClearKeys}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">{t.settingsPreferences}</h3>
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            
            {/* Language Selection */}
            <div className="p-4 flex items-center justify-between border-b border-card-border">
              <div className="flex items-center gap-3 text-foreground">
                <Languages size={20} className="text-accent" />
                <span className="font-semibold text-sm">{t.settingsLanguage}</span>
              </div>
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-card-border gap-1">
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${language === 'ar' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  عربي 🇪🇬
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`text-xs px-2.5 py-1 rounded-bold transition-all ${language === 'en' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Dark Mode */}
            <div className="p-4 flex items-center justify-between border-b border-card-border">
              <div className="flex items-center gap-3 text-foreground">
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                <span className="font-medium text-sm">{t.settingsDarkMode}</span>
              </div>
              <button 
                type="button"
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>

            {/* Currency */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-5 font-bold text-center">£</div>
                <span className="font-medium text-sm">{isRtl ? 'العملة' : 'Currency'}</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{t.egpFull}</span>
            </div>
          </div>
        </div>

        {/* Demo SMS */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider ml-2 flex items-center gap-1">
            <MessageSquare size={12} /> {isRtl ? 'تجربة المحاكاة البنكية' : 'Demo Controls'}
          </h3>
          <div className="bg-card border-2 border-accent/20 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isRtl
                ? 'في التطبيق الحقيقي، العملية بتتم تلقائياً في الخلفية من رسائل الـ SMS للبنك بتاعك. الزرار ده للمحاكاة والتجربة.'
                : "In the real mobile app, this works automatically in the background via your bank's SMS notifications. This is a simulated demo."}
            </p>
            <button 
              type="button"
              onClick={simulateSms}
              className="bg-accent/10 text-accent font-semibold py-3 rounded-xl border border-accent/20 hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              {isRtl ? 'محاكاة وصول رسالة بنكية' : 'Simulate Incoming SMS'}
            </button>
          </div>
        </div>

        {/* About & Logout */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">{t.settingsAbout}</h3>
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-card-border text-foreground">
              <div className="flex items-center gap-3">
                <Info size={20} />
                <span className="font-medium text-sm">{isRtl ? 'الإصدار' : 'Version'}</span>
              </div>
              <span className="text-sm text-muted-foreground">1.0.0 (Production)</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full p-4 flex items-center justify-between text-destructive hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span className="font-medium text-sm">{t.settingsLogout}</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      <ConfirmationCard 
        isOpen={showSmsConfirmation}
        data={{ merchant: "Vodafone", amount: 350, category: "Bills & Utilities" }}
        onConfirm={handleSmsConfirm}
        onCancel={() => setShowSmsConfirmation(false)}
        source="sms"
      />
    </div>
  );
}
