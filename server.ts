import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { PRESET_CASES } from './src/data/presets.ts';
import { CaseDossier, Character, EvidenceItem } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model selection strictly restricted to Gemini 3.x series
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = Array.from(
  new Set([
    PRIMARY_MODEL,
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
  ])
);

// Helper to strip Markdown codeblocks before JSON parsing
function parseJsonFromAi<T>(rawText: string): T {
  let cleaned = (rawText || '').trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

// 1. Initialize Gemini AI Client
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
    console.log(`[پل جمینای] ارتباط با سرویس هوش مصنوعی جمینای (${PRIMARY_MODEL}) فعال گردید.`);
  } catch (err) {
    console.error('[پل جمینای] خطا در راه‌اندازی کلاینت هوش مصنوعی:', err);
  }
} else {
  console.warn('[پل جمینای] کلید GEMINI_API_KEY در متغیرهای محیطی یافت نشد. مولد هوشمند داستان جنایی فعال شد.');
}

// Helper to generate content with automatic model fallback & 429 quota backoff
async function generateAiContent(prompt: string, isJsonMode = false, temperature = 0.85) {
  if (!ai) throw new Error('AI client not initialized');

  let lastError: unknown = null;
  const triedModels = new Set<string>();

  for (const modelCandidate of FALLBACK_MODELS) {
    if (triedModels.has(modelCandidate)) continue;
    triedModels.add(modelCandidate);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: prompt,
          config: {
            ...(isJsonMode ? { responseMimeType: 'application/json' } : {}),
            temperature,
          },
        });
        if (response && response.text) {
          return { text: response.text, usedModel: modelCandidate };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const is429 = err?.status === 429 || errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED');
        console.warn(`[پل جمینای] مدل ${modelCandidate} (تلاش ${attempt}) ${is429 ? 'دچار سقف تعداد درخواست (429)' : 'پاسخ نداد'}`);
        lastError = err;

        if (is429 && attempt === 1) {
          // Pause briefly for 1 second before retrying or switching models
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          break;
        }
      }
    }
  }
  throw lastError || new Error('All Gemini candidate models failed.');
}

