/* Cases module: shared core.
   A submitted application opens one case per channel it requests (Online, POS). Each case carries everything that channel
   needs to be approved: the merchant and criteria, its services and approved rates, the channel setup, the documents its rules
   require, the payout methods, and for every PF service its signed contract. Underwriting approves or rejects every item, then approves the case (it goes
   to Approved, where Underwriting's work ends) or returns it to Sales. Document rules, rate tiers and contracts follow
   sales-applications/shared/sa-core.js. */
(function () {
  'use strict';
  const { esc } = SA;
  const TODAY = '2026-10-28';

  /* ---------- Icons: verbatim Heroicons v2 outline paths not in sa-core ---------- */
  const P = d => `<path stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
  const EXTRA = {
    eye: P('M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z') + P('M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'),
    doc: P('M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'),
    globe: P('M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418'),
    download: P('M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3'),
    uturn: P('M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'),
    userplus: P('M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z'),
    badge: P('M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z'),
    docsearch: P('M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z')
  };
  const icon = (n, cls = 'ic-16', sw = 1.5) => EXTRA[n] ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" aria-hidden="true">${EXTRA[n]}</svg>` : SA.icon(n, cls, sw);

  /* ---------- Reference data (as in sa-core.js) ---------- */
  const DOCS = {
    'National ID': { ar: 'بطاقة الرقم القومي', slots: ['Front side', 'Back side'] },
    'Bank Account Letter / IBAN proof': { ar: 'خطاب حساب بنكي / إثبات الآيبان' },
    'Commercial Registration (CR)': { ar: 'السجل التجاري' },
    'Tax Identification Card': { ar: 'البطاقة الضريبية' },
    "Owner's Passport": { ar: 'جواز سفر المالك' },
    "Owner's Residence Card": { ar: 'بطاقة إقامة المالك' },
    'BM PSP Agreement Annex': { ar: 'ملحق اتفاقية PSP - بنك مصر' },
    'Brand Authorization Letter': { ar: 'خطاب تفويض العلامة التجارية' },
    'Store Lease / Location Proof': { ar: 'عقد إيجار المتجر / إثبات الموقع' }
  };
  const DOC_RULES = [
    { name: 'Identity (universal)', docs: ['National ID'] },
    { name: 'Bank proof (universal)', docs: ['Bank Account Letter / IBAN proof'] },
    { name: 'Tax registration', docs: ['Tax Identification Card'], entities: ['Registered Business', 'Professional Business'] },
    { name: 'Commercial Registration', docs: ['Commercial Registration (CR)'], entities: ['Registered Business'] },
    { name: 'Foreign owner KYC', docs: ["Owner's Passport", "Owner's Residence Card"], owners: ['Foreign Owner'] },
    { name: 'Bank Misr PSP annex', docs: ['BM PSP Agreement Annex'], bankPsp: 'Bank Misr' },
    { name: 'Online services', docs: ['Brand Authorization Letter'], channel: 'Online' },
    { name: 'POS services', docs: ['Store Lease / Location Proof'], channel: 'POS' }
  ];
  const PF_COVERED = ['Card', 'Wallet', 'Bank Installments', 'Basata'];
  const chOf = id => id.split(' ')[0];
  const nmOf = id => id.slice(id.indexOf(' ') + 1);
  const isCard = id => nmOf(id) === 'Card';
  const SVC_HINT = SA.SVC_HINT || {};

  /* Rate tiers: published rate, Sales Manager floor, Head of Sales floor, fixed fee. */
  const LOCAL = { key: 'local', label: 'Local rates', fee: 2, std: 1.75, mgr: 1.25 };
  const DOMESTIC = [
    { key: 'national-onus', label: 'National on-us rate (Mastercard/Visa)', fee: 2, std: 1.5, mgr: 1 },
    { key: 'national-offus', label: 'National off-us rate (Mastercard/Visa)', fee: 2, std: 2, mgr: 1.5 },
    { key: 'meeza-onus', label: 'Meeza on-us rate', fee: 1.5, std: 1.2, mgr: 0.9 },
    { key: 'meeza-offus', label: 'Meeza off-us rate', fee: 1.8, std: 1.4, mgr: 1.1 }
  ];
  const INTL = c => ({ key: 'intl-' + c, label: 'International rate (' + c + ')', fee: 3, std: 2.5, mgr: 2 });
  const SELLING = { key: 'selling', label: 'Selling rate', fee: 1.5, std: 1, mgr: 0.75 };
  const tiersFor = (id, s) => !isCard(id) ? [SELLING] : s.model === 'PSP' ? DOMESTIC.concat(s.currencies.map(INTL)) : [LOCAL, INTL('EGP')];

  /* ---------- People ---------- */
  const USERS = {
    rana: { key: 'rana', name: 'Rana Adel', init: 'RA', role: 'Underwriting Agent', email: 'rana@kashier.io' },
    omar: { key: 'omar', name: 'Omar Hassan', init: 'OH', role: 'Underwriting Agent', email: 'omar@kashier.io' },
    salma: { key: 'salma', name: 'Salma Nabil', init: 'SN', role: 'Underwriting Agent', email: 'salma@kashier.io' },
    layla: { key: 'layla', name: 'Layla Samir', init: 'LS', role: 'Underwriting Manager', email: 'layla@kashier.io', manager: true }
  };
  const AGENTS = ['Rana Adel', 'Omar Hassan', 'Salma Nabil'];
  let meKey = 'rana';
  try { meKey = sessionStorage.getItem('uw-as') || 'rana'; } catch (e) { }
  const me = () => USERS[meKey] || USERS.rana;
  const setMe = k => { meKey = USERS[k] ? k : 'rana'; try { sessionStorage.setItem('uw-as', meKey); } catch (e) { } };
  const initials = n => n.replace(/^Dr\.\s*/, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ---------- Submitted applications (seed) ----------
     svc: [id, model, [[bank, { tierKey: requestedRate }]], currencies?]. A rate below published was approved before the
     application reached Underwriting: by the Sales Manager down to their floor, by the Head of Sales below it. */
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const SEED = [
    { n: 1040, biz: 'Delta Pharma Group', contact: 'Nourhan Samir', email: 'nourhan@deltapharma.eg', phone: '+20 111 234 5678', entity: 'Registered Business', industry: 'Healthcare / Pharmacy', owner: 'Egyptian Owner', sales: 'Aya Muhammed', at: '2026-10-21T14:20:00',
      comment: 'Two rates below published, both approved. The merchant wants to go live before Black Friday.',
      svc: [['Online Card', 'PF', [['Bank Misr', {}]]], ['Online Wallet', 'PF', [['', { selling: 0.6 }]]], ['Online Bank Installments', 'PF', [['Bank Misr', { selling: 0.9 }], ['National Bank of Egypt', {}]]], ['POS Card', 'PSP', [['National Bank of Egypt', { 'national-offus': 1.8 }]], ['EGP']]],
      terminals: 3, websites: ['www.deltapharma.eg', 'instagram.com/deltapharma'], payouts: [['bank', 'National Bank of Egypt', 'Heliopolis', 'Delta Pharma Group', '1002345678901']] },
    { n: 1041, biz: 'Cairo Fresh Market', contact: 'Youssef Adel', email: 'youssef@cairofresh.com', phone: '+20 100 555 0101', entity: 'Registered Business', industry: 'Retail & E-commerce', owner: 'Egyptian Owner', sales: 'Aya Muhammed', at: '2026-10-26T10:05:00',
      svc: [['POS Card', 'PF', [['National Bank of Egypt', {}]]], ['POS Wallet', 'PF', [['', {}]]], ['POS Valu', 'PF', [['', {}]]]],
      terminals: 5, payouts: [['bank', 'CIB', 'Smart Village', 'Cairo Fresh Market', '100045220019'], ['wallet', 'Vodafone Cash', '01012345678', 'Youssef Adel', 'Branch Korba']] },
    { n: 1042, biz: 'Nile Bites Restaurants', contact: 'Hassan Mostafa', email: 'hassan@nilebites.com', phone: '+20 122 410 7788', entity: 'Registered Business', industry: 'Food & Beverage', owner: 'Egyptian Owner', sales: 'Mostafa Khaled', at: '2026-10-14T09:30:00',
      svc: [['Online Card', 'PF', [['National Bank of Egypt', {}]]], ['Online Instapay', 'PF', [['', {}]]], ['POS Card', 'PF', [['Bank Misr', { local: 1.5 }]]], ['POS Wallet', 'PF', [['', {}]]]],
      terminals: 8, websites: ['www.nilebites.com'], payouts: [['bank', 'Banque Misr', 'Zamalek', 'Nile Bites Restaurants', '20010045789']] },
    { n: 1043, biz: 'Giza Learning Hub', contact: 'Omar Khalil', email: 'omar@gizalearning.edu', phone: '+20 109 330 2244', entity: 'Professional Business', industry: 'Education', owner: 'Egyptian Owner', sales: 'Aya Muhammed', at: '2026-10-17T16:45:00',
      svc: [['Online Card', 'PSP', [['Bank Misr', {}]], ['EGP', 'USD']], ['Online Valu', 'PF', [['', {}]]], ['Online Souhoola', 'PF', [['', { selling: 0.8 }]]]],
      websites: ['www.gizalearning.edu'], missing: ['Tax Identification Card'], payouts: [['bank', 'QNB Alahli', 'Sheikh Zayed', 'Giza Learning Hub', '3300198844']] },
    { n: 1044, biz: 'Zamalek Boutique Hotel', contact: 'Dina Fathy', email: 'dina@zamalekhotel.com', phone: '+20 100 880 6611', entity: 'Registered Business', industry: 'Travel & Tourism', owner: 'Foreign Owner', sales: 'Nour Hamdy', at: '2026-10-22T11:10:00',
      comment: 'International guests: the USD and EUR rates matter most.',
      svc: [['Online Card', 'PSP', [['National Bank of Egypt', { 'intl-USD': 2.1 }]], ['EGP', 'USD', 'EUR']], ['POS Card', 'PSP', [['National Bank of Egypt', {}]], ['EGP', 'USD']], ['POS Bank Installments', 'PF', [['Bank Misr', {}]]]],
      terminals: 4, websites: ['www.zamalekhotel.com', 'booking.com/hotel/eg/zamalek-boutique'], payouts: [['bank', 'National Bank of Egypt', 'Main Branch', 'Zamalek Boutique Hotel', '1009988776655']] },
    { n: 1045, biz: 'Heliopolis Fitness Club', contact: 'Salma Hany', email: 'salma@heliofit.com', phone: '+20 111 909 3030', entity: 'Individual Seller', industry: 'Entertainment & Media', owner: 'Egyptian Owner', sales: 'Mostafa Khaled', at: '2026-10-27T13:00:00',
      svc: [['POS Card', 'PF', [['Bank Misr', {}]]], ['POS Wallet', 'PF', [['', {}]]], ['POS Aman', 'PF', [['', {}]]]],
      terminals: 2, noStore: true, payouts: [['wallet', 'Orange Cash', '01234567890', 'Salma Hany', '']] },
    { n: 1047, biz: 'Mansoura Smart Tech', contact: 'Karim Fathi', email: 'karim@mansourasmart.io', phone: '+20 155 010 2020', entity: 'Registered Business', industry: 'Technology / SaaS', owner: 'Egyptian Owner', sales: 'Aya Muhammed', at: '2026-10-25T15:40:00',
      svc: [['Online Card', 'PSP', [['Bank Misr', { 'national-onus': 1.2 }]], ['EGP', 'USD']], ['Online Wallet', 'PF', [['', {}]]], ['Online OCTO', 'PF', [['', {}]]], ['Online Forsa', 'PF', [['', {}]]], ['Online Mogo', 'PF', [['', {}]]], ['Online Contact', 'PF', [['', {}]]]],
      websites: ['www.mansourasmart.io'], missing: ['BM PSP Agreement Annex'], payouts: [['bank', 'CIB', 'Korba', 'Mansoura Smart Tech', '100088776612']] },
    { n: 1048, biz: 'Dokki Dental Clinic', contact: 'Dr. Laila Mansour', email: 'laila@dokkidental.com', phone: '+20 100 717 1717', entity: 'Professional Business', industry: 'Healthcare / Pharmacy', owner: 'Egyptian Owner', sales: 'Mostafa Khaled', at: '2026-10-20T10:15:00',
      svc: [['Online Card', 'PF', [['National Bank of Egypt', {}]]], ['Online Instapay', 'PF', [['', {}]]], ['POS Card', 'PF', [['National Bank of Egypt', {}]]], ['POS Valu', 'PF', [['', {}]]], ['POS Souhoola', 'PF', [['', {}]]]],
      terminals: 2, websites: ['www.dokkidental.com'], payouts: [['bank', 'National Bank of Egypt', 'Nasr City', 'Laila Mansour', '1001122334455']] },
    { n: 1049, biz: 'Aswan Spice Bazaar', contact: 'Nadia Hamed', email: 'nadia@aswanspice.com', phone: '+20 109 404 1212', entity: 'Individual Seller', industry: 'Food & Beverage', owner: 'Egyptian Owner', sales: 'Nour Hamdy', at: '2026-10-12T09:00:00',
      svc: [['Online Card', 'PF', [['Bank Misr', {}]]], ['Online Basata', 'PF', [['', {}]]], ['POS Card', 'PF', [['Bank Misr', {}]]]],
      terminals: 1, websites: ['facebook.com/aswanspicebazaar'], payouts: [['wallet', 'Vodafone Cash', '01098765432', 'Nadia Hamed', '']] },
    { n: 1050, biz: 'Pyramids Logistics', contact: 'Ahmed Gamal', email: 'ahmed@pyramidslog.com', phone: '+20 122 600 9090', entity: 'Registered Business', industry: 'Logistics & Delivery', owner: 'Egyptian Owner', sales: 'Aya Muhammed', at: '2026-10-27T17:25:00',
      svc: [['Online Card', 'PF', [['National Bank of Egypt', {}]]], ['Online Aman', 'PF', [['', {}]]], ['Online Basata', 'PF', [['', {}]]]],
      websites: ['www.pyramidslog.com'], noContract: ['Aman Contract'], payouts: [['bank', 'National Bank of Egypt', 'Maadi', 'Pyramids Logistics', '1005566778899']] }
  ];

  function buildApp(x) {
    const app = { id: 'APP-' + (24080000 + x.n), n: x.n, biz: x.biz, contact: x.contact, email: x.email, phone: x.phone, entity: x.entity, industry: x.industry, activities: [x.industry],
      owner: x.owner, sales: x.sales, submittedAt: x.at, comment: x.comment || '', zoho: 'ZOHO-' + String(x.n).padStart(5, '0'), svc: {}, order: [],
      terminals: x.terminals || 0, websites: x.websites || [], storeImage: x.noStore ? '' : slug(x.biz) + '-storefront.jpg', docs: {}, payouts: [], reqContracts: {}, contracts: [] };
    x.svc.forEach(([id, model, lines, currencies]) => {
      const s = { id, model, currencies: currencies || ['EGP'], ops: isCard(id) && chOf(id) === 'Online' ? ['Auth & Cap'] : [], lines: [] };
      lines.forEach(([bank, req]) => {
        const rates = tiersFor(id, s).map(t => {
          const r = req[t.key] != null ? req[t.key] : t.std;
          const below = r < t.std, approver = below ? (r >= t.mgr ? ['Nadia Salah', 'Sales Manager'] : ['Karim Zaki', 'Head of Sales']) : null;
          return { key: t.key, label: t.label, rate: r, fee: t.fee, pub: t.std, approval: approver ? { by: approver[0], role: approver[1], why: 'Moving volume from a competitor; justified on the expected monthly volume.' } : null };
        });
        s.lines.push({ bank, rates });
      });
      app.svc[id] = s; app.order.push(id);
    });
    // Every document its rules require is uploaded, except the ones the seed leaves out.
    requiredDocs(app, null).forEach((rules, name) => {
      if ((x.missing || []).includes(name)) return;
      app.docs[name] = {}; (DOCS[name].slots || ['File']).forEach(sl => { app.docs[name][sl] = slug(name) + (sl === 'File' ? '' : '-' + slug(sl)) + (sl === 'File' ? '.pdf' : '.jpg'); });
    });
    requiredContracts(app, null).forEach(r => { if (!(x.noContract || []).includes(r.label)) app.reqContracts[r.label] = slug(r.label) + '-signed.pdf'; });
    app.payouts = x.payouts.map((p, i) => p[0] === 'bank' ? { id: i + 1, type: 'bank', bank: p[1], branch: p[2], holder: p[3], acct: p[4], name: i ? 'Second account' : '' } : { id: i + 1, type: 'wallet', provider: p[1], mobile: p[2], wholder: p[3], name: p[4] || '' });
    return app;
  }

  /* The documents one channel needs, with the rules asking for each (OR within a group, AND across groups). */
  const requiredDocs = (app, ch) => docsFor(app, app.order.filter(id => !ch || chOf(id) === ch));
  /* The documents a set of services needs. Run on one service, it says which documents that service brings in. */
  function docsFor(app, ids) {
    const pspBanks = new Set();
    ids.forEach(id => { if (app.svc[id].model === 'PSP') app.svc[id].lines.forEach(l => l.bank && pspBanks.add(l.bank)); });
    const map = new Map();
    DOC_RULES.forEach(r => {
      if (r.entities && !r.entities.includes(app.entity)) return;
      if (r.owners && !r.owners.includes(app.owner)) return;
      if (r.bankPsp && !pspBanks.has(r.bankPsp)) return;
      if (r.channel && !ids.some(id => chOf(id) === r.channel)) return;
      r.docs.forEach(d => { if (!map.has(d)) map.set(d, []); map.get(d).push(r.name); });
    });
    return map;
  }
  /* PF contracts for the services of one channel: one Kashier PF contract covers Card, Wallet, Bank Installments and Basata. */
  function requiredContracts(app, ch) {
    const pf = app.order.filter(id => (!ch || chOf(id) === ch) && app.svc[id].model === 'PF'), out = [];
    const covered = [...new Set(pf.filter(id => PF_COVERED.includes(nmOf(id))).map(nmOf))];
    if (covered.length) out.push({ label: 'Kashier PF Contract', text: 'Covers ' + covered.join(', ') + ' on PF' });
    [...new Set(pf.filter(id => !PF_COVERED.includes(nmOf(id))).map(nmOf))].forEach(n => out.push({ label: n + ' Contract', text: n + ' on PF needs its own signed contract' }));
    return out;
  }

  const APPS = SEED.map(buildApp);

  /* ---------- Cases ---------- */
  const STATUSES = ['New', 'In Review', 'Returned to Sales', 'Approved'];
  const CHIP = { New: 'info', 'In Review': 'warn', 'Returned to Sales': 'bad', Approved: 'ok' };
  const CH_CODE = { Online: 'ONL', POS: 'POS' };
  const caseId = (app, ch) => `UW-${app.n}-${CH_CODE[ch]}`;

  /* Where the seeded cases stand. verify: 'all' or a share of the items (0-1); flags: { itemKey: reason }. */
  const CASE_SEED = {
    'UW-1040-ONL': { status: 'In Review', assignee: 'Rana Adel', verify: 0.5, at: '2026-10-22T09:00:00' },
    'UW-1040-POS': { status: 'New' },
    'UW-1041-POS': { status: 'New' },
    'UW-1042-ONL': { status: 'Approved', assignee: 'Omar Hassan', verify: 'all', at: '2026-10-15T10:00:00', approved: { by: 'Omar Hassan', at: '2026-10-16T15:30:00', comment: 'All clear.' } },
    'UW-1042-POS': { status: 'In Review', assignee: 'Rana Adel', verify: 0.6, at: '2026-10-15T11:00:00', flags: { 'doc:Store Lease / Location Proof': 'The lease expired in August 2026. Ask for the renewed lease.' } },
    'UW-1043-ONL': { status: 'Returned to Sales', assignee: 'Rana Adel', verify: 0.7, at: '2026-10-18T09:30:00', returned: { by: 'Rana Adel', at: '2026-10-19T12:10:00', reason: 'The Tax Identification Card is required for a Professional Business. Upload it and resubmit.', items: ['doc:Tax Identification Card'] } },
    'UW-1044-ONL': { status: 'In Review', assignee: 'Omar Hassan', verify: 0.3, at: '2026-10-23T10:00:00' },
    'UW-1044-POS': { status: 'In Review', assignee: 'Omar Hassan', verify: 0.2, at: '2026-10-23T10:05:00', flags: { "doc:Owner's Residence Card": 'The residence card photo is blurred; the expiry date cannot be read.' } },
    'UW-1045-POS': { status: 'New' },
    'UW-1047-ONL': { status: 'In Review', assignee: 'Salma Nabil', verify: 0.1, at: '2026-10-26T09:20:00' },
    'UW-1048-ONL': { status: 'In Review', assignee: 'Rana Adel', verify: 'all', at: '2026-10-21T09:00:00' },
    'UW-1048-POS': { status: 'In Review', assignee: 'Rana Adel', verify: 0.4, at: '2026-10-21T09:10:00' },
    'UW-1049-ONL': { status: 'Returned to Sales', assignee: 'Salma Nabil', verify: 0.5, at: '2026-10-13T09:00:00', returned: { by: 'Salma Nabil', at: '2026-10-14T16:20:00', reason: 'The Facebook page does not show the spice products or prices. Add the website or a page that shows what the merchant sells.', items: ['web'] } },
    'UW-1049-POS': { status: 'Approved', assignee: 'Salma Nabil', verify: 'all', at: '2026-10-13T09:05:00', approved: { by: 'Salma Nabil', at: '2026-10-14T16:30:00', comment: '' } },
    'UW-1050-ONL': { status: 'New' },
  };

  const STORE = 'uw-cases-v1';
  const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } };
  let STATE = readStore();
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(STATE)); } catch (e) { } };
  const resetAll = () => { STATE = {}; persist(); };

  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtDT = d => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const daysSince = d => Math.max(0, Math.round((new Date(TODAY + 'T12:00:00') - new Date(d)) / 864e5));
  const nowISO = () => new Date().toISOString();

  /* The contract a PF service needs: the Kashier PF contract for Card, Wallet, Bank Installments and Basata, its own for the rest. */
  const contractFor = (app, id) => app.svc[id].model !== 'PF' ? '' : PF_COVERED.includes(nmOf(id)) ? 'Kashier PF Contract' : nmOf(id) + ' Contract';
  const contractFile = (app, label, local) => app.reqContracts[label] || (local && local.uploaded.includes(label) ? slug(label) + '-resubmitted.pdf' : '');

  /* ---------- Review items: what a case holds, each approved or rejected on its own ---------- */
  const slotsOf = n => DOCS[n].slots || ['File'];
  const docDone = (app, n) => { const st = app.docs[n] || {}; return slotsOf(n).every(s => st[s]); };
  function rawItems(app, ch, local) {
    const extra = (local && local.uploaded) || [], out = [];
    const has = n => docDone(app, n) || extra.includes(n);
    out.push({ key: 'merchant', group: 'merchant', label: 'Merchant details and criteria', sub: `${app.entity} · ${app.industry}` });
    // Each service is reviewed on its own: its pricing and contract, then every document the rules require for it.
    app.order.filter(id => chOf(id) === ch).forEach(id => {
      const s = app.svc[id], banks = s.lines.map(l => l.bank).filter(Boolean), g = 'svc:' + id;
      // A PF service can't be approved without its signed contract attached.
      const con = contractFor(app, id), noCon = !!con && !contractFile(app, con, local), short = con ? 'Pricing and contract' : 'Pricing';
      out.push({ key: 'svc:' + id, group: g, svc: id, label: nmOf(id) + ' · ' + short, short, sub: `${s.model}${banks.length ? ' · ' + banks.join(', ') : ''}`, contract: con, missing: noCon, why: `The ${con} is not attached` });
      docsFor(app, [id]).forEach((rules, n) => out.push({ key: `sdoc:${id}|${n}`, group: g, svc: id, doc: n, label: nmOf(id) + ' · ' + n, short: n, sub: rules.join(', '), missing: !has(n), why: 'Not uploaded' }));
    });
    if (ch === 'Online') out.push({ key: 'web', group: 'setup', label: 'Website and social media links', sub: app.websites.length + ' link' + (app.websites.length === 1 ? '' : 's') });
    if (ch === 'POS') out.push({ key: 'pos', group: 'setup', label: 'POS terminals and store image', sub: `${app.terminals} terminal${app.terminals === 1 ? '' : 's'}`, missing: !(app.storeImage || extra.includes('Store Image')), why: 'The store image was not uploaded' });
    if (app.payouts.length) out.push({ key: 'payout', group: 'payout', label: 'Payout methods', sub: app.payouts.length + ' method' + (app.payouts.length === 1 ? '' : 's') });
    return out;
  }
  const expand = (app, ch, k) => k.startsWith('doc:') ? rawItems(app, ch, null).filter(i => i.doc === k.slice(4)).map(i => i.key) : [k];
  /* Seeded review states, applied once to the items (the share approved is taken in order, missing items stay rejected). */
  function seedReview(app, ch, sd) {
    const review = {}, items = rawItems(app, ch, null).filter(i => !i.missing);
    const n = sd.verify === 'all' ? items.length : Math.floor(items.length * (sd.verify || 0));
    const at = sd.at || app.submittedAt, by = sd.assignee;
    items.slice(0, n).forEach(i => { review[i.key] = { state: 'ok', by, at }; });
    Object.entries(sd.flags || {}).forEach(([k, reason]) => expand(app, ch, k).forEach(x => { review[x] = { state: 'flag', reason, by, at }; }));
    if (sd.returned) sd.returned.items.forEach(k => expand(app, ch, k).forEach(x => { review[x] = { state: 'flag', reason: sd.returned.reason, by: sd.returned.by, at: sd.returned.at }; }));
    return review;
  }
  function seedEvents(app, ch, sd) {
    const ev = [{ t: app.submittedAt, who: app.sales, text: 'submitted the application', ic: 'send', detail: app.id }, { t: app.submittedAt, who: 'System', text: `opened this case for the ${ch} services`, ic: 'plus' }];
    if (sd.assignee) ev.push({ t: app.submittedAt, who: 'System', text: 'assigned the case to ' + sd.assignee + ' (round robin)', ic: 'user' });
    const fl = Object.entries(sd.flags || {});
    fl.forEach(([k, r]) => ev.push({ t: sd.at, who: sd.assignee, text: 'rejected ' + k.replace(/^\w+:/, ''), ic: 'xcircle', detail: r }));
    if (sd.returned) ev.push({ t: sd.returned.at, who: sd.returned.by, text: 'returned the case to Sales', ic: 'uturn', detail: sd.returned.reason });
    if (sd.approved) ev.push({ t: sd.approved.at, who: sd.approved.by, text: 'approved the case', ic: 'check', detail: sd.approved.comment });
    return ev.reverse();
  }
  function local(id, app, ch) {
    if (!STATE[id]) {
      const sd = CASE_SEED[id] || { status: 'New' };
      STATE[id] = { status: sd.status, assignee: sd.assignee || '', review: seedReview(app, ch, sd), events: seedEvents(app, ch, sd), approved: sd.approved || null, uploaded: [],
        returned: sd.returned ? { by: sd.returned.by, at: sd.returned.at, items: [].concat(...sd.returned.items.map(k => expand(app, ch, k))).map(k => ({ key: k, label: (rawItems(app, ch, null).find(i => i.key === k) || { label: k }).label, reason: sd.returned.reason })) } : null };
    }
    return STATE[id];
  }
  /* Round robin: a case is assigned the moment it opens, to the next agent in turn, in the order the applications were
     submitted. The turn is kept with the cases, so it carries on from where it stopped. */
  function roundRobin(c) {
    const rr = STATE.__rr || { next: 0 }, name = AGENTS[rr.next % AGENTS.length];
    STATE.__rr = { next: (rr.next + 1) % AGENTS.length };
    c.local.assignee = name;
    c.local.events.unshift({ t: c.app.submittedAt, who: 'System', text: 'assigned the case to ' + name + ' (round robin)', ic: 'user' });
  }
  function build() {
    const out = [];
    APPS.forEach(app => ['Online', 'POS'].forEach(ch => {
      if (!app.order.some(x => chOf(x) === ch)) return;
      const id = caseId(app, ch), l = local(id, app, ch);
      out.push({ id, app, ch, svcIds: app.order.filter(x => chOf(x) === ch), local: l });
    }));
    const fresh = out.filter(c => !c.local.assignee).sort((a, b) => a.app.submittedAt.localeCompare(b.app.submittedAt));
    fresh.forEach(roundRobin);
    if (fresh.length) persist();
    out.forEach(c => { c.status = c.local.status; c.assignee = c.local.assignee; });
    return out;
  }
  /* An agent sees only the cases assigned to them; the manager sees every case. */
  const canSee = c => me().manager || c.assignee === me().name;
  const all = () => build().filter(canSee);
  /* Any case opens by its link (a sibling case may be someone else's); only its assignee or the manager can review it. */
  const get = id => build().find(c => c.id === id) || null;
  const siblings = c => build().filter(x => x.app.id === c.app.id && x.id !== c.id);

  function items(c) {
    return rawItems(c.app, c.ch, c.local).map(i => {
      const r = c.local.review[i.key] || {};
      if (i.missing) return Object.assign(i, { state: 'flag', reason: r.state === 'flag' ? r.reason : i.why, auto: !r.state || r.state !== 'flag', by: r.by, at: r.at });
      return Object.assign(i, { state: r.state || 'todo', reason: r.reason || '', by: r.by, at: r.at });
    });
  }
  function progress(c) {
    const list = items(c), done = list.filter(i => i.state === 'ok').length, flagged = list.filter(i => i.state === 'flag');
    return { list, done, total: list.length, flagged, ready: done === list.length };
  }
  const isMine = c => c.assignee === me().name;
  /* New means assigned but not started: the first item reviewed starts it. */
  const canReview = c => (c.status === 'New' || c.status === 'In Review') && (isMine(c) || me().manager);
  const start = c => { if (c.local.status === 'New') { c.local.status = 'In Review'; c.status = 'In Review'; } };

  /* ---------- Actions ---------- */
  const addEvent = (c, text, ic, detail) => { c.local.events.unshift({ t: nowISO(), who: me().name, text, ic, detail: detail || '' }); };
  const commit = c => { STATE[c.id] = c.local; persist(); };
  function setReview(c, key, state, reason, label) {
    start(c);
    if (state === 'todo') delete c.local.review[key]; else c.local.review[key] = { state, reason: reason || '', by: me().name, at: nowISO() };
    addEvent(c, state === 'ok' ? 'approved ' + label : state === 'flag' ? 'rejected ' + label : 'undid the review of ' + label, state === 'ok' ? 'check' : state === 'flag' ? 'xcircle' : 'retry', state === 'flag' ? reason : '');
    commit(c);
  }
  /* Only the Underwriting Manager reassigns; the case keeps its status and its review. */
  function reassign(c, name) {
    if (!me().manager) return;
    const prev = c.local.assignee;
    c.local.assignee = name;
    addEvent(c, `reassigned the case from ${prev} to ${name}`, 'user');
    commit(c);
  }
  function approve(c, comment) {
    c.local.status = 'Approved'; c.local.approved = { by: me().name, at: nowISO(), comment: comment || '' };
    addEvent(c, 'approved the case', 'check', comment);
    commit(c);
  }
  /* Return to Sales: possible once an item is rejected (or missing). Sales gets every rejected item with the reason given when it was rejected. */
  function returnToSales(c) {
    const rej = progress(c).flagged.map(i => ({ key: i.key, label: i.label, reason: i.reason }));
    if (!rej.length) return;
    c.local.status = 'Returned to Sales'; c.local.returned = { by: me().name, at: nowISO(), items: rej };
    addEvent(c, 'returned the case to Sales', 'uturn', rej.map(i => i.label + ': ' + i.reason).join(' · '));
    commit(c);
  }
  /* Prototype only: Sales fixes what was returned and resubmits. The returned items come back unreviewed, missing files arrive. */
  function resubmit(c) {
    const keys = ((c.local.returned && c.local.returned.items) || []).map(i => i.key);
    progress(c).flagged.forEach(i => { if (!keys.includes(i.key)) keys.push(i.key); });
    keys.forEach(k => {
      delete c.local.review[k];
      if (k.startsWith('sdoc:')) c.local.uploaded.push(k.slice(k.indexOf('|') + 1));
      if (k.startsWith('svc:')) { const con = contractFor(c.app, k.slice(4)); if (con && !contractFile(c.app, con, c.local)) c.local.uploaded.push(con); }
      if (k === 'pos') c.local.uploaded.push('Store Image');
    });
    c.local.status = 'In Review'; c.local.returned = null;
    c.local.events.unshift({ t: nowISO(), who: c.app.sales, text: 'resubmitted the case with the requested changes', ic: 'send', detail: keys.length + ' item' + (keys.length === 1 ? '' : 's') + ' to review again' });
    commit(c);
  }

  /* ---------- Shared bits ---------- */
  const chip = s => `<span class="sc ${CHIP[s] || 'neu'}">${esc(s)}</span>`;
  const chTag = ch => `<span class="tag info">${icon(ch === 'Online' ? 'globe' : 'device', 'ic-14')}${esc(ch)}</span>`;
  const svcLabel = id => nmOf(id);
  const docFiles = (app, n, c) => { const st = app.docs[n]; if (st) return Object.values(st); return c && c.local.uploaded.includes(n) ? [slug(n) + '-resubmitted.pdf'] : []; };

  /* Prototype bar of the Cases module. */
  const PAGES = [['index.html', 'Queue', 'The Cases list'], ['case.html', 'Case', 'One case']];

  window.UW = {
    PAGES,
    TODAY, USERS, AGENTS, STATUSES, CHIP, DOCS, me, setMe, initials, icon, chip, chTag, svcLabel, chOf, nmOf, isCard, SVC_HINT,
    all, get, siblings, items, progress, canReview, isMine, setReview, reassign, approve, returnToSales, resubmit, resetAll,
    fmtDate, fmtDT, daysSince, docFiles, contractFile, slug
  };
})();
