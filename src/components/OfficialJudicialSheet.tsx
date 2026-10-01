import React from 'react';
import { Printer, Download, Scale, ShieldCheck, X, FileText, CheckCircle, AlertTriangle, Stamp } from 'lucide-react';
import { CaseDossier, VerdictResult } from '../types.ts';

interface OfficialJudicialSheetProps {
  caseData: CaseDossier;
  type: 'indictment' | 'verdict';
  verdictResult?: VerdictResult | null;
  judgeName?: string;
  accusedName?: string;
  verdictType?: string;
  penalty?: string;
  reasoning?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialJudicialSheet: React.FC<OfficialJudicialSheetProps> = ({
  caseData,
  type,
  verdictResult,
  judgeName = 'آقای قاضی',
  accusedName,
  verdictType = 'guilty',
  penalty,
  reasoning,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isIndictment = type === 'indictment';
  const currentDate = new Date().toLocaleDateString('fa-IR');
  const mainDefendant = caseData.characters.find((c) => c.role === 'defendant') || caseData.characters[0];
  const targetAccusedName = accusedName || mainDefendant?.name || 'متهم پرونده';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto bg-[#0d0f17] border border-amber-900/60 rounded-2xl shadow-2xl overflow-hidden text-stone-900 flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#161826] border-b border-stone-800 text-stone-200 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-200">
              {isIndictment ? 'سند رسمی: کیفرخواست دادسرای عمومی و انقلاب' : 'سند رسمی: دادنامه و رای قطعی دادگاه'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / دانلود برگه</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Canvas */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-[#fcf9f0] print:p-0 print:bg-white text-stone-900 relative selection:bg-amber-200 font-sans">
          {/* Official Watermark background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <div className="text-center font-serif text-8xl font-black rotate-[-30deg] tracking-widest text-amber-950">
              قوه قضائیه
            </div>
          </div>

          {/* Document Decorative Double Border */}
          <div className="border-4 border-amber-900/80 p-6 md:p-8 rounded-xl relative bg-gradient-to-b from-[#fffef9] via-[#fdfbf3] to-[#fcf8ec] shadow-inner">
            {/* Inner fine border line */}
            <div className="border border-amber-800/40 p-4 rounded-lg space-y-6">
              
              {/* Header Emblem & Title */}
              <div className="text-center space-y-2 border-b-2 border-amber-900/30 pb-4 relative">
                {/* Top Official Crest */}
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-700 mb-2 border-b border-stone-300 pb-2">
                  <div>
                    <span className="block font-bold">شماره کلاسه: {caseData.caseNumber}</span>
                    <span className="block">تاریخ صدور: {currentDate}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-extrabold text-sm text-stone-900 block font-serif">«بسمه تعالی»</span>
                    <span className="text-[10px] text-stone-600">جمهوری اسلامی ایران • قوه قضائیه</span>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">شعبه: ۱۱۰ ویژه کیفری</span>
                    <span className="block">طبقه بندی: محرمانه قضایی</span>
                  </div>
                </div>

                <h1 className="text-xl md:text-2xl font-black text-amber-950 font-serif tracking-tight pt-1">
                  {isIndictment ? '« کیـفرخـواست دادسـرا »' : '« داد نـامـه و رأی نـهـائـی دادگـاه »'}
                </h1>
                <p className="text-xs text-stone-700 font-medium">
                  {isIndictment
                    ? 'صدور توسط دادسرای عمومی و انقلاب امور جنایی و ارجاع به صحن علنی دادگاه'
                    : 'صادره از شعبه اول دادگاه کیفری استان در خصوص پرونده جنایی'}
                </p>
              </div>

              {/* Case Profile Information Grid */}
              <div className="bg-amber-100/40 border border-amber-800/30 rounded-lg p-3 text-xs leading-relaxed space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-stone-800">
                  <div><strong className="text-amber-950">موضوع اتهام:</strong> {caseData.title}</div>
                  <div><strong className="text-amber-950">محل وقوع:</strong> {caseData.location}</div>
                  <div><strong className="text-amber-950">مقتول / بزه دیده:</strong> {caseData.victimName}</div>
                  <div><strong className="text-amber-950">متهم ردیف اول:</strong> {targetAccusedName}</div>
                  <div><strong className="text-amber-950">تاریخ وقوع:</strong> {caseData.incidentDate}</div>
                  <div><strong className="text-amber-950">مرجع رسیدگی:</strong> دادگاه کیفری استان</div>
                </div>
              </div>

              {/* Document Main Content Body */}
              {isIndictment ? (
                /* Indictment Details */
                <div className="space-y-4 text-xs md:text-sm text-stone-800 leading-relaxed text-justify">
                  <div>
                    <h3 className="font-bold text-amber-900 text-xs mb-1 border-r-2 border-amber-800 pr-2">
                      ۱. گردش کار و خلاصه تحقیقات اولیه آگاهی:
                    </h3>
                    <p className="pr-3">{caseData.briefing}</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-amber-900 text-xs mb-1 border-r-2 border-amber-800 pr-2">
                      ۲. گزارش کالبدشکافی و نتایج پزشکی قانونی:
                    </h3>
                    <p className="pr-3">
                      علت مرگ: <strong>{caseData.autopsyReport.causeOfDeath}</strong> | زمان تقربی: <strong>{caseData.autopsyReport.timeOfDeath}</strong>.
                      {caseData.autopsyReport.coronerNotes}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-amber-900 text-xs mb-1 border-r-2 border-amber-800 pr-2">
                      ۳. دلایل و امارات انتساب اتهام به متهم:
                    </h3>
                    <ul className="list-disc list-inside pr-3 space-y-1 text-stone-700">
                      {caseData.evidence.map((ev) => (
                        <li key={ev.id}>
                          <strong>{ev.title}:</strong> {ev.significance}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-stone-100 rounded border border-stone-300 font-serif text-stone-900">
                    <strong>بنا به مراتب فوق:</strong> ارتکاب بزه انتسابی محرز تشخیص داده شده و مستنداً به قانون مجازات اسلامی، تقاضای تعیین کیفر و محاکمه متهم در صحن علنی دادگاه کیفری را دارم.
                  </div>
                </div>
              ) : (
                /* Verdict Details */
                <div className="space-y-4 text-xs md:text-sm text-stone-800 leading-relaxed text-justify">
                  <div>
                    <h3 className="font-bold text-amber-950 text-xs mb-1 border-r-2 border-amber-800 pr-2">
                      متن رأی و تصمیم نهایی دادگاه:
                    </h3>
                    <p className="pr-3">
                      در خصوص اتهام آقای/خانم <strong>{targetAccusedName}</strong> دائر بر ارتکاب بزه در پرونده کلاسه {caseData.caseNumber}؛ دادگاه با عنایت به گزارش آگاهی، استماع مدافعات متهم و وکیل وی، و مداقه در شواهد پزشکی قانونی اقدام به انشای رای می‌نماید.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50/80 border-2 border-amber-800/40 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                      <Scale className="w-4 h-4 text-amber-800" />
                      <span>
                        حکم دادگاه: {verdictType === 'guilty' ? 'احراز کامل مجرمیت و محکومیت کیفری' : 'حکم برائت کامل بی‌گناهی'}
                      </span>
                    </div>

                    {verdictType === 'guilty' && (
                      <p className="text-red-950 font-extrabold text-xs">
                        مجازات تعیینی: {penalty || 'قصاص نفس با رعایت تشریفات قانونی'}
                      </p>
                    )}

                    <div className="pt-2 border-t border-amber-200">
                      <strong className="block text-xs text-amber-950 mb-1">استدلال و مستندات قاضی صادرکننده رای:</strong>
                      <p className="text-stone-800 italic pr-2 whitespace-pre-line">{reasoning || 'استدلال مستند بر تناقض شواهد و احراز سوءنیت'}</p>
                    </div>
                  </div>

                  {verdictResult && (
                    <div className={`p-3 rounded border text-xs leading-relaxed ${verdictResult.isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'}`}>
                      <strong className="block mb-1 font-bold">ارزیابی انطباق حکم با حقیقت مادی پرونده:</strong>
                      {verdictResult.feedback}
                      <p className="mt-1 font-mono text-[11px] text-stone-600">
                        نمره کشف حقیقت قضایی: {verdictResult.justiceRating} از ۱۰۰
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-600 italic">
                    رای صادره حضوری بوده و ظرف مهلت ۲۰ روز پس از ابلاغ قابل تجدیدنظرخواهی در دیوان عالی کشور می‌باشد.
                  </p>
                </div>
              )}

              {/* Signatures & Official Seals */}
              <div className="pt-6 flex items-end justify-between border-t border-amber-900/30 text-xs">
                {/* Official Judicial Stamp Emblem */}
                <div className="relative flex items-center justify-center p-2">
                  <div className="w-24 h-24 border-2 border-red-700 border-dashed rounded-full flex flex-col items-center justify-center text-red-700 rotate-[-12deg] opacity-85 select-none bg-red-50/20 shadow-sm">
                    <Stamp className="w-6 h-6 mb-0.5 text-red-700" />
                    <span className="text-[8px] font-bold text-center leading-tight">مهر رسمی دادگستری<br />شعبه ۱۱۰ کیفری</span>
                    <span className="text-[7px] font-mono mt-0.5">ثبت شد</span>
                  </div>
                </div>

                {/* Judge Signature */}
                <div className="text-center space-y-2">
                  <span className="block text-stone-700 font-bold">قاضی صادرکننده رای:</span>
                  <div className="font-serif font-black text-amber-950 text-base">{judgeName}</div>
                  <div className="w-32 h-10 border-b border-stone-800 mx-auto italic text-stone-400 text-[10px] flex items-end justify-center pb-1">
                    [امضا و مهر رسمی قضایی]
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
