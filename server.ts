import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { PRESET_CASES } from './src/data/presets.ts';
import { CaseDossier, Character } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes

  // 1. Get Preset Cases
  app.get('/api/preset-cases', (_req: Request, res: Response) => {
    res.json(PRESET_CASES);
  });

  // 2. Chat with Gemini to consult and define case
  app.post('/api/chat-consult', async (req: Request, res: Response) => {
    const { messages, userPrompt } = req.body;

    if (!ai) {
      // High-quality offline fallback simulation
      return res.json({
        reply: `جناب قاضی، ایده شما درباره «${userPrompt || 'پرونده جنایی'}» بسیار گیرا و مهیج است! پیشنهاد می‌کنم در این پرونده، متهم ردیف اول یک انگیزه مالی شدید داشته باشد ولی با ارائه یک شاهد ساختگی تلاش کند شما را فریب دهد. آیا مایلید در صحنه جرم سرنخ مسمومیت یا دستکاری پزشکی قانونی نیز گنجانده شود، یا ترجیح می‌دهید همین سناریو را بلافاصله برای دادگاه آماده و کلاسه کنم؟`,
      });
    }

    try {
      const historyContext = (messages || [])
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'قاضی' : 'مشاور هوش مصنوعی'}: ${m.content}`)
        .join('\n');

      const systemPrompt = `شما مشاور ارشد امور جنایی و بازپرسی در بازی دادگاهی «آقای قاضی» هستید.
مخاطب شما «جناب قاضی» است. بازیکن در حال مشورت با شماست تا مشخص کند چه پرونده جنایی ساخته شود.
وظیفه شما:
۱. با لحن رازآلود، رسمی و حرفه‌ای دادگاهی و جنایی به زبان فارسی پاسخ دهید.
۲. ایده‌های قاضی را پخته‌تر کنید، پیچش‌های داستانی هوشمندانه (خیانت، فریبکاری متهم، جعل اسناد، انگیزه‌های پنهان) پیشنهاد دهید.
۳. در پایان بپرسید آیا قاضی مایل است پرونده را نهایی و وارد دادگاه کند، یا هنوز جزییات دیگری مد نظر دارد.
پاسخ مختصر، جذاب و در حدود ۳ تا ۵ بند باشد.`;

      const prompt = `${systemPrompt}\n\nتاریخچه گفتگو:\n${historyContext}\n\nپیام جدید قاضی: ${userPrompt}\n\nپاسخ مشاور:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        reply: response.text || 'جناب قاضی، سناریوی پیشنهادی شما بررسی شد و آماده تدوین پرونده هستیم.',
      });
    } catch (error) {
      console.error('Error in chat-consult:', error);
      res.json({
        reply: `جناب قاضی، یادداشت‌های اولیه پرونده پیرامون «${userPrompt || 'جنایت مرموز'}» ثبت شد. شواهد صحنه جرم و لیست متهمان آماده بررسی و ورود به جلسه دادرسی است.`,
      });
    }
  });

  // 3. Generate Complete Case Dossier
  app.post('/api/generate-case', async (req: Request, res: Response) => {
    const { customIdea, consultationSummary, genre } = req.body;

    if (!ai) {
      // Return a dynamic variant of preset
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
یک پرونده جنایی کاملاً ساختگی، غنی، پر از معما و تناقض‌های ظریف ایجاد کنید.
موضوع/ایده درخواستی قاضی: ${customIdea || consultationSummary || 'یک قتل پیچیده با مظنون فریبکار و مدارک جعلی'}
ژانر: ${genre || 'معمایی، جنایی دارک'}

الزامات دقیق:
۱. فضای پرونده دارک، جنایی، جدی و معمایی باشد.
۲. حتماً اشخاص شامل موارد زیر باشد:
   - حداقل یک «متهم» (defendant) که مرتکب جرم شده یا به شدت مظنون است و یک استراتژی فریبکارانه (deceptionStrategy) برای گول زدن قاضی دارد.
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
  "title": "عنوان پرونده جنایی",
  "genre": "ژانر و موضوع جرم",
  "incidentDate": "تاریخ و ساعت وقوع",
  "location": "مکان دقیق وقوع جنایت",
  "victimName": "نام، سن و مشخصات مقتول",
  "victimBackground": "پیشینه و روابط مقتول",
  "briefing": "گزارش مشروح واقعه و صحنه جرم برای مطالعه قاضی",
  "autopsyReport": {
    "timeOfDeath": "زمان دقیق مرگ طبق نظر پزشکی قانونی",
    "causeOfDeath": "علت مرگ",
    "toxicology": "نتایج سم‌شناسی",
    "injuries": ["کبودی یا جراحت ۱", "جراحت ۲"],
    "coronerNotes": "نکات کلیدی کالبدشکافی که تناقض ادعای متهم را نشان می‌دهد"
  },
  "evidence": [
    {
      "id": "ev-1",
      "title": "نام مدرک",
      "type": "physical", // یا forensic یا document یا digital
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
      "role": "defendant", // یا plaintiff یا defense_lawyer یا expert یا witness
      "roleTitle": "سمت در دادگاه (مثلا متهم ردیف اول)",
      "age": 35,
      "occupation": "شغل",
      "relationToVictim": "نسبت با مقتول",
      "personality": "شخصیت و روانشناسی",
      "initialStatement": "اظهارات اولیه در صحن دادگاه",
      "suspicionLevel": 70,
      "isLying": true,
      "deceptionStrategy": "ترفند و دروغ متهم برای فریب قاضی",
      "vulnerabilities": ["مدرک یا تناقضی که دروغش را لو می‌دهد"]
    }
  ],
  "hiddenTruth": {
    "realCulpritId": "char-1",
    "realCulpritName": "نام مقصر واقعی",
    "motive": "انگیزه واقعی جنایت",
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
      // Fallback to random preset with custom title
      const template = PRESET_CASES[0];
      res.json({
        ...template,
        id: `case-fallback-${Date.now()}`,
        title: customIdea ? `پرونده: ${customIdea.slice(0, 30)}` : template.title,
      });
    }
  });

  // 4. Interrogate summoned person in courtroom
  app.post('/api/interrogate', async (req: Request, res: Response) => {
    const { caseData, characterId, question, evidencePresentedId, history } = req.body;

    const character: Character | undefined = caseData?.characters?.find((c: Character) => c.id === characterId);

    if (!character) {
      return res.status(404).json({ error: 'شخص مورد نظر در دادگاه یافت نشد.' });
    }

    const presentedEvidence = evidencePresentedId
      ? caseData.evidence?.find((e: { id: string }) => e.id === evidencePresentedId)
      : null;

    if (!ai) {
      // Dynamic local simulation
      let speech = '';
      let innerThought = '';
      let stressDelta = 5;
      let lawyerIntervention: string | null = null;
      let slipUp: string | null = null;

      if (character.role === 'defendant') {
        if (presentedEvidence) {
          speech = `جناب قاضی! درباره «${presentedEvidence.title}»... این نمی‌تواند مدرک محکمی باشد! کسی سعی کرده آن را آنجا بگذارد تا مرا مقصر جلوه دهد! من در آن ساعت اصلاً نزدیک آنجا نبودم!`;
          innerThought = 'رنگ از چهره‌اش پرید و دستانش را با اضطراب در جیبش پنهان کرد.';
          stressDelta = 20;
          lawyerIntervention = 'جناب قاضی، اعتراض دارم! ارائه مدارک به این شکل بدون ابلاغ رسمی قبلی موجب فشار روانی بر موکل من است.';
          slipUp = 'به طور ناخواسته اشاره کرد که وسیله در گوشه سمت راست بوده در حالی که در گزارش مکان دقیق ذکر نشده بود!';
        } else {
          speech = `آقای قاضی، من با کمال احترام حقیقت را گفتم. من هیچ نفعی از مرگ او نمی‌بردم و وجدانم کاملاً آسوده است. هر سؤالی دارید پاسخ می‌دهم.`;
          innerThought = 'با اعتماد به نفس تصنعی به چشم‌های قاضی خیره شد.';
          stressDelta = 2;
        }
      } else if (character.role === 'defense_lawyer') {
        speech = `جناب قاضی، اظهارات دادسرا صرفاً مبتنی بر حدسیات و قرائن ضعیف است. موکل من حق دارد بر اساس اصل برائت از هرگونه اتهام واهی مبرا شناخته شود.`;
        innerThought = 'پرونده را با جدیت ورق زد و عینکش را جابجا کرد.';
      } else if (character.role === 'expert') {
        speech = `طبق آزمایش‌های بیوشیمیایی و داده‌های فیزیکی، گزارش صحنه جرم کاملاً قطعی است. شواهد علمی هیچ جای شکی برای وقوع این رویداد با مشخصات قید شده باقی نمی‌گذارد.`;
        innerThought = 'با طمأنینه و نگاه به نتایج آزمایشگاهی پاسخ داد.';
      } else {
        speech = `جناب قاضی، من چیزی جز حقیقت نمی‌دانم. آن شب شرایط بسیار غیرعادی بود و من حاضر به ادای سوگند در محضر دادگاه هستم.`;
        innerThought = 'با صدایی آرام و نگران سخن گفت.';
      }

      return res.json({
        speech,
        innerThought,
        lawyerIntervention,
        stressDelta,
        slipUp,
      });
    }

    try {
      const historyContext = (history || [])
        .slice(-6)
        .map((h: { sender: string; text: string }) => `${h.sender}: ${h.text}`)
        .join('\n');

      const systemPrompt = `شما در حال نقش‌آفرینی زنده در دادگاه کیفری بازی «آقای قاضی» هستید.
اطلاعات پرونده:
عنوان: ${caseData.title}
خلاصه: ${caseData.briefing}
حقیقت پنهان (صرفاً برای اطلاع بازیگر و نه افشای مستقیم به قاضی):
مقصر واقعی: ${caseData.hiddenTruth.realCulpritName}
چگونگی وقوع: ${caseData.hiddenTruth.howCrimeHappened}
تناقض کلیدی: ${caseData.hiddenTruth.keyContradiction}

شخصیتی که باید نقش او را بازی کنید:
نام: ${character.name}
نقش: ${character.roleTitle} (${character.role})
سن: ${character.age}
روانشناسی: ${character.personality}
آیا دروغگو و مقصر است؟: ${character.isLying ? 'بله، مقصر است و سعی در فریب قاضی دارد' : 'خیر، حقیقت را می‌گوید یا از واقعیت مطلع است'}
استراتژی فریب: ${character.deceptionStrategy || 'ندارد'}
نقاط ضعف: ${(character.vulnerabilities || []).join('، ')}

شرایط فعلی دادگاه:
مدرک ارائه شده توسط قاضی در این لحظه: ${presentedEvidence ? `${presentedEvidence.title} (${presentedEvidence.description} - اهمیت: ${presentedEvidence.significance} - آزمایشگاه: ${presentedEvidence.labReport})` : 'مدرک خاصی ارائه نشده است.'}

دستورالعمل رفتاری:
- اگر نقش متهم را بازی می‌کنید: به شدت برای حفظ بی‌گناهی خود بجنگید، دستپاچه شوید اگر مدرک دندان‌شکنی ارائه شد، تناقض بگویید یا تهمت را به دیگری بزنید. اگر مدرک بسیار قوی است، دچار لکنت، دستپاچگی یا لغزش کلامی (slipUp) شوید!
- اگر وکیل مدافع هستید: اعتراضات حقوقی به جا یا تذکر به قاضی و حمایت از موکل داشته باشید.
- اگر متخصص یا شاهد هستید: بی‌طرف، مستند یا بر اساس مشاهدات واقعی صحبت کنید.
- خروجی صرفاً یک JSON معتبر باشد با ساختار زیر:
{
  "speech": "پاسخ زنده کاراکتر در دادگاه به فارسی",
  "innerThought": "توصیف زبان بدن و حالت چهره مثلا: (عرق سرد روی شقیقه‌اش نشست و نگاهم را دزدید)",
  "lawyerIntervention": "اگر وکیل مدافع نیاز به اعتراض فوری داشت متنش را بنویس وگرنه null",
  "stressDelta": عدد بین -10 تا +30 بر اساس فشار سوال و مدرک,
  "slipUp": "اگر کاراکتر سوتی داد یا ناخواسته حقیقتی را لو داد شرح بده وگرنه null"
}`;

      const userMessage = `تاریخچه گفتگو با این شخص:\n${historyContext}\n\nسؤال جدید قاضی: ${question}\nمدرک ارائه‌شده: ${presentedEvidence ? presentedEvidence.title : 'هیچ'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\n${userMessage}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error) {
      console.error('Error during interrogation:', error);
      res.json({
        speech: `جناب قاضی، من با نهایت احترام پاسخ دادم، اما ادعاهای مطرح شده نیاز به راستی‌آزمایی دارد.`,
        innerThought: 'با نگاهی مشکوک سکوت کرد.',
        stressDelta: 10,
        lawyerIntervention: null,
        slipUp: null,
      });
    }
  });

  // 5. Issue Verdict & Final Judgment Evaluation
  app.post('/api/judge-verdict', async (req: Request, res: Response) => {
    const { caseData, accusedId, verdictType, verdictReasoning, penalty } = req.body;

    const chosenPerson = caseData?.characters?.find((c: Character) => c.id === accusedId);
    const realCulpritId = caseData?.hiddenTruth?.realCulpritId;
    const isDirectMatch = accusedId === realCulpritId;

    if (!ai) {
      const isCorrect = isDirectMatch && verdictType === 'guilty';
      return res.json({
        isCorrect,
        justiceRating: isCorrect ? 94 : 45,
        truthRevealed: caseData?.hiddenTruth?.howCrimeHappened || 'حقیقت پشت پرده آشکار شد.',
        feedback: isCorrect
          ? 'آفرین جناب قاضی! شما فریب دروغ‌ها و الایبی متهم را نخوردید و عدالت به درستی اجرا شد.'
          : 'متاسفانه متهم توانست شما را فریب دهد یا مدارک اصلی نادیده گرفته شد.',
        deceptionBusted: isCorrect,
        epilogue: `دادگاه با انشای رأی شما به پایان رسید. پرونده کلاسه ${caseData?.caseNumber} مختومه گردید.`,
        culpritConfession: isCorrect ? 'متهم با دیدن استدلال محکم قاضی در هم شکست و به تمامی ابعاد جنایت اعتراف کرد.' : undefined,
      });
    }

    try {
      const evaluationPrompt = `شما دیوان عالی عدالت و ارزیاب قضایی بازی «آقای قاضی» هستید.
اطلاعات پرونده:
عنوان: ${caseData.title}
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
  "deceptionBusted": true/false (آیا ترفند فریبکارانه متهم خنثی شد؟),
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

  // Serve Frontend
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[آقای قاضی] Courtroom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
