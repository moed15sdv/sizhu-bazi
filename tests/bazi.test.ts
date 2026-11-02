import { describe, expect, it } from 'vitest';
import { calculateChart, buildKimiPrompt } from '../src/bazi';
import { decodeBirthInput, encodeBirthInput } from '../src/share';
import type { BirthInput } from '../src/types';

const baseInput: BirthInput = {
  date: '1990-05-20',
  time: '14:30',
  gender: 'unspecified',
  birthplace: '',
  lateZi: 'same-day',
};

describe('四柱排盘', () => {
  it('计算已知日期的四柱与五行', () => {
    const chart = calculateChart(baseInput);
    expect(chart.pillars.map((p) => `${p.gan}${p.zhi}`)).toEqual(['庚午', '辛巳', '乙酉', '癸未']);
    expect(chart.dayMaster).toBe('乙');
    expect(Object.values(chart.elements).reduce((sum, count) => sum + count, 0)).toBe(8);
    expect(chart.pillars[2].shiShen).toBe('日主');
  });

  it('支持晚子时的两种换日口径', () => {
    const input = { ...baseInput, date: '2024-01-01', time: '23:30' };
    const sameDay = calculateChart(input);
    const nextDay = calculateChart({ ...input, lateZi: 'next-day' });
    expect(sameDay.pillars[2].gan + sameDay.pillars[2].zhi).not.toBe(nextDay.pillars[2].gan + nextDay.pillars[2].zhi);
  });

  it('拒绝超出支持范围的年份', () => {
    expect(() => calculateChart({ ...baseInput, date: '1900-12-31' })).toThrow('1901—2099');
  });

  it('提供给 Kimi 的提示词包含已计算好的四柱', () => {
    const prompt = buildKimiPrompt(calculateChart(baseInput));
    expect(prompt).toContain('年柱：庚午');
    expect(prompt).toContain('不要重新排盘');
    expect(prompt).not.toContain('出生地');
  });
});

describe('分享链接数据', () => {
  it('可无损还原出生信息和设置', () => {
    const input = { ...baseInput, birthplace: '浙江杭州', lateZi: 'next-day' as const };
    expect(decodeBirthInput(encodeBirthInput(input))).toEqual(input);
  });

  it('拒绝无效或损坏的分享数据', () => {
    expect(decodeBirthInput('not-valid-data')).toBeNull();
    expect(decodeBirthInput(encodeBirthInput({ ...baseInput, date: 'bad' }))).toBeNull();
  });
});
