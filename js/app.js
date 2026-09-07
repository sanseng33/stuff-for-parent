(() => {
  const state = {
    jobs: [],
    updatedAt: "",
    tab: "mom",
    filterPriority: "all",
    loading: false,
  };

  function statusKey(id) { return "job-status:" + id; }
  function getStatus(job) {
    try {
      const s = localStorage.getItem(statusKey(job.id));
      if (s) return s;
    } catch (_) {}
    return job.status || "待联系";
  }
  function setStatus(id, status) {
    try { localStorage.setItem(statusKey(id), status); } catch (_) {}
  }


  const $ = (id) => document.getElementById(id);
  const listEl = $("list");
  const listEmpty = $("listEmpty");
  const updatedAtEl = $("updatedAt");
  const tabsEl = $("tabs");
  const viewList = $("viewList");
  const viewDetail = $("viewDetail");
  const detailEl = $("detail");
  const toastEl = $("toast");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toastEl.hidden = true; }, 1800);
  }

  function formatUpdated(iso) {
    if (!iso) return "更新时间未知";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "更新时间：" + iso;
    const p = (n) => String(n).padStart(2, "0");
    return `更新于 ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function parseRoute() {
    const hash = (location.hash || "#/").replace(/^#/, "");
    const parts = hash.split("/").filter(Boolean);
    if (parts[0] === "job" && parts[1]) return { name: "detail", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "dad") return { name: "list", tab: "dad" };
    return { name: "list", tab: "mom" };
  }

  function go(hash) {
    location.hash = hash;
  }

  async function loadJobs() {
    state.loading = true;
    updatedAtEl.textContent = "正在刷新…";
    try {
      const res = await fetch(`./data/jobs.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.jobs = Array.isArray(data.jobs) ? data.jobs : [];
      state.updatedAt = data.updatedAt || "";
      updatedAtEl.textContent = formatUpdated(state.updatedAt);
      tabsEl.hidden = false;
      render();
    } catch (e) {
      updatedAtEl.textContent = "加载失败，请点刷新重试";
      listEl.innerHTML = "";
      listEmpty.hidden = false;
      listEmpty.textContent = "没能读到岗位数据，请检查网络后刷新。";
      console.error(e);
    } finally {
      state.loading = false;
    }
  }

  function filtered() {
    const ageRank = { "优先": 0, "一般": 1, "慎选": 2 };
    return state.jobs
      .filter((j) => {
        if (j.person !== state.tab) return false;
        if (state.filterPriority === "all") return true;
        return String(j.priority || "").includes(state.filterPriority);
      })
      .sort((a, b) => {
        if (state.tab !== "mom") return 0;
        const ra = ageRank[a.ageFriendly] ?? 9;
        const rb = ageRank[b.ageFriendly] ?? 9;
        if (ra !== rb) return ra - rb;
        return 0;
      });
  }

  function badgeClass(p) {
    return String(p || "").includes("慎") ? "badge-warn" : "badge-ok";
  }

  function renderList() {
    const items = filtered();
    listEmpty.hidden = items.length > 0;
    listEmpty.textContent = "暂时没有岗位，稍后再刷新试试。";
    listEl.innerHTML = items.map((j) => {
      const place = [j.city, j.district].filter(Boolean).join(" · ");
      const line = j.schedule || j.askTips || j.contactHint || "";
      return `
        <button type="button" class="card" data-id="${escapeAttr(j.id)}">
          <div class="card-top">
            <h2 class="card-title">${escapeHtml(j.title || "")}</h2>
            <span class="badge ${badgeClass(j.priority)}">${escapeHtml(j.priority || "")}</span>
          </div>
          <p class="card-salary">${escapeHtml(j.salary || "薪资面议")}</p>
          <p class="card-sub">${escapeHtml(place)} · ${escapeHtml(j.company || "")}</p>
          <p class="card-line">${escapeHtml(line)}</p>
          <p class="card-sub">年龄：${escapeHtml(j.ageReq || "未写明")} · 进度：${escapeHtml(getStatus(j))}</p>
        </button>`;
    }).join("");
  }

  function findJob(id) {
    return state.jobs.find((j) => j.id === id);
  }

  function phoneHref(phone) {
    const digits = String(phone || "").replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "";
  }

  function renderDetail(job) {
    if (!job) {
      detailEl.innerHTML = `<p class="empty">找不到这条岗位，请返回列表。</p>`;
      return;
    }
    const place = [job.city, job.district].filter(Boolean).join(" · ");
    const phones = [job.phone, job.phoneAlt].filter(Boolean);
    const primaryTel = phones[0] ? phoneHref(phones[0]) : "";
    const rows = [
      ["公司", job.company],
      ["地点", place],
      ["经验", job.experience],
      ["学历", job.education],
      ["班制 / 时间", job.schedule],
      ["年龄要求", job.ageReq],
            ["地址", job.address],
      ["状态", getStatus(job)],
      ["备注", job.notes],
    ].filter(([, v]) => v);

    detailEl.innerHTML = `
      <div class="card-top">
        <h2>${escapeHtml(job.title || "")}</h2>
        <span class="badge ${badgeClass(job.priority)}">${escapeHtml(job.priority || "")}</span>
      </div>
      <p class="salary">${escapeHtml(job.salary || "薪资面议")}</p>
      <div class="kv">
        ${rows.map(([k, v]) => `<div><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`).join("")}
      </div>
      ${renderContacts(job)}
      ${job.askTips ? `<div class="tips"><strong>打电话可问：</strong><br/>${escapeHtml(job.askTips)}</div>` : ""}
      <div class="actions">
        <a class="btn-primary" ${primaryTel ? `href="${primaryTel}"` : "aria-disabled=true"}
           style="${primaryTel ? "" : "pointer-events:none;opacity:.45"}"
           ${primaryTel ? "" : "tabindex=-1"}>一键拨打</a>
        <button type="button" class="btn-secondary" id="btnCopyPhone" ${phones[0] ? "" : "disabled"}>复制电话</button>
        <button type="button" class="btn-secondary" id="btnCopyLink" ${job.url ? "" : "disabled"}>复制岗位链接</button>
        <a class="btn-secondary" ${job.url ? `href="${escapeAttr(job.url)}" target="_blank" rel="noopener"` : "aria-disabled=true"}
           style="${job.url ? "text-align:center;line-height:48px;text-decoration:none;display:block" : "pointer-events:none;opacity:.45"}">打开原网页</a>
        <button type="button" class="btn-secondary" id="btnCycleStatus">标记进度（当前：${escapeHtml(getStatus(job))}）</button>
      </div>`;

    const copyPhone = document.getElementById("btnCopyPhone");
    const copyLink = document.getElementById("btnCopyLink");
    if (copyPhone) copyPhone.onclick = () => copyText(phones[0], "电话已复制");
    if (copyLink) copyLink.onclick = () => copyText(job.url, "链接已复制");
    const copyWx = document.getElementById("btnCopyWechat");
    if (copyWx) copyWx.onclick = () => copyText(job.wechat, "微信号已复制");

    const cycle = document.getElementById("btnCycleStatus");
    if (cycle) {
      const order = ["待联系", "已联系", "已约面试", "不考虑", "已上车"];
      cycle.onclick = () => {
        const cur = getStatus(job);
        const next = order[(Math.max(0, order.indexOf(cur)) + 1) % order.length];
        setStatus(job.id, next);
        showToast("已标记：" + next);
        renderDetail(findJob(job.id));
      };
    }

  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(okMsg);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  
  function renderContacts(job) {
    const phones = [job.phone, job.phoneAlt].filter(Boolean);
    const rows = [];
    if (job.contactName) rows.push(["联系人", job.contactName]);
    if (phones.length) rows.push(["电话", phones.map(formatPhone).join(" / ")]);
    if (job.wechat) rows.push(["微信", job.wechat]);
    if (job.contactHint) rows.push(["其他联系方式", job.contactHint]);
    if (!rows.length) {
      return `<div class="contact-box"><div class="contact-title">联系方式</div><p class="v">岗位页暂未公开电话/微信，请用下方「打开原网页」在 Boss/58/鱼泡里点立即沟通或查看电话。</p></div>`;
    }
    const tel = phones[0] ? phoneHref(phones[0]) : "";
    return `<div class="contact-box">
      <div class="contact-title">联系方式</div>
      ${rows.map(([k,v]) => `<div class="contact-row"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`).join("")}
      ${tel ? `<a class="btn-primary" style="margin-top:12px;display:block;text-align:center;line-height:48px;text-decoration:none" href="${tel}">拨打 ${escapeHtml(formatPhone(phones[0]))}</a>` : ""}
      ${job.wechat ? `<button type="button" class="btn-secondary" style="margin-top:10px" id="btnCopyWechat">复制微信号</button>` : ""}
    </div>`;
  }

  function formatPhone(phone) {
    const d = String(phone || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("400") && d.length === 10) return d.slice(0,3) + "-" + d.slice(3,6) + "-" + d.slice(6);
    if (d.startsWith("0") && d.length >= 10) return d.slice(0,4) + "-" + d.slice(4);
    if (d.length === 11) return d.slice(0,3) + " " + d.slice(3,7) + " " + d.slice(7);
    return phone;
  }

  function render() {
    const route = parseRoute();
    if (route.name === "detail") {
      viewList.hidden = true;
      viewDetail.hidden = false;
      $("pageTitle").textContent = "岗位详情";
      tabsEl.hidden = true;
      renderDetail(findJob(route.id));
      return;
    }
    state.tab = route.tab || "mom";
    viewList.hidden = false;
    viewDetail.hidden = true;
    $("pageTitle").textContent = "合适的工作";
    tabsEl.hidden = false;
    const momN = state.jobs.filter((j) => j.person === "mom").length;
    const dadN = state.jobs.filter((j) => j.person === "dad").length;
    tabsEl.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.tab);
      if (btn.dataset.tab === "mom") btn.textContent = `妈妈 · 家政（${momN}）`;
      if (btn.dataset.tab === "dad") btn.textContent = `爸爸 · 司机（${dadN}）`;
    });
    renderList();
  }

  listEl.addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (!card) return;
    go(`#/job/${encodeURIComponent(card.dataset.id)}`);
  });

  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    go(btn.dataset.tab === "dad" ? "#/dad" : "#/mom");
  });

  $("btnBack").addEventListener("click", () => {
    go(state.tab === "dad" ? "#/dad" : "#/mom");
  });

  const filtersEl = $("filters");
  if (filtersEl) {
    filtersEl.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip) return;
      state.filterPriority = chip.dataset.filter;
      filtersEl.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderList();
    });
  }

  $("btnRefresh").addEventListener("click", () => {
    if (state.loading) return;
    loadJobs().then(() => showToast("已刷新"));
  });

  window.addEventListener("hashchange", render);

  const initial = parseRoute();
  if (initial.name === "list") state.tab = initial.tab;
  loadJobs();
})();
