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
  HelpCircle,
  Activity
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

    const query = inputText.trim() || `در خصوص «${selectedEvidenceToConfront?.title}» چه توضیحی در محضر دادگاه دارید؟`;
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

  const getStressColor = (stress: number) => {
    if (stress > 80) return 'text-red-400 border-red-500 bg-red-950/40';
    if (stress > 50) return 'text-amber-400 border-amber-500 bg-amber-950/40';
    return 'text-emerald-400 border-emerald-500 bg-emerald-950/40';
  };

  // Quick tactical questions for judge
  const quickQuestions = [
    'در ساعت وقوع حادثه دقیقاً با چه کسی و کجا بودید؟',
    'چطور حضور مدرک مکشوفه در صحنه جرم را توجیه می‌کنید؟',
    'آیا در خصوص انگیزه مالی یا اختلافات قبلی با مقتول اعتراف می‌کنید؟',
    'سوگند یاد کنید که حقیقت را بدون پرده‌پوشی بیان می‌کنید!',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Persons Summon Bar (Horizontal dock of character avatars) */}
      <div className="bg-[#141622] border border-stone-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 text-xs text-stone-400">
          <span className="font-semibold text-amber-300 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            جایگاه اشخاص حاضر در دادگاه (جهت احضار کلیک کنید):
          </span>
          <span>شخص حاضر در جایگاه استیضاح: <strong className="text-amber-200">{activeChar.name}</strong></span>
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
                    ? 'bg-[#222638] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-[#181a26] border-stone-800/80 hover:bg-[#1c1f2e] hover:border-stone-700'
                }`}
              >
                {/* Active indicator badge */}
                {isSelected && (
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}

                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-stone-200 truncate">{char.name}</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border truncate ${getRoleBadgeColor(char.role)}`}>
                    {char.roleTitle}
                  </span>
                  {char.role === 'defendant' && (
                    <span className="text-[10px] text-red-400 font-mono flex items-center gap-0.5 font-bold">
                      <Flame className="w-3 h-3" />
                      {stress}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Courtroom Interrogation Chamber */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interrogation Live Dialogues (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[650px] bg-[#12141d] border border-stone-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header of Interrogation Dock */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#191c2b] to-[#141622] border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300">
                {activeChar.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-100 text-sm md:text-base">{activeChar.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(activeChar.role)}`}>
                    {activeChar.roleTitle}
                  </span>
                </div>
                <p className="text-xs text-stone-400">{activeChar.occupation} • نسبت: {activeChar.relationToVictim}</p>
              </div>
            </div>

            {/* Stress Meter Indicator */}
            {activeChar.role === 'defendant' && (
              <div className="flex items-center gap-2 bg-[#181b28] px-3 py-1.5 rounded-xl border border-stone-800">
                <Activity className={`w-4 h-4 ${currentStress > 70 ? 'text-red-500 animate-bounce' : 'text-amber-400'}`} />
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">سطح اضطراب / لرزش صدا:</span>
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

          {/* Dialogue Messages Scroll Area */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#0f1118]/60">
            {/* Initial Statement Note */}
            <div className="p-4 rounded-2xl bg-[#171926] border border-stone-800 text-xs text-stone-300 space-y-1.5 shadow-sm">
              <span className="text-amber-400 font-bold block">اظهارات اولیه ثبت‌شده در محضر دادگاه:</span>
              <p className="italic text-stone-300/90 leading-relaxed font-serif">
                «{activeChar.initialStatement}»
              </p>
            </div>

            {/* Messages */}
            {messages.length === 0 && (
              <div className="text-center py-12 text-stone-500 text-xs md:text-sm">
                شخص در جایگاه احضار قرار گرفت. سوال خود را مطرح کنید یا مدرکی از پرونده جهت مواجهه ارائه دهید.
              </div>
            )}

            {messages.map((msg) => {
              const isJudge = msg.sender === 'judge';
              const isLawyer = msg.sender === 'lawyer';

              if (isLawyer) {
                return (
                  <div key={msg.id} className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-600/30 text-xs text-blue-200 space-y-1 my-2">
                    <span className="font-bold flex items-center gap-1.5 text-blue-400">
                      <ShieldAlert className="w-4 h-4" />
                      اعتراض وکیل مدافع ({msg.senderName}):
                    </span>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isJudge ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <span className="text-[11px] text-stone-400 font-medium px-1">
                    {msg.senderName}
                  </span>

                  <div
                    className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-md ${
                      isJudge
                        ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-50 rounded-br-none border border-amber-600/40'
                        : 'bg-[#1c1f2e] text-stone-200 rounded-bl-none border border-stone-700/80'
                    }`}
                  >
                    {/* Evidence tag if presented */}
                    {msg.evidencePresented && (
                      <div className="mb-2 p-2 rounded-lg bg-black/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-1.5">
                        <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                        <span>ارائه مدرک: <strong>{msg.evidencePresented.title}</strong></span>
                      </div>
                    )}

                    <p>{msg.text}</p>

                    {/* Inner Body language observation */}
                    {msg.innerThought && (
                      <div className="mt-2.5 pt-2 border-t border-stone-700/60 text-[11px] text-amber-300/80 italic font-serif">
                        {msg.innerThought}
                      </div>
                    )}

                    {/* Slip-up highlight */}
                    {msg.slipUp && (
                      <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                        <span>تناقض و لغزش کلامی: {msg.slipUp}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1c1f2e] border border-stone-800 text-xs text-stone-400 w-fit animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>متهم در حال پاسخگویی در محضر دادگاه است...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Confrontation Evidence Preview pill if selected */}
          {selectedEvidenceToConfront && (
            <div className="px-4 py-2 bg-amber-950/30 border-t border-amber-700/40 flex items-center justify-between text-xs text-amber-200">
              <span className="flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                مدرک پیوست شده برای به چالش کشیدن: <strong>{selectedEvidenceToConfront.title}</strong>
              </span>
              <button
                onClick={() => setSelectedEvidenceToConfront(null)}
                className="text-stone-400 hover:text-stone-200 text-[11px] underline cursor-pointer"
              >
                لغو پیوست
              </button>
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <form onSubmit={handleSend} className="p-3 md:p-4 bg-[#141622] border-t border-stone-800 space-y-2">
            <div className="flex items-center gap-2">
              {/* Evidence Drawer Button */}
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
                title="مواجهه متهم با یکی از مدارک پرونده"
              >
                <FileSearch className="w-4 h-4" />
                <span className="hidden sm:inline">ارائه مدرک</span>
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedEvidenceToConfront
                    ? `سوال یا مواجهه قاضی پیرامون «${selectedEvidenceToConfront.title}»...`
                    : 'سوال یا تذکر خود به عنوان قاضی را اینجا تایپ کنید...'
                }
                disabled={isLoading}
                className="flex-1 bg-[#0f1118] border border-stone-700 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />

              {/* Send Button */}
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
                <span className="text-[11px] text-amber-400/90 font-medium block">
                  یک مدرک را برای به چالش کشیدن و سنجش صداقت شخص انتخاب کنید:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {caseData.evidence.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundManager.playPaperRustle();
                        setSelectedEvidenceToConfront(item);
                        setShowEvidenceSelector(false);
                      }}
                      className="p-2 rounded-lg bg-[#161824] hover:bg-[#1f2233] border border-stone-850 hover:border-amber-500/40 text-right text-xs transition-colors cursor-pointer"
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

        {/* Right Column: Tactical Judge Panel & Persona Bio (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Judicial Queries */}
          <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              سوالات تاکتیکی پیشنهادی قاضی:
            </h4>
            <div className="space-y-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(q);
                  }}
                  className="w-full text-right p-2.5 rounded-xl bg-[#191c28] hover:bg-[#202434] border border-stone-800/80 hover:border-amber-500/30 text-xs text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Active Person Dossier Briefing Card */}
          <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <span className="text-xs font-bold text-stone-200">مشخصات متهم/شاهد</span>
              <span className={`text-[11px] px-2 py-0.5 rounded border ${getRoleBadgeColor(activeChar.role)}`}>
                {activeChar.roleTitle}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5">تیپ شخصیتی و روانی:</span>
                <p className="text-stone-300 bg-[#181a26] p-2.5 rounded-lg border border-stone-850 leading-relaxed">
                  {activeChar.personality}
                </p>
              </div>

              {activeChar.role === 'defendant' && (
                <div>
                  <span className="text-stone-400 block mb-0.5 font-medium">استراتژی دفاعی احتمالی:</span>
                  <p className="text-amber-200/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/30 leading-relaxed">
                    متهم تلاش می‌کند با توجیه حضور خود و انداختن تقصیر به گردن دیگران شما را گمراه کند.
                  </p>
                </div>
              )}
            </div>

            {/* Gavel Order in Court */}
            <div className="pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  soundManager.playGavel();
                  onGavelClick();
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-300 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <Gavel className="w-4 h-4 text-amber-500" />
                <span>کوبیدن چکش نظم و اخطار به صحن دادگاه</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
