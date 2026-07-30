export interface MultilingualDestination {
  countryKeywords: readonly string[];
  id: string;
  label: string;
  keywords: readonly string[];
  language: string;
  region: string;
  value: string;
}

export const multilingualDestinations: readonly MultilingualDestination[] = [
  {
    countryKeywords: ['대한민국', '한국', 'south korea', 'korea', 'kr'],
    id: 'seoul',
    label: '서울',
    keywords: ['seoul', '서울', 'seol'],
    language: '한국어',
    region: 'South Korea',
    value: 'seoul',
  },
  {
    countryKeywords: ['日本', '일본', 'japan', 'jp'],
    id: 'tokyo',
    label: '東京',
    keywords: ['とうきょう', 'tokyo', 'toukyou'],
    language: '日本語',
    region: 'Japan',
    value: 'tokyo',
  },
  {
    countryKeywords: ['中国', '중국', 'china', 'cn'],
    id: 'beijing',
    label: '北京',
    keywords: ['北京', 'beijing', 'peking'],
    language: '中文',
    region: 'China',
    value: 'beijing',
  },
  {
    countryKeywords: ['Deutschland', '독일', 'germany', 'de'],
    id: 'munich',
    label: 'München',
    keywords: ['munich', 'muenchen'],
    language: 'Deutsch',
    region: 'Germany',
    value: 'munich',
  },
];

export const multilingualSearchPrompts = [
  ['서을', '서울'],
  ['とうきょ', '東京'],
  ['bejing', '北京'],
  ['munchen', 'München'],
] as const;

export const multilingualSearchKeys = [
  {name: 'label', weight: 1},
  {name: 'keywords', weight: 0.7},
  {name: 'countryKeywords', weight: 0.65},
  {name: 'region', weight: 0.5},
  {name: 'value', weight: 0.5},
] as const;
