import { CaseDossier } from '../types.ts';

export interface DynamicCaseLabels {
  caseClassification: string;
  investigationTitle: string;
  victimOrPartyLabel: string;
  briefingTitle: string;
  expertReportTitle: string;
  expertBadge: string;
  timeLabel: string;
  causeOrMethodLabel: string;
  analysisLabel: string;
  damagesOrInjuriesLabel: string;
  expertNoteLabel: string;
  relationLabel: string;
  courtBranchTitle: string;
}

export function getDynamicCaseLabels(caseData: CaseDossier | null | undefined): DynamicCaseLabels {
  if (!caseData) {
    return {
      caseClassification: 'محرمانه - پرونده قضایی',
      investigationTitle: 'گزارش کلانتری و ضابطین قضایی',
      victimOrPartyLabel: 'شاکی / بزه دیده:',
      briefingTitle: 'شرح واقعه و گردش کار پرونده:',
      expertReportTitle: 'گزارش ارزیابی کارشناسی تخصصی',
      expertBadge: 'مستندات پرونده',
      timeLabel: 'زمان وقوع واقعه:',
      causeOrMethodLabel: 'شگرد / موضوع مناقشه:',
      analysisLabel: 'نتایج بررسی کارشناسی:',
      damagesOrInjuriesLabel: 'خسارات و صدمات:',
      expertNoteLabel: 'نکته کلیدی کارشناس رسمی:',
      relationLabel: 'ارتباط با شاکی پرونده:',
      courtBranchTitle: 'دادگاه کیفری و حقوقی',
    };
  }

  const textToScan = `${caseData.title || ''} ${caseData.genre || ''} ${caseData.briefing || ''}`.toLowerCase();

  const isFinancialOrTheft = /دزدی|سرقت|کلاهبرداری|اختلاس|مالی|چک|پول|سکه|طلا|خودرو|ماشین|پلاک|بانک|حسابداری|ملک|زمین|هرمی|امضا|قرارداد|فاکتور|جعل|تجاری/i.test(textToScan);
  const isFamilyOrInheritance = /ارث|سهم‌الارث|وصیت|وراثت|خانوادگی|مهریه|نفقه|طلاق|فرزند|ماترک|نسب|حضانت/i.test(textToScan);

  if (isFinancialOrTheft) {
    return {
      caseClassification: 'محرمانه - دادگاه ویژه جرایم مالی و سرقت',
      investigationTitle: 'گزارش کلانتری، بازرسی و پلیس آگاهی',
      victimOrPartyLabel: 'شاکی / صاحب مال مسروقه و متضرر:',
      briefingTitle: 'شرح ماجرای سرقت/تخلف مالی و نحوه کشف:',
      expertReportTitle: 'گزارش حسابرسی، خط‌شناسی و ردزنی مالی',
      expertBadge: 'مستندات حسابرسی و بانکی',
      timeLabel: 'زمان وقوع سرقت / تراکنش مشکوک:',
      causeOrMethodLabel: 'شگرد و شیوه ارتکاب جرم / سرقت:',
      analysisLabel: 'ردیابی حساب‌ها و اصالت‌سنجی فاکتورها:',
      damagesOrInjuriesLabel: 'اموال مسروقه، چک‌ها و مبالغ مورد مناقشه:',
      expertNoteLabel: 'نکته کلیدی حسابرس و کارشناس رسمی:',
      relationLabel: 'ارتباط با مالباخته / شاکی:',
      courtBranchTitle: 'دادگاه ویژه رسیدگی به جرایم اقتصادی و سرقت',
    };
  }

  if (isFamilyOrInheritance) {
    return {
      caseClassification: 'محرمانه - دادگاه حقوقی و امور حسبی',
      investigationTitle: 'گزارش مددکاری و تحقیقات اولیه دادسرا',
      victimOrPartyLabel: 'خواهان / شاکی / متوفی ماترک:',
      briefingTitle: 'شرح اختلاف خانوادگی و موضوع ادعای طرفین:',
      expertReportTitle: 'گزارش کارشناسی رسمی خط و اسناد ملکی',
      expertBadge: 'مستندات ثبتی و اسناد رسمی',
      timeLabel: 'تاریخ تنظیم سند / شروع اختلاف:',
      causeOrMethodLabel: 'موضوع اصلی مناقشه و ادعای ورثه:',
      analysisLabel: 'بررسی اصالت دست‌خط، وصیت‌نامه و امضاها:',
      damagesOrInjuriesLabel: 'ماترک، پلاک‌های ثبتی و حقوق مورد ادعا:',
      expertNoteLabel: 'نظریه کارشناس رسمی خط‌شناسی و املاک:',
      relationLabel: 'نسبت با خواهان / متوفی:',
      courtBranchTitle: 'شعبه ویژه دادگاه حقوقی و خانواده',
    };
  }

  // Default: Criminal / Homicide / Assault
  return {
    caseClassification: 'محرمانه - دادگاه ویژه امور جنایی',
    investigationTitle: 'گزارش کلانتری و بازپرس ویژه قتل',
    victimOrPartyLabel: 'مشخصات مقتول / بزه دیده:',
    briefingTitle: 'شرح واقعه و مشاهدات صحنه جنایت:',
    expertReportTitle: 'گزارش پزشکی قانونی و تالار تشریح',
    expertBadge: 'مستندات آزمایشگاهی و کالبدشکافی',
    timeLabel: 'زمان تقریبی واقعه / مرگ:',
    causeOrMethodLabel: 'علت مستقیم فوت / صدمه:',
    analysisLabel: 'نتایج سم‌شناسی و معاینات بالینی:',
    damagesOrInjuriesLabel: 'جراحات و صدمات ظاهری مکشوفه:',
    expertNoteLabel: 'نکته حیاتی پزشک قانونی:',
    relationLabel: 'رابطه با مقتول / قربانی:',
    courtBranchTitle: 'دادگاه کیفری یک استان (ویژه قتل و جنایات)',
  };
}
