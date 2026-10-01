import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { PRESET_CASES } from './src/data/presets.ts';
import { CaseDossier, Character } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Gemini AI Client (Railway Proxy / Bridge Setup)
// Supports GEMINI_API_KEY, GOOGLE_API_KEY, and optional custom reverse proxy endpoint (GEMINI_BASE_URL)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || '';
const customBaseUrl = process.env.GEMINI_BASE_URL || process.env.GOOGLE_GENAI_BASE_URL || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      ...(customBaseUrl ? { baseUrl: customBaseUrl } : {}),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-judge-app',
        },
      },
    });
    console.log('[پل جمینای] ارتباط با سرویس هوش مصنوعی جمینای فعال گردید.');
  } catch (err) {
    console.error('[پل جمینای] خطا در راه‌اندازی کلاینت هوش مصنوعی:', err);
  }
} else {
  console.warn('[پل جمینای] کلید GEMINI_API_KEY در متغیرهای محیطی یافت نشد. شبیه‌ساز آفلاین فعال است.');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // STATIC ASSETS & IMAGE DELIVERY (Railway Fix)
  // Ensures images are served with proper headers without text/html 404 fallback
  // ==========================================
  const serveImageHandler = (req: Request, res: Response, next: express.NextFunction) => {
    const ext = path.extname(req.path).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(ext)) {
      return next();
    }
    const filename = path.basename(req.path);
    const candidatePaths = [
      path.resolve(__dirname, 'public/images', filename),
      path.resolve(__dirname, 'public', filename),
      path.resolve(__dirname, 'dist/images', filename),
      path.resolve(__dirname, 'dist', filename),
      path.resolve(__dirname, 'src/assets/images', filename),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.setHeader('Content-Type', ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(p);
      }
    }
    next();
  };

  app.use(serveImageHandler);
  app.use('/images', express.static(path.resolve(__dirname, 'public/images')));
  app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));
  app.use(express.static(path.resolve(__dirname, 'public')));
  if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // ==========================================
  // GEMINI BRIDGE & API ROUTES
  // ==========================================

  // 0. Bridge Status (Check if user has active Gemini bridge on Railway)
  app.get('/api/bridge-status', (_req: Request, res: Response) => {
    res.json({
      active: !!ai,
      bridge: 'Railway Europe/Global Gateway',
      model: 'gemini-3.8-flash',
      noVpnNeeded: true,
      message: ai
        ? 'پل ارتباطی جمینای در سرور فعال و آماده است.'
        : 'سرور در حالت شبیه‌ساز آفلاین است. متغیر GEMINI_API_KEY را در پنل ریلوی وارد کنید.',
    });
  });

  // 1. Get Preset Cases
  app.get('/api/preset-cases', (_req: Request, res: Response) => {
    res.json(PRESET_CASES);
  });

  // 2. Chat with Gemini to consult and define case
  app.post('/api/chat-consult', async (req: Request, res: Response) => {
    const { messages, userPrompt } = req.body;

    if (!ai) {
      // High-quality offline fallback simulation
      const msgCount = (messages || []).length;
      const isReady =
        msgCount >= 2 ||
        (userPrompt && (userPrompt.includes('بساز') || userPrompt.includes('موافق') || userPrompt.includes('نهایی')));
      return res.json({
        reply: isReady
          ? `جناب قاضی، به نتیجه و توافق نهایی بر سر کلیات این پرونده رسیدیم! ماجرای جنایت، ترفند فریبکارانه متهم برای انکار جرم و تناقض پزشکی قانونی کاملاً مشخص گردید. هم‌اکنون می‌توانید دکمه «تایید نهایی و تشکیل رسمی پرونده» را بزنید تا دادگاه تشکیل شود.`
          : `جناب قاضی، ایده شما درباره «${userPrompt || 'پرونده جنایی'}» عالی است! پیشنهاد می‌کنم در این پرونده، متهم یک الایبی ساختگی ارائه دهد اما گزارش دوربین مداربسته یا کالبدشکافی دروغ او را آشکار کند. نظرتان درباره این پیچش چیست؟`,
        isReadyToBuild: isReady,
      });
    }

    try {
      const historyContext = (messages || [])
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'قاضی' : 'مشاور هوش مصنوعی'}: ${m.content}`)
        .join('\n');

      const systemPrompt = `شما مشاور ارشد جنایی و کارآگاه همکار قاضی در بازی «آقای قاضی» هستید.
شما و جناب قاضی باید از طریق گفتگو به یک سناریوی جنایی بی‌نقص، جذاب و پر از تناقض برسید.

روش کار شما:
۱. ایده‌های قاضی را بررسی کنید، سوالات هوشمندانه بپرسید (مثلاً: انگیزه جنایت چه باشد؟ متهم چه دروغی برای تبرئه خود بگوید؟ چه مدرک متناقضی باید دروغش را لو دهد؟).
۲. پاسخ‌های شما حتماً به زبان فارسی، مهیج، رازآلود، رسمی و با احترام قضایی باشد (حداکثر ۲ تا ۴ بند).
۳. اگر قاضی اعلام رضایت کرد (مثلاً گفت: «خوبه»، «موافقم»، «بساز»، «همین عالیه»، «نهایی کن») یا اگر پس از چند مرحله گفتگو به یک طرح کامل و منسجم رسیدید، صریحاً اعلام کنید که به تفاهم نهایی رسیدید و در انتهای پیامتان عبارت دقیق «[READY_TO_BUILD]» را درج کنید تا سیستم دکمه تشکیل رسمی پرونده را فعال کند.`;

      const prompt = `${systemPrompt}\n\nتاریخچه گفتگوی قبلی قاضی و مشاور:\n${historyContext}\n\nپیام جدید قاضی: ${userPrompt}\n\nپاسخ مشاور جنایی:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const isReadyToBuild =
        responseText.includes('[READY_TO_BUILD]') ||
        (userPrompt &&
          (userPrompt.includes('بساز') || userPrompt.includes('نهایی کن') || userPrompt.includes('موافقم')));

      const cleanReply = responseText.replace('[READY_TO_BUILD]', '').trim();

      res.json({
        reply: cleanReply,
        isReadyToBuild,
      });
    } catch (error) {
      console.error('Error in chat-consult:', error);
      res.json({
        reply: `جناب قاضی، یادداشت‌های تکمیلی پرونده ثبت شد. تمامی نکات مطرح شده در سناریو لحاظ خواهد شد و آماده صدور کیفرخواست هستیم.`,
        isReadyToBuild: true,
      });
    }
  });

  // 3. Generate Complete Case Dossier based on Consultation Consensus
  app.post('/api/generate-case', async (req: Request, res: Response) => {
    const { customIdea, consultationSummary, consultationThread, genre } = req.body;

    if (!ai) {
      const template = PRESET_CASES[Math.floor(Math.random() * PRESET_CASES.length)];
      const customCase: CaseDossier = {
        ...template,
        id: `case-custom-${Date.now()}`,
        caseNumber: `۱۴۰۵/${Math.floor(100 + Math.random() * 900)}-ج`,
        title: customIdea ? `پرونده ویژه: ${customIdea.slice(0, 35)}` : template.title,
      };
      return res.json(customCase);
    }

    try {
      const prompt = `شما طراح ارشد پرونده‌های جنایی برای بازی کارآگاهی و قضاوت «آقای قاضی» هستید.
قاضی و مشاور هوش مصنوعی طی گفتگوی زیر به یک توافق کامل بر سر سناریوی جنایی رسیده‌اند:

=== شرح توافقات و گفتگوی قاضی با مشاور ===
${consultationThread || consultationSummary || customIdea || 'یک قتل پیچیده با مظنون فریبکار و مدارک جعلی'}
=============================================

بر اساس این گفتگو و توافق حاصل‌شده، پرونده جنایی نهایی را به صورت یک ساختار JSON کامل و معتبر ایجاد کنید.
پرونده باید حتماً منطبق با موضوع، اسامی، محل و شواهد مورد توافق در متن بالا باشد!

الزامات دقیق:
۱. فضای پرونده دارک، جنایی، جدی و معمایی باشد.
۲. حتماً اشخاص شامل موارد زیر باشد:
   - حداقل یک «متهم» (defendant) که در پرونده دست داشته و با یک استراتژی فریبکارانه دقیق (deceptionStrategy) سعی در فریب قاضی دارد.
   - یک «شاکی» (plaintiff)
   - یک «وکیل مدافع» (defense_lawyer) با ادبیات حقوقی دفاعی
   - یک «متخصص پزشکی قانونی یا کارآگاه» (expert) با مدارک و آزمایش‌های متقن
   - یک «شاهد عینی یا شخص ثالث» (witness)
۳. شامل ۴ تا ۶ مدرک و شواهد فیزیکی، پزشکی قانونی، دیجیتال یا اسناد با گزارش آزمایشگاه.
۴. حقیقت پنهان (hiddenTruth) که نشان می‌دهد واقعاً چه کسی مقصر است، انگیزه واقعی چیست و کلید تناقضی که دروغ متهم را برملا می‌کند چیست.
۵. خروجی باید کاملاً یک ساختار معتبر JSON با کلیدهای زیر باشد (بدون هیچ متن اضافی قبل یا بعد از JSON):

{
  "id": "case-${Date.now()}",
  "caseNumber": "۱۴۰۵/...-ج",
  "title": "عنوان پرونده جنایی طبق توافق",
  "genre": "ژانر و موضوع جرم",
  "incidentDate": "تاریخ و ساعت وقوع",
  "location": "مکان دقیق وقوع جنایت طبق توافق",
  "victimName": "نام و مشخصات مقتول",
  "victimBackground": "پیشینه و روابط مقتول",
  "briefing": "گزارش مشروح واقعه و صحنه جرم برای مطالعه قاضی",
  "autopsyReport": {
    "timeOfDeath": "زمان دقیق مرگ طبق نظر پزشکی قانونی",
    "causeOfDeath": "علت مرگ",
    "toxicology": "نتایج سم‌شناسی",
    "injuries": ["جراحت ۱", "جراحت ۲"],
    "coronerNotes": "نکات کلیدی کالبدشکافی که تناقض ادعای متهم را نشان می‌دهد"
  },
  "evidence": [
    {
      "id": "ev-1",
      "title": "نام مدرک",
      "type": "physical",
      "description": "شرح مدرک",
      "foundAt": "محل کشف مدرک",
      "significance": "اهمیت مدرک در اثبات یا رد ادعاها",
      "labReport": "نتیجه بررسی آزمایشگاهی آگاهی"
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "name": "نام شخص",
      "role": "defendant",
      "roleTitle": "سمت در دادگاه (مثلا متهم ردیف اول)",
      "age": 35,
      "occupation": "شغل",
      "relationToVictim": "نسبت با مقتول",
      "personality": "شخصیت و روانشناسی",
      "initialStatement": "اظهارات اولیه در صحن دادگاه",
      "suspicionLevel": 70,
      "isLying": true,
      "deceptionStrategy": "ترفند و دروغ متهم برای فریب قاضی طبق توافق",
      "vulnerabilities": ["مدرک یا تناقضی که دروغش را لو می‌دهد"]
    }
  ],
  "hiddenTruth": {
    "realCulpritId": "char-1",
    "realCulpritName": "نام مقصر واقعی",
    "motive": "انگیزه واقعی جنایت طبق توافق",
    "howCrimeHappened": "شرح واقعی چگونگی وقوع جرم به ترتیب ساعت",
    "keyContradiction": "تناقض اساسی که قاضی باید از تطبیق مدارک با ادعای متهم کشف کند"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const responseText = response.text || '';
      const parsedCase = JSON.parse(responseText) as CaseDossier;
      res.json(parsedCase);
    } catch (error) {
      console.error('Error generating case:', error);
      const template = PRESET_CASES[0];
      res.json({
        ...template,
        id: `case-custom-${Date.now()}`,
        title: customIdea ? `پرونده: ${customIdea.slice(0, 30)}` : template.title,
      });
    }
  });

  // 4. Live Interrogation of Summoned Person in Courtroom
  app.post('/api/interrogate', async (req: Request, res: Response) => {
    const { caseData, characterId, question, evidencePresentedId, history } = req.body;

    const char = (caseData?.characters || []).find((c: Character) => c.id === characterId);
    if (!char) {
      return res.status(404).json({ error: 'شخص مورد نظر در دادگاه یافت نشد' });
    }

    const evidence = evidencePresentedId
      ? (caseData?.evidence || []).find((e: { id: string }) => e.id === evidencePresentedId)
      : null;

    if (!ai) {
      // High fidelity offline reply
      const isDef = char.role === 'defendant';
      return res.json({
        speech: isDef
          ? `جناب قاضی، بنده بارها عرض کرده‌ام که در آن لحظه شوم فرسنگ‌ها از آنجا دور بودم! این اتهامات ساخته و پرداخته دشمنان من است.`
          : `ریاست محترم دادگاه، آنچه دیدم و شنیدم را صادقانه در محضر عدالت بیان کردم.`,
        innerThought: isDef ? 'باید خونسرد بمانم و اجازه ندهم متوجه تناقض زمان‌بندی بشوند...' : undefined,
        slipUp: evidence ? `تناقض در خصوص مکان کشف ${evidence.title}` : undefined,
        stressDelta: evidence ? 15 : 5,
      });
    }

    try {
      const historyStr = (history || [])
        .map((h: { sender: string; text: string }) => `${h.sender}: ${h.text}`)
        .join('\n');

      const isDefendant = char.role === 'defendant';
      const isWitness = char.role === 'witness';
      const isExpert = char.role === 'expert';

      const prompt = `شما در حال نقش‌آفرینی زنده در صحن دادگاه جنایی بازی «آقای قاضی» هستید.
نام شخصیتی که باید نقشش را بازی کنید: ${char.name}
نقش در دادگاه: ${char.roleTitle} (${char.role})
سن: ${char.age} سال | شغل: ${char.occupation}
روابط با قربانی: ${char.relationToVictim}
روحیات و شخصیت: ${char.personality}
استراتژی دروغ و فریب متهم: ${char.deceptionStrategy || 'ندارد'}
نقاط ضعف و تناقضات متهم: ${(char.vulnerabilities || []).join(', ')}

خلاصه پرونده:
${caseData.briefing}
حقیقت پنهان واقعی پشت پرده:
${caseData.hiddenTruth.howCrimeHappened}
تناقض کلیدی پرونده: ${caseData.hiddenTruth.keyContradiction}

سابقه سوال و جواب‌های قبلی در دادگاه:
${historyStr}

سوال یا مواجهه فعلی قاضی:
"${question}"
${evidence ? `مدرک پیوست‌شده توسط قاضی که شخص با آن مواجه شده است:\nعنوان مدرک: ${evidence.title}\nشرح مدرک: ${evidence.description}\nمحل کشف: ${evidence.foundAt}\nگزارش آزمایشگاه: ${evidence.labReport}` : 'هیچ مدرک فیزیکی ارائه نشده است.'}

دستورالعمل ایفای نقش:
۱. کاملاً در قالب این کاراکتر با لحن و احساسات واقعی صحبت کنید (ترس، انکار، لکنت، غرور، دفاع حقوقی یا پرخاشگری).
۲. اگر متهم هستید، بر اساس استراتژی فریبکاری خود دروغ بگویید یا انکار کنید. اما اگر قاضی مدرکی ارائه داد که با ادعای شما تناقض دارد، دچار تپش قلب و دستپاچگی شوید و شاید دچار لغزش زبانی کوچک (slipUp) شوید!
۳. اگر وکیل مدافع نیاز به مداخله دید (اعتراض به نحوه سوال قاضی یا مدرک نامعتبر)، متن اعتراض وکیل را نیز پر کنید.

خروجی صرفاً یک JSON معتبر باشد با ساختار زیر (بدون هیچ کلمه اضافی):
{
  "speech": "پاسخ مستقیم و دیالوگ کاراکتر در صحن دادگاه به زبان فارسی",
  "innerThought": "فکر مخفیانه یا استرس درون ذهن کاراکتر (اختیاری)",
  "slipUp": "اگر متهم دچار تناقض یا سوتی کلامی شد شرح کوتاه آن، در غیر این صورت null",
  "stressDelta": 10, // تغییر میزان استرس متهم بین -10 تا +25
  "lawyerIntervention": "اگر وکیل مدافع کاراکتر اعتراض قانونی دارد متن اعتراض او، در غیر این صورت null"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error) {
      console.error('Error in interrogate API:', error);
      res.json({
        speech: `جناب قاضی، در خصوص این مورد توضیح دیگری ندارم و خواهان بررسی مجدد اوراق پرونده هستم.`,
        stressDelta: 5,
      });
    }
  });

  // 5. Judge Final Verdict Evaluation
  app.post('/api/judge-verdict', async (req: Request, res: Response) => {
    const { caseData, accusedId, verdictType, verdictReasoning, penalty } = req.body;

    const chosenPerson = (caseData?.characters || []).find((c: Character) => c.id === accusedId);
    const realCulpritId = caseData?.hiddenTruth?.realCulpritId;
    const isDirectMatch = accusedId === realCulpritId;

    if (!ai) {
      const isCorrect = isDirectMatch && verdictType === 'guilty';
      return res.json({
        isCorrect,
        justiceRating: isCorrect ? 94 : 35,
        truthRevealed: caseData?.hiddenTruth?.howCrimeHappened || 'پرونده مختومه شد.',
        feedback: isCorrect
          ? 'آفرین جناب قاضی! شما موفق شدید مجرم واقعی را شناسایی و تناقض مدارک را برملا کنید.'
          : 'حکم صادره متاسفانه با حقیقت ماجرا مغایرت داشت و فرد بی‌گناه مجازات گردید.',
        deceptionBusted: isCorrect,
        epilogue: 'پرونده با صدور دادنامه به اجرای احکام دادگستری ارسال شد.',
        culpritConfession: isCorrect ? 'اعتراف می‌کنم... فکر نمی‌کردم متوجه آن تناقض شوید!' : undefined,
      });
    }

    try {
      const evaluationPrompt = `شما هیئت عالی نظارت قضایی بر احکام دادگاه جنایی در بازی «آقای قاضی» هستید.
پرونده: ${caseData.title}
شرح واقعه: ${caseData.briefing}
حقیقت پنهان واقعی:
مجرم اصلی: ${caseData.hiddenTruth.realCulpritName} (آیدی: ${realCulpritId})
انگیزه واقعی: ${caseData.hiddenTruth.motive}
نحوه وقوع: ${caseData.hiddenTruth.howCrimeHappened}
تناقض کلیدی: ${caseData.hiddenTruth.keyContradiction}

حکم صادره توسط قاضی (بازیکن):
شخص انتخاب شده: ${chosenPerson?.name || 'نامشخص'} (آیدی: ${accusedId})
نوع حکم: ${verdictType} (مثلاً guilty به معنای محکوم، acquitted به معنای تبرئه)
استدلال قاضی: ${verdictReasoning}
میزان مجازات تعیینی: ${penalty || 'تعیین نشده'}

وظیفه شما:
۱. بررسی کنید آیا قاضی درست تشخیص داده و مجرم واقعی را محکوم کرده است؟
۲. آیا استدلال قاضی به تناقض اصلی و مدارک معتبر اشاره کرده است؟
۳. نمره عدالت (justiceRating بین ۰ تا ۱۰۰) بدهید.
۴. شرح کامل حقیقت را برای کاربر فاش کنید تا بفهمد واقعاً پشت پرده چه گذشته بوده.
۵. خروجی صرفاً یک JSON معتبر باشد با فرمت:
{
  "isCorrect": true/false,
  "justiceRating": 95,
  "truthRevealed": "شرح کامل و جذاب حقیقت واقعی پشت پرده جنایت",
  "feedback": "تحلیل عملکرد قاضی: نقاط قوت استدلال و مواردی که قاضی متوجه شد یا غفلت کرد",
  "deceptionBusted": true/false,
  "epilogue": "سرنوشت پرونده، متهم و شاکی پس از اجرای این حکم",
  "culpritConfession": "جملات اعتراف یا واکنش نهایی مقصر در لحظه اعلام حکم"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: evaluationPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error) {
      console.error('Error evaluating verdict:', error);
      const isCorrect = isDirectMatch && verdictType === 'guilty';
      res.json({
        isCorrect,
        justiceRating: isCorrect ? 90 : 40,
        truthRevealed: caseData?.hiddenTruth?.howCrimeHappened || 'پرونده بررسی شد.',
        feedback: isCorrect ? 'رأی منطبق بر حقیقت و مدارک موجود اصدار یافت.' : 'حکم صادره با واقعیت مادی پرونده همخوانی نداشت.',
        deceptionBusted: isCorrect,
        epilogue: 'پرونده به اجرای احکام دادسرا ارجاع شد.',
      });
    }
  });

  // ==========================================
  // SPA SERVING (Production & Development)
  // ==========================================
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT !== undefined ||
    fs.existsSync(path.resolve(__dirname, 'dist/index.html'));

  if (isProduction && fs.existsSync(path.resolve(__dirname, 'dist/index.html'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api') || req.path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|map)$/i)) {
        return res.status(404).send('Asset not found');
      }
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[آقای قاضی] پل هوشمند دادگاه و سرور روی پورت ${PORT} آماده پاسخگویی است.`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
