(() => {
  "use strict";

  // ===================== Налаштування =====================
  const SITE_FILES = [
    "index.html", "style.css", "script.js", "data.js",
    "admin.html", "admin.css", "admin.js", "README.md",
  ];
  const DIFFS = ["Easy", "Medium", "Hard", "Insane"];
  const OSES = ["Linux", "Windows", "FreeBSD", "OpenBSD", "Other"];
  const CATS = ["Web", "Crypto", "Pwn", "Reversing", "Forensics", "Misc", "OSINT",
    "Hardware", "Mobile", "Blockchain", "GamePwn", "AI/ML"];
  const today = () => new Date().toISOString().slice(0, 10);

  const SCHEMA = {
    profile: {
      label: "Профіль", icon: "👤", single: true,
      fields: [
        { k: "name", l: "Ім'я" },
        { k: "nickname", l: "Нікнейм" },
        { k: "title", l: "Підзаголовок", full: true },
        { k: "about", l: "Про мене", t: "textarea", full: true },
        { k: "avatar", l: "Аватар", t: "upload", dir: "assets", accept: "image/*", full: true },
        { k: "htbProfile", l: "Профіль HTB (посилання)", t: "url" },
        { k: "rank", l: "Ранг HTB" },
        { k: "location", l: "Локація" },
        { k: "links", l: "Посилання (GitHub, LinkedIn, Email…)", t: "links", full: true },
      ],
    },
    certificates: {
      label: "Сертифікати", icon: "📜", titleKey: "title",
      blank: () => ({ title: "Новий сертифікат", issuer: "Hack The Box", date: today(), image: "", file: "", credentialUrl: "", description: "" }),
      fields: [
        { k: "title", l: "Назва", full: true },
        { k: "issuer", l: "Видавець" },
        { k: "date", l: "Дата", t: "date" },
        { k: "image", l: "Зображення сертифіката", t: "upload", dir: "assets/certs", accept: "image/*", full: true },
        { k: "file", l: "PDF-файл", t: "upload", dir: "assets/certs", accept: "application/pdf", full: true },
        { k: "credentialUrl", l: "Посилання для перевірки", t: "url", full: true },
        { k: "description", l: "Опис", t: "textarea", full: true },
      ],
    },
    badges: {
      label: "Бейджі", icon: "🏅", titleKey: "name",
      blank: () => ({ name: "Новий бейдж", image: "", date: today(), description: "" }),
      fields: [
        { k: "name", l: "Назва" },
        { k: "date", l: "Дата", t: "date" },
        { k: "image", l: "Зображення", t: "upload", dir: "assets/badges", accept: "image/*", full: true },
        { k: "description", l: "Опис", full: true },
      ],
    },
    machines: {
      label: "Машини", icon: "🖥️", titleKey: "name",
      blank: () => ({ name: "NewMachine", os: "Linux", difficulty: "Easy", date: today(), image: "", tags: [], writeup: "", user: true, root: true }),
      fields: [
        { k: "name", l: "Назва" },
        { k: "date", l: "Дата проходження", t: "date" },
        { k: "os", l: "ОС", t: "select", opts: OSES },
        { k: "difficulty", l: "Складність", t: "select", opts: DIFFS },
        { k: "image", l: "Аватар машини", t: "upload", dir: "assets/machines", accept: "image/*", full: true },
        { k: "tags", l: "Теги (через кому)", t: "tags", full: true },
        { k: "writeup", l: "Посилання на райтап (тільки retired)", t: "url", full: true },
        { k: "user", l: "User flag", t: "check" },
        { k: "root", l: "Root flag", t: "check" },
      ],
    },
    challenges: {
      label: "Челенджі", icon: "🏁", titleKey: "name",
      blank: () => ({ name: "New Challenge", category: "Web", difficulty: "Easy", date: today(), writeup: "", tags: [] }),
      fields: [
        { k: "name", l: "Назва" },
        { k: "date", l: "Дата", t: "date" },
        { k: "category", l: "Категорія", t: "select", opts: CATS },
        { k: "difficulty", l: "Складність", t: "select", opts: DIFFS },
        { k: "tags", l: "Теги (через кому)", t: "tags", full: true },
        { k: "writeup", l: "Посилання на райтап (тільки retired)", t: "url", full: true },
      ],
    },
  };

  // ===================== Стан =====================
  const STORE_KEY = "htb-admin-cfg";
  let cfg = null;              // {owner, repo, branch, token}
  let offline = false;
  let data = null;
  const pending = new Map();   // repoPath -> File
  let dirty = false;
  let tab = "profile";
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

  const $ = (id) => document.getElementById(id);

  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "text") n.textContent = v;
      else if (k in n && k !== "list") n[k] = v;
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c);
    return n;
  }

  function toast(msg, isErr = false, html = false) {
    const t = $("toast");
    t.className = "toast" + (isErr ? " err" : "");
    html ? (t.innerHTML = msg) : (t.textContent = msg);
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), isErr ? 8000 : 5000);
  }

  function setDirty(v = true) {
    dirty = v;
    $("dirty").hidden = !v;
  }

  // ===================== GitHub API =====================
  async function gh(path, opts = {}) {
    const headers = {
      Authorization: "Bearer " + cfg.token,
      Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    const r = await fetch("https://api.github.com" + path, { method: opts.method || "GET", headers, body: opts.body, cache: "no-store" });
    if (!r.ok) {
      let m = r.statusText;
      try { m = (await r.json()).message || m; } catch (_) {}
      const e = new Error(`GitHub ${r.status}: ${m}`);
      e.status = r.status;
      throw e;
    }
    if (opts.raw) return r.text();
    return r.status === 204 ? null : r.json();
  }
  const repoBase = () => `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;

  // Один коміт з кількома файлами (Git Data API)
  async function commitFiles(files, message, onProgress) {
    const base = repoBase();
    const ref = await gh(`${base}/git/ref/heads/${cfg.branch}`);
    const parent = ref.object.sha;
    const parentCommit = await gh(`${base}/git/commits/${parent}`);
    const tree = [];
    let i = 0;
    for (const f of files) {
      onProgress && onProgress(++i, files.length, f.path);
      const blob = await gh(`${base}/git/blobs`, { method: "POST", body: JSON.stringify({ content: f.content, encoding: "base64" }) });
      tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const newTree = await gh(`${base}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }) });
    const commit = await gh(`${base}/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }) });
    await gh(`${base}/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
    return commit;
  }

  // ===================== Base64 / серіалізація =====================
  function bytesToB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const textB64 = (t) => bytesToB64(new TextEncoder().encode(t));
  const blobB64 = async (b) => bytesToB64(new Uint8Array(await b.arrayBuffer()));

  function serialize(d) {
    return "/* =====================================================================\n" +
      "   ДАНІ ПОРТФОЛІО — редагуй через admin.html або вручну.\n" +
      "   Картинки лежать у assets/. Дати у форматі \"РРРР-ММ-ДД\".\n" +
      "   ===================================================================== */\n\n" +
      "const PORTFOLIO = " + JSON.stringify(d, null, 2) + ";\n";
  }

  function parseDataJs(text) {
    // eslint-disable-next-line no-new-func
    const obj = new Function(text + "\n;return typeof PORTFOLIO !== 'undefined' ? PORTFOLIO : window.PORTFOLIO;")();
    if (!obj || typeof obj !== "object") throw new Error("data.js не містить PORTFOLIO");
    obj.profile = obj.profile || {};
    obj.profile.links = obj.profile.links || [];
    for (const k of ["certificates", "badges", "machines", "challenges"]) obj[k] = Array.isArray(obj[k]) ? obj[k] : [];
    return obj;
  }

  async function loadData() {
    let text;
    if (cfg && !offline) {
      try {
        text = await gh(`${repoBase()}/contents/data.js?ref=${encodeURIComponent(cfg.branch)}`, { raw: true });
      } catch (e) {
        if (e.status !== 404) throw e;   // порожній репозиторій — беремо локальний data.js
      }
    }
    if (text == null) {
      const r = await fetch("data.js?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error("Не вдалося завантажити data.js");
      text = await r.text();
    }
    data = parseDataJs(text);
  }

  // ===================== Вхід =====================
  function guessRepo() {
    const h = location.hostname;
    if (h.endsWith(".github.io")) {
      const owner = h.split(".")[0];
      const seg = location.pathname.split("/").filter(Boolean)[0];
      const repo = seg && !seg.endsWith(".html") ? seg : `${owner}.github.io`;
      return { owner, repo };
    }
    return { owner: "", repo: "htb-portfolio" };
  }

  function readCfg() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY) || "null"); }
    catch (_) { return null; }
  }

  async function connect(c, remember) {
    cfg = c;
    const repo = await gh(repoBase());
    if (!repo.permissions || !repo.permissions.push) {
      throw new Error("Токен не має права запису в цей репозиторій.");
    }
    const s = JSON.stringify(cfg);
    sessionStorage.setItem(STORE_KEY, s);
    if (remember) localStorage.setItem(STORE_KEY, s);
  }

  async function enterEditor() {
    await loadData();
    $("login").hidden = true;
    $("editor").hidden = false;
    $("repo-pill").textContent = offline ? "офлайн-режим" : `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;
    $("save-btn").hidden = offline;
    $("deploy-btn").hidden = offline || !isLocal;
    renderTabs();
    renderPanel();
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector("button[type=submit]");
    const err = $("l-error");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Перевірка…";
    try {
      await connect({
        owner: $("l-owner").value.trim(),
        repo: $("l-repo").value.trim(),
        branch: $("l-branch").value.trim() || "main",
        token: $("l-token").value.trim(),
      }, $("l-remember").checked);
      $("l-token").value = "";
      offline = false;
      await enterEditor();
    } catch (ex) {
      cfg = null;
      err.textContent = ex.status === 401 ? "Невірний токен." : ex.status === 404 ? "Репозиторій не знайдено або токен не має до нього доступу." : ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Увійти";
    }
  });

  $("offline-btn").addEventListener("click", async () => {
    offline = true;
    try { await enterEditor(); } catch (ex) { toast(ex.message, true); }
  });

  $("logout-btn").addEventListener("click", () => {
    if (dirty && !confirm("Є незбережені зміни. Все одно вийти?")) return;
    localStorage.removeItem(STORE_KEY);
    sessionStorage.removeItem(STORE_KEY);
    setDirty(false);
    location.reload();
  });

  // ===================== Рендер =====================
  function renderTabs() {
    const side = $("tabs");
    side.replaceChildren(...Object.entries(SCHEMA).map(([key, s]) =>
      el("button", { class: key === tab ? "on" : "", onclick: () => { tab = key; renderTabs(); renderPanel(); } },
        el("span", { text: `${s.icon}  ${s.label}` }),
        s.single ? null : el("span", { class: "count", text: String(data[key].length) }))));
  }

  function previewSrc(path) {
    if (!path) return "";
    const f = pending.get(path);
    if (f) return (f._url = f._url || URL.createObjectURL(f));
    return /^https?:/.test(path) ? path : path + "?t=" + Date.now();
  }

  function fieldEl(obj, f, onChange) {
    const change = (v) => { obj[f.k] = v; setDirty(); onChange && onChange(f.k); };
    let input;
    switch (f.t) {
      case "textarea":
        input = el("textarea", { value: obj[f.k] || "", oninput: (e) => change(e.target.value) });
        break;
      case "select": {
        const opts = [...f.opts];
        if (obj[f.k] && !opts.includes(obj[f.k])) opts.push(obj[f.k]);
        input = el("select", { onchange: (e) => change(e.target.value) },
          opts.map((o) => el("option", { value: o, text: o, selected: o === obj[f.k] })));
        break;
      }
      case "check":
        return el("label", { class: "check" },
          el("input", { type: "checkbox", checked: !!obj[f.k], onchange: (e) => change(e.target.checked) }), f.l);
      case "tags":
        input = el("input", {
          value: (obj[f.k] || []).join(", "), placeholder: "Web, SQLi, Sudo",
          oninput: (e) => change(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)),
        });
        break;
      case "links":
        input = linksEditor(obj);
        break;
      case "upload":
        input = uploadEditor(obj, f, change);
        break;
      default:
        input = el("input", {
          type: f.t === "date" ? "date" : f.t === "url" ? "url" : "text",
          value: obj[f.k] || "", placeholder: f.t === "url" ? "https://…" : "",
          oninput: (e) => change(e.target.value),
        });
    }
    return el("label", { class: f.full ? "full" : "" }, f.l, input);
  }

  function uploadEditor(obj, f, change) {
    const isImg = f.accept.startsWith("image");
    const wrap = el("div", { class: "upload" });
    const draw = () => {
      const path = obj[f.k] || "";
      const preview = el("div", { class: "preview" });
      if (path && isImg) preview.append(el("img", { src: previewSrc(path), alt: "", onerror: (e) => e.target.replaceWith("🖼️") }));
      else preview.textContent = path ? "📄" : isImg ? "🖼️" : "📎";

      const fileIn = el("input", {
        type: "file", accept: f.accept, hidden: true,
        onchange: (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 20 * 1024 * 1024) return toast("Файл завеликий (максимум 20 МБ).", true);
          const dot = file.name.lastIndexOf(".");
          const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : "";
          const stem = (dot > 0 ? file.name.slice(0, dot) : file.name)
            .toLowerCase().replace(/[^a-z0-9а-яіїєґ_-]+/gi, "-").replace(/^-+|-+$/g, "") || "file";
          const p = `${f.dir}/${stem}-${Date.now().toString(36)}${ext}`;
          pending.set(p, file);
          change(p);
          draw();
        },
      });
      wrap.replaceChildren(
        preview,
        el("div", { class: "u-main" },
          el("input", { value: path, placeholder: `${f.dir}/назва-файлу`, oninput: (e) => { change(e.target.value); } }),
          el("div", { class: "u-actions" },
            el("button", { type: "button", class: "btn", text: "⇪ Завантажити файл", onclick: () => fileIn.click() }),
            path ? el("button", { type: "button", class: "btn", text: "Прибрати", onclick: () => { pending.delete(path); change(""); draw(); } }) : null,
            pending.has(path) ? el("span", { class: "pending", text: "буде завантажено при збереженні" }) : null),
          fileIn));
    };
    draw();
    return wrap;
  }

  function linksEditor(profile) {
    const box = el("div", { class: "links-ed" });
    const draw = () => {
      box.replaceChildren(
        ...profile.links.map((lnk, i) => el("div", { class: "link-row" },
          el("input", { value: lnk.label || "", placeholder: "Назва", oninput: (e) => { lnk.label = e.target.value; setDirty(); } }),
          el("input", { value: lnk.url || "", placeholder: "https://… або mailto:…", oninput: (e) => { lnk.url = e.target.value; setDirty(); } }),
          el("button", { type: "button", class: "icon-btn", title: "Видалити", text: "🗑", onclick: () => { profile.links.splice(i, 1); setDirty(); draw(); } }))),
        el("div", {}, el("button", { type: "button", class: "btn", text: "+ Додати посилання", onclick: () => { profile.links.push({ label: "", url: "" }); setDirty(); draw(); } })));
    };
    draw();
    return box;
  }

  function renderPanel(openIndex = -1) {
    const s = SCHEMA[tab];
    const panel = $("panel");

    if (s.single) {
      const obj = data[tab];
      panel.replaceChildren(
        el("div", { class: "panel-head" }, el("h2", {}, el("span", { class: "accent", text: s.icon }), s.label)),
        el("div", { class: "item single" }, el("div", { class: "fields" }, s.fields.map((f) => fieldEl(obj, f)))));
      return;
    }

    const list = data[tab];
    const items = list.map((obj, i) => {
      const title = el("span", { class: "s-title", text: obj[s.titleKey] || "(без назви)" });
      const date = el("span", { class: "s-date", text: obj.date || "" });
      const imgPath = obj.image;
      const thumb = imgPath ? el("img", { class: "s-thumb", src: previewSrc(imgPath), alt: "", onerror: (e) => e.target.replaceWith(el("span", { class: "s-thumb", text: s.icon })) })
        : el("span", { class: "s-thumb", text: s.icon });
      const onChange = (k) => {
        if (k === s.titleKey) title.textContent = obj[k] || "(без назви)";
        if (k === "date") date.textContent = obj.date || "";
      };
      return el("details", { class: "item", open: i === openIndex },
        el("summary", {}, thumb, title, date,
          el("button", {
            type: "button", class: "icon-btn", title: "Видалити", text: "🗑",
            onclick: (e) => {
              e.preventDefault();
              if (!confirm(`Видалити «${obj[s.titleKey] || "запис"}»?`)) return;
              list.splice(i, 1);
              setDirty(); renderTabs(); renderPanel();
            },
          })),
        el("div", { class: "fields" }, s.fields.map((f) => fieldEl(obj, f, onChange))));
    });

    panel.replaceChildren(
      el("div", { class: "panel-head" },
        el("h2", {}, el("span", { class: "accent", text: s.icon }), s.label),
        el("button", {
          class: "btn primary", text: "+ Додати",
          onclick: () => { list.unshift(s.blank()); setDirty(); renderTabs(); renderPanel(0); },
        })),
      el("p", { class: "panel-note", text: "На сайті записи автоматично сортуються за датою (нові зверху). Натисни на запис, щоб редагувати." }),
      ...(items.length ? items : [el("div", { class: "empty-box", text: "Поки що порожньо — натисни «+ Додати»." })]));
  }

  // ===================== Збереження =====================
  async function withBusy(btn, label, fn) {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    try { return await fn((t) => (btn.textContent = t)); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  function siteUrl() {
    return cfg.repo.toLowerCase() === `${cfg.owner.toLowerCase()}.github.io`
      ? `https://${cfg.owner.toLowerCase()}.github.io/`
      : `https://${cfg.owner.toLowerCase()}.github.io/${cfg.repo}/`;
  }

  async function pendingFiles() {
    const out = [];
    for (const [path, file] of pending) out.push({ path, content: await blobB64(file) });
    return out;
  }

  $("save-btn").addEventListener("click", () => withBusy($("save-btn"), "Збереження…", async (label) => {
    try {
      const files = [{ path: "data.js", content: textB64(serialize(data)) }, ...(await pendingFiles())];
      await commitFiles(files, "Оновлення портфоліо через адмін-панель", (i, n) => label(`Збереження ${i}/${n}…`));
      pending.clear();
      setDirty(false);
      const url = siteUrl();
      toast(`✔ Збережено! Сайт оновиться приблизно за хвилину: <a href="${url}" target="_blank" rel="noopener">${url}</a>`, false, true);
    } catch (ex) {
      toast("Помилка збереження: " + ex.message, true);
    }
  }));

  // Публікація всіх файлів сайту (лише з локального сервера)
  async function listAssets(dir, out) {
    const r = await fetch(dir + "/", { cache: "no-store" });
    if (!r.ok) return;
    const doc = new DOMParser().parseFromString(await r.text(), "text/html");
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (!href || /^(\?|\/|\.\.|#|[a-z]+:)/i.test(href)) continue;
      const name = decodeURIComponent(href);
      if (name.endsWith("/")) await listAssets(dir + "/" + name.slice(0, -1), out);
      else out.push(dir + "/" + name);
    }
  }

  $("deploy-btn").addEventListener("click", () => {
    if (!confirm(`Завантажити всі файли сайту з цього комп'ютера в ${cfg.owner}/${cfg.repo}? Файли з такими ж назвами в репозиторії буде перезаписано.`)) return;
    withBusy($("deploy-btn"), "Публікація…", async (label) => {
      try {
        const paths = [...SITE_FILES];
        await listAssets("assets", paths);
        const files = [{ path: ".nojekyll", content: "" }];
        for (const p of paths) {
          if (p === "data.js") { files.push({ path: p, content: textB64(serialize(data)) }); continue; }
          const r = await fetch(encodeURI(p) + "?t=" + Date.now(), { cache: "no-store" });
          if (!r.ok) continue;
          files.push({ path: p, content: await blobB64(await r.blob()) });
        }
        files.push(...(await pendingFiles()));
        await commitFiles(files, "Публікація сайту портфоліо", (i, n) => label(`Публікація ${i}/${n}…`));
        pending.clear();
        setDirty(false);
        toast(`✔ Опубліковано ${files.length} файлів. Якщо GitHub Pages увімкнено, сайт буде тут: <a href="${siteUrl()}" target="_blank" rel="noopener">${siteUrl()}</a>`, false, true);
      } catch (ex) {
        toast("Помилка публікації: " + ex.message + (ex.status === 409 ? " (репозиторій порожній — створи його з README)" : ""), true);
      }
    });
  });

  $("download-btn").addEventListener("click", () => {
    const blob = new Blob([serialize(data)], { type: "text/javascript" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "data.js" });
    document.body.append(a);
    a.click();
    a.remove();
    if (pending.size) toast("Увага: нові картинки не входять у data.js — скопіюй їх у assets/ вручну.", true);
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  // ===================== Старт =====================
  const g = guessRepo();
  $("l-owner").value = g.owner;
  $("l-repo").value = g.repo;
  if (isLocal) $("offline-btn").hidden = false;
  else $("offline-btn").hidden = true;

  const saved = readCfg();
  if (saved && saved.token) {
    $("l-owner").value = saved.owner;
    $("l-repo").value = saved.repo;
    $("l-branch").value = saved.branch;
    cfg = saved;
    gh(repoBase())
      .then(() => enterEditor())
      .catch(() => {
        cfg = null;
        localStorage.removeItem(STORE_KEY);
        sessionStorage.removeItem(STORE_KEY);
        $("l-error").textContent = "Сесія закінчилась — увійди знову.";
        $("l-error").hidden = false;
      });
  }
})();
