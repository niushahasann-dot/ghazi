import React, { useState, useEffect } from 'react';
import { PRESET_CASES } from './data/presets.ts';
import { CaseDossier, EvidenceItem, InterrogationMessage, VerdictResult } from './types.ts';
import { soundManager } from './utils/audio.ts';
import { Navbar } from './components/Navbar.tsx';
import { CaseDossierView } from './components/CaseDossierView.tsx';
import { CourtroomView } from './components/CourtroomView.tsx';
import { VerdictModal } from './components/VerdictModal.tsx';
import { ConsultationRoom } from './components/ConsultationRoom.tsx';
import { MainMenu } from './components/MainMenu.tsx';
import { Home, ArrowRight, Sparkles } from 'lucide-react';

export default function App() {
  // App views: 'menu' (lobby) | 'consult' (dedicated standalone design room) | 'game' (active courtroom session)
  const [currentView, setCurrentView] = useState<'menu' | 'consult' | 'game'>('menu');
  const [currentTab, setCurrentTab] = useState<'dossier' | 'court' | 'verdict' | 'consult'>('court');

  // No case is loaded initially
  const [caseData, setCaseData] = useState<CaseDossier | null>(null);
  const [presetCases, setPresetCases] = useState<CaseDossier[]>(PRESET_CASES);

  const [activeCharacterId, setActiveCharacterId] = useState<string>('');
  const [characterStressMap, setCharacterStressMap] = useState<Record<string, number>>({});
  const [dialogueHistory, setDialogueHistory] = useState<Record<string, InterrogationMessage[]>>({});
  const [selectedEvidenceToConfront, setSelectedEvidenceToConfront] = useState<EvidenceItem | null>(null);
  const [isVerdictModalOpen, setIsVerdictModalOpen] = useState(false);
  const [gavelAnimating, setGavelAnimating] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isInterrogating, setIsInterrogating] = useState(false);

  // Initialize presets on mount from server if available
  useEffect(() => {
    fetch('/api/preset-cases')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPresetCases(data);
        }
      })
      .catch((err) => console.log('Using local preset cases:', err));
  }, []);

  // Update initial active character when caseData changes
  useEffect(() => {
    if (caseData && caseData.characters && caseData.characters.length > 0) {
      const def = caseData.characters.find((c) => c.role === 'defendant') || caseData.characters[0];
      setActiveCharacterId(def.id);

      // Initialize stress map
      const initialMap: Record<string, number> = {};
      caseData.characters.forEach((c) => {
        initialMap[c.id] = c.suspicionLevel;
      });
      setCharacterStressMap(initialMap);
      setDialogueHistory({});
      setSelectedEvidenceToConfront(null);
    }
  }, [caseData]);

  // Gavel Strike Event
  const handleGavelClick = () => {
    soundManager.playGavel();
    setGavelAnimating(true);
    setTimeout(() => setGavelAnimating(false), 800);

    // If in courtroom, add an order in court system notice
    if (currentView === 'game' && currentTab === 'court' && caseData && activeCharacterId) {
      const gavelMsg: InterrogationMessage = {
        id: `gavel-${Date.now()}`,
        sender: 'judge',
        senderName: 'ریاست دادگاه (ضربه چکش)',
        text: '«سکوت و نظم در دادگاه! اظهارات صریح و بدون حاشیه بیان شود!»',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => ({
        ...prev,
        [activeCharacterId]: [...(prev[activeCharacterId] || []), gavelMsg],
      }));
    }
  };

  // Select character for interrogation
  const handleSelectCharacterForCourt = (characterId: string) => {
    setActiveCharacterId(characterId);
    setCurrentTab('court');
  };

  // Present evidence from dossier into court
  const handlePresentEvidenceInCourt = (evidence: EvidenceItem) => {
    setSelectedEvidenceToConfront(evidence);
    setCurrentTab('court');
  };

  // Interrogate summoned person
  const handleSendMessage = async (text: string, evidenceId?: string) => {
    if (isInterrogating || !caseData) return;
    setIsInterrogating(true);

    const activeChar = caseData.characters.find((c) => c.id === activeCharacterId) || caseData.characters[0];
    const presentedEvidence = evidenceId
      ? caseData.evidence.find((e) => e.id === evidenceId)
      : undefined;

    const judgeMsg: InterrogationMessage = {
      id: `msg-j-${Date.now()}`,
      sender: 'judge',
      senderName: 'جناب قاضی',
      text,
      evidencePresented: presentedEvidence,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Append judge message immediately
    const charMessages = dialogueHistory[activeChar.id] || [];
    setDialogueHistory((prev) => ({
      ...prev,
      [activeChar.id]: [...charMessages, judgeMsg],
    }));

    try {
      const response = await fetch('/api/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          characterId: activeChar.id,
          question: text,
          evidencePresentedId: evidenceId,
          history: charMessages.map((m) => ({
            sender: m.senderName,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();

      // Check lawyer intervention
      if (data.lawyerIntervention) {
        soundManager.playObjection();
        const lawyerChar = caseData.characters.find((c) => c.role === 'defense_lawyer');
        const lawyerMsg: InterrogationMessage = {
          id: `msg-lawyer-${Date.now()}`,
          sender: 'lawyer',
          senderName: lawyerChar ? lawyerChar.name : 'وکیل مدافع',
          text: data.lawyerIntervention,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        setDialogueHistory((prev) => ({
          ...prev,
          [activeChar.id]: [...(prev[activeChar.id] || []), lawyerMsg],
        }));
      }

      // Update stress
      if (data.stressDelta) {
        setCharacterStressMap((prev) => {
          const oldVal = prev[activeChar.id] ?? activeChar.suspicionLevel;
          const newVal = Math.min(100, Math.max(0, oldVal + data.stressDelta));
          if (newVal > 75) {
            soundManager.playHeartbeat();
          }
          return { ...prev, [activeChar.id]: newVal };
        });
      }

      // If slip-up detected, play dramatic chord
      if (data.slipUp) {
        soundManager.playDramaticSting();
      }

      const characterReplyMsg: InterrogationMessage = {
        id: `msg-c-${Date.now()}`,
        sender: 'character',
        senderName: activeChar.name,
        characterId: activeChar.id,
        text: data.speech || 'جناب قاضی، پاسخ دیگری برای این ادعا ندارم.',
        innerThought: data.innerThought,
        slipUp: data.slipUp,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      setDialogueHistory((prev) => ({
        ...prev,
        [activeChar.id]: [...(prev[activeChar.id] || []), characterReplyMsg],
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsInterrogating(false);
    }
  };

  // Submit final verdict
  const handleSubmitVerdict = async (
    accusedId: string,
    verdictType: string,
    reasoning: string,
    penalty: string
  ): Promise<VerdictResult | null> => {
    if (!caseData) return null;
    try {
      const response = await fetch('/api/judge-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          accusedId,
          verdictType,
          verdictReasoning: reasoning,
          penalty,
        }),
      });

      const result: VerdictResult = await response.json();
      return result;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Start Consultation from Main Menu (Opens ONLY the design room)
  const handleStartConsultationFromMenu = () => {
    soundManager.playPaperRustle();
    setCurrentView('consult');
  };

  // When Case is confirmed and generated, go DIRECTLY to the courtroom!
  const handleCaseCreatedAndEnterCourt = (newCase: CaseDossier) => {
    setCaseData(newCase);
    setCurrentTab('court'); // Direct entry to Courtroom as requested!
    setCurrentView('game');
    soundManager.playGavel();
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-[#c5c6c7] font-['Vazirmatn',sans-serif] selection:bg-amber-800/40 selection:text-amber-200">
      {/* 1. Main Menu View */}
      {currentView === 'menu' && (
        <MainMenu
          onStartConsultation={handleStartConsultationFromMenu}
          presetCases={presetCases}
          onSelectCase={handleCaseCreatedAndEnterCourt}
          isSoundOn={isSoundOn}
          setIsSoundOn={setIsSoundOn}
          onGavelStrike={handleGavelClick}
        />
      )}

      {/* 2. Dedicated Standalone Consultation & Design Room (ONLY this page is shown!) */}
      {currentView === 'consult' && (
        <div className="min-h-screen flex flex-col bg-[#0b0c14]">
          {/* Focused Top Bar without distracting tabs */}
          <header className="sticky top-0 z-40 bg-[#0f111c]/95 backdrop-blur-md border-b border-amber-900/40 px-4 py-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  soundManager.playPaperRustle();
                  setCurrentView('menu');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
              >
                <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>بازگشت به منوی اصلی</span>
              </button>

              <div className="h-5 w-px bg-stone-800 hidden sm:block" />

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-amber-100">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>اتاق مشورت بازپرسی و طراحی پرونده با جمینای</span>
              </div>
            </div>

            <div className="text-[11px] text-stone-400 hidden md:block">
              پس از توافق نهایی با جمینای، مستقیماً وارد صحن دادگاه خواهید شد.
            </div>
          </header>

          <main className="flex-1 pb-10">
            <ConsultationRoom
              onCaseGenerated={handleCaseCreatedAndEnterCourt}
              presetCases={presetCases}
              onSelectPresetCase={handleCaseCreatedAndEnterCourt}
            />
          </main>
        </div>
      )}

      {/* 3. In-Session Game View (Enters directly to Courtroom upon case finalization) */}
      {currentView === 'game' && caseData && (
        <div className="flex flex-col min-h-screen">
          {/* Top Navbar */}
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            caseTitle={caseData.title}
            caseNumber={caseData.caseNumber}
            isSoundOn={isSoundOn}
            setIsSoundOn={setIsSoundOn}
            onGavelClick={handleGavelClick}
            gavelAnimating={gavelAnimating}
            onReturnToMenu={() => {
              soundManager.playPaperRustle();
              setCurrentView('menu');
            }}
          />

          {/* Main Courtroom or Dossier Area */}
          <main className="flex-1 pb-12">
            {currentTab === 'court' && (
              <CourtroomView
                caseData={caseData}
                activeCharacterId={activeCharacterId}
                onSelectCharacter={(charId) => setActiveCharacterId(charId)}
                messages={dialogueHistory[activeCharacterId] || []}
                onSendMessage={handleSendMessage}
                isLoading={isInterrogating}
                onGavelClick={handleGavelClick}
                characterStressMap={characterStressMap}
                selectedEvidenceToConfront={selectedEvidenceToConfront}
                setSelectedEvidenceToConfront={setSelectedEvidenceToConfront}
                onOpenDossier={() => setCurrentTab('dossier')}
                onOpenVerdict={() => setIsVerdictModalOpen(true)}
              />
            )}

            {currentTab === 'dossier' && (
              <CaseDossierView
                caseData={caseData}
                onSelectCharacterForCourt={handleSelectCharacterForCourt}
                onOpenVerdictModal={() => setIsVerdictModalOpen(true)}
                onPresentEvidenceInCourt={handlePresentEvidenceInCourt}
              />
            )}

            {currentTab === 'verdict' && (
              <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="p-8 rounded-3xl bg-[#131520] border border-amber-900/30 text-center space-y-4 shadow-2xl">
                  <h2 className="text-2xl font-bold text-amber-100">صحن انشای رأی نهایی دیوان عدالت</h2>
                  <p className="text-sm text-stone-400 max-w-xl mx-auto leading-relaxed">
                    آیا کلیه شواهد را ارزیابی و از متهمان بازجویی کرده‌اید؟ برای صدور قطعی دادنامه روی دکمه زیر کلیک نمایید.
                  </p>
                  <button
                    onClick={() => {
                      soundManager.playGavel();
                      setIsVerdictModalOpen(true);
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-700 via-amber-700 to-amber-800 hover:from-red-600 hover:to-amber-700 text-stone-100 font-extrabold text-sm md:text-base shadow-xl shadow-red-950/40 transition-all cursor-pointer"
                  >
                    باز کردن برگه انشای حکم دادگاه
                  </button>
                </div>
              </div>
            )}

            {currentTab === 'consult' && (
              <ConsultationRoom
                onCaseGenerated={handleCaseCreatedAndEnterCourt}
                presetCases={presetCases}
                onSelectPresetCase={handleCaseCreatedAndEnterCourt}
              />
            )}
          </main>

          {/* Verdict Modal */}
          <VerdictModal
            caseData={caseData}
            isOpen={isVerdictModalOpen}
            onClose={() => setIsVerdictModalOpen(false)}
            onSubmitVerdict={handleSubmitVerdict}
            onStartNewCase={() => {
              setIsVerdictModalOpen(false);
              setCurrentView('consult');
            }}
          />
        </div>
      )}
    </div>
  );
}
