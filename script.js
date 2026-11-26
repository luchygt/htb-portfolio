(() => {
  const D = window.PORTFOLIO || (typeof PORTFOLIO !== "undefined" ? PORTFOLIO : {});
  const P = D.profile || {};
  const certs = sortByDate(D.certificates || []);
  const badges = sortByDate(D.badges || []);
  const machines = sortByDate(D.machines || []);
  const challenges = sortByDate(D.challenges || []);

  const DIFFS = ["Easy", "Medium", "Hard", "Insane"];
  const OS_ICON = { linux: "🐧", windows: "🪟", freebsd: "😈", openbsd: "🐡", other: "💻" };
  const CAT_ICON = {
    web: "🌐", crypto: "🔐", pwn: "💥", reversing: "🔍", forensics: "🧪", misc: "🧩",
    osint: "🛰️", hardware: "🔌", mobile: "📱", blockchain: "⛓️", gamepwn: "🎮", "ai/ml": "🤖",
  };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function sortByDate(arr) { return [...arr].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))); }
  function fmtDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString("uk-UA", { day: "2-digit", month: "short", year: "numeric" });
  }
  function diffClass(d) { return String(d || "").toLowerCase(); }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  function link(url, label, cls = "btn") {
    return url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : "";
  }

  // ---------- profile ----------
  document.title = `${P.nickname || P.name || "Портфоліо"} · Hack The Box`;
  $("nav-nick").textContent = P.nickname || "portfolio";
  $("p-name").textContent = P.name || "";
  $("p-title").textContent = P.title || "";
  $("p-about").textContent = P.about || "";
  $("p-meta").innerHTML = [
    P.rank && `<span class="pill">Rank: <b>${esc(P.rank)}</b></span>`,
    P.location && `<span class="pill">📍 ${esc(P.location)}</span>`,
    P.nickname && `<span class="pill">@${esc(P.nickname)}</span>`,
  ].filter(Boolean).join("");
  $("p-links").innerHTML =
    link(P.htbProfile, "⬢ Профіль HTB", "btn primary") +
    (P.links || []).map((l) => link(l.url, esc(l.label))).join("");
  $("p-avatar").innerHTML = P.avatar
    ? `<img src="${esc(P.avatar)}" alt="${esc(P.name)}">`
    : `<div>${esc(initials(P.name))}</div>`;
  $("footer-text").innerHTML =
    `© ${new Date().getFullYear()} ${esc(P.name || "")} · Hack The Box portfolio`;

  // typing effect
  const typedText = `whoami --htb ${P.nickname || ""}`.trim();
  let ti = 0;
  (function type() {
    if (ti <= typedText.length) { $("typed").textContent = typedText.slice(0, ti++); setTimeout(type, 70); }
  })();

  // ---------- stats ----------
  function diffBar(list) {
    const total = list.length || 1;
    const counts = DIFFS.map((d) => list.filter((x) => x.difficulty === d).length);
    return `<div class="diffbar">${counts.map((c, i) =>
      c ? `<span style="width:${(c / total) * 100}%;background:var(--${DIFFS[i].toLowerCase()})" title="${DIFFS[i]}: ${c}"></span>` : "").join("")}</div>
      <div class="diff-legend">${counts.map((c, i) =>
        c ? `<span><i style="background:var(--${DIFFS[i].toLowerCase()})"></i>${DIFFS[i]} ${c}</span>` : "").join("")}</div>`;
  }
  const rooted = machines.filter((m) => m.root).length;
  $("stats").innerHTML = `
    <div class="stat reveal"><div class="num">${machines.length}</div><div class="lbl">Машин (${rooted} root)</div>${diffBar(machines)}</div>
    <div class="stat reveal"><div class="num">${challenges.length}</div><div class="lbl">Челенджів</div>${diffBar(challenges)}</div>
    <div class="stat reveal"><div class="num">${certs.length}</div><div class="lbl">Сертифікатів</div></div>
    <div class="stat reveal"><div class="num">${badges.length}</div><div class="lbl">Бейджів</div></div>`;

  // ---------- certificates ----------
  $("certs-grid").innerHTML = certs.length ? certs.map((c, i) => `
    <article class="card reveal">
      ${c.image
        ? `<div class="cert-img" data-lb="${i}"><img src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy"></div>`
        : `<div class="cert-img ph"><span class="ph-icon">📜</span></div>`}
      <div class="cert-body">
        <h3>${esc(c.title)}</h3>
        <div class="issuer">${esc(c.issuer || "")}</div>
        <div class="date">${fmtDate(c.date)}</div>
        ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
        <div class="card-actions">
          ${link(c.file, "📄 PDF")}
          ${link(c.credentialUrl, "✔ Перевірити")}
        </div>
      </div>
    </article>`).join("") : `<p class="empty">// поки порожньо</p>`;

  // ---------- badges ----------
  $("badges-grid").innerHTML = badges.length ? badges.map((b) => `
    <div class="card badge-card reveal" title="${esc(b.description || "")}">
      ${b.image
        ? `<div class="badge-img"><img src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy"></div>`
        : `<div class="badge-img ph">🏅</div>`}
      <h4>${esc(b.name)}</h4>
      ${b.description ? `<div class="desc">${esc(b.description)}</div>` : ""}
      <div class="date">${fmtDate(b.date)}</div>
    </div>`).join("") : `<p class="empty">// поки порожньо</p>`;

  // ---------- filters ----------
  function chips(container, onChange) {
    const state = new Set();
    container.innerHTML = DIFFS.map((d) => `<button class="chip" data-d="${d}">${d}</button>`).join("");
    container.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      const d = b.dataset.d;
      state.has(d) ? state.delete(d) : state.add(d);
      b.classList.toggle("on");
      onChange();
    });
    return state;
  }
  function fillSelect(sel, allLabel, values) {
    sel.innerHTML = `<option value="">${allLabel}</option>` +
      [...new Set(values.filter(Boolean))].sort().map((v) => `<option>${esc(v)}</option>`).join("");
  }
  function matches(item, q, diffs, field, fieldVal) {
    if (diffs.size && !diffs.has(item.difficulty)) return false;
    if (fieldVal && item[field] !== fieldVal) return false;
    if (!q) return true;
    const hay = [item.name, item[field], ...(item.tags || [])].join(" ").toLowerCase();
    return hay.includes(q);
  }

  // ---------- machines ----------
  const mDiffs = chips($("m-diff"), renderMachines);
  fillSelect($("m-os"), "Усі ОС", machines.map((m) => m.os));
  $("m-search").addEventListener("input", renderMachines);
  $("m-os").addEventListener("change", renderMachines);

  function renderMachines() {
    const q = $("m-search").value.trim().toLowerCase();
    const os = $("m-os").value;
    const list = machines.filter((m) => matches(m, q, mDiffs, "os", os));
    $("machines-grid").innerHTML = list.length ? list.map((m) => `
      <article class="card machine">
        <div class="m-head">
          <div class="m-avatar">${m.image ? `<img src="${esc(m.image)}" alt="" loading="lazy">` : OS_ICON[String(m.os).toLowerCase()] || "💻"}</div>
          <div>
            <h3>${esc(m.name)}</h3>
            <div class="m-sub"><span>${esc(m.os || "")}</span><span class="diff ${diffClass(m.difficulty)}">${esc(m.difficulty || "")}</span></div>
          </div>
        </div>
        ${m.tags && m.tags.length ? `<div class="tags">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
        <div class="flags">
          <span class="flag ${m.user ? "got" : ""}">${m.user ? "✔" : "✗"} user</span>
          <span class="flag ${m.root ? "got" : ""}">${m.root ? "✔" : "✗"} root</span>
        </div>
        <div class="m-foot"><span>${fmtDate(m.date)}</span>${m.writeup ? link(m.writeup, "Райтап →", "") : ""}</div>
      </article>`).join("") : `<p class="empty">// нічого не знайдено</p>`;
  }
  renderMachines();

  // ---------- challenges ----------
  const cDiffs = chips($("c-diff"), renderChallenges);
  fillSelect($("c-cat"), "Усі категорії", challenges.map((c) => c.category));
  $("c-search").addEventListener("input", renderChallenges);
  $("c-cat").addEventListener("change", renderChallenges);

  function renderChallenges() {
    const q = $("c-search").value.trim().toLowerCase();
    const cat = $("c-cat").value;
    const list = challenges.filter((c) => matches(c, q, cDiffs, "category", cat));
    $("challenges-body").innerHTML = list.length ? list.map((c) => `
      <tr>
        <td class="ch-name">${c.link
          ? `<a class="ch-link" href="${esc(c.link)}" target="_blank" rel="noopener" title="Відкрити челендж">${esc(c.name)} <span class="ext">↗</span></a>`
          : esc(c.name)}${c.tags && c.tags.length ? ` <span class="tags" style="display:inline-flex">${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</span>` : ""}</td>
        <td class="ch-cat">${CAT_ICON[String(c.category).toLowerCase()] || "🏁"} ${esc(c.category || "")}</td>
        <td><span class="diff ${diffClass(c.difficulty)}">${esc(c.difficulty || "")}</span></td>
        <td class="ch-date">${fmtDate(c.date)}</td>
        <td class="ch-links">${link(c.link, "Челендж ↗", "")}${c.link && c.writeup ? " · " : ""}${c.writeup ? link(c.writeup, "Райтап →", "") : ""}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="empty">// нічого не знайдено</td></tr>`;
  }
  renderChallenges();

  // ---------- lightbox ----------
  const lb = $("lightbox");
  $("certs-grid").addEventListener("click", (e) => {
    const el = e.target.closest("[data-lb]");
    if (!el) return;
    const c = certs[+el.dataset.lb];
    $("lb-img").src = c.image;
    $("lb-caption").textContent = c.title;
    lb.hidden = false;
  });
  const closeLb = () => { lb.hidden = true; $("lb-img").src = ""; };
  lb.addEventListener("click", closeLb);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  // ---------- nav ----------
  $("burger").addEventListener("click", () => $("menu").classList.toggle("open"));
  $("menu").addEventListener("click", (e) => { if (e.target.tagName === "A") $("menu").classList.remove("open"); });

  const navLinks = [...document.querySelectorAll("#menu a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));

  // reveal on scroll
  const rev = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("shown"); rev.unobserve(en.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => rev.observe(el));
})();
