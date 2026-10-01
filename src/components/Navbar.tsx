import React from 'react';
import { Gavel, Volume2, VolumeX, FolderOpen, Scale, FileSignature, Sparkles, Home, LogOut, Maximize, Minimize, Cpu, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio.ts';
import { useFullscreen } from '../utils/useFullscreen.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavbarProps {
  currentTab: 'dossier' | 'court' | 'verdict';
  setCurrentTab: (tab: 'dossier' | 'court' | 'verdict') => void;
  caseTitle: string;
  caseNumber: string;
  isSoundOn: boolean;
  setIsSoundOn: (val: boolean) => void;
  onGavelClick: () => void;
  gavelAnimating: boolean;
  onReturnToMenu: () => void;
  activeModel?: string;
  onOpenModelTester?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  caseTitle,
  caseNumber,
  isSoundOn,
  setIsSoundOn,
  onGavelClick,
  gavelAnimating,
  onReturnToMenu,
  activeModel,
  onOpenModelTester,
}) => {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playPaperRustle();
  };

  const handleFullscreenClick = () => {
    soundManager.playPaperRustle();
    toggleFullscreen();
  };

  const getModelShortName = (name?: string) => {
    if (!name) return 'جمینای ۳.۸';
    if (name.includes('lite')) return 'جمینای ۳.۱ لایت';
    if (name.includes('3.8')) return 'جمینای ۳.۸ فلش';
    if (name.includes('latest')) return 'جمینای فلش پایدار';
    return name;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur-md border-b border-amber-900/30 text-stone-200 shadow-2xl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Brand & Emblem & Return to Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              onReturnToMenu();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-sm group shrink-0 min-h-[36px]"
            title="بازگشت به منوی اصلی دادگاه"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">منوی اصلی</span>
          </button>

          <div className="h-4 w-px bg-stone-800 hidden sm:block shrink-0" />

          {/* Court Logo Emblem button to toggle Fullscreen */}
          <button
            onClick={handleFullscreenClick}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-md shadow-amber-950/60 shrink-0 relative bg-stone-900 hover:scale-110 transition-all cursor-pointer group ring-2 ring-amber-500/20"
            title={isFullscreen ? 'خروج از حالت تمام صفحه' : 'نمایش تمام صفحه در گوشی و مانیتور (Fullscreen)'}
          >
            <img
              src="/images/court_gavel_logo.jpg"
              alt="نشان رسمی دادگاه آقای قاضی"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-[1.15] group-hover:scale-125 transition-transform duration-300"
            />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-amber-100 flex items-center gap-1 truncate">
                <span>آقای قاضی</span>
                <span className="text-[8px] sm:text-[9px] font-normal px-1 sm:px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  شعبه ویژه
                </span>
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-400 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
              {caseNumber} • <span className="text-amber-200/90">{caseTitle}</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation (Horizontal scrolling on mobile) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-[#161822] p-0.5 sm:p-1 rounded-xl border border-stone-800/80 shadow-inner overflow-x-auto custom-scrollbar max-w-full order-3 lg:order-2">
          <button
            onClick={() => {
              setCurrentTab('dossier');
              soundManager.playPaperRustle();
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
              currentTab === 'dossier'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>پرونده</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('court');
              soundManager.playGavel();
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
              currentTab === 'court'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>صحن دادگاه</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('verdict');
              soundManager.playDramaticSting();
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
              currentTab === 'verdict'
                ? 'bg-red-950/40 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5 text-red-400" />
            <span>صدور رأی</span>
          </button>
        </nav>

        {/* Actions: Live Model Badge, PWA Install, Fullscreen, Gavel Strike & Sound */}
        <div className="flex items-center gap-1 sm:gap-1.5 order-2 lg:order-3">
          {/* Prominent PWA Install Button */}
          <PWAInstallButton />

          {/* Active Model Indicator Chip (Clickable to open test modal) */}
          {onOpenModelTester && (
            <button
              onClick={() => {
                soundManager.playPaperRustle();
                onOpenModelTester();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#141624] hover:bg-[#1c1e30] border border-stone-800 text-stone-300 hover:text-amber-300 text-[10px] sm:text-xs font-mono transition-all cursor-pointer shadow-sm shrink-0 min-h-[34px]"
              title="مشاهده وضعیت نسخه‌های مختلف جمینای و تست اتصال"
            >
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">{getModelShortName(activeModel)}</span>
              <span className="md:hidden">جمینای</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={handleFullscreenClick}
            className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[34px] ${
              isFullscreen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow'
                : 'bg-stone-900/90 hover:bg-stone-800 border-stone-800 text-stone-300 hover:text-amber-200'
            }`}
            title={isFullscreen ? 'خروج از حالت تمام صفحه' : 'نمایش تمام صفحه در گوشی و مانیتور (Fullscreen)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-amber-400" /> : <Maximize className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden xl:inline text-[11px]">{isFullscreen ? 'پنجره' : 'تمام‌صفحه'}</span>
          </button>

          {/* Gavel Strike Action */}
          <button
            onClick={onGavelClick}
            title="کوبیدن چکش نظم دادگاه (سکوت در صحن!)"
            className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 text-[11px] sm:text-xs font-semibold shadow-lg border border-amber-500/30 transition-all cursor-pointer active:scale-95 min-h-[34px] ${
              gavelAnimating ? 'ring-4 ring-amber-500/50 scale-105' : ''
            }`}
          >
            <Gavel className={`w-3.5 h-3.5 transition-transform duration-150 ${gavelAnimating ? '-rotate-45 text-amber-200' : ''}`} />
            <span className="hidden sm:inline">نظم!</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer shrink-0 min-h-[34px]"
            title={isSoundOn ? 'قطع صدا' : 'وصل صدا'}
          >
            {isSoundOn ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};

