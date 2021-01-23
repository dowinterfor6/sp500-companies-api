export interface WikiApiParams {
  action: string;
  format: string;
  page: string;
  prop: string;
  formatversion: number;
}

export interface WikiParseResponse {
  parse: {
    title: string;
    pageid: number;
    revid?: number;
    text: string;
  };
}
