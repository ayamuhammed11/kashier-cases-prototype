/* Cases list: the queue of the Cases module.
   One row per case (one case per channel of a submitted application), assigned by round robin. An agent sees their own cases;
   the manager sees every case and filters by agent. Needs sa-core.js, uw-core.js and the filter bar. */
(function () {
  'use strict';
  const { esc } = SA, icon = UW.icon;
  const TABS = ['All'].concat(UW.STATUSES);
  const st = { tab: 'All', q: '', page: 1, size: 10, data: 'loaded', filters: {} };
  try { Object.assign(st, JSON.parse(sessionStorage.getItem('uw-list') || '{}')); } catch (e) { }
  const keep = () => { try { sessionStorage.setItem('uw-list', JSON.stringify({ tab: st.tab, size: st.size })); } catch (e) { } };
  const mgr = () => !!UW.me().manager;

  const BANKS_OF = c => [...new Set([].concat(...c.svcIds.map(id => c.app.svc[id].lines.map(l => l.bank))).filter(Boolean))];
  const FIELDS = () => [
    { key: 'ch', type: 'multi', icon: 'device', label: 'Channel', hint: 'Each application opens one case for its Online services and one for its POS services.', options: ['Online', 'POS'] },
    ...(mgr() ? [{ key: 'assignee', type: 'multi', icon: 'user', label: 'Agent', hint: 'Cases assigned to these underwriters.', options: UW.AGENTS }] : []),
    { key: 'banks', type: 'multi', icon: 'banknotes', label: 'Bank', hint: 'Cases with a service on these banks.', options: ['Bank Misr', 'National Bank of Egypt'] },
    { key: 'industry', type: 'multi', icon: 'store', label: 'Industry', hint: 'The merchant\'s industry.', options: [...new Set(UW.all().map(c => c.app.industry))].sort() },
    { key: 'submitted', type: 'date', icon: 'calendar', label: 'Submitted', hint: 'When Sales submitted the application.' }
  ];
  const getv = (c, k) => k === 'ch' ? c.ch : k === 'assignee' ? c.assignee : k === 'banks' ? BANKS_OF(c) : k === 'industry' ? c.app.industry : k === 'submitted' ? c.app.submittedAt.slice(0, 10) : '';
  const searchHit = c => !st.q || [c.app.biz, c.id, c.app.id, c.app.contact, c.app.email, c.assignee].join(' ').toLowerCase().includes(st.q.toLowerCase());
  const base = vals => UW.all().filter(c => searchHit(c) && KFilter.matches(vals || st.filters, c, FIELDS(), getv));
  const tabHit = c => st.tab === 'All' || c.status === st.tab;
  /* Oldest first while waiting on Underwriting, newest first once approved. */
  const rows = () => base().filter(tabHit).sort((a, b) => st.tab === 'Approved' ? b.app.submittedAt.localeCompare(a.app.submittedAt) : a.app.submittedAt.localeCompare(b.app.submittedAt));
  const href = c => 'case.html?id=' + encodeURIComponent(c.id);
  const chev = () => `<svg class="ic-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${AGENT_ICONS['chevron-right']}</svg>`;

  function header() {
    const m = UW.me();
    return `<header class="hdr"><div class="hdr-l"><nav class="crumb" aria-label="Breadcrumb"><a href="#">Home</a>${chev()}<span aria-current="page">Cases</span></nav>
      <h1>Cases</h1><p class="desc">${mgr() ? 'Every submitted application opens one case for its Online services and one for its POS services, assigned to the underwriters by round robin. Reassign them, and follow each one until it is approved.' : 'The cases assigned to you by round robin. Each case holds every Online or every POS service of an application: review each service, its pricing and its documents, then approve the case or return it to Sales.'}</p></div>
      <div class="tsearch" id="topSearch"></div>
      <button type="button" class="profile" aria-label="Account: ${esc(m.name)}"><span class="pav">${m.init}</span><span class="pdata"><span class="pname">${esc(m.name)}</span><span class="pmail">${esc(m.role)}</span></span>${icon('chevron', 'ic-16')}</button></header>`;
  }
  function tabs() {
    const b = base(), cnt = s => s === 'All' ? b.length : b.filter(c => c.status === s).length;
    return `<div class="stabs" role="tablist" aria-label="Status">${TABS.map(s => { const attn = s === 'New' && cnt(s) > 0; return `<button type="button" role="tab" aria-selected="${st.tab === s}" data-act="tab" data-v="${esc(s)}">${s}<span class="c ${attn ? 'attn' : ''}">${cnt(s)}</span></button>`; }).join('')}</div>`;
  }
  function services(c) {
    const n = c.svcIds.map(UW.nmOf), show = n.slice(0, 3);
    return `<span class="svcs" title="${esc(n.join(', '))}">${show.map(x => `<span class="tag">${esc(x)}</span>`).join('')}${n.length > 3 ? `<span class="tag">+${n.length - 3}</span>` : ''}</span>`;
  }
  function secondLine(c) {
    if (c.status === 'New') return `<span class="sub2 m">Not started · assigned ${UW.daysSince(c.app.submittedAt)} day${UW.daysSince(c.app.submittedAt) === 1 ? '' : 's'} ago</span>`;
    if (c.status === 'In Review') { const p = UW.progress(c); return p.flagged.length ? `<span class="sub2 h">${p.done} of ${p.total} approved · ${p.flagged.length} rejected</span>` : p.ready ? '<span class="sub2 ok">Every item approved · ready to approve the case</span>' : `<span class="sub2">${p.done} of ${p.total} approved</span>`; }
    if (c.status === 'Returned to Sales') { const it = c.local.returned.items, t = it.map(i => i.label + ': ' + i.reason).join(' · '); return `<span class="sub2 h" title="${esc(t)}">${it.length > 1 ? it.length + ' items rejected · ' : ''}${esc(it[0].label)}: ${esc(it[0].reason)}</span>`; }
    if (c.status === 'Approved') return `<span class="sub2">Approved ${UW.fmtDate(c.local.approved.at)} by ${esc(c.local.approved.by)}</span>`;
    return '';
  }
  const who = c => `<span class="who"><span class="av" aria-hidden="true">${UW.initials(c.assignee)}</span>${esc(c.assignee)}</span>`;
  function table(list) {
    const head = `<th>Case</th><th>Channel</th><th>Services</th><th>Status</th>${mgr() ? '<th>Agent</th>' : ''}<th>Submitted</th>`, cols = mgr() ? 7 : 6;
    if (st.data === 'loading') return `<div class="tscroll"><table class="dt uwq"><thead><tr>${head}<th></th></tr></thead><tbody>${Array.from({ length: 6 }, () => `<tr class="skel-row">${'<td><span></span></td>'.repeat(cols)}</tr>`).join('')}</tbody></table></div>`;
    if (!list.length) {
      const filtered = st.q || Object.keys(st.filters || {}).some(k => (st.filters[k] || []).length !== 0) || st.tab !== 'All';
      if (st.data === 'empty' || !filtered) return `<div class="empty"><span class="ei">${icon('docsearch', 'ic-24')}</span><h3>No cases yet</h3><p>A case opens here when Sales submits an application and its rates are approved.</p></div>`;
      return `<div class="empty"><span class="ei">${icon('search', 'ic-24')}</span><h3>No cases match</h3><p>Try another status tab, or clear the search and filters.</p><button type="button" class="btn btn-outline btn-sm" data-act="clear">Clear search and filters</button></div>`;
    }
    const page = list.slice((st.page - 1) * st.size, st.page * st.size);
    return `<div class="tscroll"><table class="dt uwq"><thead><tr>${head}<th><span class="sr-only">Open</span></th></tr></thead><tbody>
      ${page.map(c => `<tr tabindex="0" data-href="${href(c)}" aria-label="Open ${esc(c.app.biz)}, ${c.ch} case">
        <td><div class="mer"><span class="mav" aria-hidden="true">${UW.initials(c.app.biz)}</span><span class="two"><span class="p">${esc(c.app.biz)}</span><span class="s">${esc(c.id)} · ${esc(c.app.id)}</span></span></div></td>
        <td>${UW.chTag(c.ch)}</td><td>${services(c)}</td>
        <td>${UW.chip(c.status)}${secondLine(c)}</td>${mgr() ? `<td>${who(c)}</td>` : ''}
        <td class="two num"><span class="p" style="font-weight:400">${UW.fmtDate(c.app.submittedAt)}</span><span class="s">by ${esc(c.app.sales)}</span></td>
        <td class="go">${icon('right', 'ic mirror')}</td></tr>`).join('')}</tbody></table></div>
      <div class="rcards-l">${page.map(c => `<a class="rc" href="${href(c)}"><span class="top"><span class="mav" aria-hidden="true">${UW.initials(c.app.biz)}</span><span class="t"><b>${esc(c.app.biz)}</b><span>${esc(c.id)} · ${esc(c.app.industry)}</span></span>${UW.chTag(c.ch)}</span>
        <span>${UW.chip(c.status)}${secondLine(c)}</span>${services(c)}<span class="meta">${mgr() ? `<span>${esc(c.assignee)}</span>` : ''}<span>Submitted ${UW.fmtDate(c.app.submittedAt)}</span></span></a>`).join('')}</div>`;
  }
  function pager(list) {
    if (st.data !== 'loaded' || !list.length) return '';
    const pages = Math.max(1, Math.ceil(list.length / st.size)); st.page = Math.min(st.page, pages);
    const a = (st.page - 1) * st.size + 1, b2 = Math.min(st.page * st.size, list.length);
    return `<div class="pager"><span>${a} – ${b2} of ${list.length}</span><span class="r"><span class="rpp"><label for="rpp">Rows per page</label> <select id="rpp" data-act-change="size">${[10, 20, 50].map(n => `<option ${n === st.size ? 'selected' : ''}>${n}</option>`).join('')}</select></span><button type="button" data-act="prev" aria-label="Previous page" ${st.page === 1 ? 'disabled' : ''}>${icon('left', 'ic-16 mirror')}</button><span>${st.page} / ${pages}</span><button type="button" data-act="next" aria-label="Next page" ${st.page === pages ? 'disabled' : ''}>${icon('right', 'ic-16 mirror')}</button></span></div>`;
  }
  function body() {
    const list = st.data === 'empty' ? [] : rows();
    return `<div class="lnav" data-live="nav">${tabs()}</div><div class="owned"><div id="fbHost"></div><div class="lcard" data-live="tbl">${table(list)}${pager(list)}</div></div>`;
  }
  function refresh() {
    const host = document.querySelector('[data-live="body"]'); if (!host) return;
    const list = st.data === 'empty' ? [] : rows();
    host.querySelector('[data-live="nav"]').innerHTML = tabs(); host.querySelector('[data-live="tbl"]').innerHTML = table(list) + pager(list);
  }
  function render(page) {
    page.innerHTML = `<div class="wrap"><div class="ph">${header()}</div><div data-live="body">${body()}</div></div>`;
    KFilter.search(document.getElementById('topSearch'), { placeholder: 'Find a case or merchant...', value: st.q, onSearch: q => { st.q = q; st.page = 1; refresh(); } });
    KFilter.mount(document.getElementById('fbHost'), {
      fields: FIELDS(), noun: ['case', 'cases'], today: UW.TODAY, initial: st.filters,
      onExport: () => SA.toast(`${rows().length} cases exported as CSV`),
      count: vals => base(vals).filter(tabHit).length,
      onChange: v => { st.filters = v; st.page = 1; refresh(); }
    });
  }

  window.UWQueue = {
    render, refresh,
    setData(d) { st.data = d; },
    reset() { st.page = 1; st.filters = {}; },
    chg: { size: el => { st.size = +el.value; st.page = 1; keep(); } },
    act: {
      tab: d => { st.tab = d.v; st.page = 1; keep(); refresh(); return false; },
      prev: () => { st.page--; refresh(); return false; },
      next: () => { st.page++; refresh(); return false; },
      clear: () => { st.q = ''; st.tab = 'All'; st.filters = {}; keep(); return true; }
    }
  };
})();
