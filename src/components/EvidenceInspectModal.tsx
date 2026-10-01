import React from 'react';
import { X, Search, ShieldAlert, FileText, FlaskConical, Cpu, ArrowLeft } from 'lucide-react';
import { EvidenceItem } from '../types.ts';
import { soundManager } from '../utils/audio.ts';

interface EvidenceInspectModalProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
  onPresentInCourt?: (evidence: EvidenceItem) => void;
}

export const EvidenceInspectModal: React.FC<EvidenceInspectModalProps> = ({
  evidence,
  onClose,
  onPresentInCourt,
}) => {
  if (!evidence) return null;

  const getTypeIcon = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'forensic':
        return <FlaskConical className="w-5 h-5 text-emerald-400" />;
      case 'document':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'digital':
        return <Cpu className="w-5 h-5 text-cyan-400" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
    }
  };

  const getTypeName = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'forensic':
        return 'مدرک پزشکی قانونی و سم‌شناسی';
      case 'document':
        return 'سند مکتوب و کارشناسی خط';
      case 'digital':
        return 'شواهد سایبری و دیجیتال';
      default:
        return 'مدرک مادی و فیزیکی صحنه جرم';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#13151f] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden text-stone-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1c1f2e] to-[#161824] border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              {getTypeIcon(evidence.type)}
            </div>
            <div>
              <span className="text-xs font-medium text-amber-400/80 block">{getTypeName(evidence.type)}</span>
              <h3 className="text-lg font-bold text-amber-100">{evidence.title}</h3>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playPaperRustle();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Stamp & ID */}
          <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono rounded bg-stone-800 text-stone-300 border border-stone-700">
                کد ثبت مدرک: #{evidence.id}
              </span>
            </div>
            <div className="px-3 py-1 rounded border-2 border-red-700/60 bg-red-950/20 text-red-400 font-bold text-xs uppercase tracking-wider -rotate-2 shadow-sm">
              مدرک توقیفی دادسرا
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-stone-400 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              شرح دقیق شیء و موقعیت کشف:
            </h4>
            <p className="text-sm text-stone-200 leading-relaxed bg-[#181a26] p-3.5 rounded-xl border border-stone-800">
              {evidence.description}
            </p>
          </div>

          {/* Found At */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#181a26] p-3 rounded-xl border border-stone-800/80">
              <span className="text-xs text-stone-400 block mb-1">محل کشف در صحنه جرم:</span>
              <span className="text-sm font-medium text-amber-200">{evidence.foundAt}</span>
            </div>
            <div className="bg-[#181a26] p-3 rounded-xl border border-stone-800/80">
              <span className="text-xs text-stone-400 block mb-1">نوع طبقه‌بندی:</span>
              <span className="text-sm font-medium text-stone-300">{getTypeName(evidence.type)}</span>
            </div>
          </div>

          {/* Significance */}
          <div>
            <h4 className="text-xs font-semibold text-stone-400 mb-1.5">اهمیت جنایی و بار اثباتی:</h4>
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-600/30 text-amber-200/90 text-sm leading-relaxed">
              {evidence.significance}
            </div>
          </div>

          {/* Lab Report if present */}
          {evidence.labReport && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                نتیجه آزمایشگاه تشخیص هویت و بالستیک:
              </h4>
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-sm leading-relaxed font-mono">
                {evidence.labReport}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#11131c] border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 text-sm transition-colors cursor-pointer"
          >
            بستن پرونده مدرک
          </button>

          {onPresentInCourt && (
            <button
              onClick={() => {
                soundManager.playDramaticSting();
                onPresentInCourt(evidence);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
            >
              <span>ارائه این مدرک در صحن بازجویی</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
