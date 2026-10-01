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

// Model selection strictly prioritizing gemini-3.5-flash-lite for testing
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = Array.from(
  new Set([
    PRIMARY_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'models/gemini-3.5-flash-lite',
    'models/gemini-3.8-flash',
    'models/gemini-3.7-flash',
    'models/gemini-3.6-flash',
    'models/gemini-3.5-flash',
  ])
);

// ============================================================================
// SYSTEM LOGGING FRAMEWORK (For live debugging in the frontend UI)
// ============================================================================
export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
  details?: any;
}

export const systemLogs: SystemLog[] = [];

export function addSystemLog(type: SystemLog['type'], module: string, message: string, details?: any) {
  const log: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    module,
    message,
    details: details ? JSON.parse(JSON.stringify(details, Object.getOwnPropertyNames(details))) : undefined,
  };
  systemLogs.unshift(log);
  if (systemLogs.length > 150) {
    systemLogs.pop();
  }
  console.log(`[${log.timestamp}] [${type.toUpperCase()}] [${module}] ${message}`);
}

// Helper to strip Markdown codeblocks before JSON parsing
function parseJsonFromAi<T>(rawText: string): T {
  let cleaned = (rawText || '').trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

// 1. Initialize Gemini AI Client
const apiKey = process.env.MY_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || '';
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
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    addSystemLog('success', 'GeminiClient', `کلاینت هوش مصنوعی با موفقیت تنظیم شد. کلید استفاده شده: ${maskedKey}`);
    if (customBaseUrl) {
      addSystemLog('info', 'GeminiClient', `آدرس سفارشی سرور تنظیم شده است: ${customBaseUrl}`);
    }
  } catch (err: any) {
    addSystemLog('error', 'GeminiClient', `خطا در راه‌اندازی کلاینت هوش مصنوعی: ${err?.message || err}`, err);
  }
} else {
  addSystemLog('warn', 'GeminiClient', 'کلید GEMINI_API_KEY در متغیرهای محیطی یافت نشد! حالت آفلاین سناریونویس فعال شد.');
}

