/* EduVision — анализ работ, оценка по направлениям, черновик отчёта, сверка фактов.
   Работает и в браузере (window.EV), и в Node (require). Без зависимостей. */
(function (root) {
  "use strict";

  // ---------- 1. Проверка текста (правила) ----------
  // Каждое правило: тип (grammar | spelling), тема для рекомендации, сообщение.
  const MISSPELL = {
    becouse: "because", freind: "friend", frend: "friend", importent: "important", beatiful: "beautiful",
    beautifull: "beautiful", wich: "which", tomorow: "tomorrow", realy: "really", untill: "until",
    thier: "their", recieve: "receive", intresting: "interesting", diffrent: "different",
    wonderfull: "wonderful", sience: "science", togeter: "together", famouse: "famous",
    belive: "believe", writting: "writing", comming: "coming", grammer: "grammar", wensday: "Wednesday"
  };
  const MODALS = "(?<!\\b(?:does|did|do|can|will|should|must|could|would|to|let|make|makes|may|might)\\s+)";
  const RULES = [
    { id: "ps3", type: "grammar", topic: "Present Simple: окончание -s после he / she / it",
      re: new RegExp(MODALS + "\\b(he|she|it|my (?:mother|father|sister|brother|friend|teacher|grandmother|grandfather|mum|dad))\\s+(?:usually\\s+|always\\s+|often\\s+|sometimes\\s+|never\\s+)?(go|make|play|work|like|want|have|do|get|live|watch|read|eat|need|drink|cook|study)\\b", "gi"),
      msg: m => `После «${m[1]}» глагол в Present Simple получает -s: «${m[2] === "have" ? "has" : m[2] === "do" ? "does" : m[2] === "go" ? "goes" : m[2] === "study" ? "studies" : m[2] + "s"}»` },
    { id: "didpast", type: "grammar", topic: "Past Simple: после did / didn't — начальная форма глагола",
      re: /\b(did(?:n't|nt| not))\s+(\w+ed|went|saw|ate|came|took|made|got|bought|was|were|had)\b/gi,
      msg: m => `После «${m[1]}» нужна начальная форма, а не «${m[2]}»` },
    { id: "moreer", type: "grammar", topic: "Степени сравнения: не «more + -er»",
      re: /\bmore\s+(better|worse|bigger|smaller|faster|cheaper|older|younger|easier|happier|quieter|nicer)\b/gi,
      msg: m => `«more ${m[1]}» — двойное сравнение, достаточно «${m[1]}»` },
    { id: "amagree", type: "grammar", topic: "Глагол agree без be",
      re: /\b(am|is|are)\s+agree\b/gi, msg: m => `«${m[0]}» → «agree» без «${m[1]}»` },
    { id: "uncount", type: "grammar", topic: "Неисчисляемые существительные",
      re: /\b(informations|advices|furnitures|homeworks|peoples)\b/gi,
      msg: m => `«${m[1]}» — неисчисляемое, без -s` },
    { id: "aan", type: "grammar", topic: "Артикли a / an",
      re: /\ba\s+(?!(?:uni|use|usu|eu|one|once))([aeiou]\w*)/gi,
      msg: m => `Перед гласным звуком — «an ${m[1]}»` },
    { id: "ilower", type: "spelling", topic: "Местоимение I — всегда с заглавной",
      re: /\bi\b(?!\.)/g, msg: () => "«I» пишется с заглавной буквы" },
    { id: "capstart", type: "spelling", topic: "Заглавная буква в начале предложения",
      re: /(?:^|[.!?]\s+)(?!i\b)([a-z])/g, msg: () => "Предложение начинается с заглавной буквы" },
    { id: "apos", type: "spelling", topic: "Апостроф в сокращениях",
      re: /\b(dont|doesnt|didnt|cant|wont|isnt|arent|wasnt|werent|im|ive|thats)\b/gi,
      msg: m => `Пропущен апостроф: «${m[1]}»` },
    { id: "double", type: "spelling", topic: "Повтор слова",
      re: /\b(\w+)\s+\1\b/gi, msg: m => `Слово повторено: «${m[1]}»` },
    { id: "misspell", type: "spelling", topic: "Написание слов",
      re: new RegExp("\\b(" + Object.keys(MISSPELL).join("|") + ")\\b", "gi"),
      msg: m => `Ошибка в написании: «${m[1]}» → «${MISSPELL[m[1].toLowerCase()]}»` }
  ];

  function wordCount(text) { return (String(text).match(/[A-Za-z']+/g) || []).length; }

  function checkText(text) {
    const out = [];
    for (const r of RULES) {
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(text)) !== null) {
        out.push({ rule: r.id, type: r.type, topic: r.topic, match: m[0].trim(), index: m.index, message: r.msg(m) });
        if (m[0].length === 0) r.re.lastIndex++;
      }
    }
    return out.sort((a, b) => a.index - b.index);
  }

  // ---------- 2. Сопоставление с программой ----------
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function coverage(text, lesson) {
    const t = String(text);
    const vocabUsed = [], vocabMissing = [];
    for (const v of lesson.vocab) {
      const re = new RegExp("\\b" + escapeRe(v) + "(s|es|ed|d|ing)?\\b", "i");
      (re.test(t) ? vocabUsed : vocabMissing).push(v);
    }
    const grammarUsed = [], grammarMissing = [];
    for (const g of lesson.grammar) {
      const re = new RegExp(g.re, "gi");
      const ex = (t.match(re) || []).slice(0, 2);
      (ex.length ? grammarUsed : grammarMissing).push({ id: g.id, name: g.name, examples: ex });
    }
    return { vocabUsed, vocabMissing, grammarUsed, grammarMissing };
  }

  // ---------- 3. Шкалы 1–5 (правила записаны явно) ----------
  const RULES_TEXT = {
    percent: "≥ 90 % → 5; 75–89 % → 4; 60–74 % → 3; 40–59 % → 2; < 40 % → 1",
    errors: "ошибок на 100 слов: ≤ 1 → 5; ≤ 3 → 4; ≤ 6 → 3; ≤ 10 → 2; > 10 → 1",
    writing: "письмо, % = 0,4·объём + 0,3·конструкции урока + 0,3·лексика урока; далее шкала процентов"
  };
  function scoreFromPercent(p) { return p >= 90 ? 5 : p >= 75 ? 4 : p >= 60 ? 3 : p >= 40 ? 2 : 1; }
  function scoreFromErrorRate(r) { return r <= 1 ? 5 : r <= 3 ? 4 : r <= 6 ? 3 : r <= 10 ? 2 : 1; }
  const r1 = x => Math.round(x * 10) / 10;
  const fmt = x => String(r1(x)).replace(".", ",");
  const ruDate = iso => { const [y, m, d] = String(iso).split("-"); return `${d}.${m}.${y}`; };

  const DIRS = [
    ["listening", "Аудирование"], ["reading", "Чтение"], ["writing", "Письмо"],
    ["speaking", "Говорение"], ["grammar", "Грамматика"], ["spelling", "Правописание"]
  ];

  // ---------- 4. Анализ ученика ----------
  function analyzeStudent(student, works, KB) {
    const lessonById = Object.fromEntries(KB.lessons.map(l => [l.id, l]));
    const mine = works.filter(w => w.student === student.code).sort((a, b) => a.date.localeCompare(b.date));
    const essays = mine.filter(w => w.type === "essay" && w.text);
    const tests = mine.filter(w => w.type === "test" && w.results);

    const perWork = essays.map(w => {
      const lesson = lessonById[w.lesson];
      const errors = checkText(w.text);
      const words = wordCount(w.text);
      const g = errors.filter(e => e.type === "grammar").length;
      const s = errors.filter(e => e.type === "spelling").length;
      return { id: w.id, date: w.date, lesson: w.lesson, lessonTitle: lesson ? lesson.title : w.lesson,
        words, errors, grammarErrors: g, spellingErrors: s,
        ratePer100: words ? r1((g + s) * 100 / words) : 0,
        coverage: lesson ? coverage(w.text, lesson) : null };
    });

    const words = perWork.reduce((a, w) => a + w.words, 0);
    const gErr = perWork.reduce((a, w) => a + w.grammarErrors, 0);
    const sErr = perWork.reduce((a, w) => a + w.spellingErrors, 0);
    const gRate = words ? r1(gErr * 100 / words) : null;
    const sRate = words ? r1(sErr * 100 / words) : null;

    const skill = {};
    for (const k of ["listening", "reading", "grammar"]) {
      let c = 0, t = 0;
      for (const w of tests) if (w.results[k]) { c += +w.results[k][0]; t += +w.results[k][1]; }
      skill[k] = t ? { correct: c, total: t, percent: Math.round(c * 100 / t) } : null;
    }

    const D = {};
    const dir = (key, score, basis, kind) => { D[key] = { key, name: DIRS.find(d => d[0] === key)[1], score, basis, kind }; };

    for (const k of ["listening", "reading"]) {
      const s = skill[k];
      dir(k, s ? scoreFromPercent(s.percent) : null,
        s ? `тесты: ${s.correct} из ${s.total} верных (${s.percent} %)` : "нет тестов", "objective");
    }

    // грамматика: тест + ошибки в эссе
    {
      const parts = [], scores = [];
      if (skill.grammar) { const sc = scoreFromPercent(skill.grammar.percent); scores.push(sc); parts.push(`тест ${skill.grammar.percent} % → ${sc}`); }
      if (gRate !== null) { const sc = scoreFromErrorRate(gRate); scores.push(sc); parts.push(`${fmt(gRate)} грамм. ошибки на 100 слов → ${sc}`); }
      dir("grammar", scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        parts.length ? parts.join("; ") + (scores.length > 1 ? "; среднее" : "") : "нет данных", "objective");
    }
    dir("spelling", sRate !== null ? scoreFromErrorRate(sRate) : null,
      sRate !== null ? `ошибок: ${sErr}, слов: ${words} → ${fmt(sRate)} на 100 слов` : "нет письменных работ", "objective");

    // письмо: объём, конструкции и лексика урока
    let vocabUsedAll = [], vocabMissingAll = [], constrUsed = [], constrTotal = 0, vocabTotal = 0;
    for (const w of perWork) if (w.coverage) {
      vocabUsedAll.push(...w.coverage.vocabUsed); vocabMissingAll.push(...w.coverage.vocabMissing);
      constrUsed.push(...w.coverage.grammarUsed); constrTotal += w.coverage.grammarUsed.length + w.coverage.grammarMissing.length;
      vocabTotal += w.coverage.vocabUsed.length + w.coverage.vocabMissing.length;
    }
    vocabUsedAll = [...new Set(vocabUsedAll)];
    vocabMissingAll = [...new Set(vocabMissingAll)].filter(v => !vocabUsedAll.includes(v));
    const writing = { avgWords: perWork.length ? Math.round(words / perWork.length) : 0 };
    if (perWork.length) {
      writing.volume = Math.round(Math.min(writing.avgWords / KB.course.expectedWords, 1) * 100);
      writing.constructs = constrTotal ? Math.round(constrUsed.length * 100 / constrTotal) : 0;
      writing.vocab = vocabTotal ? Math.round(perWork.reduce((a, w) => a + (w.coverage ? w.coverage.vocabUsed.length : 0), 0) * 100 / vocabTotal) : 0;
      writing.percent = Math.round(0.4 * writing.volume + 0.3 * writing.constructs + 0.3 * writing.vocab);
      dir("writing", scoreFromPercent(writing.percent),
        `объём ${writing.volume} % (в среднем ${writing.avgWords} слов), конструкции урока ${writing.constructs} %, лексика урока ${writing.vocab} % → ${writing.percent} %`, "objective");
    } else dir("writing", null, "нет письменных работ", "objective");

    const T = student.teacher || {};
    dir("speaking", T.speaking || null,
      T.speaking ? `оценка педагога${T.speakingNote ? ": " + T.speakingNote : ""}` : "нужна оценка педагога", "interpretive");

    const soft = [["teamwork", "Работа в команде"], ["presentation", "Презентация"]]
      .map(([k, n]) => ({ key: k, name: n, score: T[k] || null, kind: "interpretive" }));

    // динамика
    const trend = {};
    if (perWork.length >= 2) trend.errors = { from: perWork[0].ratePer100, to: perWork[perWork.length - 1].ratePer100,
      fromDate: perWork[0].date, toDate: perWork[perWork.length - 1].date };
    if (tests.length >= 2) {
      const pct = w => { let c = 0, t = 0; for (const k in w.results) { c += +w.results[k][0]; t += +w.results[k][1]; } return Math.round(c * 100 / t); };
      trend.tests = { from: pct(tests[0]), to: pct(tests[tests.length - 1]), fromDate: tests[0].date, toDate: tests[tests.length - 1].date };
    }

    // частые ошибки
    const byTopic = {};
    for (const w of perWork) for (const e of w.errors) {
      byTopic[e.topic] = byTopic[e.topic] || { topic: e.topic, type: e.type, count: 0, examples: [] };
      byTopic[e.topic].count++;
      if (byTopic[e.topic].examples.length < 3 && !byTopic[e.topic].examples.includes(e.match)) byTopic[e.topic].examples.push(e.match);
    }
    const topErrors = Object.values(byTopic).sort((a, b) => b.count - a.count);

    const topics = [...new Set(mine.map(w => w.lesson))].map(id => lessonById[id]).filter(Boolean)
      .map(l => ({ id: l.id, title: l.title, topic: l.topic, cefr: l.cefr }));
    const grammarUsedNames = [...new Set(constrUsed.map(g => g.name))];

    const all = DIRS.map(([k]) => D[k]);
    const scored = all.filter(d => d.score);
    const strengths = scored.filter(d => d.score >= 4).map(d => d.name);
    const difficulties = scored.filter(d => d.score <= 3).sort((a, b) => a.score - b.score).map(d => d.name);

    const recs = [];
    const weak = scored.filter(d => d.score <= 3).sort((a, b) => a.score - b.score);
    const topG = topErrors.find(e => e.type === "grammar");
    const topS = topErrors.find(e => e.type === "spelling");
    for (const d of weak) {
      if (d.key === "grammar" && topG) recs.push(`Повторить правило «${topG.topic}» и выполнить упражнения на него (пример из работ: «${topG.examples[0]}»).`);
      else if (d.key === "grammar") recs.push("Повторить грамматику последних уроков по учебнику и выполнить упражнения рабочей тетради.");
      if (d.key === "spelling" && topS) recs.push(`Обратить внимание на тему «${topS.topic}»: перечитывать текст перед сдачей (пример: «${topS.examples[0]}»).`);
      if (d.key === "listening") recs.push("Регулярно слушать короткие адаптированные аудиозаписи уровня курса и пересказывать их.");
      if (d.key === "reading") recs.push("Читать адаптированные тексты уровня курса и отвечать на вопросы по ним.");
      if (d.key === "writing") recs.push(`Писать короткие тексты по темам уроков, используя новые слова${vocabMissingAll.length ? " (например: " + vocabMissingAll.slice(0, 4).join(", ") + ")" : ""}.`);
      if (d.key === "speaking") recs.push("Больше говорить: пересказывать прочитанное и отвечать на вопросы полными предложениями.");
    }
    const keep = ["Продолжать заниматься в том же темпе и закреплять пройденные темы.",
      "Повторять новые слова из уроков с помощью карточек.",
      "Читать и слушать на английском то, что интересно ученику: песни, мультфильмы, комиксы."];
    for (const k of keep) if (recs.length < 3) recs.push(k);

    return {
      student: { code: student.code, group: student.group, level: student.level },
      period: mine.length ? { from: mine[0].date, to: mine[mine.length - 1].date } : null,
      counts: { works: mine.length, essays: essays.length, tests: tests.length, words },
      directions: D, soft, projects: student.projects || [], perWork, skill, writing,
      vocab: { used: vocabUsedAll, missing: vocabMissingAll, usedCount: vocabUsedAll.length },
      grammarUsed: grammarUsedNames, topics, trend, topErrors, strengths, difficulties,
      recommendations: recs.slice(0, 3), rules: RULES_TEXT
    };
  }

  // ---------- 5. Черновик отчёта (только посчитанные факты) ----------
  function generateReport(a, KB) {
    const L = [];
    const low = s => s.charAt(0).toLowerCase() + s.slice(1), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const st = a.student;
    L.push(`Отчёт о прогрессе ученика ${st.code} (группа ${st.group}, курс «${KB.course.title}», уровень ${st.level})`);
    if (a.period) L.push(`Период: ${ruDate(a.period.from)} — ${ruDate(a.period.to)}.`);
    L.push("");
    L.push(`Что пройдено. За период выполнено работ: ${a.counts.works} (письменных: ${a.counts.essays}, тестов: ${a.counts.tests}). ` +
      `Темы: ${a.topics.map(t => `«${t.topic}» (${t.cefr})`).join(", ") || "—"}.` +
      (a.grammarUsed.length ? ` В письменных работах ученик уже использует: ${a.grammarUsed.join("; ")}.` : "") +
      (a.vocab.usedCount ? ` Использовано слов из программы: ${a.vocab.usedCount}.` : ""));
    if (a.projects.length) L.push(`Проекты: ${a.projects.join("; ")}.`);
    L.push("");
    const p = [];
    if (a.trend.errors) {
      const t = a.trend.errors;
      p.push(t.to < t.from ? `число ошибок на 100 слов снизилось с ${fmt(t.from)} до ${fmt(t.to)}`
        : t.to > t.from ? `число ошибок на 100 слов выросло с ${fmt(t.from)} до ${fmt(t.to)} — темы усложнились, это нужно отработать`
        : `число ошибок на 100 слов не изменилось (${fmt(t.to)})`);
    }
    if (a.trend.tests) {
      const t = a.trend.tests;
      p.push(t.to > t.from ? `результат тестов вырос с ${t.from} % до ${t.to} %` : t.to < t.from ? `результат тестов снизился с ${t.from} % до ${t.to} %` : `результат тестов стабилен (${t.to} %)`);
    }
    L.push("Прогресс. " + (p.length ? cap(p.join("; ")) + "." : "Пока мало работ, чтобы оценить динамику."));
    L.push("Сильные стороны. " + (a.strengths.length ? cap(a.strengths.map(low).join(", ")) + "." : "Будут видны после следующих работ."));
    const diff = a.difficulties.slice();
    if (a.topErrors.length) diff.push(`чаще всего встречается: «${a.topErrors[0].topic}»`);
    L.push("Трудности. " + (diff.length ? cap(diff.map(low).join(", ")) + "." : "Существенных трудностей не выявлено."));
    L.push("");
    L.push("Оценки по направлениям (шкала от 1 до 5):");
    for (const d of DIRS.map(([k]) => a.directions[k]))
      L.push(`— ${d.name}: ${d.score ? d.score : "нет данных"}${d.kind === "interpretive" && d.score ? " (оценка педагога)" : ""}`);
    const soft = a.soft.filter(s => s.score);
    if (soft.length) L.push(`— Мягкие навыки (оценка педагога): ${soft.map(s => `${s.name.toLowerCase()} — ${s.score}`).join(", ")}`);
    L.push("");
    L.push("Рекомендации:");
    a.recommendations.forEach(r => L.push("— " + r));
    L.push("");
    L.push("Черновик подготовлен системой EduVision по результатам работ ученика и проверен педагогом.");
    return L.join("\n");
  }

  // ---------- 6. Сверка: все числа и даты в тексте есть в данных ----------
  function collectFacts(a) {
    const nums = new Set([1, 5]), dates = new Set();
    (function walk(o, key) {
      if (o === null || o === undefined || key === "index" || key === "rules") return;
      if (typeof o === "number") { nums.add(r1(o)); return; }
      if (typeof o === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(o)) dates.add(ruDate(o));
        else (o.match(/\d+(?:[.,]\d+)?/g) || []).forEach(n => nums.add(r1(+n.replace(",", "."))));
        return;
      }
      if (Array.isArray(o)) { o.forEach(x => walk(x)); return; }
      if (typeof o === "object") for (const k in o) walk(o[k], k);
    })(a);
    return { nums, dates };
  }

  function factCheck(text, a) {
    const { nums, dates } = collectFacts(a);
    const unsupported = [];
    let t = String(text);
    t = t.replace(/\b\d{2}\.\d{2}\.\d{4}\b/g, d => { if (!dates.has(d)) unsupported.push(d); return " "; });
    t = t.replace(/\b[ABC][12]\+?/g, " ").replace(/\b[A-Z]-\d+\b|\b[A-Z]\d-\d\b/g, " "); // уровни CEFR, коды учеников и групп
    for (const m of t.match(/(?<![\p{L}\d])\d+(?:[.,]\d+)?/gu) || []) {
      const v = r1(+m.replace(",", "."));
      if (!nums.has(v)) unsupported.push(m);
    }
    return { ok: unsupported.length === 0, unsupported: [...new Set(unsupported)] };
  }

  // ---------- 7. Запрос к языковой модели (только посчитанные данные) ----------
  function buildPrompt(a, KB) {
    const facts = {
      ученик: a.student.code, курс: KB.course.title, период: a.period,
      работ: a.counts, темы: a.topics.map(t => t.topic),
      оценки: Object.fromEntries(DIRS.map(([k]) => a.directions[k]).map(d => [d.name, { балл: d.score, основание: d.basis, тип: d.kind === "objective" ? "объективное" : "интерпретационное" }])),
      мягкие_навыки: Object.fromEntries(a.soft.map(s => [s.name, s.score])),
      динамика: a.trend, частые_ошибки: a.topErrors.slice(0, 3).map(e => ({ тема: e.topic, количество: e.count, примеры: e.examples })),
      использованная_грамматика: a.grammarUsed, проекты: a.projects
    };
    return "Ты помогаешь педагогу языкового центра написать отчёт для родителей.\n" +
      "Пиши по-русски, доброжелательно и понятно, без терминов. Структура: что пройдено, прогресс, сильные стороны, трудности, ровно три рекомендации.\n" +
      "Используй ТОЛЬКО факты из JSON ниже. Не добавляй чисел, дат и событий, которых там нет. Интерпретационные оценки помечай как мнение педагога.\n\n" +
      JSON.stringify(facts, null, 2);
  }

  // ---------- 8. Опыт «система против педагогов» ----------
  function parseCSV(text) {
    const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
    const sep = lines[0].includes(";") ? ";" : ",";
    const head = lines[0].split(sep).map(s => s.trim());
    return lines.slice(1).map(l => { const c = l.split(sep); return Object.fromEntries(head.map((h, i) => [h, (c[i] || "").trim()])); });
  }

  const KIND = { listening: "objective", reading: "objective", writing: "objective", grammar: "objective", spelling: "objective", speaking: "interpretive", teamwork: "interpretive", presentation: "interpretive" };

  function agreement(systemRows, teacherRows) {
    const sys = new Map(systemRows.map(r => [r.student + "|" + r.direction, +r.score]));
    const by = {};
    for (const r of teacherRows) {
      const s = sys.get(r.student + "|" + r.direction);
      if (!s || !+r.score) continue;
      const b = by[r.direction] = by[r.direction] || { direction: r.direction, kind: KIND[r.direction] || "objective", n: 0, within1: 0 };
      b.n++; if (Math.abs(s - +r.score) <= 1) b.within1++;
    }
    const rows = Object.values(by).map(b => ({ ...b, percent: Math.round(b.within1 * 100 / b.n) }));
    const grp = k => { const g = rows.filter(r => r.kind === k); const n = g.reduce((a, r) => a + r.n, 0); const w = g.reduce((a, r) => a + r.within1, 0); return { n, within1: w, percent: n ? Math.round(w * 100 / n) : null }; };
    const objective = grp("objective"), interpretive = grp("interpretive");
    return { rows, objective, interpretive,
      hypothesis: objective.percent !== null && objective.percent >= 85 && (interpretive.percent === null || interpretive.percent < objective.percent) };
  }

  const api = { RULES, checkText, wordCount, coverage, scoreFromPercent, scoreFromErrorRate, analyzeStudent,
    generateReport, factCheck, buildPrompt, parseCSV, agreement, DIRS, ruDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EV = api;
})(typeof window !== "undefined" ? window : globalThis);
