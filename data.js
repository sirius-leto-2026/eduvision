/* EduVision — демонстрационные данные.
   Библиотека знаний (программа курса по урокам) и обезличенные профили учеников.
   Все работы выдуманы для демонстрации; реальные работы — только с согласия родителей. */
(function (root) {
  const KB = {
    course: { id: "A2-demo", title: "English A2 (демо-курс)", level: "A2", expectedWords: 80 },
    lessons: [
      { id: "L1", title: "My daily routine", cefr: "A1", topic: "Распорядок дня",
        vocab: ["get up", "breakfast", "usually", "always", "never", "sometimes", "homework", "after", "before", "weekday"],
        grammar: [
          { id: "ps3", name: "Present Simple, 3-е лицо (-s)", re: "\\b(he|she|it|my \\w+)\\s+(usually\\s+|always\\s+|often\\s+)?\\w+(s|es)\\b" },
          { id: "freq", name: "Наречия частотности", re: "\\b(always|usually|often|sometimes|never)\\b" }
        ],
        expected: "Рассказывает о своём дне простыми предложениями в Present Simple" },
      { id: "L2", title: "Last weekend", cefr: "A2", topic: "Прошедшие выходные",
        vocab: ["went", "visited", "yesterday", "weekend", "museum", "park", "friends", "played", "watched", "ago"],
        grammar: [
          { id: "pastreg", name: "Past Simple, правильные глаголы", re: "\\b(visited|played|watched|walked|stayed|cooked|helped|cleaned|liked|wanted|talked)\\b" },
          { id: "pastirr", name: "Past Simple, неправильные глаголы", re: "\\b(went|saw|had|ate|came|took|made|got|bought|was|were|met|swam)\\b" }
        ],
        expected: "Описывает события прошлого в Past Simple, использует маркеры времени" },
      { id: "L3", title: "Comparing cities", cefr: "A2", topic: "Сравнение городов",
        vocab: ["bigger", "smaller", "than", "the most", "city", "village", "crowded", "quiet", "expensive", "interesting"],
        grammar: [
          { id: "comp", name: "Сравнительная степень", re: "\\b(\\w+er|more \\w+|less \\w+)\\s+than\\b" },
          { id: "sup", name: "Превосходная степень", re: "\\bthe\\s+(most\\s+\\w+|\\w+est)\\b" }
        ],
        expected: "Сравнивает места и предметы, использует степени сравнения" },
      { id: "L4", title: "Future plans", cefr: "A2", topic: "Планы на будущее",
        vocab: ["plan", "holiday", "next", "summer", "travel", "future", "hope", "become", "will", "going to"],
        grammar: [
          { id: "goingto", name: "be going to", re: "\\b(am|is|are|'m|'s|'re)\\s+going\\s+to\\b" },
          { id: "will", name: "Future Simple (will)", re: "\\b(will|'ll)\\s+\\w+" }
        ],
        expected: "Говорит о планах и прогнозах с be going to и will" },
      { id: "L5", title: "Experiences", cefr: "A2+", topic: "Жизненный опыт",
        vocab: ["ever", "never", "already", "yet", "just", "been", "tried", "seen", "abroad", "once"],
        grammar: [
          { id: "pp", name: "Present Perfect", re: "\\b(have|has|'ve)\\s+(ever\\s+|never\\s+|already\\s+|just\\s+)?(been|seen|tried|visited|eaten|done|made|played|read|met|had|swum|travelled|lived)\\b" }
        ],
        expected: "Рассказывает о жизненном опыте в Present Perfect" },
      { id: "L6", title: "Food and health", cefr: "A2", topic: "Еда и здоровье",
        vocab: ["healthy", "vegetables", "fruit", "should", "enough", "sugar", "exercise", "diet", "water", "sleep"],
        grammar: [
          { id: "should", name: "Совет: should / shouldn't", re: "\\bshould(n't| not)?\\s+\\w+" },
          { id: "quant", name: "much / many / a lot of", re: "\\b(much|many|a lot of)\\b" }
        ],
        expected: "Даёт советы о здоровье, различает исчисляемые и неисчисляемые" }
    ]
  };

  const DEMO = {
    students: [
      { code: "S-014", group: "A2-1", level: "A2",
        teacher: { speaking: 4, speakingNote: "отвечает развёрнуто, иногда паузы", teamwork: 5, presentation: 4 },
        projects: ["Постер «My dream city»"] },
      { code: "S-027", group: "A2-1", level: "A2",
        teacher: { speaking: 3, speakingNote: "понимает вопросы, отвечает коротко", teamwork: 4, presentation: 3 },
        projects: ["Мини-проект «Healthy menu»"] },
      { code: "S-031", group: "A2-2", level: "A2",
        teacher: { speaking: null, speakingNote: "", teamwork: null, presentation: null },
        projects: [] }
    ],
    works: [
      { id: "w1", student: "S-014", lesson: "L1", type: "essay", date: "2026-10-05",
        text: "Every day i get up at seven. My mother usually make breakfast for me. I always go to school by bus. After school i do my homework. In the evening my brother play computer games but i never play becouse i read books. On weekday I sometimes go to the park with my freind." },
      { id: "w2", student: "S-014", lesson: "L2", type: "essay", date: "2026-10-26",
        text: "Last weekend I went to the museum with my friends. We saw old pictures and it was very interesting. Then we visited a cafe and I ate a big pizza. On Sunday I played football in the park and watched a film in the evening. I didnt went to bed early. It was a great weekend." },
      { id: "w3", student: "S-014", lesson: "L3", type: "essay", date: "2026-11-16",
        text: "Nizhny Novgorod is bigger than my town. It is more crowded and more expensive, but it is the most interesting city in our region. My village is quieter than the city. I think big cities are more better for young people because there are many museums and parks. My grandmother likes the village because it is quiet." },
      { id: "t1", student: "S-014", lesson: "L2", type: "test", date: "2026-10-28",
        results: { listening: [7, 10], reading: [8, 10], grammar: [6, 10] } },
      { id: "t2", student: "S-014", lesson: "L3", type: "test", date: "2026-11-18",
        results: { listening: [9, 10], reading: [9, 10], grammar: [8, 10] } },

      { id: "w4", student: "S-027", lesson: "L1", type: "essay", date: "2026-10-06",
        text: "i get up at eight. My sister get up at seven. i eat breakfast and go to school. After school i play games. I never do homework in the morning. My father work in a big company." },
      { id: "w5", student: "S-027", lesson: "L6", type: "essay", date: "2026-11-20",
        text: "To be healthy you should eat vegetables and fruit. You shouldn't eat much sugar. I drink enough water every day and I sleep eight hours. Many people dont do exercise but it is very importent. I think a healthy diet is the best way to feel good." },
      { id: "t3", student: "S-027", lesson: "L2", type: "test", date: "2026-10-28",
        results: { listening: [5, 10], reading: [7, 10], grammar: [5, 10] } },
      { id: "t4", student: "S-027", lesson: "L6", type: "test", date: "2026-11-22",
        results: { listening: [6, 10], reading: [8, 10], grammar: [7, 10] } }
    ]
  };

  const api = { KB, DEMO };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EVDATA = api;
})(typeof window !== "undefined" ? window : globalThis);
