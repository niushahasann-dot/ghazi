import React from 'react';
import { Gavel, Volume2, VolumeX, FolderOpen, Scale, FileSignature, Sparkles, Home, LogOut } from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface NavbarProps {
  currentTab: 'dossier' | 'court' | 'verdict' | 'consult';
  setCurrentTab: (tab: 'dossier' | 'court' | 'verdict' | 'consult') => void;
  caseTitle: string;
  caseNumber: string;
  isSoundOn: boolean;
  setIsSoundOn: (val: boolean) => void;
  onGavelClick: () => void;
  gavelAnimating: boolean;
  onReturnToMenu: () => void;
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
}) => {
  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playPaperRustle();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur-md border-b border-amber-900/30 text-stone-200 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Emblem & Return to Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              onReturnToMenu();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
            title="بازگشت به منوی اصلی دادگاه"
          >
            <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">منوی اصلی</span>
          </button>

          <div className="h-6 w-px bg-stone-800 hidden sm:block" />

          {/* Court Logo Badge */}
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40 shadow-md shadow-amber-950/50 shrink-0 relative bg-stone-900">
            <img
              src="/src/assets/images/court_gavel_logo_1790814378414.jpg"
              alt="نشان رسمی دادگاه آقای قاضی"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-amber-100 flex items-center gap-1.5">
                <span>آقای قاضی</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  شعبه ویژه جنایی
                </span>
              </h1>
            </div>
            <p className="text-xs text-stone-400 truncate max-w-xs md:max-w-md">
              {caseNumber} • <span className="text-amber-200/90">{caseTitle}</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-[#161822] p-1 rounded-xl border border-stone-800/80 shadow-inner">
          <button
            onClick={() => {
              setCurrentTab('dossier');
              soundManager.playPaperRustle();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'dossier'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>پرونده جنایی</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('court');
              soundManager.playGavel();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'court'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>صحن دادگاه و بازجویی</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('verdict');
              soundManager.playDramaticSting();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'verdict'
                ? 'bg-red-950/40 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <FileSignature className="w-4 h-4 text-red-400" />
            <span>صدور رأی نهایی</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('consult');
              soundManager.playPaperRustle();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'consult'
                ? 'bg-purple-900/30 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">مشورت با جمینای</span>
            <span className="sm:hidden">طراحی</span>
          </button>
        </nav>

        {/* Actions: Gavel Strike & Sound */}
        <div className="flex items-center gap-2">
          {/* Gavel Strike Action */}
          <button
            onClick={onGavelClick}
            title="کوبیدن چکش نظم دادگاه (سکوت در صحن!)"
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 text-xs md:text-sm font-semibold shadow-lg border border-amber-500/30 transition-all cursor-pointer active:scale-95 ${
              gavelAnimating ? 'ring-4 ring-amber-500/50 scale-105' : ''
            }`}
          >
            <Gavel className={`w-4 h-4 transition-transform duration-150 ${gavelAnimating ? '-rotate-45 text-amber-200' : ''}`} />
            <span className="hidden md:inline">نظم در دادگاه!</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title={isSoundOn ? 'قطع صدا' : 'وصل صدا'}
          >
            {isSoundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
