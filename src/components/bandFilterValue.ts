export type BandFilterValue = {
  query: string;
  day: string | null;
  stage: string[];
  genre: string | null;
  upcoming: boolean;
};

export const EMPTY_FILTERS: BandFilterValue = {
  query: '',
  day: null,
  stage: [],
  genre: null,
  upcoming: false,
};