// Helper to generate content with automatic model fallback & 429 quota backoff
async function generateAiContent(prompt: string, isJsonMode = false, temperature = 0.85, maxOutputTokens?: number) {
  if (!ai) {
    addSystemLog('error', 'GeminiAPI', 'تلاش برای تولید محتوا در حالی که کلاینت هوش مصنوعی فعال نیست (بدون کلید API)');
    throw new Error('AI client not initialized');
  }

  let lastError: any = null;
  const triedModels = new Set<string>();

  addSystemLog('info', 'GeminiAPI', `شروع فراخوانی تولید محتوا با ${FALLBACK_MODELS.length} کاندید مدل`);

  for (const modelCandidate of FALLBACK_MODELS) {
    if (triedModels.has(modelCandidate)) continue;
    triedModels.add(modelCandidate);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        addSystemLog('info', 'GeminiAPI', `تلاش برای ارسال درخواست به مدل [${modelCandidate}] - تلاش شماره ${attempt}`);
        
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: prompt,
          config: {
            ...(isJsonMode ? { responseMimeType: 'application/json' } : {}),
            temperature,
            ...(maxOutputTokens ? { maxOutputTokens } : {}),
          },
        });

        if (response && response.text) {
          addSystemLog('success', 'GeminiAPI', `دریافت موفق پاسخ از مدل [${modelCandidate}] در تلاش ${attempt}`, {
            characterCount: response.text.length,
            preview: response.text.substring(0, 150) + '...'
          });
          return { text: response.text, usedModel: modelCandidate };
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const status = err?.status || err?.statusCode || 'UnknownStatus';
        const is429 = status === 429 || errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED');
        
        addSystemLog('warn', 'GeminiAPI', `خطا در مدل [${modelCandidate}] (تلاش ${attempt}) - کد وضعیت: ${status} | پیام: ${errMsg}`, err);
        lastError = err;

        if (is429 && attempt === 1) {
          addSystemLog('info', 'GeminiAPI', 'پاسخ 429 (سقف تعداد درخواست) دریافت شد. ایجاد تاخیر ۱ ثانیه‌ای قبل از تلاش مجدد...');
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          break;
        }
      }
    }
  }
  
  addSystemLog('error', 'GeminiAPI', 'تمام مدل‌های کاندید فلش با خطا مواجه شدند! رجوع به حالت پشتیبان آفلاین.', lastError);
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
    title: `پرونده بحرانی درباره: ${cleanTopic}`,
    genre: 'بررسی تخلف، دادرسی و حل معما',
    incidentDate: '۱۴۰۵/۰۷/۰۹ - ساعت ۲۱:۰۰ شب',
    location: 'محل وقوع اختلافات مربوط به پرونده',
    victimName: 'جناب آقای کامران رستگار (شاکی / متضرر پرونده)',
    victimBackground: `شخص ذینفع و شاکی اصلی پرونده که تقاضای ممیزی رسمی و پیگرد قانونی موضوع «${cleanTopic}» را دارد.`,
    briefing: `گزارش بازرسی شعبه ویژه دادگاه: تحقیقات اولیه پیرامون موضوع «${cleanTopic}» حاکی از وجود تخلفات جدی و اسناد متناقض مالی و اداری است. اشخاص مرتبط هر کدام ادعاهای متناقضی را در محضر دادگاه مطرح نموده‌اند که نیازمند بازجویی و مداقه جنایی قاضی است.`,
    autopsyReport: {
      timeOfDeath: 'ساعت ۲۰:۳۰ الی ۲۱:۰۰ شب',
      causeOfDeath: `ریشه اختلاف پیرامون موضوع: ${cleanTopic}`,
      toxicology: 'مثبت - وجود تخلف ساختاری و جعل اسناد اداری',
      injuries: ['فاکتورهای مالی مورد مناقشه', 'اسناد پلاک ثبتی یا شهادت شهود'],
      coronerNotes: 'بررسی کارشناسی حاکی از تعمد کامل متهم اصلی در ارتکاب تخلف و دروغگویی سیستماتیک است.',
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
  app.get('/api/system-logs', (_req: Request, res: Response) => {
    res.json(systemLogs);
  });

  app.post('/api/diagnose-gemini', async (_req: Request, res: Response) => {
    addSystemLog('info', 'Diagnostics', 'فراخوانی تست اتصال دستی به جمینای آغاز شد.');
    const report: any = {
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!apiKey,
      apiKeyMasked: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4) : 'یافت نشد',
      customBaseUrl: customBaseUrl || 'پیش‌فرض گوگل',
      dnsTest: 'کامل نشده',
      geminiPing: 'کامل نشده',
      errors: []
    };

    // 1. DNS / connectivity check
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const pingRes = await fetch('https://generativelanguage.googleapis.com/', { signal: controller.signal });
      clearTimeout(id);
      report.dnsTest = `موفق (کد وضعیت: ${pingRes.status})`;
      addSystemLog('success', 'Diagnostics', 'تست دسترسی اینترنتی به دامنه گوگل موفقیت‌آمیز بود.');
    } catch (err: any) {
      report.dnsTest = `خطا در اتصال: ${err?.message || err}`;
      report.errors.push(`خطای دسترسی به اینترنت: ${err?.message || err}`);
      addSystemLog('error', 'Diagnostics', 'خطای عدم دسترسی اینترنتی به گوگل مپ/جمینای از هاست', err);
    }

    // 2. Client initialization verification
    if (!ai) {
      report.geminiPing = 'کلید API تنظیم نشده است';
      report.errors.push('کلاینت هوش مصنوعی ساخته نشده است زیرا کلید API یافت نشد.');
      addSystemLog('warn', 'Diagnostics', 'تست متوقف شد: کلید API معتبر یافت نشد.');
      return res.json({ success: false, report });
    }

    // 3. Mini test query to Gemini using robust generateAiContent helper
    try {
      addSystemLog('info', 'Diagnostics', `تست فراخوانی زنده با سامانه آبشاری مدل‌ها`);
      const testResult = await generateAiContent('سلام. فقط کلمه "موفق" را برگردان.', false, 0.1, 10);
      if (testResult && testResult.text) {
        report.geminiPing = `موفق (با مدل ${testResult.usedModel}). پاسخ: "${testResult.text.trim()}"`;
        addSystemLog('success', 'Diagnostics', `تست فراخوانی زنده با موفقیت به پایان رسید. مدل: ${testResult.usedModel}`);
        return res.json({ success: true, report });
      } else {
        throw new Error('پاسخ خالی یا نامعتبر از جمینای دریافت شد.');
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const errStatus = err?.status || err?.statusCode || 'نامعلوم';
      report.geminiPing = `خطای دیسپاچ: کد ${errStatus} | ${errMsg}`;
      report.errors.push({
        message: errMsg,
        status: errStatus,
        rawError: err
      });
      addSystemLog('error', 'Diagnostics', `تست فراخوانی زنده با شکست مواجه شد. کد خطا: ${errStatus}`, err);
      return res.json({ success: false, report });
    }
  });

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
    const requestedTopic = (topicText || customIdea || 'جنایت پیچیده').trim();

    if (!ai) {
      const bespokeCase = generateProceduralCase(requestedTopic);
      return res.json(bespokeCase);
    }

    try {
      const prompt = `شما داستان‌نویس و طراح ارشد پرونده‌های قضایی برای بازی کارآگاهی و قضاوت «آقای قاضی» هستید.
موضوع کلی پرونده که کاربر درخواست کرده است: "${requestedTopic}"

دستورالعمل‌های بسیار مهم و حیاتی سبک پرونده:
پرونده می‌تواند در یکی از دسته‌بندی‌های زیر طراحی شود (با توجه به موضوع درخواستی "${requestedTopic}"):
۱. **جنایی (Murder / Assault)**: قتل، ضرب و شتم، جنایات فیزیکی.
۲. **مالی و تجاری (Financial Fraud / Embezzlement)**: کلاهبرداری هرمی، اختلاس، پول‌شویی، جعل اسناد ملکی، سرقت مالکیت معنوی، خیانت در امانت شرکا.
۳. **خانوادگی و مدنی (Family / Inheritance / Civil Disputes)**: تقسیم سهم‌الارث مشکوک، دعوای وصیت‌نامه جعلی، طلاق با مخفی‌کاری مالی متقابل، دعوای مالکیت زمین‌های خانوادگی.

ادبیات واقعی داستان‌نویسی قضایی:
- به هیچ عنوان عبارت خام درخواستی یا کلمات مصنوعی مانند "موضوع درخواستی" یا "پرونده ویژه موضوع..." را در متن، عناوین، سمت کاراکترها یا دیالوگ‌ها تکرار نکنید!
- یک عنوان جذاب و طبیعی خلق کنید (مثال برای مالی: "پرونده اختلاس صندوق بازنشستگی زرین" یا خانوادگی: "ماترک موروثی خاندان سالار").
- تمام اسامی، مشاغل، محل وقوع جرم، گزارش ارزیابی و مدارک باید مانند یک پرونده واقعی قضایی با داستان‌نویسی روان و مهیج فارسی نگاشته شوند.

انعطاف در ساختار گزارش تخصصی (autopsyReport):
برای اینکه ساختار فیلدها ثابت بماند اما مناسب با ژانرهای مالی و خانوادگی باشد، فیلد "autopsyReport" را به صورت زیر معنایی تطبیق دهید:
الف) در پرونده‌های جنایی/قتل: همان فرمت کالبدشکافی جسد مقتول (زمان مرگ، علت فوت، سم‌شناسی، آسیب‌ها).
ب) در پرونده‌های مالی/کلاهبرداری:
   - "timeOfDeath": زمان دقیق تراکنش مشکوک اولیه یا کشف اولین فاکتور جعلی.
   - "causeOfDeath": شگرد اصلی ارتکاب کلاهبرداری یا فرار مالیاتی.
   - "toxicology": ردیابی حساب‌های مقصد و جریان جابجایی پول‌های مفقودشده.
   - "injuries": ["مبلغ دقیق کسری صندوق یا ضرر شاکیان", "لیست حساب‌های مسدودشده متهم"].
   - "coronerNotes": گزارش حسابرس رسمی دادگستری در خصوص تراز مالی جعلی و تضادهای ثبت‌شده.
ج) در پرونده‌های خانوادگی/وصیت‌نامه/ارث:
   - "timeOfDeath": تاریخ ارجاع پرونده به دادگاه خانواده یا شروع مرافعه ورثه.
   - "causeOfDeath": اختلاف اصلی طرفین (مثلا ادعای جعلی بودن وصیت‌نامه یا سهم‌الارث ناحق).
   - "toxicology": گزارش صحت‌سنجی خط‌شناسی و امضاء وصیت‌نامه یا تست سلامت روان متوفی در زمان تحریر.
   - "injuries": ["سند پلاک ثبتی مورد اختلاف", "میزان مهریه یا سهم‌الارث مورد مناقشه"].
   - "coronerNotes": گزارش رسمی مددکار خانواده یا نظریه کارشناس رسمی خط‌شناسی دادگستری.

تعداد اشخاص (بین ۳ تا ۹ نفر):
- متهم ردیف اول (defendant): با استراتژی دروغین (deceptionStrategy) و الایبی محکم اما دارای تناقض.
- سایر کاراکترها شامل شاکی یا مدعی‌العموم (plaintiff)، کارشناس رسمی یا مأمور پرونده (expert)، و شهود دیگر (witness).

مدارک و حقیقت پنهان:
- ۴ تا ۶ مدرک فیزیکی، دیجیتالی یا اسناد رسمی متناسب با ژانر پرونده.
- حقیقت پنهان (hiddenTruth) شامل مقصر واقعی، انگیزه واقعی و کلید تناقضی که دروغ متهم را لو می‌دهد.

خروجی صرفاً یک ساختار معتبر JSON با کلیدهای زیر باشد (بدون هیچ متن اضافی قبل یا بعد از JSON):

{
  "id": "case-${Date.now()}",
  "caseNumber": "۱۴۰۵/...-ج",
  "title": "عنوان جذاب و داستانی پرونده (مثلاً: سایه جعل در وصیت‌نامه عمارت اقدسیه)",
  "genre": "ژانر پرونده (مثلاً: مالی - کلاهبرداری، خانوادگی - انحصار وراثت، جنایی - قتل)",
  "incidentDate": "تاریخ و ساعت وقوع یا کشف تخلف",
  "location": "مکان وقوع جرم یا محل ثبت اسناد",
  "victimName": "نام کامل شاکی پرونده، مقتول، یا صاحب اصلی اموال مفقوده",
  "victimBackground": "پیشینه، روابط و وضعیت شاکی یا قربانی اصلی",
  "briefing": "گزارش مشروح، جذاب و داستانی صحنه جرم یا خلاصه ماجرای کلاهبرداری/اختلاف خانوادگی جهت مطالعه اولیه قاضی",
  "autopsyReport": {
    "timeOfDeath": "زمان ردیابی تخلف اولیه / زمان فوت",
    "causeOfDeath": "علت فوت / شگرد کلاهبرداری / ریشه اختلاف خانوادگی",
    "toxicology": "نتایج سم‌شناسی / ردیابی حساب‌های مقصد / اصالت‌سنجی دست‌خط وصیت‌نامه",
    "injuries": ["مورد ۱", "مورد ۲"],
    "coronerNotes": "نکات کلیدی گزارش کارشناس رسمی دادگستری یا پزشکی قانونی که تناقض ادعای متهم را نشان می‌دهد"
  },
  "evidence": [
    {
      "id": "ev-1",
      "title": "نام مدرک داستانی (مانند فاکتور خرید جعلی، پرینت تراکنش‌های بانکی، وصیت‌نامه، اثر انگشت)",
      "type": "physical",
      "description": "شرح مدرک",
      "foundAt": "محل کشف مدرک یا نحوه استخراج سند",
      "significance": "اهمیت مدرک در اثبات یا رد ادعاها",
      "labReport": "نتیجه بررسی کارشناس خط‌شناسی، آگاهی یا بازرسی مالی"
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "name": "نام و فامیلی کامل شخص",
      "role": "defendant",
      "roleTitle": "سمت در دادگاه (مثلا متهم ردیف اول - برادرزاده متوفی، یا شريک تجاری سابق)",
      "age": 38,
      "occupation": "شغل کامل شخص",
      "relationToVictim": "نسبت یا ارتباط با شاکی/قربانی/متوفی",
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
    "motive": "انگیزه واقعی جرم (مثلاً زیاده‌خواهی در سهم‌الارث یا تسویه بدهی‌های قمار)",
    "howCrimeHappened": "شرح واقعی چگونگی وقوع تخلف یا جرم به ترتیب ساعت و تاریخ",
    "keyContradiction": "تناقض اساسی که قاضی باید از تطبیق مدارک مالی/جنایی کشف کند"
  }
}`;

      const resAi = await generateAiContent(prompt, true, 0.85, 4000);
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

  // Interrogation API with Group Chat Dynamic Routing & Typo/Phonetic Matching
  app.post('/api/interrogate', async (req: Request, res: Response) => {
    const { caseData, question, evidencePresentedId, history } = req.body;

    const charsList = caseData?.characters || [];
    if (charsList.length === 0) {
      return res.status(404).json({ error: 'شخصیتی در دادگاه وجود ندارد' });
    }

    const evidence = evidencePresentedId
      ? (caseData?.evidence || []).find((e: { id: string }) => e.id === evidencePresentedId)
      : null;

    if (!ai) {
      // Offline fallback defaults to first character
      const char = charsList[0];
      const isDef = char.role === 'defendant';
      return res.json({
        addressedCharacterId: char.id,
        addressedCharacterName: char.name,
        speech: isDef
          ? `جناب قاضی، بنده (${char.name}) بارها عرض کرده‌ام که در زمان وقوع حادثه، هیچ نقشی در این جنایت نداشتم!`
          : `ریاست محترم دادگاه، بنده به عنوان ${char.roleTitle} آنچه دیدم و شنیدم را صادقانه بیان کردم.`,
        innerThought: isDef ? 'باید خونسرد بمانم...' : undefined,
        slipUp: evidence ? `تناقض در خصوص مکان و چگونگی کشف ${evidence.title}` : undefined,
        stressDelta: evidence ? 18 : 6,
        interruption: null
      });
    }

    try {
      const historyStr = (history || [])
        .map((h: { sender: string; text: string }) => `${h.sender}: ${h.text}`)
        .join('\n');

      const allCharsDescription = charsList
        .map((c: Character) => `ID: "${c.id}" | نام کامل: "${c.name}" | سمت: "${c.roleTitle}" | سن: ${c.age} | شغل: "${c.occupation}" | رابطه با قربانی: "${c.relationToVictim}" | روحیات: "${c.personality}" | وضعیت اخلاقی: "${c.temperament || 'normal'}" | استراتژی فریب: "${c.deceptionStrategy || 'ندارد'}" | نقاط ضعف: "${(c.vulnerabilities || []).join(', ')}"`)
        .join('\n\n');

      const prompt = `شما کارگردان و هوش مصنوعی هماهنگ‌کننده کل سالن دادگاه جنایی بازی «آقای قاضی» هستید.
قاضی (کاربر) در یک چت گروهی، سوال یا مدرکی را مطرح کرده است. شما باید تشخیص دهید قاضی با چه کسی سخن می‌گوید، دیالوگ او را شبیه‌سازی کنید و خروجی را ارسال کنید.

لیست تمامی اشخاص حاضر در صحن دادگاه (متهمین، شاکیان، شهود، کارشناسان، شاکی):
${allCharsDescription}

خلاصه پرونده جنایی:
${caseData.briefing}
حقیقت پنهان واقعی پشت پرده:
${caseData.hiddenTruth?.howCrimeHappened || ''}
تناقض کلیدی پرونده: ${caseData.hiddenTruth?.keyContradiction || ''}

سابقه جریان دادگاه زنده (همه حرف‌های قبلی همه اشخاص):
${historyStr}

سوال یا مواجهه جدید قاضی:
"${question}"
${evidence ? `مدرک پیوست‌شده توسط قاضی که کل دادگاه آن را می‌بینند:\nعنوان مدرک: ${evidence.title}\nشرح مدرک: ${evidence.description}\nمحل کشف: ${evidence.foundAt}\nگزارش آزمایشگاه: ${evidence.labReport}` : 'هیچ مدرک فیزیکی ضمیمه نشده است.'}

دستورالعمل‌های بسیار مهم و حیاتی هدایت گروهی:
۱. **تشخیص هوشمند آدرس مخاطب**: متن سوال قاضی را بررسی کنید و بفهمید روی سخن او دقیقاً با کدام یک از اشخاص حاضر در دادگاه است.
   - او ممکن است نام اول، فامیل، یا سمت شخص (مثلاً "آقای حسابدار"، "پزشک قانونی"، "کامران") را بیاورد.
   - **اشتباهات تایپی و تلفظی**: قاضی ممکن است اسم‌ها را با اشتباه تایپی یا مخفف بگوید (مثلاً بنویسد "کمران" به جای "کامران"، یا "مهین" به جای "مهین‌بانو"). نزدیک‌ترین شخصیت را شناسایی کنید.
   - **واکنش به اشتباه تایپی**: اگر قاضی اسم را با اشتباه تایپی یا به صورت عامیانه صدا زد، شخصیت باید حتماً در ابتدای پاسخ خود با لحنی زنده و دراماتیک به این موضوع اشاره کند (مثال: «جناب قاضی، گمان می‌کنم منظورتان من (کامران) بودم... بله بفرمایید...» یا «اگر با من (مهین‌بانو) هستید قاضی محترم...»).
   - **اگر مخاطبی مشخص نبود**: اگر سوال کاملاً عمومی است و اسم کسی برده نشده، فعال‌ترین متهم یا متهم اصلی پرونده را به عنوان پاسخ‌دهنده اول انتخاب کنید.

۲. **آگاهی جمعی**: شخصیت انتخاب شده کاملاً از تمام سوال‌ها و دروغ‌هایی که دیگران تا این لحظه در "سابقه جریان دادگاه زنده" گفته‌اند باخبر است و باید در دفاع از خود فعالانه به آنها ارجاع دهد!

۳. **مداخله و قطع کلام خودکار (interruption)**: بررسی کنید آیا بر اثر پاسخ این شخصیت، یا به علت اتهام مستقیم قاضی، شخصیت عصبی یا شاکی دیگری در سالن از جایش بلند شده و با پرخاشگری وسط حرف او می‌پرد؟
   - اگر بله، بخش "interruption" را پر کنید تا مرافعه شروع شود. در غیر این صورت آن را null بگذارید.

خروجی صرفاً یک JSON معتبر فارسی باشد با ساختار زیر (هیچ کلمه اضافی قبل یا بعد ارسال نکنید):
{
  "addressedCharacterId": "آیدی دقیق کاراکتر پاسخ‌دهنده (مثلاً char-kamran)",
  "addressedCharacterName": "نام دقیق کاراکتر پاسخ‌دهنده",
  "speech": "پاسخ مستقیم و دیالوگ کاراکتر پاسخ‌دهنده به زبان فارسی (با لحن متناسب با شخصیت، مزاج و تایید یا تصحیح اسم با لحن طبیعی)",
  "innerThought": "فکر مخفیانه یا استرس درونی ذهن کاراکتر پاسخ‌دهنده",
  "slipUp": "اگر متهم دچار تناقض یا سوتی کلامی شد شرح کوتاه آن، در غیر این صورت null",
  "stressDelta": 10,
  "lawyerIntervention": "اگر وکیل مدافع این کاراکتر اعتراض قانونی دارد متن اعتراض او، در غیر این صورت null",
  "interruption": {
    "interrupterId": "آیدی کاراکتر معترض که وسط حرف پرید",
    "interrupterName": "نام کاراکتر معترض",
    "interrupterText": "دیالوگ عصبانی کاراکتر معترض که بدون اجازه وسط حرف می‌پرد",
    "replyText": "پاسخ تند متقابل کاراکتر پاسخ‌دهنده اصلی به او"
  }
}`;

      const resAi = await generateAiContent(prompt, true, 0.85, 2000);
      const parsed = parseJsonFromAi<Record<string, any>>(resAi.text);
      res.json(parsed);
    } catch (error) {
      addSystemLog('error', 'InterrogateAPI', `خطا در اجرای پاسخ هوشمند جمینای: ${error}`, error);
      
      // Determine which character was most likely being addressed to keep context intact
      let targetChar = charsList[0];
      const cleanQuestion = (question || '').toLowerCase();
      for (const char of charsList) {
        if (cleanQuestion.includes(char.name.toLowerCase()) || (char.roleTitle && cleanQuestion.includes(char.roleTitle.toLowerCase()))) {
          targetChar = char;
          break;
        }
      }

      // Evasive/realistic fallbacks based on role
      let speech = `جناب قاضی، بنده به عنوان ${targetChar.roleTitle} توضیحات اولیه را ارائه دادم. لطفاً سوال یا مدرک را مجدداً و شفاف‌تر مطرح کنید.`;
      if (targetChar.role === 'defendant') {
        const defendantReplies = [
          `جناب قاضی، بنده تحت فشار شدیدی هستم و نسبت به این اتهام سکوت می‌کنم تا مدارک دقیق‌تری ارائه شود! من بی‌گناهم!`,
          `ریاست محترم دادگاه، من قبلاً پاسخ این موضوع را داده‌ام و اصرار به بی‌گناهی خود دارم! او دارد مرا متهم می‌کند!`,
          `جناب قاضی، این پرسش شما یا شهود برای تخریب چهره من طراحی شده است. از ارائه پاسخ‌های فرعی خودداری می‌کنم.`
        ];
        speech = defendantReplies[Math.floor(Math.random() * defendantReplies.length)];
      } else if (targetChar.role === 'witness') {
        speech = `ریاست محترم، من فقط یک شاهد ساده هستم و بیش از آنچه ثبت شده چیزی به یاد نمی‌آورم. لطفاً مرا تحت فشار قرار ندهید.`;
      } else if (targetChar.role === 'plaintiff') {
        speech = `جناب قاضی، ما از دادگاه تقاضای اجرای اشد مجازات را داریم. مدارک و اسناد ما کاملاً واضح و گویای ارتکاب جرم است!`;
      } else if (targetChar.role === 'expert') {
        speech = `جناب قاضی، گزارش فنی و تخصصی بنده ضمیمه پرونده است. از نظر کارشناسی من، موضوع نیاز به ممیزی و ارزیابی شواهد موجود دارد.`;
      }

      res.json({
        addressedCharacterId: targetChar.id,
        addressedCharacterName: targetChar.name,
        speech,
        innerThought: targetChar.role === 'defendant' ? 'نباید سوتی بدهم... اوضاع خطری شد!' : 'امیدوارم قاضی حقیقت را بفهمد.',
        slipUp: null,
        stressDelta: 3,
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
