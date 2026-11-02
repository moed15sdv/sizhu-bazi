declare module 'lunar-javascript' {
  interface EightChar {
    setSect(sect: 1 | 2): void;
    getYearGan(): string;
    getYearZhi(): string;
    getYearShiShenGan(): string;
    getYearHideGan(): string[];
    getYearShiShenZhi(): string[];
    getYearNaYin(): string;
    getYearDiShi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getMonthShiShenGan(): string;
    getMonthHideGan(): string[];
    getMonthShiShenZhi(): string[];
    getMonthNaYin(): string;
    getMonthDiShi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayShiShenGan(): string;
    getDayHideGan(): string[];
    getDayShiShenZhi(): string[];
    getDayNaYin(): string;
    getDayDiShi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getTimeShiShenGan(): string;
    getTimeHideGan(): string[];
    getTimeShiShenZhi(): string[];
    getTimeNaYin(): string;
    getTimeDiShi(): string;
  }

  interface Lunar {
    getEightChar(): EightChar;
    toString(): string;
    getYearShengXiaoExact(): string;
    getPrevJieQi(): { getName(): string; getSolar(): { toYmdHms(): string } };
    getNextJieQi(): { getName(): string; getSolar(): { toYmdHms(): string } };
  }

  interface Solar {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
  };
}
