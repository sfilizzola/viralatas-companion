export type BandFilterValue = {
  query: string;
  day: string | null;
  stage: string[];
  genre: string | null;
  upcoming: boolean;
  sortOrder: 'time-asc' | 'time-desc' | 'alpha';
  userId: string | null;
};

export const EMPTY_FILTERS: BandFilterValue = {
  query: '',
  day: null,
  stage: [],
  genre: null,
  upcoming: false,
  sortOrder: 'time-asc',
  userId: null,
};
