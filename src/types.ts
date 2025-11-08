export interface KanjiExample {
  word: string;
  reading: string;
  meaning: string;
}

export interface KanjiReadings {
  on: string[];
  kun: string[];
}

export interface Kanji {
  id: number;
  character: string;
  meanings: string[];
  readings: KanjiReadings;
  examples: KanjiExample[];
  strokes: number;
  level: string;
}

export interface QuizQuestion {
  id: number;
  character: string;
  type: 'reading' | 'meaning';
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface UserProgress {
  kanjiId: number;
  studied: boolean;
  lastStudied?: Date;
  correctAnswers: number;
  totalAttempts: number;
}
