/* EduVision — интерфейс. Состояние хранится в localStorage этого браузера. */
(function () {
  "use strict";
  const { KB, DEMO } = window.EVDATA;
  const EV = window.EV;
  const KEY = "eduvision-v1";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));

  let state;
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.students) return s; } catch (e) { /* нет доступа */ }
    return { ...clone(DEMO), reports: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ } }
  state = load();

  const lessonTitle = id => { const l = KB.lessons.find(x => x.id === id); return l ? `${l.id}. ${l.title}` : id; };
  const student = code => state.students.find(s => s.code === code);
  const analyze = code => EV.analyzeStudent(student(code), state.works, KB);

  // ---------- вкладки ----------
  const tabs = [...document.querySelectorAll("[role=tab]")];
  function show(name) {
    tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.tab === name));
    document.querySelectorAll(".tab").forEach(s => s.hidden = s.id !== "tab-" + name);
    render(name);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t.dataset.tab));
    t.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n.dataset.tab); }
    });
  });

  function fillStudentSelect(sel, keep) {
    const v = sel.value;
    sel.innerHTML = state.students.map(s => `<option value="${esc(s.code)}">${esc(s.code)} · ${esc(s.group)}</option>`).join("");
    if (keep && v && student(v)) sel.value = v;
  }

  // ---------- Ученики ----------
  function renderStudents() {
    const opt = (v) => `<option value="">—</option>` + [1, 2, 3, 4, 5].map(n => `<option ${v === n ? "selected" : ""}>${n}</option>`).join("");
    $("#studentsTable").innerHTML = `<tr><th>Код</th><th>Группа</th><th>Уровень</th><th>Работ</th><th>Говорение</th><th>Работа в команде</th><th>Презентация</th><th>Проекты (через ;)</th><th></th></tr>` +
      state.students.map(s => {
        const t = s.teacher || {};
        return `<tr data-code="${esc(s.code)}"><td><b>${esc(s.code)}</b></td><td>${esc(s.group)}</td><td>${esc(s.level)}</td>
        <td>${state.works.filter(w => w.student === s.code).length}</td>
        <td><select data-f="speaking" aria-label="Говорение ${esc(s.code)}">${opt(t.speaking)}</select></td>
        <td><select data-f="teamwork" aria-label="Работа в команде ${esc(s.code)}">${opt(t.teamwork)}</select></td>
        <td><select data-f="presentation" aria-label="Презентация ${esc(s.code)}">${opt(t.presentation)}</select></td>
        <td><input data-f="projects" value="${esc((s.projects || []).join("; "))}" aria-label="Проекты ${esc(s.code)}"></td>
        <td><button data-del="${esc(s.code)}" class="link">удалить</button></td></tr>`;
      }).join("");
  }
  $("#studentsTable").addEventListener("change", e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const s = student(tr.dataset.code), f = e.target.dataset.f;
    s.teacher = s.teacher || {};
    if (f === "projects") s.projects = e.target.value.split(";").map(x => x.trim()).filter(Boolean);
    else s.teacher[f] = e.target.value ? +e.target.value : null;
    save();
  });
  $("#studentsTable").addEventListener("click", e => {
    const c = e.target.dataset.del; if (!c) return;
    if (!confirm(`Удалить ученика ${c} и все его работы?`)) return;
    state.students = state.students.filter(s => s.code !== c);
    state.works = state.works.filter(w => w.student !== c);
    delete state.reports[c]; save(); renderStudents();
  });
  $("#addStudent").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target), code = f.get("code").trim().toUpperCase();
    if (student(code)) { alert("Такой код уже есть"); return; }
    state.students.push({ code, group: f.get("group").trim(), level: f.get("level"), teacher: {}, projects: [] });
    save(); e.target.reset(); renderStudents();
  });

  // ---------- Работы ----------
  const wf = $("#addWork");
  wf.lesson.innerHTML = KB.lessons.map(l => `<option value="${l.id}">${esc(lessonTitle(l.id))} (${l.cefr})</option>`).join("");
  wf.date.value = new Date().toISOString().slice(0, 10);
  wf.type.addEventListener("change", () => {
    const t = wf.type.value === "test";
    wf.querySelector(".essay-only").hidden = t; wf.querySelector(".test-only").hidden = !t;
  });
  wf.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(wf);
    const w = { id: "w" + Date.now(), student: f.get("student"), lesson: f.get("lesson"), type: f.get("type"), date: f.get("date") };
    if (w.type === "essay") {
      w.text = f.get("text").trim();
      if (EV.wordCount(w.text) < 5) { alert("Слишком короткий текст"); return; }
    } else {
      w.results = {};
      for (const [k, a, b] of [["listening", "l1", "l2"], ["reading", "r1", "r2"], ["grammar", "g1", "g2"]]) {
        const c = +f.get(a), t = +f.get(b);
        if (t > 0 && c >= 0 && c <= t) w.results[k] = [c, t];
      }
      if (!Object.keys(w.results).length) { alert("Введите хотя бы один результат: верно из всего"); return; }
    }
    state.works.push(w); save();
    wf.text.value = ""; $("#worksFilter").value = w.student; renderWorks();
  });

  function highlight(text, errors) {
    let out = "", pos = 0;
    for (const e of errors) {
      const i = text.indexOf(e.match, Math.max(pos, e.index));
      if (i < 0 || i < pos) continue;
      out += esc(text.slice(pos, i)) + `<mark class="${e.type}" title="${esc(e.message)}">${esc(e.match)}</mark>`;
      pos = i + e.match.length;
    }
    return out + esc(text.slice(pos));
  }

  function renderWorks() {
    fillStudentSelect(wf.student, true);
    const f = $("#worksFilter"); fillStudentSelect(f, true);
    const code = f.value;
    const a = code ? analyze(code) : null;
    const list = state.works.filter(w => w.student === code).sort((x, y) => x.date.localeCompare(y.date));
    $("#worksList").innerHTML = list.length ? list.map(w => {
      const head = `<div class="w-head"><b>${EV.ruDate(w.date)}</b> · ${esc(lessonTitle(w.lesson))} · ${w.type === "test" ? "тест" : "письменная работа"}
        <button class="link" data-delw="${esc(w.id)}">удалить</button></div>`;
      if (w.type === "test") return `<div class="card">${head}` + Object.entries(w.results).map(([k, [c, t]]) =>
        `<span class="chip">${{ listening: "Аудирование", reading: "Чтение", grammar: "Грамматика" }[k]}: ${c} из ${t}</span>`).join(" ") + `</div>`;
      const p = a.perWork.find(x => x.id === w.id);
      const cov = p.coverage;
      return `<div class="card">${head}<p class="essay">${highlight(w.text, p.errors)}</p>
        <div class="meta">Слов: ${p.words} · грамматических ошибок: ${p.grammarErrors} · орфографических: ${p.spellingErrors} · на 100 слов: ${String(p.ratePer100).replace(".", ",")}</div>
        ${cov ? `<div class="meta">Лексика урока: <span class="ok">${esc(cov.vocabUsed.join(", ") || "—")}</span>${cov.vocabMissing.length ? ` · не использовано: <span class="miss">${esc(cov.vocabMissing.join(", "))}</span>` : ""}</div>
        <div class="meta">Грамматика урока: ${cov.grammarUsed.map(g => `<span class="ok">${esc(g.name)}</span> (${esc(g.examples.join("; "))})`).join(", ") || "—"}${cov.grammarMissing.length ? ` · нет: <span class="miss">${esc(cov.grammarMissing.map(g => g.name).join(", "))}</span>` : ""}</div>` : ""}
        ${p.errors.length ? `<ul class="errs">${p.errors.map(e => `<li><span class="tag ${e.type}">${e.type === "grammar" ? "грамматика" : "правописание"}</span> ${esc(e.message)}</li>`).join("")}</ul>` : ""}</div>`;
    }).join("") : `<p class="hint">Работ пока нет.</p>`;
  }
  $("#worksFilter").addEventListener("change", renderWorks);
  $("#worksList").addEventListener("click", e => {
    const id = e.target.dataset.delw; if (!id || !confirm("Удалить работу?")) return;
    state.works = state.works.filter(w => w.id !== id); save(); renderWorks();
  });

  // OCR (Tesseract.js загружается только по кнопке)
  function loadTesseract() {
    return new Promise((res, rej) => {
      if (window.Tesseract) return res(window.Tesseract);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => res(window.Tesseract); s.onerror = () => rej(new Error("не удалось загрузить Tesseract.js — нужен интернет"));
      document.head.appendChild(s);
    });
  }
  $("#ocrBtn").addEventListener("click", async () => {
    const file = $("#photo").files[0], st = $("#ocrStatus");
    if (!file) { st.textContent = "Выберите фото работы"; return; }
    try {
      st.textContent = "Загружаю распознаватель…";
      const T = await loadTesseract();
      const r = await T.recognize(file, "eng", { logger: m => { if (m.status === "recognizing text") st.textContent = `Распознаю… ${Math.round(m.progress * 100)} %`; } });
      wf.text.value = r.data.text.trim();
      st.textContent = `Готово, средняя уверенность ${Math.round(r.data.confidence)} %. Проверьте текст перед сохранением.`;
    } catch (err) { st.textContent = "Ошибка: " + err.message; }
  });

  // ---------- Кабинет педагога ----------
  let current = null;
  function renderTeacher() {
    fillStudentSelect($("#tStudent"), true);
    const code = $("#tStudent").value, rep = state.reports[code];
    $("#tStatus").textContent = rep && rep.approved ? "утверждён " + rep.approvedAt : rep ? "черновик" : "нет отчёта";
    $("#tStatus").className = "badge " + (rep && rep.approved ? "good" : "");
    if (rep) { current = analyze(code); showAnalysis(current); $("#tText").value = rep.text; $("#tEditor").hidden = false; check(); }
    else { $("#tAnalysis").innerHTML = ""; $("#tEditor").hidden = true; }
  }
  function showAnalysis(a) {
    const rows = EV.DIRS.map(([k]) => a.directions[k]).concat(a.soft.map(s => ({ ...s, basis: s.score ? "оценка педагога" : "нужна оценка педагога" })));
    $("#tAnalysis").innerHTML = `<div class="scroll"><table><tr><th>Направление</th><th>Балл</th><th>Основание</th><th>Тип</th></tr>` +
      rows.map(d => `<tr><td>${esc(d.name)}</td><td class="score s${d.score || 0}">${d.score || "—"}</td><td>${esc(d.basis)}</td>
        <td><span class="tag ${d.kind}">${d.kind === "objective" ? "считает система" : "решает педагог"}</span></td></tr>`).join("") + `</table></div>
      <p class="hint">Правила шкал: ${esc(a.rules.percent)}. ${esc(a.rules.errors)}. ${esc(a.rules.writing)}.</p>
      ${a.topErrors.length ? `<p><b>Частые ошибки:</b> ${a.topErrors.slice(0, 4).map(e => `${esc(e.topic)} — ${e.count}`).join("; ")}</p>` : ""}`;
    $("#tPrompt").value = EV.buildPrompt(a, KB);
  }
  function check() {
    const r = EV.factCheck($("#tText").value, current);
    $("#factBox").className = "fact " + (r.ok ? "good" : "bad");
    $("#factBox").textContent = r.ok ? "Сверка фактов: все числа и даты в тексте есть в данных ученика."
      : "Сверка фактов: в данных нет — " + r.unsupported.join(", ") + ". Исправьте текст перед утверждением.";
    $("#approveBtn").disabled = !r.ok;
    return r.ok;
  }
  $("#tStudent").addEventListener("change", renderTeacher);
  $("#draftBtn").addEventListener("click", () => {
    const code = $("#tStudent").value; if (!code) return;
    const rep = state.reports[code];
    if (rep && rep.approved && !confirm("Отчёт уже утверждён. Сформировать новый черновик?")) return;
    current = analyze(code);
    state.reports[code] = { text: EV.generateReport(current, KB), approved: false };
    save(); renderTeacher();
  });
  $("#tText").addEventListener("input", () => {
    const rep = state.reports[$("#tStudent").value]; if (!rep) return;
    rep.text = $("#tText").value; if (rep.approved) { rep.approved = false; }
    save(); check();
    $("#tStatus").textContent = "черновик"; $("#tStatus").className = "badge";
  });
  $("#approveBtn").addEventListener("click", () => {
    if (!check()) return;
    const rep = state.reports[$("#tStudent").value];
    rep.approved = true; rep.approvedAt = new Date().toLocaleString("ru-RU"); save(); renderTeacher();
  });
  $("#revokeBtn").addEventListener("click", () => {
    const rep = state.reports[$("#tStudent").value]; if (!rep) return;
    rep.approved = false; save(); renderTeacher();
  });
  $("#copyPrompt").addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText($("#tPrompt").value); });

  // ---------- Родителю ----------
  function renderParent() {
    fillStudentSelect($("#pStudent"), true);
    const rep = state.reports[$("#pStudent").value];
    $("#pReport").innerHTML = rep && rep.approved
      ? `<article class="report">${esc(rep.text).replace(/\n/g, "<br>")}<p class="hint">Утверждено педагогом: ${esc(rep.approvedAt)}</p></article>`
      : `<p class="card">Отчёт ещё не утверждён педагогом. Родитель видит отчёт только после проверки.</p>`;
  }
  $("#pStudent").addEventListener("change", renderParent);

  // ---------- Опыт ----------
  function systemRows() {
    const out = [];
    for (const s of state.students) {
      const a = analyze(s.code);
      for (const [k] of EV.DIRS) if (a.directions[k].score) out.push({ student: s.code, direction: k, score: a.directions[k].score });
      for (const x of a.soft) if (x.score) out.push({ student: s.code, direction: x.key, score: x.score });
    }
    return out;
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("#dlSystem").addEventListener("click", () =>
    download("оценки_системы.csv", "student,direction,score\n" + systemRows().map(r => `${r.student},${r.direction},${r.score}`).join("\n"), "text/csv"));
  function showExp(csv) {
    const res = EV.agreement(systemRows(), EV.parseCSV(csv.replace(/^﻿/, "")));
    const pc = g => g.percent === null ? "—" : g.percent + " % (" + g.within1 + " из " + g.n + ")";
    $("#expResult").innerHTML = `<div class="scroll"><table><tr><th>Направление</th><th>Тип</th><th>Пар</th><th>Совпадение ±1</th></tr>` +
      res.rows.map(r => `<tr><td>${esc(r.direction)}</td><td>${r.kind === "objective" ? "объективное" : "интерпретационное"}</td><td>${r.n}</td><td>${r.percent} %</td></tr>`).join("") +
      `</table></div><p><b>Объективные:</b> ${pc(res.objective)} · <b>интерпретационные:</b> ${pc(res.interpretive)}</p>
      <p class="fact ${res.hypothesis ? "good" : "bad"}">Гипотеза (≥ 85 % по объективным и меньше по интерпретационным): ${res.hypothesis ? "подтверждается на этих данных" : "не подтверждается на этих данных"}.</p>`;
  }
  $("#teacherCsv").addEventListener("change", async e => { const f = e.target.files[0]; if (f) showExp(await f.text()); });
  $("#demoCsv").addEventListener("click", () => {
    // пример: «педагог» с небольшими расхождениями — для демонстрации расчёта
    const shift = { listening: 0, reading: 1, writing: -1, grammar: 0, spelling: 1, speaking: -2, teamwork: 2, presentation: -2 };
    showExp("student,direction,score\n" + systemRows().map(r => `${r.student},${r.direction},${Math.min(5, Math.max(1, r.score + (shift[r.direction] || 0)))}`).join("\n"));
  });

  // ---------- Данные ----------
  $("#exportBtn").addEventListener("click", () => download("eduvision-данные.json", JSON.stringify(state, null, 2), "application/json"));
  $("#importFile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const s = JSON.parse((await f.text()).replace(/^﻿/, "")); if (!s.students || !s.works) throw new Error("нет students/works"); state = { reports: {}, ...s }; save(); alert("Импортировано"); }
    catch (err) { alert("Не удалось импортировать: " + err.message); }
  });
  $("#resetBtn").addEventListener("click", () => { if (confirm("Заменить данные демонстрационными?")) { state = { ...clone(DEMO), reports: {} }; save(); render("data"); } });
  $("#wipeBtn").addEventListener("click", () => {
    if (!confirm("Удалить всех учеников, работы и отчёты из этого браузера? Действие необратимо.")) return;
    state = { students: [], works: [], reports: {} }; save(); render("data");
  });
  function renderKB() {
    $("#kbTable").innerHTML = `<tr><th>Урок</th><th>CEFR</th><th>Тема</th><th>Лексика</th><th>Грамматика</th><th>Ожидаемый результат</th></tr>` +
      KB.lessons.map(l => `<tr><td>${esc(lessonTitle(l.id))}</td><td>${l.cefr}</td><td>${esc(l.topic)}</td><td>${esc(l.vocab.join(", "))}</td><td>${esc(l.grammar.map(g => g.name).join("; "))}</td><td>${esc(l.expected)}</td></tr>`).join("");
  }

  function render(name) {
    ({ students: renderStudents, works: renderWorks, teacher: renderTeacher, parent: renderParent, exp: () => {}, data: renderKB })[name]();
  }
  show("students");
})();
