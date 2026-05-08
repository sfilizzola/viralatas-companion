export type BandFilterValue = {
  query: string;
  day: string | null;
  stage: string | null;
  genre: string | null;
  upcoming: boolean;
};

export const EMPTY_FILTERS: BandFilterValue = {
  query: '',
  day: null,
  stage: null,
  genre: null,
  upcoming: false,
};