// ============================================================================
// DYNAMIC PROCEDURAL NARRATIVE GENERATOR
// Creates realistic, organic Persian crime stories with custom names,
// without literal placeholder repeating of raw user search terms!
// ============================================================================
function generateProceduralCase(topic: string): CaseDossier {
  const cleanTopic = topic.trim();
  const caseId = `case-${Date.now()}`;
  const caseNum = `۱۴۰۵/${Math.floor(100 + Math.random() * 899)}-ج`;

  // Keyword categories
  const isFootball = /فوتبال|ورزش|بازیکن|رختکن|استادیوم|تیم|فینال/i.test(cleanTopic);
  const isCinema = /سینما|بازیگر|فیلم|جشنواره|کارگردان|ستاره|تئاتر/i.test(cleanTopic);
  const isCorporate = /نفت|هلدینگ|شرکت|اختلاس|مالی|بانک|پول|سرمایه/i.test(cleanTopic);
  const isYacht = /کشتی|دریا|قایق|سقوط|خلیج|جزیره|تفریحی/i.test(cleanTopic);
  const isLab = /آزمایشگاه|ژنتیک|دارو|پزشک|دانشمند|فرمول|بیمارستان/i.test(cleanTopic);

  if (isFootball) {
    return {
      id: caseId,
      caseNumber: caseNum,
      title: 'قتل سهمگین کاپیتان تیم ملی در رختکن آزادی',
      genre: 'جنایی، ورزشی و معمایی دارک',
      incidentDate: '۱۴۰۵/۰۷/۰۹ - ساعت ۲۰:۴۵ شب',
      location: 'رختکن اختصاصی ورزشگاه آزادی تهران',
      victimName: 'آرش دادگر (۲۷ ساله - ستاره و کاپیتان تیم ملی)',
      victimBackground: 'کاپیتان محبوب ۲۷ ساله که ساعات پایانی قبل از بازی فینال آسیا در رختکن به طرز فجیعی به قتل رسید.',
      briefing: 'گزارش ویژه دادسرا: ساعت ۲۰:۴۵ شب گذشته، جسد آرش دادگر روی نیمکت رختکن کشف شد. علائم کالبدشکافی حاکی از مسمومیت سریع با سم اعصاب نویچوک در نوشیدنی وی است. تحقیقات اولیه از ۵ شخص کلیدی حاضر در ورزشگاه آغاز گردیده است.',
      autopsyReport: {
        timeOfDeath: 'ساعت ۲۰:۱۵ الی ۲۰:۳۰ شب',
        causeOfDeath: 'تزریق دوز مهلک سم اعصاب نویچوک به نوشیدنی ورزشی',
        toxicology: 'مثبت - وجود ماده سمی شتاب‌دهنده در نمونه خون',
        injuries: ['آثار مقاومت روی مچ دست راست', 'ساییدگی پشت لبه گردن'],
        coronerNotes: 'سم دقیقاً ۱۵ دقیقه قبل از فوت به بطری نوشیدنی اضافه شده است.',
      },
      evidence: [
        {
          id: 'ev-f1',
          title: 'بطری نوشیدنی آلوده به سم نویچوک',
          type: 'physical',
          description: 'بطری نیمه‌خورده روی میز رختکن با اثر انگشت روی درب.',
          foundAt: 'میز اختصاصی مقتول در رختکن',
          significance: 'اثر انگشت سرمربی روی درب بطری شناسایی شد.',
          labReport: 'تطبیق کامل اثر انگشت شست سرمربی تیم.',
        },
        {
          id: 'ev-f2',
          title: 'تصاویر دوربین مداربسته راهروی رختکن',
          type: 'digital',
          description: 'ورود فردی با کاپشن مشکی و کلاه در ساعت ۲۰:۲۰.',
          foundAt: 'اتاق حراست ورزشگاه',
          significance: 'رد ادعای حضور سرمربی در اتاق آنالیز ویدئویی.',
          labReport: 'تطبیق نحوه راه رفتن با سرمربی متهم.',
        },
        {
          id: 'ev-f3',
          title: 'سند تعهد ۳ میلیاردی به سایت شرط‌بندی',
          type: 'document',
          description: 'تعهدنامه مالی روی باخت تیم در فینال.',
          foundAt: 'کیف دستی سرمربی متهم',
          significance: 'انگیزه اصلی حذف کاپیتان برای باخت تیم.',
          labReport: 'استعلام اصالت امضا از بانک مرکزی.',
        },
      ],
      characters: [
        {
          id: 'char-f1',
          name: 'رضا صولتی (۴۵ ساله)',
          role: 'defendant',
          roleTitle: 'متهم ردیف اول - سرمربی تیم',
          age: 45,
          occupation: 'سرمربی فوتبال',
          relationToVictim: 'سرمربی آرش دادگر',
          personality: 'جاه‌طلب، بدهکار به سایت‌های شرط‌بندی',
          initialStatement: '«جناب قاضی، آرش برای من مثل پسرم بود! من موقع حادثه در اتاق آنالیز ویدئویی بودم. این اتهامات خط‌دهی رقبای ماست!»',
          suspicionLevel: 80,
          isLying: true,
          deceptionStrategy: 'ادعای حضور در اتاق آنالیز، در حالی که دوربین راهرو خروج او را ثبت کرده است.',
          vulnerabilities: ['تناقض ساعت حضور در اتاق آنالیز با پرینت دوربین', 'بدهی ۳ میلیاردی به سایت‌های شرط‌بندی'],
        },
        {
          id: 'char-f2',
          name: 'امیرحسین جهانگیر (۵۲ ساله)',
          role: 'plaintiff',
          roleTitle: 'شاکی - مدیرعامل و مالک باشگاه',
          age: 52,
          occupation: 'مالک باشگاه ورزشی',
          relationToVictim: 'مدیر باشگاه آرش دادگر',
          personality: 'مقتدر و خواهان قصاص قاتل',
          initialStatement: '«ریاست دادگاه، سرمربی از هفته‌ها قبل بر سر مبالغ شرط‌بندی با مقتول درگیری کلامی شدید داشت!»',
          suspicionLevel: 25,
          isLying: false,
          deceptionStrategy: 'شفاف و خواهان کشف حقیقت.',
          vulnerabilities: [],
        },
        {
          id: 'char-f3',
          name: 'سامان افشار (۳۴ ساله)',
          role: 'defendant',
          roleTitle: 'متهم ردیف دوم - ایجنت مالی مقتول',
          age: 34,
          occupation: 'مدیر برنامه بازیکنان',
          relationToVictim: 'ایجنت رسمی مقتول',
          personality: 'طماع و پنهان‌کار',
          initialStatement: '«آرش قصد داشت قراردادش را فسخ کند اما من هرگز دستم به خون او آلوده نیست!»',
          suspicionLevel: 65,
          isLying: true,
          deceptionStrategy: 'پنهان کردن پیامک‌های تهدیدآمیز ۵ میلیاردی.',
          vulnerabilities: ['پرینت پیامک تهدید به مرگ در روز قبل از حادثه'],
        },
        {
          id: 'char-f4',
          name: 'دکتر کامران مهرآسا (۴۰ ساله)',
          role: 'expert',
          roleTitle: 'کارشناس رسمی - پزشک سم‌شناس',
          age: 40,
          occupation: 'پزشک ورزشی آگاهی',
          relationToVictim: 'پزشک معالج باشگاه',
          personality: 'دقیق و بی‌طرف',
          initialStatement: '«سم در دوز کشنده و دقیقاً ۱۵ دقیقه قبل از فوت وارد بطری نوشیدنی مقتول شده است.»',
          suspicionLevel: 10,
          isLying: false,
          deceptionStrategy: 'ارائه گزارش علمی متقن.',
          vulnerabilities: [],
        },
        {
          id: 'char-f5',
          name: 'فرهاد مجد (۲۹ ساله)',
          role: 'witness',
          roleTitle: 'شاهد - مسئول تدارکات رختکن',
          age: 29,
          occupation: 'مسئول تجهیزات رختکن',
          relationToVictim: 'تدارکات رختکن مقتول',
          personality: 'مضطرب اما راستگو',
          initialStatement: '«من دیدم سرمربی با کاپشن مشکی وارد رختکن شد و بطری نوشیدنی را روی میز گذاشت!»',
          suspicionLevel: 20,
          isLying: false,
          deceptionStrategy: 'شهادت مستقیم به جابجایی بطری.',
          vulnerabilities: [],
        },
      ],
      hiddenTruth: {
        realCulpritId: 'char-f1',
        realCulpritName: 'رضا صولتی (سرمربی تیم)',
        motive: 'بدهی ۳ میلیاردی به سایت‌های شرط‌بندی و ترس از افشای آن توسط کاپیتان تیم',
        howCrimeHappened: 'سرمربی تیم با کاپشن مشکی وارد رختکن شده، سم نویچوک را در بطری ورزشی مقتول حل کرده و با ادعای دروغین حضور در اتاق آنالیز قصد فریب دادگاه را داشته است.',
        keyContradiction: 'تطبیق اثر انگشت سرمربی روی بطری سمی و فیلم دوربین راهرو با ادعای الایبی دروغین او.',
      },
    };
  }

  if (isCinema) {
    return {
      id: caseId,
      caseNumber: caseNum,
      title: 'مسمومیت مرگبار سوپراستار سینما در اختتامیه جشنواره',
      genre: 'جنایی، هنری و رازآلود',
      incidentDate: '۱۴۰۵/۰۷/۰۹ - ساعت ۲۱:۳۰ شب',
      location: 'سالن همایش‌های برج میلاد - اتاق گریم پشت صحنه',
      victimName: 'سحر جاوید (۳۲ ساله - بازیگر سرشناس)',
      victimBackground: 'بازیگر مطرح سینما که لحظاتی پس از دریافت سیمرغ بلورین در پشت صحنه به طرز مشکوکی فوت کرد.',
      briefing: 'گزارش ویژه: سحر جاوید پس از دریافت سیمرغ در اتاق گریم با نوشیدن قهوه حاوی سیانور جان باخت. تحقیقات نشان می‌دهد کارگردان فیلم و بازیگر رقیب وی انگیزه‌های پنهانی قوی داشته‌اند.',
      autopsyReport: {
        timeOfDeath: 'ساعت ۲۱:۱۵ شب',
        causeOfDeath: 'مسمومیت حاد با سیانور پتاسیم',
        toxicology: 'وجود دوز فوق‌العاده بالای سیانور در مایع معده',
        injuries: ['کبودی روی لب‌ها', 'تشنج شدید تنفسی'],
        coronerNotes: 'سم کمتر از ۵ دقیقه قبل از نوشیدن وارد فنجان شده است.',
      },
      evidence: [
        {
          id: 'ev-c1',
          title: 'فنجان قهوه سرامیکی آلوده به سیانور',
          type: 'physical',
          description: 'فنجان قهوه مقتول با اثر انگشت کارگردان روی دسته.',
          foundAt: 'میز گریم پشت صحنه جشنواره',
          significance: 'اثر انگشت کارگردان روی دسته فنجان باقی مانده است.',
          labReport: 'تایید سیانور و اثر انگشت کامل کارگردان.',
        },
        {
          id: 'ev-c2',
          title: 'اسناد افشای اختلاس بودجه فیلم',
          type: 'document',
          description: 'گزارش حسابرسی ۱۰ میلیاردی که مقتول قصد افشای آن را داشت.',
          foundAt: 'کیف دستی مقتول',
          significance: 'انگیزه قاتل برای حق‌السکوت و جنایت.',
          labReport: 'تایید اصالت مدارک کشف شده.',
        },
      ],
      characters: [
        {
          id: 'char-c1',
          name: 'پیمان معتمد (۴۸ ساله)',
          role: 'defendant',
          roleTitle: 'متهم ردیف اول - کارگردان سینما',
          age: 48,
          occupation: 'کارگردان فیلم',
          relationToVictim: 'کارگردان فیلم مقتول',
          personality: 'خودشیفته و پنهان‌کار',
          initialStatement: '«جناب قاضی، سحر شاهکار فیلم من بود! من هنگام حادثه روی سن در حال مصاحبه با خبرنگاران بودم!»',
          suspicionLevel: 80,
          isLying: true,
          deceptionStrategy: 'ادعای حضور روی سن، در حالی که مصاحبه او ۱۰ دقیقه قبل تمام شده بود.',
          vulnerabilities: ['فیلم ضبط‌شده صحنه که ترک مصاحبه توسط او را ثبت کرده است'],
        },
        {
          id: 'char-c2',
          name: 'الناز فروزش (۳۰ ساله)',
          role: 'defendant',
          roleTitle: 'متهم ردیف دوم - بازیگر رقیب',
          age: 30,
          occupation: 'بازیگر سینما',
          relationToVictim: 'رقیب مقتول در جشنواره',
          personality: 'کینه‌توز و مغرور',
          initialStatement: '«من از مقتول متنفر بودم چون نقش من را گرفت، اما من او را نکشتم!»',
          suspicionLevel: 60,
          isLying: true,
          deceptionStrategy: 'انکار ورود به اتاق گریم.',
          vulnerabilities: ['کشف اثر پودر سیانور روی کیف دستی او'],
        },
        {
          id: 'char-c3',
          name: 'مهندس کاوه شریفی (۵۵ ساله)',
          role: 'plaintiff',
          roleTitle: 'شاکی - تهیه‌کننده فیلم و همسر مقتول',
          age: 55,
          occupation: 'تهیه‌کننده سینما',
          relationToVictim: 'همسر قانونی مقتول',
          personality: 'سوگوار و شاکی',
          initialStatement: '«کارگردان می‌خواست مانع افشای اختلاس مالی بودجه فیلم توسط سحر شود!»',
          suspicionLevel: 20,
          isLying: false,
          deceptionStrategy: 'خواهان قصاص کامل.',
          vulnerabilities: [],
        },
        {
          id: 'char-c4',
          name: 'دکتر هومن صبا (۴۵ ساله)',
          role: 'expert',
          roleTitle: 'کارشناس رسمی - سم‌شناس پزشکی قانونی',
          age: 45,
          occupation: 'سم‌شناس جنایی',
          relationToVictim: 'پزشک معاینه جسد',
          personality: 'دقیق و جدی',
          initialStatement: '«سم دقیقاً ۵ دقیقه قبل از سرو قهوه به فنجان افزوده شده است.»',
          suspicionLevel: 10,
          isLying: false,
          deceptionStrategy: 'ارائه مدارک آزمایشگاهی.',
          vulnerabilities: [],
        },
      ],
      hiddenTruth: {
        realCulpritId: 'char-c1',
        realCulpritName: 'پیمان معتمد (کارگردان)',
        motive: 'جلوگیری از افشای اسناد اختلاس ۱۰ میلیاردی بودجه فیلم توسط مقتول',
        howCrimeHappened: 'کارگردان فیلم قبل از رفتن به اتاق گریم، سیانور را وارد فنجان قهوه سحر کرده و با ادعای مصاحبه با خبرنگاران قصد انحراف دادگاه را داشته است.',
        keyContradiction: 'تطبیق اثر انگشت کارگردان روی دسته فنجان قهوه و انقضای زمان مصاحبه تلویزیونی او.',
      },
    };
  }

  // General Universal Organic Case Generator
  return {
    id: caseId,
    caseNumber: caseNum,
    title: `جنایت تاریک و راز پنهان در عمارت نیاوران`,
    genre: 'جنایی، معمایی و دادرسی دادگاهی',
    incidentDate: '۱۴۰۵/۰۷/۰۹ - ساعت ۲۱:۰۰ شب',
    location: 'عمارت خصوصی و دفتر کار نیاوران',
    victimName: 'مهندس کامران رستگار (۴۲ ساله - سرمایه‌گذار ارشد)',
    victimBackground: `سرمایه‌گذار برجسته‌ای که به دنبال اختلافات مالی سنگین و افشای اسناد محرمانه به قتل رسید.`,
    briefing: `گزارش آگاهی: ساعت ۲۱:۰۰ شب گذشته، جسد مهندس رستگار در اتاق کار شخصی‌اش کشف گردید. بررسی‌های جنایی نشان می‌دهد ۵ شخص مرتبط داستان‌های متناقضی درباره حضور خود بیان کرده‌اند که باید در صحن دادگاه بازجویی شوند.`,
    autopsyReport: {
      timeOfDeath: 'ساعت ۲۰:۳۰ الی ۲۱:۰۰ شب',
      causeOfDeath: 'انسداد مجاری تنفسی و مسمومیت ترکیبی',
      toxicology: 'مثبت - وجود ماده شیمیایی شتاب‌دهنده در خون',
      injuries: ['آثار کبودی روی مچ دست', 'ضربه به گیجگاه راست'],
      coronerNotes: 'جرم با برنامه‌ریزی قبلی و توسط فردی با دسترسی مستقیم انجام شده است.',
    },
    evidence: [
      {
        id: 'ev-u1',
        title: 'اسناد انتقال اموال با امضای جعل‌شده',
        type: 'document',
        description: 'اسناد مالی کشف‌شده در کشوی دفتر کار متهم.',
        foundAt: 'دفتر کار متهم اصلی',
        significance: 'ثبت انگیزه مالی دقیق برای وقوع جنایت.',
        labReport: 'تایید جعل امضای مقتول توسط متهم.',
      },
      {
        id: 'ev-u2',
        title: 'پرینت ردیابی دکل مخابراتی موبایل',
        type: 'digital',
        description: 'گزارش آنتن‌دهی گوشی متهم اصلی در زمان وقوع فوت.',
        foundAt: 'استعلام پلیس فتا',
        significance: 'رد کامل ادعای الایبی متهم مبنی بر حضور در شهر دیگر.',
        labReport: 'تایید حضور گوشی متهم در محدوده صحنه جرم.',
      },
    ],
    characters: [
      {
        id: 'char-u1',
        name: 'بهرام کاظمی (۴۵ ساله)',
        role: 'defendant',
        roleTitle: 'متهم ردیف اول - شریک کاری مقتول',
        age: 45,
        occupation: 'مدیر ارشد مالی',
        relationToVictim: 'شریک کاری و رقیب اصلی مقتول',
        personality: 'حیله‌گر و خونسرد',
        initialStatement: '«جناب قاضی، بنده در زمان وقوع حادثه در جلسه رسمی با شرکای خارجی بودم و هیچ نقشی در این ماجرا ندارم!»',
        suspicionLevel: 85,
        isLying: true,
        deceptionStrategy: 'ارائه فاکتور و الایبی جعلی برای ساعت وقوع جنایت.',
        vulnerabilities: ['تناقض ردیابی آنتن تلفن همراه با ادعای حضور در جلسه', 'بدهی ۵ میلیاردی به مقتول'],
      },
      {
        id: 'char-u2',
        name: 'شیوا خسروی (۳۶ ساله)',
        role: 'plaintiff',
        roleTitle: 'شاکی - همسر قانونی مقتول',
        age: 36,
        occupation: 'نماینده قانونی خانواده',
        relationToVictim: 'همسر مقتول',
        personality: 'متاثر و خواهان احقاق حق',
        initialStatement: '«ریاست محترم دادگاه، متهم ردیف اول بارها همسرم را بر سر اسناد مالی تهدید به مرگ کرده بود!»',
        suspicionLevel: 25,
        isLying: false,
        deceptionStrategy: 'ارائه پرینت تهدیدها به دادگاه.',
        vulnerabilities: [],
      },
      {
        id: 'char-u3',
        name: 'سرهنگ حامد نوری (۵۰ ساله)',
        role: 'expert',
        roleTitle: 'کارشناس رسمی - کارآگاه ویژه جنایی',
        age: 50,
        occupation: 'کارآگاه ارشد آگاهی',
        relationToVictim: 'مسئول بررسی صحنه جرم',
        personality: 'دقیق و قانون‌مدار',
        initialStatement: '«بررسی صحنه جرم نشان می‌دهد جنایت کاملاً برنامه‌ریزی‌شده و توسط فردی با دسترسی مستقیم رخ داده است.»',
        suspicionLevel: 10,
        isLying: false,
        deceptionStrategy: 'ارائه گزارش رسمی کشف جرم.',
        vulnerabilities: [],
      },
      {
        id: 'char-u4',
        name: 'امید نیازی (۳۱ ساله)',
        role: 'witness',
        roleTitle: 'شاهد - نگهبان شب ساختمان',
        age: 31,
        occupation: 'نگهبان و مسئول ایمنی',
        relationToVictim: 'کارمند ساختمان',
        personality: 'مضطرب و تیزبین',
        initialStatement: '«من دیدم متهم خروجش از ساختمان را طوری تنظیم کرد که ساعت دوربین‌ها خراب نشان داده شود!»',
        suspicionLevel: 30,
        isLying: false,
        deceptionStrategy: 'شاهد لغزش‌های متهم.',
        vulnerabilities: [],
      },
    ],
    hiddenTruth: {
      realCulpritId: 'char-u1',
      realCulpritName: 'بهرام کاظمی (شریک کاری)',
      motive: 'تصاحب اموال و تسویه بدهی ۵ میلیاردی به مقتول',
      howCrimeHappened: 'متهم ردیف اول وارد دفتر کار مقتول شده، اسناد جعل‌شده را قرار داده و با تنفس ماده سمی مقتول را به قتل رسانده است.',
      keyContradiction: 'تناقض فاحش الایبی متهم با ردیابی آنتن دکل مخابراتی و اسناد جعل‌شده در کیف وی.',
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Static Assets & Image Delivery
  const serveImageHandler = (req: Request, res: Response, next: NextFunction) => {
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

  // API Routes
  app.get('/api/bridge-status', (_req: Request, res: Response) => {
    res.json({
      active: !!ai,
      bridge: 'Railway Europe/Global Gateway',
      model: PRIMARY_MODEL,
      noVpnNeeded: true,
      message: ai
        ? `پل ارتباطی جمینای در سرور فعال و آماده است.`
        : 'سرور در حالت شبیه‌ساز آفلاین است. متغیر GEMINI_API_KEY را در پنل ریلوی وارد کنید.',
    });
  });

  app.get('/api/preset-cases', (_req: Request, res: Response) => {
    res.json(PRESET_CASES);
  });

  // Generate Complete Case Dossier based directly on topic/keyword
  app.post('/api/generate-case', async (req: Request, res: Response) => {
    const { customIdea, topicText } = req.body;
    const requestedTopic = (topicText || customIdea || 'قتل و جنایت پیچیده').trim();

    if (!ai) {
      const bespokeCase = generateProceduralCase(requestedTopic);
      return res.json(bespokeCase);
    }

    try {
      const prompt = `شما داستان‌نویس و طراح ارشد پرونده‌های جنایی برای بازی کارآگاهی و قضاوت «آقای قاضی» هستید.
موضوع کلی جنایت که کاربر درخواست کرده است: "${requestedTopic}"

دستورالعمل‌های بسیار مهم و حیاتی:
۱. ادبیات واقعی داستان‌نویسی جنایی:
   - به هیچ عنوان عبارت خام درخواستی ("${requestedTopic}") یا کلمات مصنوعی مانند "موضوع درخواستی" یا "پرونده ویژه موضوع..." را در متن، عناوین، سمت کاراکترها یا دیالوگ‌ها تکرار نکنید!
   - یک عنوان جذاب و طبیعی خلق کنید (مثال: به جای "پرونده موضوع قتل بازیکن فوتبال"، بنویسید "راز مقتول در رختکن استادیوم آزادی").
   - تمام اسامی، مشاغل، محل وقوع جرم، گزارش کالبدشکافی و مدارک باید مانند یک پرونده واقعی قضایی با داستان‌نویسی روان و مهیج فارسی نگاشته شوند.

۲. اشخاص چالش‌برانگیز (هر تعدادی که داستان نیاز دارد، به انتخاب خودتان بین ۳ تا ۹ نفر):
   - متهم ردیف اول (defendant): با استراتژی دروغین (deceptionStrategy) و الایبی محکم اما متناقض.
   - سایرین بر اساس نیاز داستان نظیر متهم ردیف دوم یا سوم، شاکی (plaintiff)، کارشناس (expert)، یا شهود کلیدی (witness) با روابط نزدیک یا دشمنی شخصی با قربانی یا متهمین.

۳. مدارک و حقیقت پنهان:
   - ۴ تا ۶ مدرک فیزیکی، پزشکی قانونی و دیجیتال.
   - حقیقت پنهان (hiddenTruth) شامل مقصر واقعی، انگیزه واقعی و کلید تناقضی که دروغ متهم را لو می‌دهد.

خروجی صرفاً یک ساختار معتبر JSON با کلیدهای زیر باشد (بدون هیچ متن اضافی قبل یا بعد از JSON):

{
  "id": "case-${Date.now()}",
  "caseNumber": "۱۴۰۵/...-ج",
  "title": "عنوان جذاب و داستانی پرونده (مثلاً: راز جنایت در برج پلاتین)",
  "genre": "ژانر و موضوع جرم",
  "incidentDate": "تاریخ و ساعت وقوع",
  "location": "مکان دقیق وقوع جنایت",
  "victimName": "نام کامل و عنوان مقتول",
  "victimBackground": "پیشینه و روابط مقتول",
  "briefing": "گزارش مشروح، جذاب و داستانی صحنه جرم برای مطالعه قاضی",
  "autopsyReport": {
    "timeOfDeath": "زمان دقیق مرگ طبق نظر پزشکی قانونی",
    "causeOfDeath": "علت اصلی فوت",
    "toxicology": "نتایج سم‌شناسی",
    "injuries": ["جراحت ۱", "جراحت ۲"],
    "coronerNotes": "نکات کلیدی کالبدشکافی که تناقض ادعای متهم را نشان می‌دهد"
  },
  "evidence": [
    {
      "id": "ev-1",
      "title": "نام مدرک داستانی",
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
      "name": "نام و فامیلی کامل شخص",
      "role": "defendant",
      "roleTitle": "سمت در دادگاه (مثلا متهم ردیف اول - سرمربی تیم)",
      "age": 38,
      "occupation": "شغل کامل شخص",
      "relationToVictim": "نسبت با مقتول",
      "personality": "شخصیت و روانشناسی کاراکتر",
      "initialStatement": "اظهارات اولیه طبیعی در صحن دادگاه",
      "suspicionLevel": 75,
      "isLying": true,
      "deceptionStrategy": "دروغ و ترفند متهم برای انحراف قاضی",
      "vulnerabilities": ["تناقض یا مدرکی که دروغش را لو می‌دهد"]
    }
  ],
  "hiddenTruth": {
    "realCulpritId": "char-1",
    "realCulpritName": "نام مقصر واقعی",
    "motive": "انگیزه واقعی جنایت",
    "howCrimeHappened": "شرح واقعی چگونگی وقوع جرم به ترتیب ساعت",
    "keyContradiction": "تناقض اساسی که قاضی باید از تطبیق مدارک کشف کند"
  }
}`;

      const resAi = await generateAiContent(prompt, true, 0.85);
      const parsedCase = parseJsonFromAi<CaseDossier>(resAi.text);
      res.json(parsedCase);
    } catch (error) {
      console.error('Error generating case via Gemini:', error);
      const bespokeCase = generateProceduralCase(requestedTopic);
      res.json(bespokeCase);
    }
  });

  // Dynamic Heated Verbal Argument Generator
  app.post('/api/generate-argument', async (req: Request, res: Response) => {
    const { caseData, lastExchange } = req.body;

    if (!ai) {
      // Offline fallback argument
      const c1 = caseData?.characters?.[0] || { name: 'متهم اول' };
      const c2 = caseData?.characters?.[1] || { name: 'متهم دوم' };
      return res.json({
        argument: [
          { senderName: c1.name, text: 'جناب قاضی، این آقا دارد کاملاً دروغ می‌گوید تا خودش را تبرئه کند!' },
          { senderName: c2.name, text: 'خفه شو! خودت آن شب کلید گاوصندوق را برداشتی و دوربین‌ها را خاموش کردی!' },
          { senderName: c1.name, text: 'تهمت نزن بی‌شرف! مدارک ردیابی موبایلت در نیاوران کاملاً ثبت شده است!' }
        ]
      });
    }

    try {
      const chars = caseData.characters || [];
      const charDetails = chars.map((c: Character) => `${c.name} (${c.roleTitle}) - روحیات: ${c.personality}`).join('\n');

      const prompt = `شما کارگردان تئاتر قضایی برای بازی «آقای قاضی» هستید.
یک درگیری و مرافعه لفظی شدید و انفجاری بین شخصیت‌های دادگاه نیاز داریم.
شخصیت‌های موجود در دادگاه:
${charDetails}

موضوع پرونده:
${caseData.title} | ${caseData.briefing}

آخرین صحبت رد و بدل شده در دادگاه: "${lastExchange || 'صحبت‌های قبلی اتهام‌زنی شرکا به هم'}"

یک مرافعه لفظی و دعوای داغ بین ۲ الی ۳ نفر از متهمان یا شاکیان (ترجیحاً کسانی که با هم تضاد منافع دارند، مثل متهم ردیف اول و شاهد کلیدی یا شاکی) بنویسید.
لحن باید بسیار پرخاشگر، عصبی، تند و طبیعی باشد (شامل تهمت زدن به هم، پریدن وسط حرف یکدیگر، قسم خوردن و تپق زدن به خاطر عصبانیت).

خروجی دقیقاً یک آرایه JSON با ساختار زیر باشد (هیچ متن دیگری ارسال نکنید):
[
  { "senderName": "نام دقیق کاراکتر اول", "text": "دیالوگ عصبانی اول..." },
  { "senderName": "نام دقیق کاراکتر دوم", "text": "پاسخ انفجاری دوم و پریدن وسط حرف کاراکتر اول..." },
  { "senderName": "نام دقیق کاراکتر اول", "text": "اتهام و فریاد متقابل کاراکتر اول..." },
  { "senderName": "نام دقیق کاراکتر سوم یا دوم", "text": "اعتراض تند بعدی..." }
]`;

      const resAi = await generateAiContent(prompt, true, 0.9);
      const argument = parseJsonFromAi<unknown>(resAi.text);
      res.json({ argument });
    } catch (error) {
      console.error('Error generating heated argument:', error);
      const c1 = caseData?.characters?.[0] || { name: 'متهم اول' };
      const c2 = caseData?.characters?.[1] || { name: 'متهم دوم' };
      res.json({
        argument: [
          { senderName: c1.name, text: 'جناب قاضی، او سعی دارد تقصیر را گردن من بیندازد در حالی که خودش مسئول اصلی بود!' },
          { senderName: c2.name, text: 'دروغ نگو! تو خودت آن شب با مقتول ملاقات خصوصی داشتی!' }
        ]
      });
    }
  });

  // Interrogation API with Autonomous Character Interruption based on Temperament
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
      const isDef = char.role === 'defendant';
      return res.json({
        speech: isDef
          ? `جناب قاضی، بنده (${char.name}) بارها عرض کرده‌ام که در زمان وقوع حادثه، هیچ نقشی در این جنایت نداشتم! ادعای من کاملاً روشن است و حقیقت به زودی مشخص می‌شود.`
          : `ریاست محترم دادگاه، بنده به عنوان ${char.roleTitle} آنچه دیدم و شنیدم را صادقانه بیان کردم.`,
        innerThought: isDef ? 'باید خونسرد بمانم و اجازه ندهم متوجه تناقض زمان‌بندی یا مدارک بشوند...' : undefined,
        slipUp: evidence ? `تناقض در خصوص مکان و چگونگی کشف ${evidence.title}` : undefined,
        stressDelta: evidence ? 18 : 6,
        interruption: null
      });
    }

    try {
      const historyStr = (history || [])
        .map((h: { sender: string; text: string }) => `${h.sender}: ${h.text}`)
        .join('\n');

      const otherChars = (caseData.characters || [])
        .filter((c: Character) => c.id !== characterId)
        .map((c: Character) => `- نام: ${c.name} | سمت: ${c.roleTitle} | روحیات: ${c.personality} | وضعیت اخلاقی: ${c.temperament || 'normal'}`)
        .join('\n');

      const prompt = `شما در حال نقش‌آفرینی زنده در صحن دادگاه جنایی بازی «آقای قاضی» هستید.
شخصیت اصلی که در تریبون است و باید پاسخ مستقیم بدهد:
نام: ${char.name}
نقش در دادگاه: ${char.roleTitle} (${char.role})
سن: ${char.age} سال | شغل: ${char.occupation}
روابط با قربانی: ${char.relationToVictim}
روحیات و شخصیت: ${char.personality}
وضعیت اخلاقی و عصبی کاراکتر (temperament): ${char.temperament || 'normal'} (calm=آرام، anxious=عصبی و تدافعی، normal=معمولی)
استراتژی دروغ و فریب متهم: ${char.deceptionStrategy || 'ندارد'}
نقاط ضعف و تناقضات متهم: ${(char.vulnerabilities || []).join(', ')}

سایر کاراکترهای حاضر در سالن دادگاه (که در جایگاه تماشاچیان یا صندلی خود نشسته‌اند):
${otherChars}

خلاصه پرونده جنایی:
${caseData.briefing}
حقیقت پنهان واقعی پشت پرده:
${caseData.hiddenTruth?.howCrimeHappened || ''}
تناقض کلیدی پرونده: ${caseData.hiddenTruth?.keyContradiction || ''}

سابقه سوال و جواب‌های قبلی در دادگاه:
${historyStr}

سوال یا مواجهه فعلی قاضی:
"${question}"
${evidence ? `مدرک پیوست‌شده توسط قاضی که شخص با آن مواجه شده است:\nعنوان مدرک: ${evidence.title}\nشرح مدرک: ${evidence.description}\nمحل کشف: ${evidence.foundAt}\nگزارش آزمایشگاه: ${evidence.labReport}` : 'هیچ مدرک فیزیکی ارائه نشده است.'}

دستورالعمل‌های ایفای نقش بسیار مهم:
۱. در قالب شخصیت اصلی پاسخ دقیق، داستانی و فارسی بدهید.
۲. اگر متهم هستید، بر اساس استراتژی خود دروغ بگویید یا انکار کنید. اما اگر با مدرک متناقض مواجه شدید، دستپاچه شوید و شاید دچار لغزش زبانی کوچک (slipUp) شوید.
۳. وکیل مدافع در صورت نیاز اعتراض خود را در "lawyerIntervention" ثبت کند.
۴. **شنوایی جمعی و آگاهی کامل در دادگاه (علنی بودن جلسه)**: توجه داشته باشید که اینجا یک دادگاه علنی است و تمام شخصیت‌های داخل سالن از جزئیات، سوال و جواب‌ها، شهادت‌ها و افشاگری‌های ثبت‌شده در «سابقه سوال و جواب‌های قبلی در دادگاه» کاملاً آگاهند و شنیده‌اند! شخصیت اصلی فعلی باید فعالانه به ادعاها، دروغ‌ها یا اتهاماتی که دیگران پیش از این علیه او بیان کرده‌اند واکنش نشان دهد، آن‌ها را رد و خنثی کند یا به متهم دیگر تهمت بزند (مثال: «جناب قاضی، کامران که چند لحظه پیش ادعا کرد من سم خریدم، کاملاً دروغ می‌گوید چون خودش...»).
۵. **مداخله و قطع کلام خودکار (interruption)**: بررسی کنید آیا این سوال قاضی یا مدرک پیوست‌شده، اتهام بزرگی را متوجه یکی دیگر از شخصیت‌های حاضر در صحن دادگاه می‌کند؟ یا اینکه صحبت‌های شخصیت اصلی، دروغ عیانی است که یکی از متهمان عصبی (anxious) یا شاکی را خشمگین می‌کند؟
   - اگر بله (به خصوص اگر شخصیت دیگر روحیاتی عصبی/anxious یا معمولی داشته باشد و احساس خطر کند)، او ناگهان بدون اجازه وسط صحبت می‌پرد و داد می‌زند!
   - در این صورت، بخش "interruption" را با مشخصات آن شخصیت پر کنید. در غیر این صورت آن را کاملاً null بگذارید.

خروجی صرفاً یک JSON معتبر باشد با ساختار زیر (بدون هیچ کلمه اضافی قبل یا بعد):
{
  "speech": "پاسخ مستقیم و دیالوگ کاراکتر اصلی در صحن دادگاه به زبان فارسی",
  "innerThought": "فکر مخفیانه یا استرس درون ذهن کاراکتر اصلی (اختیاری)",
  "slipUp": "اگر متهم اصلی دچار تناقض یا سوتی کلامی شد شرح کوتاه آن، در غیر این صورت null",
  "stressDelta": 10,
  "lawyerIntervention": "اگر وکیل مدافع کاراکتر اصلی اعتراض دارد متن اعتراض او، در غیر این صورت null",
  "interruption": {
    "interrupterId": "آیدی کاراکتر معترض که وسط حرف پرید",
    "interrupterName": "نام کاراکتر معترض",
    "interrupterText": "جمله تند، پرخاشگرانه و معترض کاراکتر معترض که بدون اجازه وسط حرف پریده و متهم اصلی یا قاضی را مخاطب قرار می‌دهد",
    "replyText": "پاسخ تند، متقابل و عصبی متهم اصلی در دفاع از خود به کاراکتر معترض"
  }
}`;

      const resAi = await generateAiContent(prompt, true, 0.85);
      const parsed = parseJsonFromAi<Record<string, any>>(resAi.text);
      res.json(parsed);
    } catch (error) {
      console.error('Error in interrogate API:', error);
      res.json({
        speech: `جناب قاضی، بنده (${char.name}) توضیحاتم را دادم و خواهان انطباق اسناد با گواهی شهود هستم.`,
        stressDelta: 5,
        interruption: null
      });
    }
  });

  // Verdict Evaluation API
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
مجرم اصلی: ${caseData.hiddenTruth?.realCulpritName || 'مشخص شده در پرونده'} (آیدی: ${realCulpritId})
انگیزه واقعی: ${caseData.hiddenTruth?.motive || ''}
نحوه وقوع: ${caseData.hiddenTruth?.howCrimeHappened || ''}
تناقض کلیدی: ${caseData.hiddenTruth?.keyContradiction || ''}

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

      const resAi = await generateAiContent(evaluationPrompt, true, 0.7);
      const parsed = parseJsonFromAi<Record<string, unknown>>(resAi.text);
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
    console.log(`[آقای قاضی] پل هوشمند دادگاه روی پورت ${PORT} فعال شد.`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
