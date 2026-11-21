export type Verdict = "safe" | "suspicious" | "scam";

export interface AnalysisReason {
  icon: string;
  text_en: string;
  text_hi: string;
}

export interface LinkAnalysis {
  url: string;
  verdict: Verdict;
  reason: { en: string; hi: string; text_en?: string; text_hi?: string };
  lookalike_of: string | null;
}

export interface Advice {
  text_en: string;
  text_hi: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  score: number;
  reasons: AnalysisReason[];
  links: LinkAnalysis[];
  advice: Advice[];
  highlights: string[];
}
