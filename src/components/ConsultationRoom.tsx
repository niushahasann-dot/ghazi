import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  FolderPlus,
  Compass,
  CheckCircle2,
  Lightbulb,
  Scale,
  RefreshCw,
  Library,
  MessageSquare,
  ShieldCheck,
  Check,
  ChevronLeft
} from 'lucide-react';
import { CaseDossier, ConsultationMessage } from '../types.ts';
import { soundManager } from '../utils/audio.ts';

interface ConsultationRoomProps {
  onCaseGenerated: (newCase: CaseDossier) => void;
  presetCases: CaseDossier[];
  onSelectPresetCase: (preset: CaseDossier) => void;
}

export const ConsultationRoom: React.FC<ConsultationRoomProps> = ({
  onCaseGenerated,
  presetCases,
  onSelectPresetCase,
}) => {
  const [messages, setMessages] = useState<ConsultationMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'درود بر شما جناب قاضی. من بازپرس همکار و مشاور امور جنایی شما هستم.\nبرای اینکه دادگاه امروز شما پر از چالش و معما باشد، بیایید گام‌به‌گام این پرونده را با هم طراحی کنیم.\n\nابتدا بفرمایید: مایلید ماجرای جنایت در چه محیطی (مثلاً یک عمارت باستانی، یک هلدینگ اقتصادی، یک بیمارستان خصوصی یا ویلایی در خارج شهر) و با چه نوع انگیزه‌ای اتفاق افتاده باشد؟',
      timestamp: 'هم‌اکنون',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [isGeneratingCase, setIsGeneratingCase] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isConsensusReached, setIsConsensusReached] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isConsulting]);

  const starterIdeas = [
    'قتل مشکوک در گالری عتیقه با زهر سیانور و جعل وصیت‌نامه',
    'شلیک شبانه در جاده کوهستانی با ادعای سرقت مسلحانه ساختگی',
    'سقوط از طبقه ۲۳ برج سپهر و خفگی با کلروفرم قبل از پرتاب',
    'مسمومیت دارویی یک جراح معروف در بیمارستان با جعل پرونده پزشکی',
  ];

  const followUpSuggestions = [
    'متهم ردیف اول چه الایبی یا عذر موجهی برای گول زدن من سر هم می‌کند؟',
    'می‌خواهم انگیزه جنایت کینه شخصی و ارثیه باشد نه صرفاً پول نقد.',
    'چه مدرک آزمایشگاهی یا تناقض زمانی در کالبدشکافی باید دروغش را لو دهد؟',
    'عالی است! روی تمام جزییات این سناریو به تفاهم رسیدیم، پرونده را نهایی و بساز!',
  ];

  // Send message to Gemini for consulting
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isConsulting) return;

    soundManager.playPaperRustle();
    const userMsg: ConsultationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setIsConsulting(true);

    try {
      const response = await fetch('/api/chat-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userPrompt: textToSend,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: data.reply || 'جناب قاضی، ایده‌های شما در حال پردازش در پرونده است.',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (data.isReadyToBuild) {
        setIsConsensusReached(true);
        soundManager.playDramaticSting();
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: 'جناب قاضی، نکات شما به دقت ثبت شد. هر زمان آماده بودید، تشکیل دادگاه را تایید بفرمایید.',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsConsulting(false);
    }
  };

  // Trigger Case Dossier Generation via Gemini
  const handleGenerateCase = async () => {
    if (isGeneratingCase) return;

    soundManager.playGavel();
    setIsGeneratingCase(true);
    setGenerationStep('در حال تنظیم کیفرخواست دادسرا و ثبت هویت متهمان...');

    // Combine entire conversation
    const fullConversation = messages
      .map((m) => `${m.role === 'user' ? 'قاضی' : 'مشاور هوش مصنوعی'}: ${m.content}`)
      .join('\n\n');

    const timer1 = setTimeout(() => {
      setGenerationStep('تدوین نقشه فریبکارانه متهم و استراتژی گول زدن دادگاه...');
    }, 1500);

    const timer2 = setTimeout(() => {
      setGenerationStep('استخراج گزارش کالبدشکافی، سم‌شناسی و شواهد آزمایشگاهی...');
    }, 3200);

    try {
      const response = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationThread: fullConversation,
          consultationSummary: fullConversation.slice(-600),
          genre: 'معمایی، جنایی و دارک دادگاهی',
        }),
      });

      const caseData: CaseDossier = await response.json();
      soundManager.playDramaticSting();
      onCaseGenerated(caseData);
    } catch (err) {
      console.error(err);
      if (presetCases.length > 0) {
        onSelectPresetCase(presetCases[0]);
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsGeneratingCase(false);
      setGenerationStep('');
    }
  };

  const userMessagesCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Consultation Chamber Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#181a28] via-[#131522] to-[#0d0e17] border border-amber-900/40 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>اتاق مشورت بازپرسی و طراحی مشترک پرونده با جمینای</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-stone-100 tracking-tight">
            مشورت دوطرفه با جمینای برای خلق جنایت
          </h2>

          <p className="text-xs md:text-sm text-stone-400 leading-relaxed">
            در این بخش ابتدا با مشاور هوش مصنوعی گفتگو کنید، نوع جنایت، ترفندهای متهم برای فریب دادگاه و شواهد متناقض را به پختگی برسانید. وقتی هر دو به توافق رسیدید، پرونده رسماً کلاسه و وارد دادرسی می‌شود.
          </p>

          {/* Consultation Progress Steps */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              userMessagesCount >= 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-stone-800 text-stone-500 border-stone-700'
            }`}>
              <Check className="w-3.5 h-3.5" />
              <span>۱. طرح ایده اولیه جرم</span>
            </span>

            <span className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              userMessagesCount >= 2 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-stone-800 text-stone-500 border-stone-700'
            }`}>
              <Check className="w-3.5 h-3.5" />
              <span>۲. استراتژی فریب و الایبی متهم</span>
            </span>

            <span className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              isConsensusReached ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-stone-800 text-stone-500 border-stone-700'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>۳. تفاهم نهایی با جمینای</span>
            </span>
          </div>
        </div>

        {/* Loading Progress Bar */}
        {isGeneratingCase && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-3 animate-pulse shadow-lg">
            <RefreshCw className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            <span className="font-semibold">{generationStep || 'در حال آماده‌سازی پرونده دادگاه...'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chat Conversation with Gemini (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[620px] bg-[#12141e] border border-stone-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#191b29] to-[#141624] border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-200">مشاور ارشد جنایی (Gemini)</h3>
                <span className="text-[11px] text-stone-400">همفکری زنده برای تنظیم سناریو و ترفندهای متهم</span>
              </div>
            </div>

            {isConsensusReached ? (
              <span className="text-xs text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تفاهم حاصل شد
              </span>
            ) : (
              <span className="text-xs text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono">
                در حال مشورت ({userMessagesCount} پیام)
              </span>
            )}
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#0f1118]/60">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <span className="text-[10px] text-stone-400 px-1">
                    {isUser ? 'جناب قاضی' : 'مشاور جنایی (جمینای)'} • {msg.timestamp}
                  </span>
                  <div
                    className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-stone-100 rounded-br-none border border-amber-600/30'
                        : 'bg-[#1a1c2b] text-stone-200 rounded-bl-none border border-stone-700/80 font-serif'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {isConsulting && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1a1c2b] border border-stone-800 text-xs text-stone-400 w-fit animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>مشاور در حال تحلیل و ارائه پیشنهاد جنایی است...</span>
              </div>
            )}

            {/* Glowing Consensus Card when agreed */}
            {isConsensusReached && !isGeneratingCase && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#16201a] to-emerald-950/40 border-2 border-emerald-500/50 shadow-xl space-y-3 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>توافق کامل با جمینای بر سر ابعاد این پرونده حاصل شد!</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  تمامی ایده‌ها، الایبی فریبکارانه متهم و مدارک متناقض آماده ساخت است. برای کلاسه کردن رسمی و گشودن دادگاه کلیک کنید:
                </p>
                <button
                  onClick={handleGenerateCase}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-amber-600 to-amber-700 hover:from-emerald-500 hover:to-amber-600 text-stone-950 font-black text-sm shadow-xl shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <Scale className="w-4 h-4 fill-stone-950" />
                  <span>تایید نهایی و تشکیل پرونده در صحن دادگاه</span>
                </button>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 md:p-4 bg-[#141622] border-t border-stone-800 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="نظر یا ایده خود را بنویسید (مثلاً: متهم ادعا کند خارج از شهر بوده، اما...)"
                disabled={isConsulting || isGeneratingCase}
                className="flex-1 bg-[#0f1118] border border-stone-700 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isConsulting || isGeneratingCase || !inputPrompt.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs md:text-sm shadow-lg transition-all disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">ارسال نظر</span>
              </button>
            </form>

            {/* If user wants to conclude now */}
            {!isConsensusReached && userMessagesCount >= 1 && (
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-stone-400 text-[11px]">
                  اگر سناریو به نظرتان کامل است، می‌توانید همین حالا با جمینای به نتیجه برسید:
                </span>
                <button
                  type="button"
                  onClick={() => handleSendMessage('همین سناریو بسیار عالی و کامل است، بیایید به نتیجه برسیم و پرونده را تشکیل دهیم!')}
                  className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer text-xs"
                >
                  رسیدن به توافق نهایی و بستن پرونده
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prompt Starters & Instant Presets (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Idea Starters (if starting) */}
          {userMessagesCount === 0 ? (
            <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                ایده‌های شروع گفتگو با جمینای:
              </h4>
              <div className="space-y-2">
                {starterIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(idea)}
                    className="w-full text-right p-2.5 rounded-xl bg-[#191c28] hover:bg-[#212435] border border-stone-800/80 hover:border-amber-500/30 text-xs text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Follow-up Prompts to Advance Consultation */
            <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                پیشنهادات ادامه مشورت و تکمیل طرح:
              </h4>
              <div className="space-y-2">
                {followUpSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="w-full text-right p-2.5 rounded-xl bg-[#191c28] hover:bg-[#212435] border border-stone-800/80 hover:border-amber-500/30 text-xs text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instant Preset Masterpieces */}
          <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
              <Library className="w-4 h-4 text-amber-400" />
              پرونده‌های آماده (بدون نیاز به مشورت):
            </h4>
            <div className="space-y-2.5">
              {presetCases.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl bg-[#191c28] border border-stone-800 hover:border-amber-500/40 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-stone-200">{preset.title}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{preset.caseNumber}</span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-2">
                    {preset.briefing}
                  </p>
                  <div className="pt-1.5 flex justify-end">
                    <button
                      onClick={() => {
                        soundManager.playGavel();
                        onSelectPresetCase(preset);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      شروع این پرونده
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
