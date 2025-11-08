import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import kanjiData from './data/kanji.json';
import { Kanji, QuizQuestion } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 漢字一覧取得
app.get('/api/kanji', (req: Request, res: Response) => {
  res.json(kanjiData);
});

// 特定の漢字取得
app.get('/api/kanji/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const kanji = kanjiData.find((k: Kanji) => k.id === id);

  if (!kanji) {
    res.status(404).json({ error: 'Kanji not found' });
    return;
  }

  res.json(kanji);
});

// レベル別漢字取得
app.get('/api/kanji/level/:level', (req: Request, res: Response) => {
  const level = req.params.level;
  const filteredKanji = kanjiData.filter((k: Kanji) => k.level === level);
  res.json(filteredKanji);
});

// ランダム漢字取得
app.get('/api/kanji/random/:count', (req: Request, res: Response) => {
  const count = parseInt(req.params.count);
  const shuffled = [...kanjiData].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, kanjiData.length));
  res.json(selected);
});

// クイズ生成
app.get('/api/quiz/:count', (req: Request, res: Response) => {
  const count = parseInt(req.params.count);
  const shuffled = [...kanjiData].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, kanjiData.length));

  const questions: QuizQuestion[] = selected.map((kanji: Kanji) => {
    const questionType = Math.random() > 0.5 ? 'reading' : 'meaning';

    if (questionType === 'reading') {
      // 読み方クイズ
      const allReadings = [...kanji.readings.on, ...kanji.readings.kun];
      const correctAnswer = allReadings[0];

      // ダミー選択肢を生成
      const otherKanji = shuffled.filter((k: Kanji) => k.id !== kanji.id);
      const wrongOptions = otherKanji
        .slice(0, 3)
        .flatMap((k: Kanji) => [...k.readings.on, ...k.readings.kun])
        .slice(0, 3);

      const options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

      return {
        id: kanji.id,
        character: kanji.character,
        type: 'reading',
        question: `「${kanji.character}」の読み方は？`,
        options,
        correctAnswer
      };
    } else {
      // 意味クイズ
      const correctAnswer = kanji.meanings[0];

      // ダミー選択肢を生成
      const otherKanji = shuffled.filter((k: Kanji) => k.id !== kanji.id);
      const wrongOptions = otherKanji
        .slice(0, 3)
        .flatMap((k: Kanji) => k.meanings)
        .slice(0, 3);

      const options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

      return {
        id: kanji.id,
        character: kanji.character,
        type: 'meaning',
        question: `「${kanji.character}」の意味は？`,
        options,
        correctAnswer
      };
    }
  });

  res.json(questions);
});

// 統計情報
app.get('/api/stats', (req: Request, res: Response) => {
  const stats = {
    totalKanji: kanjiData.length,
    byLevel: kanjiData.reduce((acc: any, kanji: Kanji) => {
      acc[kanji.level] = (acc[kanji.level] || 0) + 1;
      return acc;
    }, {}),
    avgStrokes: kanjiData.reduce((sum: number, k: Kanji) => sum + k.strokes, 0) / kanjiData.length
  };

  res.json(stats);
});

// ルートパス
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 漢字学習アプリサーバーが起動しました`);
  console.log(`📚 http://localhost:${PORT} でアクセスできます`);
});
