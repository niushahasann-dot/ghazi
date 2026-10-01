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

  // Case loaded
  const [caseData, setCaseData] = useState<CaseDossier | null>(null);
  const [presetCases, setPresetCases] = useState<CaseDossier[]>(PRESET_CASES);

  const [activeCharacterId, setActiveCharacterId] = useState<string>('');
  const [characterStressMap, setCharacterStressMap] = useState<Record<string, number>>({});
  
  // Single Unified Group Chat stream for all courtroom dialogue Sequential Log!
  const [courtroomMessages, setCourtroomMessages] = useState<InterrogationMessage[]>([]);
  
  const [selectedEvidenceToConfront, setSelectedEvidenceToConfront] = useState<EvidenceItem | null>(null);
  const [isVerdictModalOpen, setIsVerdictModalOpen] = useState(false);
  const [gavelAnimating, setGavelAnimating] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isInterrogating, setIsInterrogating] = useState(false);

  // Heated Dispute states
  const [isDisputeActive, setIsDisputeActive] = useState(false);
  const [isDisputeLoading, setIsDisputeLoading] = useState(false);
  const [disputeTimeoutIds, setDisputeTimeoutIds] = useState<number[]>([]);

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
      setCourtroomMessages([]);
      setSelectedEvidenceToConfront(null);
      setIsDisputeActive(false);
      setIsDisputeLoading(false);
      disputeTimeoutIds.forEach((id) => clearTimeout(id));
      setDisputeTimeoutIds([]);
    }
  }, [caseData]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      disputeTimeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [disputeTimeoutIds]);

  // Gavel Strike Event - Can silence heated disputes!
  const handleGavelClick = () => {
    soundManager.playGavel();
    setGavelAnimating(true);
    setTimeout(() => setGavelAnimating(false), 800);

    // If a Heated Dispute is currently active, stop it!
    if (isDisputeActive) {
      // Clear all pending dispute timeouts
      disputeTimeoutIds.forEach((id) => clearTimeout(id));
      setDisputeTimeoutIds([]);
      setIsDisputeActive(false);

      const gavelOrderMsg: InterrogationMessage = {
        id: `gavel-order-${Date.now()}`,
        sender: 'judge',
        senderName: 'ریاست محترم دادگاه (ضربه چکش)',
        text: '«سکوت! سکوت در صحن دادگاه! مرافعه خاتمه یابد و متهمین فوراً روی صندلی‌های خود مستقر شوند. در غیر این صورت به جرم اخلال در نظم دادرسی برخورد شدید قانونی خواهد شد!»',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setCourtroomMessages((prev) => [...prev, gavelOrderMsg]);
      return;
    }

    // Standard gavel announcement if no dispute is active
    if (currentView === 'game' && currentTab === 'court' && caseData) {
      const standardMsg: InterrogationMessage = {
        id: `gavel-${Date.now()}`,
        sender: 'judge',
        senderName: 'ریاست دادگاه (ضربه چکش)',
        text: '«سکوت و نظم در دادگاه! اظهارات صریح و بدون حاشیه بیان شود!»',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setCourtroomMessages((prev) => [...prev, standardMsg]);
    }
  };

  // Trigger a dynamic heated verbal dispute back-and-forth between suspects
  const triggerHeatedDispute = async () => {
    if (!caseData || isDisputeActive || isDisputeLoading) return;
    setIsDisputeLoading(true);
    soundManager.playDramaticSting();

    try {
      const lastMsg = courtroomMessages[courtroomMessages.length - 1]?.text || '';
      const response = await fetch('/api/generate-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          lastExchange: lastMsg,
        }),
      });
      const data = await response.json();
      const lines = data.argument?.argument || data.argument || [];

      if (Array.isArray(lines) && lines.length > 0) {
        setIsDisputeActive(true);
        setIsDisputeLoading(false);

        // Queue lines to be posted one-by-one every 3 seconds
        const timeouts: number[] = [];
        lines.forEach((line: any, index: number) => {
          const timeoutId = window.setTimeout(() => {
            // Only add if dispute is still active
            setIsDisputeActive((active) => {
              if (active) {
                if (index % 2 === 0) {
                  soundManager.playObjection();
                } else {
                  soundManager.playPaperRustle();
                }
                const disputeMsg: InterrogationMessage = {
                  id: `dispute-${Date.now()}-${index}`,
                  sender: 'dispute_character',
                  senderName: line.senderName,
                  text: line.text,
                  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                };
                setCourtroomMessages((prev) => [...prev, disputeMsg]);
              }
              return active;
            });
          }, (index + 1) * 3200);
          timeouts.push(timeoutId);
        });
        setDisputeTimeoutIds(timeouts);
      } else {
        setIsDisputeLoading(false);
      }
    } catch (err) {
      console.error(err);
      setIsDisputeLoading(false);
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

  // Interrogate in general group chat with dynamic Gemini routing and fuzzy match typos
  const handleSendMessage = async (text: string, evidenceId?: string) => {
    if (isInterrogating || !caseData) return;
    setIsInterrogating(true);

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

    // Append judge message to unified courtroom log
    setCourtroomMessages((prev) => [...prev, judgeMsg]);

    try {
      const response = await fetch('/api/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          question: text,
          evidencePresentedId: evidenceId,
          history: courtroomMessages.map((m) => ({
            sender: m.senderName,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();

      // Find which character actually responded based on Gemini dynamic routing
      const responderId = data.addressedCharacterId || activeCharacterId || caseData.characters[0].id;
      const responderChar = caseData.characters.find((c) => c.id === responderId) || caseData.characters[0];

      // Update active focused character to the one responding so their face, stress level, and card are highlighted
      setActiveCharacterId(responderId);

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
        setCourtroomMessages((prev) => [...prev, lawyerMsg]);
      }

      // Update stress for the responding character
      if (data.stressDelta) {
        setCharacterStressMap((prev) => {
          const oldVal = prev[responderId] ?? responderChar.suspicionLevel;
          const newVal = Math.min(100, Math.max(0, oldVal + data.stressDelta));
          if (newVal > 75) {
            soundManager.playHeartbeat();
          }
          return { ...prev, [responderId]: newVal };
        });
      }

      // If slip-up detected, play dramatic chord
      if (data.slipUp) {
        soundManager.playDramaticSting();
      }

      const characterReplyMsg: InterrogationMessage = {
        id: `msg-c-${Date.now()}`,
        sender: 'character',
        senderName: responderChar.name,
        characterId: responderChar.id,
        text: data.speech || 'جناب قاضی، پاسخ دیگری برای این ادعا ندارم.',
        innerThought: data.innerThought,
        slipUp: data.slipUp,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      setCourtroomMessages((prev) => [...prev, characterReplyMsg]);

      // If Gemini returned an organic autonomous interruption:
      if (data.interruption) {
        // Trigger a dramatic sequence!
        const tid1 = window.setTimeout(() => {
          soundManager.playObjection();
          const disputeMsg1: InterrogationMessage = {
            id: `dispute-auto-${Date.now()}-1`,
            sender: 'dispute_character',
            senderName: data.interruption.interrupterName,
            text: data.interruption.interrupterText,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          };
          setCourtroomMessages((prev) => [...prev, disputeMsg1]);

          // After another 1.8 seconds, the original character replies back in anger!
          const tid2 = window.setTimeout(() => {
            soundManager.playPaperRustle();
            const disputeMsg2: InterrogationMessage = {
              id: `dispute-auto-${Date.now()}-2`,
              sender: 'character',
              senderName: responderChar.name,
              characterId: responderChar.id,
              text: data.interruption.replyText,
              timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            };
            setCourtroomMessages((prev) => [...prev, disputeMsg2]);

            // Turn on active heated dispute mode so they keep trading generic/procedural barbs!
            setIsDisputeActive(true);
            
            // Queue generic angry back-and-forth lines to keep the argument alive until the gavel is hit!
            const timeouts: number[] = [];
            const genericAngryLines = [
              { senderName: data.interruption.interrupterName, text: 'جناب قاضی، این آقا دارد کاملاً دروغ می‌گوید تا خودش را تبرئه کند!' },
              { senderName: responderChar.name, text: 'خفه شو! تو خودت آن شب در عمارت بودی و کلید کتابخانه دست تو بود!' },
              { senderName: data.interruption.interrupterName, text: 'تهمت نزن شیاد! سوابق بانکی و الایبی جعلی تو همه چیز را آشکار خواهد کرد!' },
              { senderName: responderChar.name, text: 'سر جایت بنشین و بگذار حقیقت مشخص شود!' }
            ];
            genericAngryLines.forEach((line, index) => {
              const tid = window.setTimeout(() => {
                setIsDisputeActive((active) => {
                  if (active) {
                    soundManager.playObjection();
                    const nextMsg: InterrogationMessage = {
                      id: `dispute-auto-loop-${Date.now()}-${index}`,
                      sender: index % 2 === 0 ? 'dispute_character' : 'character',
                      senderName: line.senderName,
                      text: line.text,
                      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                    };
                    setCourtroomMessages((prev) => [...prev, nextMsg]);
                  }
                  return active;
                });
              }, (index + 1) * 3500);
              timeouts.push(tid);
            });
            setDisputeTimeoutIds(timeouts);

          }, 1800);
          setDisputeTimeoutIds((prev) => [...prev, tid2]);

        }, 1500);
        setDisputeTimeoutIds((prev) => [...prev, tid1]);
      }
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

      {/* 2. Dedicated Standalone Consultation & Design Room */}
      {currentView === 'consult' && (
        <div className="min-h-screen flex flex-col bg-[#0b0c14]">
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
                <span>طراحی آنی پرونده جدید با تایپ موضوع (جمینای)</span>
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

      {/* 3. In-Session Game View */}
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
                messages={courtroomMessages}
                onSendMessage={handleSendMessage}
                isLoading={isInterrogating}
                onGavelClick={handleGavelClick}
                characterStressMap={characterStressMap}
                selectedEvidenceToConfront={selectedEvidenceToConfront}
                setSelectedEvidenceToConfront={setSelectedEvidenceToConfront}
                onOpenDossier={() => setCurrentTab('dossier')}
                onOpenVerdict={() => setIsVerdictModalOpen(true)}
                isDisputeActive={isDisputeActive}
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
