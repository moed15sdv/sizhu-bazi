import { Solar } from 'lunar-javascript';
import type { BaziChart, BirthInput, ElementName, Pillar } from './types';

const GAN_ELEMENT: Record<string, ElementName> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const ZHI_ELEMENT: Record<string, ElementName> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土',
  丑: '土', 未: '土', 申: '金', 酉: '金', 亥: '水', 子: '水',
};

export const DAY_MASTER_TEXT: Record<string, { symbol: string; reflection: string }> = {
  甲: { symbol: '甲木常取乔木之象，重方向、根基与持续生长。', reflection: '可留意：目标感与弹性如何同时保留？' },
  乙: { symbol: '乙木常取花草藤蔓之象，重适应、连接与细致感受。', reflection: '可留意：柔韧应对时，边界是否足够清晰？' },
  丙: { symbol: '丙火常取日光之象，重表达、热力与开阔视野。', reflection: '可留意：向外照亮时，如何为自己保留节奏？' },
  丁: { symbol: '丁火常取灯烛之象，重专注、温度与精微洞察。', reflection: '可留意：细致投入之外，是否需要更多休息？' },
  戊: { symbol: '戊土常取山岳之象，重承载、稳定与现实基础。', reflection: '可留意：承担责任时，是否也允许变化发生？' },
  己: { symbol: '己土常取田园之象，重培育、整理与实务照料。', reflection: '可留意：照顾细节时，是否忽略了自己的需要？' },
  庚: { symbol: '庚金常取矿石刀剑之象，重决断、原则与锤炼。', reflection: '可留意：坚持原则时，表达方式能否更有余地？' },
  辛: { symbol: '辛金常取珠玉之象，重品质、分寸与辨别力。', reflection: '可留意：追求精致时，能否接纳不完美的过程？' },
  壬: { symbol: '壬水常取江河之象，重流动、资源与宏观连接。', reflection: '可留意：可能性很多时，哪一条最值得深入？' },
  癸: { symbol: '癸水常取雨露之象，重感受、渗透与静水深流。', reflection: '可留意：内在感受丰富时，如何转化为清楚表达？' },
};

export function parseBirthInput(input: BirthInput) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const time = /^(\d{2}):(\d{2})$/.exec(input.time);
  if (!date || !time) throw new Error('请填写完整的出生日期和时间。');

  const [year, month, day] = date.slice(1).map(Number);
  const [hour, minute] = time.slice(1).map(Number);
  if (year < 1901 || year > 2099) throw new Error('目前支持 1901—2099 年的公历出生日期。');
  if (hour > 23 || minute > 59) throw new Error('出生时间格式不正确。');
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new Error('这个公历日期不存在，请检查后重试。');
  }
  return { year, month, day, hour, minute };
}

export function calculateChart(input: BirthInput): BaziChart {
  const { year, month, day, hour, minute } = parseBirthInput(input);
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(input.lateZi === 'next-day' ? 1 : 2);

  const configs = [
    { key: 'year', label: '年柱', prefix: 'Year' },
    { key: 'month', label: '月柱', prefix: 'Month' },
    { key: 'day', label: '日柱', prefix: 'Day' },
    { key: 'time', label: '时柱', prefix: 'Time' },
  ] as const;

  const pillars: Pillar[] = configs.map(({ key, label, prefix }) => {
    const gan = eightChar[`get${prefix}Gan`]();
    const zhi = eightChar[`get${prefix}Zhi`]();
    return {
      key,
      label,
      gan,
      zhi,
      ganElement: GAN_ELEMENT[gan],
      zhiElement: ZHI_ELEMENT[zhi],
      shiShen: eightChar[`get${prefix}ShiShenGan`](),
      hiddenGans: eightChar[`get${prefix}HideGan`](),
      hiddenShiShen: eightChar[`get${prefix}ShiShenZhi`](),
      naYin: eightChar[`get${prefix}NaYin`](),
      diShi: eightChar[`get${prefix}DiShi`](),
    };
  });

  const elements: Record<ElementName, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((pillar) => {
    elements[pillar.ganElement] += 1;
    elements[pillar.zhiElement] += 1;
  });

  const previous = lunar.getPrevJieQi();
  const next = lunar.getNextJieQi();
  return {
    input: { ...input },
    pillars,
    lunarDate: `${lunar.toString()} · 属${lunar.getYearShengXiaoExact()}`,
    solarTerm: `${previous.getName()} ${previous.getSolar().toYmdHms()} ｜ ${next.getName()} ${next.getSolar().toYmdHms()}`,
    dayMaster: pillars[2].gan,
    dayMasterElement: pillars[2].ganElement,
    elements,
  };
}

export function chartToText(chart: BaziChart): string {
  const pillarText = chart.pillars.map((p) => `${p.label}：${p.gan}${p.zhi}（${p.shiShen}；藏干 ${p.hiddenGans.join('、')}；纳音 ${p.naYin}）`).join('\n');
  const elements = (Object.entries(chart.elements) as [ElementName, number][]).map(([name, count]) => `${name} ${count}`).join('，');
  return [
    `公历：${chart.input.date} ${chart.input.time}`,
    `农历：${chart.lunarDate}`,
    `晚子时：${chart.input.lateZi === 'next-day' ? '23:00 后换次日日柱' : '23:00 后仍用当日日柱'}`,
    pillarText,
    `日主：${chart.dayMaster}${chart.dayMasterElement}`,
    `表层五行统计（不含藏干）：${elements}`,
  ].join('\n');
}

export function buildKimiPrompt(chart: BaziChart): string {
  return `你是一位措辞审慎、尊重传统文化的中文命理解读助手。请严格基于下面已经计算好的四柱进行解读，不要重新排盘，不要修改干支。\n\n${chartToText(chart)}\n${chart.input.gender === 'unspecified' ? '' : `性别：${chart.input.gender === 'female' ? '女' : '男'}\n`}${chart.input.birthplace ? `出生地：${chart.input.birthplace}（仅作背景，未做真太阳时校正）\n` : ''}\n请用约 600—900 字，分四部分回答：\n1. 命局概览：概括四柱与日主，不要把五行个数直接等同于旺衰。\n2. 五行与十神：解释表层分布及主要十神的传统象征，指出藏干与旺衰需要综合判断。\n3. 自我观察：给出性格、人际、事业学习方面的开放式观察，不使用“注定”“必然”等断语。\n4. 生活建议：给出 3 条温和、可执行且不涉及迷信消费的建议。\n\n不要预测灾祸、寿数、婚期或具体吉凶日期，不提供医疗、法律或投资判断。结尾简短注明“仅供传统文化与自我探索参考”。`;
}
