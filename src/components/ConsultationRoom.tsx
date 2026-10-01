import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  FolderPlus,
  Compass,
  CheckCircle,
  Lightbulb,
  Scale,
  RefreshCw,
  Library
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
        'درود بر شما جناب قاضی. من مشاور ارشد و طراح سناریوهای جنایی شما هستم. قبل از آغاز جلسه دادگاه، بفرمایید پرونده این جلسه چه مشخصاتی داشته باشد؟ مکان وقوع، نحوه قتل یا جنایت، روابط خانوادگی، یا ترفند فریبکارانه متهم را برای من شرح دهید تا سناریویی پر از پیچیدگی و تناقض برای محک دادگاه شما تدوین کنم. یا می‌توانید از سناریوهای آماده زیر یکی را انتخاب فرمایید.',
      timestamp: 'هم‌اکنون',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [isGeneratingCase, setIsGeneratingCase] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  const quickThemes = [
    'قتل مشکوک در گالری عتیقه با زهر سیانور و جعل وصیت‌نامه',
    'شلیک شبانه در جاده کوهستانی با ادعای سرقت ساختگی',
    'سقوط از طبقه بیست‌وسوم برج تجاری و خفگی قبل از پرتاب',
    'مسمومیت دارویی مدیر بیمارستان خصوصی و جعل پرونده پزشکی',
    'سرقت شمش‌های طلا از صرافی با اسناد حسابداری دستکاری‌شده',
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

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsConsulting(true);

    try {
      const response = await fetch('/api/chat-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userPrompt: textToSend,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: data.reply || 'جناب قاضی، مشخصات این پرونده بررسی شد و آماده تدوین نهایی است.',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: 'جناب قاضی، یادداشت‌های شما ثبت شد. هر زمان آماده بودید دکمه «تدوین نهایی پرونده» را بزنید.',
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
    setGenerationStep('در حال نگارش گزارش صحنه جرم و تحلیل انگیزه جنایت...');

    const summary = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' | ');

    const timer1 = setTimeout(() => {
      setGenerationStep('طراحی استراتژی فریبکارانه متهم و نقشه گمراه کردن قاضی...');
    }, 1500);

    const timer2 = setTimeout(() => {
      setGenerationStep('استخراج یافته‌های کالبدشکافی و گزارش بالستیک آزمایشگاه...');
    }, 3200);

    try {
      const response = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customIdea: summary || 'یک پرونده جنایی با متهم فریبکار و مدارک جعلی',
          consultationSummary: summary,
          genre: 'معمایی، جنایی و دارک',
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Intro Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#181a26] via-[#141620] to-[#0f1017] border border-purple-900/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>اتاق مشورت بازپرسی و طراحی اختصاصی پرونده با جمینای</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-stone-100 tracking-tight">
            سناریوی پرونده جنایی خود را بسازید
          </h2>

          <p className="text-xs md:text-sm text-stone-400 leading-relaxed">
            قبل از ورود به تالار دادرسی، می‌توانید با هوش مصنوعی درباره ایده، نوع جرم، موقعیت مکانی و ترفندهای متهم گفتگو کنید. جمینای یک پرونده غنی، ساختگی و چندلایه با تناقض‌های ظریف ایجاد خواهد کرد تا مهارت قضاوت شما به چالش کشیده شود.
          </p>
        </div>

        {/* Generate Action Button */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-stone-400">
            ایده خود را در چت زیر با جمینای مطرح کنید یا مستقیماً دستور تدوین پرونده را صادر نمایید.
          </span>
          <button
            onClick={handleGenerateCase}
            disabled={isGeneratingCase}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-stone-100 text-xs md:text-sm font-bold shadow-xl shadow-purple-950/40 border border-purple-500/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4 text-purple-300" />
            <span>
              {isGeneratingCase ? 'در حال طراحی و کلاسه کردن پرونده...' : 'تدوین نهایی پرونده و ورود به صحن دادگاه'}
            </span>
          </button>
        </div>

        {isGeneratingCase && (
          <div className="mt-4 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
            <span>{generationStep || 'در حال آماده‌سازی مدارک و گزارشات...'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat Chamber with Gemini (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[580px] bg-[#12141e] border border-stone-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#191b29] to-[#141624] border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-200">مشاور ارشد پرونده‌سازی جنایی (Gemini)</h3>
                <span className="text-[11px] text-stone-400">همفکری و تدوین الایبی، شواهد و سوءنیت‌ها</span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              آماده دریافت ایده
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#0f1118]/60">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <span className="text-[10px] text-stone-400 px-1">
                    {isUser ? 'جناب قاضی' : 'طراح پرونده (جمینای)'} • {msg.timestamp}
                  </span>
                  <div
                    className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-stone-100 rounded-br-none border border-amber-600/30'
                        : 'bg-[#1a1c2b] text-stone-200 rounded-bl-none border border-stone-700/80'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {isConsulting && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1a1c2b] border border-stone-800 text-xs text-stone-400 w-fit animate-pulse">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>طراح پرونده در حال بررسی ایده و پاسخ است...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 md:p-4 bg-[#141622] border-t border-stone-800">
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
                placeholder="ایده خود درباره پرونده جدید را بنویسید (مثلاً: یک قتل در استودیوی ضبط صدا...)"
                disabled={isConsulting || isGeneratingCase}
                className="flex-1 bg-[#0f1118] border border-stone-700 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isConsulting || isGeneratingCase || !inputPrompt.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-stone-100 font-bold text-xs md:text-sm shadow-lg transition-all disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">ارسال</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Preset Themes & Ready Cases (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Idea Prompts */}
          <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              ایده‌های پیشنهادی جهت الهام:
            </h4>
            <div className="space-y-2">
              {quickThemes.map((theme, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(theme)}
                  className="w-full text-right p-2.5 rounded-xl bg-[#191c28] hover:bg-[#212435] border border-stone-800/80 hover:border-purple-500/30 text-xs text-stone-300 hover:text-purple-200 transition-colors cursor-pointer"
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Instant Preset Masterpieces */}
          <div className="bg-[#141622] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
              <Library className="w-4 h-4 text-amber-400" />
              پرونده‌های طلایی آماده ورود به دادگاه:
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
