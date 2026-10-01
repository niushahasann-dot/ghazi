import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  BookOpen,
  FolderOpen,
  Gavel,
  ShieldAlert,
  Volume2,
  VolumeX,
  ChevronLeft,
  Search,
  Clock,
  MapPin,
  AlertTriangle,
  X,
  Play,
  Terminal
} from 'lucide-react';
import { CaseDossier } from '../types.ts';
import { soundManager } from '../utils/audio.ts';
import { useFullscreen } from '../utils/useFullscreen.ts';
import { Maximize, Minimize } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface MainMenuProps {
  onStartConsultation: () => void;
  presetCases: CaseDossier[];
  onSelectCase: (selectedCase: CaseDossier) => void;
  isSoundOn: boolean;
  setIsSoundOn: (val: boolean) => void;
  onGavelStrike: () => void;
  onOpenDiagnostics: () => void;
  onOpenModelTester?: () => void;
  activeModel?: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartConsultation,
  presetCases,
  onSelectCase,
  isSoundOn,
  setIsSoundOn,
  onGavelStrike,
  onOpenDiagnostics,
  onOpenModelTester,
  activeModel,
}) => {
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [previewCase, setPreviewCase] = useState<CaseDossier | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playGavel();
  };

  const handleFullscreenToggle = () => {
    soundManager.playPaperRustle();
    toggleFullscreen();
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-x-hidden bg-[#0a0b10] text-[#c5c6c7] p-2.5 sm:p-5 md:p-8 select-none">
      {/* Background Visual Texture & Light Cone */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-950/25 via-[#0b0c14] to-[#07080b] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Header Controls */}
      <header className="relative z-10 flex flex-wrap items-center justify-between max-w-6xl mx-auto w-full gap-2 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handleFullscreenToggle}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-md shadow-amber-950/50 bg-[#12141f] shrink-0 hover:scale-105 transition-transform cursor-pointer ring-2 ring-amber-500/20"
            title="نمایش تمام صفحه در گوشی و مانیتور (Fullscreen)"
          >
            <img
              src="/images/court_gavel_logo.jpg"
              alt="نشان رسمی دادگاه"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-[1.15]"
            />
          </button>
          <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-stone-300 tracking-wider truncate">
            دیوان عالی امور جنایی • شعبه ویژه قضاوت
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Prominent PWA Install Button */}
          <PWAInstallButton />

          {/* Active Model Indicator Button */}
          {onOpenModelTester && (
            <button
              onClick={() => {
                soundManager.playPaperRustle();
                onOpenModelTester();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/60 text-amber-300 hover:text-amber-200 text-[10px] sm:text-xs font-mono transition-all cursor-pointer shadow min-h-[36px]"
              title="بررسی و تست اتصال مدل‌های مختلف جمینای (ضد ۵۰۳)"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>وضعیت جمینای</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={handleFullscreenToggle}
            className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[36px] ${
              isFullscreen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow'
                : 'bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-amber-200'
            }`}
            title={isFullscreen ? 'خروج از تمام صفحه' : 'نمایش تمام صفحه در گوشی و مانیتور (Fullscreen)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-amber-400" /> : <Maximize className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline text-[11px]">{isFullscreen ? 'پنجره' : 'تمام صفحه'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playPaperRustle();
              onOpenDiagnostics();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-bold transition-all cursor-pointer shadow min-h-[36px]"
            title="کنسول دیباگ و لاگ‌های زنده سیستمی"
          >
            <span className="hidden sm:inline">لاگ‌ها</span>
          </button>

          <button
            onClick={() => {
              soundManager.playGavel();
              onGavelStrike();
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-medium transition-all cursor-pointer shadow min-h-[36px]"
            title="تست ضربه چکش دادگاه"
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">ضربه چکش</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer shrink-0 min-h-[36px]"
            title={isSoundOn ? 'قطع صدا' : 'وصل صدا'}
          >
            {isSoundOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />}
          </button>
        </div>
      </header>

      {/* Hero Branding Section */}
      <div className="relative z-10 max-w-4xl mx-auto w-full text-center my-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Judicial Crest Emblem (Hero Image Logo - Grand Size without any white border) */}
        <div className="relative inline-block my-1 sm:my-2">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 rounded-full bg-amber-600/20 blur-2xl -z-10 scale-110 pointer-events-none" />

          {/* Majestic Circular Emblem */}
          <button
            onClick={handleFullscreenToggle}
            className="w-44 h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 mx-auto rounded-full overflow-hidden border-4 border-amber-600/80 shadow-[0_0_50px_rgba(217,119,6,0.35)] bg-[#0d0e14] ring-4 sm:ring-8 ring-[#1c1f2e] group hover:border-amber-400 transition-all duration-300 cursor-pointer block"
            title="برای تمام‌صفحه شدن کلیک کنید"
          >
            <img
              src="/images/court_gavel_logo.jpg"
              alt="نشان رسمی دادگاه آقای قاضی"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-[1.12] group-hover:scale-[1.16] transition-transform duration-700"
            />
          </button>

          {/* Badge beneath the circular seal */}
          <div className="absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-950 via-red-900 to-red-950 border border-red-500/70 text-red-200 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-xl flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400 animate-pulse" />
            <span>نشان رسمی دیوان قضاوت جنایی</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-amber-100 tracking-tight font-serif drop-shadow-lg">
            آقای قاضی
          </h1>
          <p className="text-xs sm:text-base md:text-lg text-amber-200/80 font-medium max-w-2xl mx-auto leading-relaxed px-2">
            شبیه‌ساز هوشمند دادرسی، بازجویی از متهمان فریبکار و کشف حقیقت جنایی با قدرت هوش مصنوعی چندنسخه‌ای
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 max-w-2xl mx-auto pt-2 sm:pt-4 text-right">
          {/* Card 1: Custom Case with Gemini */}
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              onStartConsultation();
            }}
            className="group relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#191c2b] via-[#141624] to-[#10121d] border border-amber-500/40 hover:border-amber-400/80 shadow-xl hover:shadow-amber-950/40 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 hover:-translate-y-0.5 min-h-[160px]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ساخت آنی با موضوع دلخواه
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-100 group-hover:text-amber-200 transition-colors">
                طراحی پرونده با تایپ موضوع دلخواه
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed">
                فقط موضوع مورد نظرتان را تایپ کنید (مثل: قتل بازیکن فوتبال، مسمومیت در برج، کلاهبرداری هرمی...) تا هوش مصنوعی تمام اشخاص، سناریو و مدارک را خلق کند.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-amber-200 border-t border-amber-900/40">
              <span>تایپ موضوع و خلق آنی پرونده</span>
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
          </button>

          {/* Card 2: Court Archive (Preset Cases) */}
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              setShowArchiveModal(true);
            }}
            className="group relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#1c1a24] via-[#161420] to-[#111019] border border-amber-600/40 hover:border-amber-400/80 shadow-xl hover:shadow-amber-950/40 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 hover:-translate-y-0.5 min-h-[160px]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {presetCases.length} پرونده آماده و کارشناسی‌شده
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-100 group-hover:text-amber-200 transition-colors">
                بایگانی پرونده‌های راکد دادسرا
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed">
                شامل قتل با سیانور در نیاوران، شلیک در جاده فشم، سقوط از برج سپهر، سرقت جام زرین موزه، و حریق کارخانه با مدارک آماده دادرسی.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-amber-200 border-t border-amber-900/40">
              <span>انتخاب از پرونده‌های طلایی</span>
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
          </button>
        </div>

        {/* Guide Trigger */}
        <div className="pt-2 sm:pt-3">
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              setShowGuideModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#141620] hover:bg-[#1a1d2c] border border-stone-850 hover:border-stone-700 text-stone-400 hover:text-stone-200 text-[11px] sm:text-xs font-medium transition-all cursor-pointer min-h-[40px]"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>راهنمای آیین دادرسی و قواعد بازی قضاوت</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-stone-500 py-3 border-t border-stone-900/60 max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
        <span>سامانه هوشمند دادگاه‌های کیفری یک • کلیه شخصیت‌ها و وقایع ساختگی هستند.</span>
        <span className="font-mono text-stone-600">نسخه ۱.۰ - مجهز به مدل Gemini 3.8 Flash</span>
      </footer>

      {/* Archive Modal (Choose from 3 Master Cases) */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#12141e] border border-amber-900/50 rounded-3xl shadow-2xl overflow-hidden text-stone-200 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#181a28] border-b border-stone-800">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-amber-100">بایگانی پرونده‌های ویژه دادگاه</h3>
                  <span className="text-xs text-stone-400">یک پرونده را برای بررسی و ورود به جلسه دادرسی انتخاب کنید:</span>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              {presetCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="p-4 rounded-2xl bg-[#161826] border border-stone-800 hover:border-amber-500/40 transition-all space-y-3 shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-2.5">
                    <div>
                      <span className="text-xs font-mono text-amber-400 font-bold ml-2">کلاسه {caseItem.caseNumber}</span>
                      <h4 className="text-base font-bold text-stone-100 inline">{caseItem.title}</h4>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-950/50 text-red-300 border border-red-800/40 font-semibold">
                      {caseItem.genre}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed bg-[#11131c] p-3 rounded-xl border border-stone-850">
                    {caseItem.briefing}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-400">
                    <div>
                      <strong className="text-stone-300">مقتول:</strong> {caseItem.victimName}
                    </div>
                    <div>
                      <strong className="text-stone-300">تعداد متهمان/شهود:</strong> {caseItem.characters.length} نفر
                    </div>
                    <div>
                      <strong className="text-stone-300">مدارک ثبت‌شده:</strong> {caseItem.evidence.length} مدرک آزمایشگاهی
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        soundManager.playGavel();
                        onSelectCase(caseItem);
                        setShowArchiveModal(false);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-stone-950" />
                      <span>گشودن این پرونده و ورود به دادرسی</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#12141e] border border-amber-900/50 rounded-3xl shadow-2xl overflow-hidden text-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#181a28] border-b border-stone-800">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-amber-100">آیین دادرسی و دستورالعمل قضاوت</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs md:text-sm leading-relaxed text-stone-300">
              <div className="p-4 rounded-xl bg-[#171926] border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">۱</span>
                  مرحله اول: مطالعه پرونده و گزارش کالبدشکافی
                </h4>
                <p className="text-xs text-stone-400">
                  ابتدا گزارش صحنه جرم، علت مستقیم فوت، زمان مرگ و مدارک کشف شده را در برگه پرونده به دقت مرور کنید. هر ساعت و هر نمونه آزمایشگاهی ممکن است کلید شکستن دروغ متهم باشد.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171926] border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">۲</span>
                  مرحله دوم: احضار به جایگاه و استیضاح زنده
                </h4>
                <p className="text-xs text-stone-400">
                  شخص مظنون یا شاهدان را احضار کنید. متهم زیر نظر جمینای کنترل می‌شود و تمام سعی خود را می‌کند تا با توجیه حضور خود، صحنه‌سازی یا تهمت زدن به دیگران شما را فریب دهد!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171926] border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">۳</span>
                  مرحله سوم: مواجهه با مدارک و ایجاد لغزش کلامی
                </h4>
                <p className="text-xs text-stone-400">
                  از دکمه «ارائه مدرک» استفاده کنید تا متهم را با اثر انگشت، رد تایر، فندک یا گزارش سم‌شناسی گوشه رینگ ببرید. با تحت فشار قرار گرفتن متهم، نشانگر اضطراب او بالا رفته و تناقض‌گویی خواهد کرد.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171926] border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">۴</span>
                  مرحله چهارم: انشای دادنامه و ارزیابی دیوان عدالت
                </h4>
                <p className="text-xs text-stone-400">
                  پس از تکمیل تحقیقات، وارد برگه رأی نهایی شوید و استدلال قضایی خود را بنویسید. سپس چکش دادگاه را بکوبید تا جمینای حقیقت واقعی را فاش کند و امتیاز هوش قضایی شما را محاسبه نماید.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
