export type Gender = 'female' | 'male' | 'unspecified';
export type LateZiMode = 'same-day' | 'next-day';
export type ElementName = '木' | '火' | '土' | '金' | '水';

export interface BirthInput {
  date: string;
  time: string;
  gender: Gender;
  birthplace: string;
  lateZi: LateZiMode;
}

export interface Pillar {
  key: 'year' | 'month' | 'day' | 'time';
  label: string;
  gan: string;
  zhi: string;
  ganElement: ElementName;
  zhiElement: ElementName;
  shiShen: string;
  hiddenGans: string[];
  hiddenShiShen: string[];
  naYin: string;
  diShi: string;
}

export interface BaziChart {
  input: BirthInput;
  pillars: Pillar[];
  lunarDate: string;
  solarTerm: string;
  dayMaster: string;
  dayMasterElement: ElementName;
  elements: Record<ElementName, number>;
}
