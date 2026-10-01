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

export default function App() {
  // App views: 'menu' (initial entry) or 'game' (inside active court session)
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [currentTab, setCurrentTab] = useState<'dossier' | 'court' | 'verdict' | 'consult'>('dossier');

  // No case is loaded initially as requested by user
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

  // Start Consultation from Main Menu
  const handleStartConsultationFromMenu = () => {
    setCurrentTab('consult');
    setCurrentView('game');
  };

  // Case switched or generated
  const handleCaseLoaded = (newCase: CaseDossier) => {
    setCaseData(newCase);
    setCurrentTab('dossier');
    setCurrentView('game');
    soundManager.playDramaticSting();
  };

  return (
    <div className="min-h-screen bg-[#0b0c12] text-[#c5c6c7] font-['Vazirmatn',sans-serif] selection:bg-amber-800/40 selection:text-amber-200">
      {/* Courtroom Ambient Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/15 via-[#0b0c12] to-[#08090d] pointer-events-none -z-10" />

      {/* 1. Main Menu View (Initial state when app opens) */}
      {currentView === 'menu' ? (
        <MainMenu
          onStartConsultation={handleStartConsultationFromMenu}
          presetCases={presetCases}
          onSelectCase={handleCaseLoaded}
          isSoundOn={isSoundOn}
          setIsSoundOn={setIsSoundOn}
          onGavelStrike={handleGavelClick}
        />
      ) : (
        /* 2. In-Session Game View */
        <div className="flex flex-col min-h-screen">
          {/* Top Navbar */}
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            caseTitle={caseData ? caseData.title : 'طراحی پرونده با هوش مصنوعی'}
            caseNumber={caseData ? caseData.caseNumber : 'کلاسه جدید'}
            isSoundOn={isSoundOn}
            setIsSoundOn={setIsSoundOn}
            onGavelClick={handleGavelClick}
            gavelAnimating={gavelAnimating}
            onReturnToMenu={() => {
              soundManager.playPaperRustle();
              setCurrentView('menu');
            }}
          />

          {/* Main View Area */}
          <main className="flex-1 pb-16">
            {currentTab === 'dossier' && caseData && (
              <CaseDossierView
                caseData={caseData}
                onSelectCharacterForCourt={handleSelectCharacterForCourt}
                onOpenVerdictModal={() => setIsVerdictModalOpen(true)}
                onPresentEvidenceInCourt={handlePresentEvidenceInCourt}
              />
            )}

            {currentTab === 'court' && caseData && (
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
              />
            )}

            {currentTab === 'verdict' && caseData && (
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

            {/* If user switched to dossier or court without a case loaded yet */}
            {(currentTab === 'dossier' || currentTab === 'court' || currentTab === 'verdict') && !caseData && (
              <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="p-8 rounded-3xl bg-[#131522] border border-stone-800 space-y-4 shadow-xl">
                  <h3 className="text-lg font-bold text-stone-200">هنوز پرونده‌ای برای این دادگاه باز نشده است</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    ابتدا با جمینای پرونده دلخواه خود را طراحی کنید یا از بایگانی پرونده‌ها یکی را برگزینید.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCurrentTab('consult')}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-stone-100 text-xs font-bold transition-all cursor-pointer"
                    >
                      طراحی پرونده با جمینای
                    </button>
                    <button
                      onClick={() => setCurrentView('menu')}
                      className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      بازگشت به منوی اصلی
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'consult' && (
              <ConsultationRoom
                onCaseGenerated={handleCaseLoaded}
                presetCases={presetCases}
                onSelectPresetCase={handleCaseLoaded}
              />
            )}
          </main>

          {/* Verdict Modal */}
          {caseData && (
            <VerdictModal
              caseData={caseData}
              isOpen={isVerdictModalOpen}
              onClose={() => setIsVerdictModalOpen(false)}
              onSubmitVerdict={handleSubmitVerdict}
              onStartNewCase={() => {
                setIsVerdictModalOpen(false);
                setCurrentTab('consult');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
