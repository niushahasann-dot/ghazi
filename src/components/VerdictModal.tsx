import React, { useState } from 'react';
import {
  X,
  Gavel,
  Scale,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  ArrowRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { CaseDossier, Character, VerdictResult } from '../types.ts';
import { soundManager } from '../utils/audio.ts';

interface VerdictModalProps {
  caseData: CaseDossier;
  isOpen: boolean;
  onClose: () => void;
  onSubmitVerdict: (
    accusedId: string,
    verdictType: string,
    reasoning: string,
    penalty: string
  ) => Promise<VerdictResult | null>;
  onStartNewCase: () => void;
}

export const VerdictModal: React.FC<VerdictModalProps> = ({
  caseData,
  isOpen,
  onClose,
  onSubmitVerdict,
  onStartNewCase,
}) => {
  const [selectedAccusedId, setSelectedAccusedId] = useState<string>(
    caseData.characters[0]?.id || ''
  );
  const [verdictType, setVerdictType] = useState<string>('guilty');
  const [penalty, setPenalty] = useState<string>('قصاص نفس (اشد مجازات قانونی)');
  const [reasoning, setReasoning] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<VerdictResult | null>(null);

  if (!isOpen) return null;

  const handleIssueVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasoning.trim() || isSubmitting) return;

    soundManager.playGavel();
    setIsSubmitting(true);

    try {
      const res = await onSubmitVerdict(selectedAccusedId, verdictType, reasoning, penalty);
      if (res) {
        setResult(res);
        if (res.isCorrect) {
          soundManager.playDramaticSting();
        } else {
          soundManager.playHeartbeat();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedChar = caseData.characters.find((c) => c.id === selectedAccusedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#12141e] border border-amber-900/40 rounded-3xl shadow-2xl overflow-hidden text-stone-200 max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1c1f2e] to-[#151724] border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center">
              <Scale className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <span className="text-xs text-stone-400 block font-mono">پرونده کلاسه {caseData.caseNumber}</span>
              <h3 className="text-lg font-bold text-amber-100">انشای دادنامه و صدور حکم نهایی دادگاه</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
          {!result ? (
            /* Verdict Form */
            <form onSubmit={handleIssueVerdict} className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200/90 leading-relaxed">
                جناب قاضی، جلسه رسیدگی به پایان رسیده است. پس از استماع اظهارات شاکی، مدافعات متهم و وکیل، و مداقه در شواهد پزشکی قانونی، اکنون نوبت انشای رأی مستقل شماست. دقت کنید که متهم تمام توان خود را برای گمراه کردن شما به کار بسته بود!
              </div>

              {/* Step 1: Select Person */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300 block">
                  ۱. شخص مورد نظر برای صدور رأی را مشخص کنید:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {caseData.characters.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccusedId(char.id);
                        soundManager.playPaperRustle();
                      }}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        selectedAccusedId === char.id
                          ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500/50'
                          : 'bg-[#181a26] border-stone-800 hover:bg-[#1f2233]'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-200 block truncate">{char.name}</span>
                      <span className="text-[10px] text-stone-400 block truncate">{char.roleTitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Verdict Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300 block">
                  ۲. تصمیم قضایی شما در خصوص {selectedChar?.name || 'فرد منتخب'}:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setVerdictType('guilty')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      verdictType === 'guilty'
                        ? 'bg-red-950/30 border-red-500 ring-1 ring-red-500/40 text-red-200'
                        : 'bg-[#181a26] border-stone-800 text-stone-400 hover:bg-[#1e2130]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="verdictType"
                      value="guilty"
                      checked={verdictType === 'guilty'}
                      onChange={() => setVerdictType('guilty')}
                      className="accent-red-500"
                    />
                    <div>
                      <span className="text-xs font-bold block text-stone-100">احراز مجرمیت و محکومیت کیفری</span>
                      <span className="text-[11px] text-stone-400">فرد به عنوان مرتکب اصلی یا شریک جرم شناخته شد.</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setVerdictType('acquitted')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      verdictType === 'acquitted'
                        ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/40 text-emerald-200'
                        : 'bg-[#181a26] border-stone-800 text-stone-400 hover:bg-[#1e2130]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="verdictType"
                      value="acquitted"
                      checked={verdictType === 'acquitted'}
                      onChange={() => setVerdictType('acquitted')}
                      className="accent-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold block text-stone-100">حکم برائت کامل (بی‌گناهی)</span>
                      <span className="text-[11px] text-stone-400">فقدان ادله اثباتی و عدم احراز سوءنیت مجرمانه.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Penalty if guilty */}
              {verdictType === 'guilty' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-300 block">
                    ۳. تعیین نوع و میزان مجازات قانونی:
                  </label>
                  <select
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                    className="w-full bg-[#161824] border border-stone-700 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="قصاص نفس (اشد مجازات قانونی)">قصاص نفس (اشد مجازات قانونی قتل عمد)</option>
                    <option value="حبس ابد با اعمال شاقه">حبس ابد با اعمال شاقه</option>
                    <option value="بیست سال حبس تعزیری و رد مال">بیست سال حبس تعزیری و رد مال مسروقه</option>
                    <option value="ده سال حبس به جرم معاونت و جعل اسناد">ده سال حبس به جرم معاونت در جنایت و جعل اسناد</option>
                  </select>
                </div>
              )}

              {/* Step 4: Reasoning Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-300 block">
                  ۴. انشای استدلال قضایی (دلایل و مدارک مستند شما در پرونده):
                </label>
                <textarea
                  rows={4}
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="جناب قاضی، دلایل محکومیت یا برائت را ذکر کنید (مثلاً: تناقض ساعت مرگ با ادعای متهم، اثر انگشت روی سلاح/فنجان، فریبکاری در الایبی و...)"
                  className="w-full bg-[#0f1118] border border-stone-700 rounded-xl p-4 text-xs md:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Seal & Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !reasoning.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-700 via-amber-700 to-amber-800 hover:from-red-600 hover:to-amber-700 text-stone-100 font-extrabold text-sm md:text-base shadow-xl shadow-red-950/50 flex items-center justify-center gap-3 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <Gavel className="w-5 h-5 text-amber-300" />
                  <span>
                    {isSubmitting ? 'در حال ثبت رأی در دیوان عالی دادگستری...' : 'ختم جلسه دادرسی و صدور قطعی حکم دادگاه'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* Post-Verdict Truth & Score Reveal */
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              {/* Score Header Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1d2d] to-[#121420] border border-amber-500/30 text-center space-y-3 shadow-xl">
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 mb-1">
                  {result.isCorrect ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  )}
                </div>

                <h3 className="text-xl md:text-2xl font-extrabold text-amber-100">
                  {result.isCorrect
                    ? 'عدالت اجرا شد! شما حقیقت را کشف کردید'
                    : 'فریب دروغ متهم را خوردید یا عدالت مخدوش شد'}
                </h3>

                <div className="flex items-center justify-center gap-4 text-xs md:text-sm">
                  <span className="px-3 py-1 rounded-full bg-stone-800 border border-stone-700">
                    امتیاز درک قضایی: <strong className="text-amber-400 font-mono text-base">{result.justiceRating}/۱۰۰</strong>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-stone-800 border border-stone-700">
                    وضعیت فریبکاری: <strong className={result.deceptionBusted ? 'text-emerald-400' : 'text-red-400'}>
                      {result.deceptionBusted ? 'دسیسه متهم برملا شد' : 'متهم دادگاه را گمراه کرد'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Feedback Analysis */}
              <div className="p-5 rounded-2xl bg-[#161826] border border-stone-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  تحلیل و ارزیابی دیوان عالی از استدلال قاضی:
                </h4>
                <p className="text-sm text-stone-200 leading-relaxed">
                  {result.feedback}
                </p>
              </div>

              {/* Hidden Truth Unveiled */}
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-700/30 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  پرده‌برداری از حقیقت کامل پرونده (آنچه در خفا رخ داده بود):
                </h4>
                <p className="text-sm text-amber-100/90 leading-relaxed whitespace-pre-line">
                  {result.truthRevealed}
                </p>
              </div>

              {/* Culprit final confession if available */}
              {result.culpritConfession && (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-600/30 text-red-200 text-xs leading-relaxed space-y-1">
                  <span className="font-bold block text-red-400">واکنش و اعتراف نهایی مقصر در صحن دادگاه:</span>
                  <p className="italic font-serif">«{result.culpritConfession}»</p>
                </div>
              )}

              {/* Epilogue */}
              <div className="p-4 rounded-xl bg-[#141622] border border-stone-800 text-xs text-stone-400 leading-relaxed">
                <strong className="text-stone-300 block mb-1">سرانجام پس از اجرای حکم:</strong>
                {result.epilogue}
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ویرایش و انشای مجدد رأی
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playGavel();
                    onStartNewCase();
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-xs md:text-sm shadow-lg shadow-amber-900/40 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بررسی پرونده جنایی بعدی</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
