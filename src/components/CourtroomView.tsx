import React, { useState, useRef, useEffect } from 'react';
import {
  Gavel,
  Send,
  AlertOctagon,
  ShieldAlert,
  Flame,
  UserCheck,
  FileSearch,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Volume2,
  FolderOpen,
  Scale,
  Mic,
  Activity,
  FileSignature
} from 'lucide-react';
import { CaseDossier, Character, EvidenceItem, InterrogationMessage } from '../types.ts';
import { soundManager } from '../utils/audio.ts';

interface CourtroomViewProps {
  caseData: CaseDossier;
  activeCharacterId: string;
  onSelectCharacter: (charId: string) => void;
  messages: InterrogationMessage[];
  onSendMessage: (text: string, evidenceId?: string) => Promise<void>;
  isLoading: boolean;
  onGavelClick: () => void;
  characterStressMap: Record<string, number>;
  selectedEvidenceToConfront: EvidenceItem | null;
  setSelectedEvidenceToConfront: (item: EvidenceItem | null) => void;
  onOpenDossier?: () => void;
  onOpenVerdict?: () => void;
}

export const CourtroomView: React.FC<CourtroomViewProps> = ({
  caseData,
  activeCharacterId,
  onSelectCharacter,
  messages,
  onSendMessage,
  isLoading,
  onGavelClick,
  characterStressMap,
  selectedEvidenceToConfront,
  setSelectedEvidenceToConfront,
  onOpenDossier,
  onOpenVerdict,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEvidenceSelector, setShowEvidenceSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChar = caseData.characters.find((c) => c.id === activeCharacterId) || caseData.characters[0];
  const currentStress = characterStressMap[activeChar.id] ?? activeChar.suspicionLevel;

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedEvidenceToConfront) || isLoading) return;

    const query = inputText.trim() || `در خصوص مدرک «${selectedEvidenceToConfront?.title}» چه توضیحی در محضر دادگاه دارید؟`;
    const evId = selectedEvidenceToConfront ? selectedEvidenceToConfront.id : undefined;

    setInputText('');
    setSelectedEvidenceToConfront(null);
    setShowEvidenceSelector(false);

    soundManager.playPaperRustle();
    await onSendMessage(query, evId);
  };

  const getRoleBadgeColor = (role: Character['role']) => {
    switch (role) {
      case 'defendant':
        return 'bg-red-500/20 text-red-300 border-red-500/40 font-bold';
      case 'plaintiff':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'defense_lawyer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold';
      case 'expert':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    }
  };

  // Quick tactical questions for judge
  const quickQuestions = [
    'در ساعت وقوع قتل دقیقاً کجا بودید و چه شاهدی دارید؟',
    'چطور کشف این مدرک در صحنه جرم را انکار می‌کنید؟',
    'انگیزه مالی یا اختلافات قبلی شما با مقتول برای دادگاه محرز است!',
    'به شرافت خود سوگند یاد کنید و حقیقت را بدون فریبکاری بگویید!',
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] py-4 px-2 sm:px-4 md:px-6 animate-in fade-in duration-300">
      {/* Real Courtroom Background with Moody Dark Vignette */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none -z-20 opacity-35 filter brightness-50 contrast-125"
        style={{ backgroundImage: `url('/images/courtroom_hall_bg.jpg')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#08090e] via-[#0b0d14]/90 to-[#08090e]/95 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Judicial Bench Header Bar */}
        <div className="bg-[#12141f]/90 backdrop-blur-md border border-amber-900/40 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-500/50 shadow-md shrink-0 bg-stone-900">
              <img
                src="/images/court_gavel_logo.jpg"
                alt="لوگو دادگاه"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-[1.15]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-amber-400 font-bold">کلاسه: {caseData.caseNumber}</span>
                <span className="text-stone-500">•</span>
                <span className="text-xs text-stone-300">{caseData.genre}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-amber-100 truncate max-w-sm sm:max-w-xl">
                {caseData.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDossier && (
              <button
                onClick={() => {
                  soundManager.playPaperRustle();
                  onOpenDossier();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-750 text-stone-300 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>اوراق پرونده و کالبدشکافی</span>
              </button>
            )}

            {onOpenVerdict && (
              <button
                onClick={() => {
                  soundManager.playDramaticSting();
                  onOpenVerdict();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-red-100 text-xs font-bold border border-red-500/40 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
              >
                <FileSignature className="w-3.5 h-3.5 text-red-300" />
                <span>انشای حکم و صدور رأی</span>
              </button>
            )}
          </div>
        </div>

        {/* Character Summon Dock (Judicial Bench View) */}
        <div className="bg-[#12141f]/90 backdrop-blur-md border border-stone-800/90 rounded-2xl p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2.5 text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              جایگاه اشخاص حاضر در صحن دادگاه (برای فراخوانی به جایگاه کلیک کنید):
            </span>
            <span className="text-stone-400 text-[11px]">
              حاضر در تریبون: <strong className="text-amber-200">{activeChar.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {caseData.characters.map((char) => {
              const isSelected = char.id === activeChar.id;
              const stress = characterStressMap[char.id] ?? char.suspicionLevel;

              return (
                <button
                  key={char.id}
                  onClick={() => {
                    if (char.id !== activeChar.id) {
                      soundManager.playGavel();
                      onSelectCharacter(char.id);
                    }
                  }}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#24293e] to-[#1a1e2f] border-amber-500 shadow-lg shadow-amber-950/40 ring-2 ring-amber-500/40'
                      : 'bg-[#151724]/90 border-stone-800/80 hover:bg-[#1b1e2e] hover:border-stone-700'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}

                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-stone-100 truncate">{char.name}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border truncate ${getRoleBadgeColor(char.role)}`}>
                      {char.roleTitle}
                    </span>
                    {char.role === 'defendant' && (
                      <span className="text-[10px] text-red-400 font-mono flex items-center gap-0.5 font-bold">
                        <Flame className="w-3 h-3 text-red-500" />
                        {stress}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Trial Hall & Interrogation Dock */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Interrogation Stand & Dialogue Stream (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-[640px] bg-[#11131c]/95 backdrop-blur-md border border-stone-800/90 rounded-3xl shadow-2xl overflow-hidden">
            {/* Accused Stand Header */}
            <div className="px-6 py-3.5 bg-gradient-to-r from-[#1c1f2e] via-[#161826] to-[#121420] border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 relative shadow-inner">
                  <Mic className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-100 text-sm sm:text-base">{activeChar.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(activeChar.role)}`}>
                      {activeChar.roleTitle}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">{activeChar.occupation} • نسبت با قربانی: {activeChar.relationToVictim}</p>
                </div>
              </div>

              {/* Stress & Nervous Tremor Meter */}
              {activeChar.role === 'defendant' && (
                <div className="flex items-center gap-2 bg-[#181a28] px-3.5 py-1.5 rounded-xl border border-stone-800 shadow-sm">
                  <Activity className={`w-4 h-4 ${currentStress > 70 ? 'text-red-500 animate-bounce' : 'text-amber-400'}`} />
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-medium">اضطراب و لرزش صدا:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            currentStress > 75 ? 'bg-red-500' : currentStress > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, currentStress))}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-stone-200">{currentStress}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trial Speech Scroll Area */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#0d0e16]/80">
              {/* Initial Statement Record */}
              <div className="p-4 rounded-2xl bg-[#161826] border border-stone-800 text-xs text-stone-300 space-y-1.5 shadow-sm">
                <span className="text-amber-400 font-bold block">متن اظهارات اولیه ثبت‌شده در محضر دادگاه:</span>
                <p className="italic text-stone-300/90 leading-relaxed font-serif">
                  «{activeChar.initialStatement}»
                </p>
              </div>

              {messages.length === 0 && (
                <div className="text-center py-14 text-stone-500 text-xs md:text-sm space-y-2">
                  <Mic className="w-8 h-8 mx-auto text-stone-600 animate-pulse" />
                  <p>شخص در تریبون استیضاح سوگند یاد کرده است. سوال خود را مطرح کنید یا مدرکی جهت مواجهه ارائه دهید.</p>
                </div>
              )}

              {/* Live Dialogue Exchange */}
              {messages.map((msg) => {
                const isJudge = msg.sender === 'judge';
                const isLawyer = msg.sender === 'lawyer';

                if (isLawyer) {
                  return (
                    <div key={msg.id} className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-600/40 text-xs text-blue-200 space-y-1 my-2 shadow-md animate-in slide-in-from-left duration-200">
                      <span className="font-bold flex items-center gap-1.5 text-blue-400">
                        <ShieldAlert className="w-4 h-4" />
                        اعتراض رسمی وکیل مدافع ({msg.senderName}):
                      </span>
                      <p className="leading-relaxed font-serif">{msg.text}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isJudge ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <span className="text-[11px] text-stone-400 font-medium px-1">
                      {msg.senderName}
                    </span>

                    <div
                      className={`max-w-[85%] md:max-w-[78%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-lg ${
                        isJudge
                          ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-50 rounded-br-none border border-amber-600/40'
                          : 'bg-[#1b1e2c] text-stone-200 rounded-bl-none border border-stone-700/80 font-serif'
                      }`}
                    >
                      {/* Evidence Tag if presented */}
                      {msg.evidencePresented && (
                        <div className="mb-2 p-2 rounded-xl bg-black/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-1.5 shadow-sm">
                          <FileSearch className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>ارائه مدرک جرم: <strong>{msg.evidencePresented.title}</strong></span>
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* Inner Body language observation */}
                      {msg.innerThought && (
                        <div className="mt-2.5 pt-2 border-t border-stone-700/60 text-[11px] text-amber-300/80 italic font-sans">
                          {msg.innerThought}
                        </div>
                      )}

                      {/* Slip-up reveal */}
                      {msg.slipUp && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-2 shadow-inner">
                          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                          <span>تناقض و لغزش کلامی: {msg.slipUp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1c1f2e] border border-stone-800 text-xs text-stone-300 w-fit animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>شخص در حال پاسخگویی به هیئت دادگاه است...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Selected Evidence Pill */}
            {selectedEvidenceToConfront && (
              <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-700/50 flex items-center justify-between text-xs text-amber-200">
                <span className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-amber-400" />
                  مدرک پیوست‌شده جهت به چالش کشیدن: <strong>{selectedEvidenceToConfront.title}</strong>
                </span>
                <button
                  onClick={() => setSelectedEvidenceToConfront(null)}
                  className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer"
                >
                  لغو پیوست
                </button>
              </div>
            )}

            {/* Interrogation Input Form */}
            <form onSubmit={handleSend} className="p-3 md:p-4 bg-[#141622] border-t border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPaperRustle();
                    setShowEvidenceSelector(!showEvidenceSelector);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedEvidenceToConfront
                      ? 'bg-amber-600 text-stone-900 border-amber-500 font-bold'
                      : 'bg-[#1b1e2c] hover:bg-[#222638] text-amber-300 border-amber-600/30'
                  }`}
                  title="مواجهه متهم با مدارک ضبط‌شده"
                >
                  <FileSearch className="w-4 h-4" />
                  <span className="hidden sm:inline">ارائه مدرک</span>
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedEvidenceToConfront
                      ? `سوال یا مواجهه قضایی درباره «${selectedEvidenceToConfront.title}»...`
                      : 'سوال، تذکر یا اتهام خود را در محضر دادگاه بیان کنید...'
                  }
                  disabled={isLoading}
                  className="flex-1 bg-[#0f1118] border border-stone-700 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={isLoading || (!inputText.trim() && !selectedEvidenceToConfront)}
                  className="flex items-center justify-center p-2.5 md:px-5 md:py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-xs md:text-sm shadow-lg shadow-amber-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden md:inline mr-1.5">طرح سوال</span>
                </button>
              </div>

              {/* Quick Evidence Picker Drawer */}
              {showEvidenceSelector && (
                <div className="p-3 rounded-xl bg-[#0e1017] border border-stone-800 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[11px] text-amber-400 font-medium block">
                    یک مدرک را برای مواجهه و به دام انداختن متهم انتخاب کنید:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar">
                    {caseData.evidence.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          soundManager.playPaperRustle();
                          setSelectedEvidenceToConfront(item);
                          setShowEvidenceSelector(false);
                        }}
                        className="p-2.5 rounded-xl bg-[#161824] hover:bg-[#1f2233] border border-stone-850 hover:border-amber-500/40 text-right text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-stone-200 block truncate">{item.title}</span>
                        <span className="text-[10px] text-stone-400 block truncate">{item.foundAt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Tactical Sidebar: Questions & Gavel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Questions */}
            <div className="bg-[#12141f]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                سوالات تاکتیکی و قضایی پیشنهادی:
              </h4>
              <div className="space-y-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(q)}
                    className="w-full text-right p-2.5 rounded-xl bg-[#181a26] hover:bg-[#202434] border border-stone-800 hover:border-amber-500/30 text-xs text-stone-300 hover:text-amber-200 transition-colors cursor-pointer leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Suspect Psychology & Bio */}
            <div className="bg-[#12141f]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <span className="text-xs font-bold text-stone-200">روانشناسی متهم/شاهد</span>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${getRoleBadgeColor(activeChar.role)}`}>
                  {activeChar.roleTitle}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 block mb-0.5">وضعیت رفتاری:</span>
                  <p className="text-stone-300 bg-[#171926] p-2.5 rounded-xl border border-stone-800 leading-relaxed">
                    {activeChar.personality}
                  </p>
                </div>

                {activeChar.role === 'defendant' && (
                  <div>
                    <span className="text-stone-400 block mb-0.5 font-medium">ترفند فریبکاری احتمالی:</span>
                    <p className="text-amber-200/90 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/30 leading-relaxed">
                      متهم با تمام توان سعی دارد حضور خود را انکار و پرونده را تصادف یا کار دیگران جلوه دهد.
                    </p>
                  </div>
                )}
              </div>

              {/* Courtroom Gavel Action */}
              <div className="pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playGavel();
                    onGavelClick();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-stone-900 to-stone-850 hover:from-amber-950/40 hover:to-stone-800 border border-stone-700 text-stone-300 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow active:scale-98"
                >
                  <Gavel className="w-4 h-4 text-amber-500" />
                  <span>کوبیدن چکش نظم (سکوت در صحن دادگاه!)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
