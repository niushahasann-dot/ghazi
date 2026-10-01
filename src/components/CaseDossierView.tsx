import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  FlaskConical,
  Eye,
  Scale,
  ShieldCheck,
  Search,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { CaseDossier, EvidenceItem, Character } from '../types.ts';
import { soundManager } from '../utils/audio.ts';
import { EvidenceInspectModal } from './EvidenceInspectModal.tsx';

interface CaseDossierViewProps {
  caseData: CaseDossier;
  onSelectCharacterForCourt: (characterId: string) => void;
  onOpenVerdictModal: () => void;
  onPresentEvidenceInCourt: (evidence: EvidenceItem) => void;
}

export const CaseDossierView: React.FC<CaseDossierViewProps> = ({
  caseData,
  onSelectCharacterForCourt,
  onOpenVerdictModal,
  onPresentEvidenceInCourt,
}) => {
  const [inspectedEvidence, setInspectedEvidence] = useState<EvidenceItem | null>(null);

  const getRoleBadge = (role: Character['role']) => {
    switch (role) {
      case 'defendant':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'plaintiff':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'defense_lawyer':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'expert':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Dossier Header Folder Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181a24] via-[#141620] to-[#0f1017] border border-amber-900/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-4 left-6 border-2 border-red-700/50 bg-red-950/20 text-red-400 px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold tracking-widest uppercase -rotate-2 select-none shadow">
          محرمانه - دادگاه جنایی
        </div>

        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-950/60 bg-stone-900 shrink-0">
              <img
                src="/images/court_gavel_logo.jpg"
                alt="مهر رسمی پرونده"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-[1.15]"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-amber-400">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  کلاسه: {caseData.caseNumber}
                </span>
                <span className="text-stone-500">•</span>
                <span className="text-stone-300">{caseData.genre}</span>
              </div>
              <h2 className="text-xl md:text-3xl font-extrabold text-amber-100 tracking-tight mt-1">
                {caseData.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-stone-400 pt-1">
            <div className="flex items-center gap-1.5 text-stone-300">
              <Clock className="w-4 h-4 text-amber-500/80" />
              <span>زمان وقوع: {caseData.incidentDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <MapPin className="w-4 h-4 text-amber-500/80" />
              <span>محل وقوع: {caseData.location}</span>
            </div>
          </div>
        </div>

        {/* Action quick buttons */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            راهنمای قاضی: کلیه مدارک و گزارش کالبدشکافی را با دقت بررسی کرده و سپس اشخاص را برای بازجویی احضار کنید.
          </p>
          <button
            onClick={() => {
              soundManager.playGavel();
              onOpenVerdictModal();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-stone-100 text-xs md:text-sm font-bold shadow-lg shadow-red-950/40 border border-red-500/30 transition-all cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>آماده صدور حکم نهایی هستم</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns (Left: Case Incident & Autopsy, Right: Evidence & Characters) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dossier Report & Autopsy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incident Report */}
          <div className="rounded-2xl bg-[#141622] border border-stone-800/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base border-b border-stone-800 pb-3">
              <FileText className="w-5 h-5 text-amber-400" />
              <h3>گزارش کلانتری و بازپرس ویژه قتل</h3>
            </div>

            {/* Victim Profile */}
            <div className="p-4 rounded-xl bg-[#1a1c2b] border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
                <User className="w-4 h-4 text-red-400" />
                <span>مشخصات مقتول: {caseData.victimName}</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                {caseData.victimBackground}
              </p>
            </div>

            {/* Briefing Narrative */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-stone-400">شرح واقعه و مشاهدات صحنه جنایت:</h4>
              <p className="text-sm text-stone-300 leading-relaxed bg-[#11131c] p-4 rounded-xl border border-stone-850 whitespace-pre-line">
                {caseData.briefing}
              </p>
            </div>
          </div>

          {/* Autopsy & Forensics Report */}
          <div className="rounded-2xl bg-[#141622] border border-emerald-900/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <h3>گزارش پزشکی قانونی و تالار تشریح</h3>
              </div>
              <span className="text-xs text-emerald-400/80 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
                مستندات آزمایشگاهی
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#191c28] border border-stone-800">
                <span className="text-stone-400 block mb-1 font-medium">زمان تقریبی مرگ:</span>
                <span className="text-stone-200 font-semibold">{caseData.autopsyReport.timeOfDeath}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#191c28] border border-stone-800">
                <span className="text-stone-400 block mb-1 font-medium">علت مستقیم فوت:</span>
                <span className="text-red-300 font-semibold">{caseData.autopsyReport.causeOfDeath}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#191c28] border border-stone-800 space-y-1">
              <span className="text-xs text-stone-400 font-medium block">نتایج آنالیز سم‌شناسی:</span>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {caseData.autopsyReport.toxicology}
              </p>
            </div>

            {caseData.autopsyReport.injuries && caseData.autopsyReport.injuries.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-stone-400 font-medium block">جراحات و صدمات ظاهری مکشوفه:</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {caseData.autopsyReport.injuries.map((inj, idx) => (
                    <li
                      key={idx}
                      className="p-2 rounded-lg bg-[#11131c] border border-stone-850 text-stone-300 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>{inj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-600/30 text-emerald-200 text-xs leading-relaxed">
              <span className="font-bold block mb-1">نکته حیاتی پزشک قانونی:</span>
              {caseData.autopsyReport.coronerNotes}
            </div>
          </div>
        </div>

        {/* Right Column: Evidence & Summon Characters (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Evidence Dossier Shelf */}
          <div className="rounded-2xl bg-[#141622] border border-stone-800/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Search className="w-5 h-5 text-amber-400" />
                <h3>شواهد و مدارک ضبط‌شده ({caseData.evidence.length})</h3>
              </div>
              <span className="text-xs text-stone-400">کلیک برای بازبینی جزئیات</span>
            </div>

            <div className="space-y-3">
              {caseData.evidence.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    soundManager.playPaperRustle();
                    setInspectedEvidence(item);
                  }}
                  className="group p-3.5 rounded-xl bg-[#191c28] hover:bg-[#202434] border border-stone-800 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-stone-200 group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                      #{item.id}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 line-clamp-2 mt-1.5">
                    {item.description}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-amber-400/80">
                    <span className="truncate max-w-[200px]">کشف در: {item.foundAt}</span>
                    <span className="flex items-center gap-1 group-hover:underline">
                      <Eye className="w-3.5 h-3.5" />
                      بررسی
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Persons in Court */}
          <div className="rounded-2xl bg-[#141622] border border-stone-800/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base border-b border-stone-800 pb-3">
              <User className="w-5 h-5 text-amber-400" />
              <h3>اشخاص حاضر در جلسه دادگاه</h3>
            </div>

            <div className="space-y-3">
              {caseData.characters.map((char) => (
                <div
                  key={char.id}
                  className="p-3.5 rounded-xl bg-[#191c28] border border-stone-800 hover:border-amber-500/30 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-stone-100">{char.name}</span>
                      <span className="text-xs text-stone-400 mr-2 font-mono">({char.age} ساله)</span>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getRoleBadge(char.role)}`}>
                      {char.roleTitle}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400">
                    <strong className="text-stone-300">نسبت/شغل:</strong> {char.relationToVictim} ({char.occupation})
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-stone-800/60">
                    <span className="text-xs text-stone-400">
                      سوءظن اولیه: <strong className="text-amber-400 font-mono">{char.suspicionLevel}%</strong>
                    </span>
                    <button
                      onClick={() => {
                        soundManager.playGavel();
                        onSelectCharacterForCourt(char.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <span>احضار به جایگاه</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Modal */}
      {inspectedEvidence && (
        <EvidenceInspectModal
          evidence={inspectedEvidence}
          onClose={() => setInspectedEvidence(null)}
          onPresentInCourt={onPresentEvidenceInCourt}
        />
      )}
    </div>
  );
};
