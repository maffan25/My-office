/* MyOffice — Finance (tema krem · merah · biru). Data tetap di localStorage 'mo-fin-v1' (kompatibel dengan data lama & Analytics). */
(function () {
  'use strict';
  const MO = window.MyOffice, K = MO.kit, esc = K.esc, rp = K.rp, uid = K.uid, by = K.by, fd = K.fd, today = K.todayS;
  const KEY = 'mo-fin-v1', pad = n => ('0' + n).slice(-2);
  let D; try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  D = D || {}; ['acc', 'tx', 'bud', 'goal', 'con', 'cat', 'item', 'rcp', 'cart', 'tag'].forEach(k => D[k] = D[k] || []);
  const mkc = (k, a) => a.forEach(n => D.cat.push({ id: uid(), name: n, kind: k, archived: false }));
  if (!D.cat.length) { mkc('Pemasukan', ['Uang saku', 'Gaji', 'Freelance', 'Beasiswa', 'Bisnis', 'Lainnya']); mkc('Pengeluaran', ['Makanan', 'Minuman', 'Transportasi', 'Pendidikan', 'Kebutuhan pribadi', 'Hiburan', 'Langganan', 'Kesehatan', 'Organisasi', 'Tabungan', 'Lainnya']); }
  const ICO = { Makanan: '🍜', Minuman: '🥤', Transportasi: '🛵', Pendidikan: '📚', 'Kebutuhan pribadi': '🧴', Hiburan: '🎬', Langganan: '📱', Kesehatan: '💊', Organisasi: '🤝', Tabungan: '🐷', Lainnya: '🧾', 'Uang saku': '👛', Gaji: '💼', Freelance: '💻', Beasiswa: '🎓', Bisnis: '🏪' };
  const ic = c => (c && (c.icon || ICO[c.name])) || '🧾';
  /* katalog = KATEGORI saja; nama item, harga, jumlah & label diisi sendiri saat mencatat */
  if (!D.mig2) { if (!D.cat.some(c => c.kind === 'Pengeluaran' && c.name === 'Minuman')) D.cat.splice(Math.max(0, D.cat.findIndex(c => c.name === 'Makanan') + 1), 0, { id: uid(), name: 'Minuman', kind: 'Pengeluaran', archived: false }); D.mig2 = 1; }
  if (!D.tagSeeded) { [['Penting', '⭐'], ['Mendesak', '⚡'], ['Kebutuhan', '🧺'], ['Keinginan', '🎁'], ['Hiburan', '🎉'], ['Bisa ditunda', '⏳']].forEach(([n, e]) => D.tag.push({ id: uid(), name: n, icon: e })); D.tagSeeded = 1; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { MO.msg('Peringatan', 'Data tidak bisa disimpan di browser ini.'); } };
  const st = { tab: 'home', sub: { riw: 'tx', dom: 'acc' }, m: today().slice(0, 7), cat: '', q: '', tt: '', rng: 6 };
  const mlab = ym => new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const addM = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const pc = (a, b) => b > 0 ? a / b * 100 : 0;
  const cn = id => (by(D.cat, id) || {}).name || '—', an = id => (by(D.acc, id) || {}).name || '—';
  const bal = a => { let b = +a.opening || 0; D.tx.forEach(t => { const x = +t.amount || 0; if (t.accId === a.id) b += t.type === 'Income' ? x : -x; if (t.type === 'Transfer' && t.toAccId === a.id) b += x; }); return b; };
  const sum = (type, m, f) => D.tx.filter(t => t.type === type && t.date.slice(0, 7) === m && (!f || f(t))).reduce((a, t) => a + (+t.amount || 0), 0);
  const expBy = m => { const o = {}; D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === m).forEach(t => o[t.catId] = (o[t.catId] || 0) + (+t.amount || 0)); return o; };
  const budFor = (cid, m) => D.bud.find(b => b.catId === cid && b.month === m) || D.bud.find(b => b.catId === cid && !b.month);
  const got = g => D.con.filter(c => c.goalId === g.id).reduce((a, c) => a + (+c.amount || 0), 0);
  const expCats = () => D.cat.filter(c => c.kind === 'Pengeluaran' && !c.archived);
  const cartN = () => D.cart.reduce((a, l) => a + l.qty, 0), cartT = () => D.cart.reduce((a, l) => a + l.qty * l.price, 0);
  const tg = id => by(D.tag, id), tgi = t => t ? ci(t, '🏷️') : '';
  const tgChip = id => { const t = tg(id); return t ? `<span class="fn-lb" style="--h:${hue(t.name)}">${tgi(t)} ${esc(t.name)}</span>` : ''; };
  const tagBy = m => { const o = {}; D.tx.filter(t => t.type === 'Expense' && t.date.slice(0, 7) === m).forEach(t => { const k = tg(t.tagId) ? t.tagId : ''; o[k] = (o[k] || 0) + (+t.amount || 0); }); return o; };
  const hue = s => { let h = 0; String(s).split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) % 360); return h; };
  /* gambar/logo kustom: o.img (data URL) menang atas emoji */
  const ci = (o, fb) => (o && o.img) ? '<img class="fn-im" src="' + o.img + '" alt="" draggable="false">' : (o && o.icon ? esc(o.icon) : fb);
  const cic = c => ci(c, c ? (ICO[c.name] || '🧾') : '🧾');
  const bnm = () => (D.brand && D.brand.name) || 'MyOffice Finance';

  /* ---------- ikon ---------- */
  const SV = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const I = {
    ana: '<img class="fn-3d" src="icons/chart.png" alt="">',
    cam: SV('<path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
    home: '<img class="fn-3d" src="icons/work.png" alt="">',
    menu: '<img class="fn-3d" src="icons/book.png" alt="">',
    cart: SV('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>'),
    rcp: '<img class="fn-3d" src="icons/task.png" alt="">',
    wal: '<img class="fn-3d" src="icons/fin.png" alt="">',
    x: SV('<path d="M18 6 6 18M6 6l12 12"/>'), dl: SV('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'), pr: SV('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>')
  };
  const ART = '<svg viewBox="0 0 170 160" aria-hidden="true"><g>' + [128, 108, 88].map(y => `<path d="M26 ${y}v11a54 17 0 0 0 108 0v-11z" fill="#f0c36b"/><ellipse cx="80" cy="${y}" rx="54" ry="17" fill="#ffe3a0"/><ellipse cx="80" cy="${y}" rx="40" ry="11" fill="none" stroke="#e8b655" stroke-width="2"/>`).join('') + '</g><g transform="rotate(-14 112 52)"><circle cx="112" cy="52" r="32" fill="#d92b2b"/><circle cx="112" cy="52" r="25" fill="none" stroke="#ffe3d3" stroke-width="2.5" stroke-dasharray="3 4"/><text x="112" y="60" text-anchor="middle" font-family="Baloo 2,Arial" font-weight="800" font-size="22" fill="#fff3e6">Rp</text></g><circle cx="30" cy="40" r="5" fill="#fff" opacity=".8"/><circle cx="150" cy="118" r="4" fill="#fff" opacity=".7"/><path d="M40 62l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".85"/></svg>';

  /* ---------- kerangka ---------- */
  const R = document.createElement('div'); R.className = 'fn-ov'; R.hidden = true;
  R.innerHTML = '<div class="fn-app" role="dialog" aria-modal="true" aria-label="Finance"><header class="fn-hd"><div class="fn-brand"><button class="fn-logo" data-a="brand" aria-label="Ubah logo dan nama" title="Ubah logo & nama">Rp</button><div><b data-bn>MyOffice Finance</b><small data-bt>Catat hemat, hidup tenang</small></div></div><h2 class="fn-ttl"></h2><div class="fn-hb"><button data-a="goriw" aria-label="Resi" title="Resi">' + I.rcp + '</button><button data-a="close" aria-label="Tutup" title="Tutup">' + I.x + '</button></div></header><main class="fn-v" id="fnv"></main><nav class="fn-nav" aria-label="Menu Finance"></nav><div class="fn-sh" hidden></div></div>';
  document.body.appendChild(R);
  const V = R.querySelector('#fnv'), NAV = R.querySelector('.fn-nav'), SH = R.querySelector('.fn-sh');

  /* ---------- tampilan ---------- */
  const mon = () => `<div class="fn-mon"><button data-a="mon" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>${mlab(st.m)}</b><button data-a="mon" data-d="1" aria-label="Bulan berikutnya">›</button></div>`;
  const empty = (t, b) => `<div class="fn-empty"><i>🧾</i><p>${t}</p>${b || ''}</div>`;
  const meter = p => `<div class="fn-meter"><i class="${p >= 100 ? 'bad' : p >= 80 ? 'warn' : ''}" style="width:${Math.min(100, p)}%"></i></div>`;
  const seg = (k, list) => `<div class="fn-seg">${list.map(([v, l]) => `<button aria-pressed="${st.sub[k] === v}" data-a="sub" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const txRow = t => {
    const tr = t.type === 'Transfer', c = by(D.cat, t.catId), nm = t.desc || (tr ? 'Transfer' : c ? c.name : 'Transaksi');
    return `<button class="fn-row" data-a="edit" data-e="tx" data-id="${t.id}"><i class="fn-ico">${tr ? '🔁' : cic(c)}</i><div><b>${esc(nm)}</b><small>${tr ? esc(an(t.accId)) + ' → ' + esc(an(t.toAccId)) : esc(c ? c.name : '') + ' · ' + esc(an(t.accId))} · ${fd(t.date)}${t.rcpId ? ' · resi' : ''}${t.tagId && tg(t.tagId) ? ' · ' + esc(tg(t.tagId).name) : ''}</small></div><strong class="${tr ? '' : t.type === 'Income' ? 'pos' : 'neg'}">${tr ? '' : t.type === 'Income' ? '+' : '−'}${rp(t.amount)}</strong></button>`;
  };
  const katCard = c => {
    const n = D.tx.filter(t => t.type === 'Expense' && t.catId === c.id && t.date.slice(0, 7) === st.m), v = n.reduce((a, t) => a + (+t.amount || 0), 0);
    return `<article class="fn-it fn-kc"><button class="fn-ed" data-a="edit" data-e="cat" data-id="${c.id}" aria-label="Ubah kategori ${esc(c.name)}">✎</button><button class="fn-kb" data-a="pick" data-id="${c.id}" aria-label="Catat pengeluaran ${esc(c.name)}"><span class="fn-art${c.img ? ' has' : ''}" style="--h:${hue(c.name)}">${cic(c)}</span><b>${esc(c.name)}</b><small>${v ? rp(v) + ' · ' + n.length + 'x bulan ini' : 'Belum ada bulan ini'}</small><span class="fn-go">+ Catat</span></button></article>`;
  };
  function home() {
    const m = st.m, act = D.acc.filter(a => a.active), total = act.reduce((a, x) => a + bal(x), 0), inc = sum('Income', m), exp = sum('Expense', m), eb = expBy(m);
    const tb = tagBy(m), tk = Object.keys(tb).sort((a, b) => tb[b] - tb[a]), tsum = tk.reduce((a, k) => a + tb[k], 0);
    let bL = 0, bS = 0; expCats().forEach(c => { const b = budFor(c.id, m); if (b) { bL += +b.limit || 0; bS += eb[c.id] || 0; } });
    const gs = D.goal.filter(g => g.status === 'Aktif'), g0 = gs[0];
    const recent = D.tx.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return mon() + `<div class="fn-hm"><div class="fn-hm-a"><section class="fn-ban"><div><h1>Catat.<br>Hemat.<br>Tenang.</h1><p>Saldo <b>${rp(total)}</b><br>Keluar bulan ini ${rp(exp)} · masuk ${rp(inc)}</p><button class="fn-btn w" data-a="tab" data-t="menu">Catat pengeluaran</button></div>${ART}</section>
    <div class="fn-cats" role="list">${expCats().map(c => `<button role="listitem" data-a="pick" data-id="${c.id}"><i>${cic(c)}</i><span>${esc(c.name)}</span><small>${eb[c.id] ? rp(eb[c.id]).replace('Rp ', '') : '–'}</small></button>`).join('')}</div>
    <div class="fn-sec"><h3>Pengeluaran per label</h3><button class="fn-lnk" data-a="tab" data-t="menu">Katalog →</button></div>
    ${tk.length ? '<div class="fn-lst">' + tk.map(k => { const t = tg(k); return `<div class="fn-bud"><i class="fn-ico">${t ? tgi(t) : '🏷️'}</i><div><b>${t ? esc(t.name) : 'Tanpa label'}</b><small>${rp(tb[k])} dari ${rp(tsum)}</small>${meter(pc(tb[k], tsum))}</div><em>${Math.round(pc(tb[k], tsum))}%</em></div>`; }).join('') + '</div>' : empty('Pilih kategori di atas, lalu isi nama item, harga, jumlah & label sesukamu. Ringkasan per label muncul di sini.')}
    </div><aside class="fn-hm-b"><section class="fn-rw"><span class="fn-seal">${bL ? '📊' : g0 ? '🎯' : '⭐'}</span><div><b>${bL ? 'Anggaran ' + mlab(m) : g0 ? esc(g0.name) : 'Belum ada anggaran'}</b><small>${bL ? 'Terpakai ' + rp(bS) + ' dari ' + rp(bL) : g0 ? 'Terkumpul ' + rp(got(g0)) + ' dari ' + rp(g0.target) : 'Pasang batas belanja supaya uang tidak bocor.'}</small>${bL ? meter(pc(bS, bL)) : g0 ? meter(pc(got(g0), +g0.target)) : ''}</div><button class="fn-btn" data-a="godom" data-v="${bL || !g0 ? 'bud' : 'goal'}">${bL || g0 ? 'Lihat' : 'Atur'}</button></section>
    <div class="fn-sec"><h3>Transaksi terbaru</h3><button class="fn-lnk" data-a="tab" data-t="riw">Riwayat →</button></div>
    ${recent.length ? recent.map(txRow).join('') : empty('Belum ada transaksi. Pilih kategori di Katalog lalu catat.')}</aside></div>`;
  }
  function menu() {
    const L = expCats();
    return `<p class="fn-hint">Pilih <b>kategori</b>, lalu isi sendiri nama item, harga, jumlah &amp; label (Penting, Mendesak, Hiburan, dll). Kategori bisa kamu ubah lewat tombol ✎.</p>
    <div class="fn-grid" id="fng">${L.map(katCard).join('')}<button class="fn-it fn-kc fn-new" data-a="add" data-e="cat"><span class="fn-art">＋</span><b>Kategori baru</b><small>Mis. Minuman, Parkir, Donasi</small></button></div>
    <div class="fn-two"><button class="fn-btn ghost" data-a="godom" data-v="cat">🏷️ Atur label prioritas</button></div>
    ${cartN() ? `<button class="fn-pill" data-a="cart">${I.cart}<span>${cartN()} item</span><b>${rp(cartT())}</b></button>` : ''}`;
  }
  function riw() {
    let h = seg('riw', [['tx', 'Transaksi'], ['rcp', 'Resi']]);
    if (st.sub.riw === 'rcp') {
      const L = D.rcp.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      return h + (L.length ? '<div class="fn-lst">' + L.map(r => `<article class="fn-rc"><div><b>${esc(r.no)}</b><small>${fd(r.date)} ${esc(r.time)} · ${r.items.length} item · ${esc(an(r.accId))}</small></div><strong>${rp(r.total)}</strong><div class="fn-acts"><button class="fn-btn sm" data-a="rcp" data-id="${r.id}">Lihat</button><button class="fn-btn sm ghost" data-a="png" data-id="${r.id}">Unduh PNG</button></div></article>`).join('') + '</div>' : empty('Belum ada resi. Resi dibuat otomatis setiap kali kamu mencatat keranjang.', '<button class="fn-btn" data-a="tab" data-t="menu">Pilih pengeluaran</button>'));
    }
    const L = D.tx.filter(t => t.date.slice(0, 7) === st.m && (!st.tt || t.type === st.tt)).sort((a, b) => b.date.localeCompare(a.date));
    let i = 0, o = 0; L.forEach(t => { if (t.type === 'Income') i += +t.amount; if (t.type === 'Expense') o += +t.amount; });
    return h + mon() + `<div class="fn-sum"><div><small>Masuk</small><b class="pos">${rp(i)}</b></div><div><small>Keluar</small><b class="neg">${rp(o)}</b></div><div><small>Bersih</small><b>${i - o < 0 ? '−' : ''}${rp(Math.abs(i - o))}</b></div></div>
    <div class="fn-chips">${[['', 'Semua'], ['Income', 'Pemasukan'], ['Expense', 'Pengeluaran'], ['Transfer', 'Transfer']].map(([v, l]) => `<button aria-pressed="${st.tt === v}" data-a="tt" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="fn-two"><button class="fn-btn" data-a="add" data-e="tx">+ Transaksi</button><button class="fn-btn ghost" data-a="csv">Ekspor CSV</button></div>
    ${L.length ? '<div class="fn-lst">' + L.map(txRow).join('') + '</div>' : empty('Tidak ada transaksi di bulan ini.')}`;
  }
  const NETL = { visa: '<i class="atm-visa">VISA</i>', mc: '<i class="atm-mc"><u></u><u></u></i>', gpn: '<i class="atm-gpn">GPN</i>' };
  const NETD = { Bank: 'visa', Tabungan: 'gpn', 'Rekening lain': 'mc' };
  function atm(a, h) {
    const t = a.type === 'E-wallet' ? 'ew' : a.type === 'Cash' ? 'cs' : 'bk', neg = bal(a) < 0, net = NETL[a.net === 'none' ? '' : a.net || NETD[a.type]] || '';
    const dg = String(a.no || '').replace(/\D/g, ''), no = dg ? (dg.length > 4 ? '•••• •••• •••• ' + dg.slice(-4) : dg) : '•••• •••• •••• ••••', plain = a.img && a.ov === 'off';
    return `<button class="atm t-${t} c${h % 6} ${a.img ? 'has-img' : ''} ${plain ? 'plain' : ''} ${a.active ? '' : 'off'}" data-a="edit" data-e="acc" data-id="${a.id}" aria-label="${esc(a.name)}">
      ${a.img ? `<img class="atm-bg" src="${esc(a.img)}" alt="">` : '<span class="atm-pat"></span>'}<span class="atm-sh"></span>
      ${plain ? '' : `<span class="atm-top"><em>${esc(a.name)}${a.active ? '' : ' · nonaktif'}</em><small>${esc(a.type)}</small></span>
      <span class="atm-mid"><i class="atm-chip"></i><svg class="atm-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 7a7 7 0 0 1 0 10M12 4.5a11 11 0 0 1 0 15M16 2a15 15 0 0 1 0 20"/></svg></span>
      <span class="atm-no">${no}</span>
      <span class="atm-bot"><span><small>PEMEGANG</small><strong>${esc((a.holder || '').toUpperCase() || '—')}</strong></span>${net}</span>`}
      <b class="atm-bal ${neg ? 'neg' : ''}"><small>Saldo</small>${neg ? '−' : ''}${rp(Math.abs(bal(a)))}</b></button>`;
  }
  function dom() {
    let h = seg('dom', [['acc', 'Akun'], ['bud', 'Anggaran'], ['goal', 'Tabungan'], ['cat', 'Kategori']]); const s = st.sub.dom;
    if (s === 'acc') {
      const act = D.acc.filter(a => a.active), total = act.reduce((a, x) => a + bal(x), 0);
      return h + `<div class="fn-sum one"><div><small>Total saldo · ${act.length} akun aktif</small><b>${rp(total)}</b></div></div><div class="fn-two"><button class="fn-btn" data-a="add" data-e="acc">+ Akun</button></div>` +
        (D.acc.length ? '<div class="atm-grid">' + D.acc.map((a, k) => atm(a, k)).join('') + '</div>' : empty('Belum ada akun. Tambahkan Cash, Bank, atau E-wallet dulu.'));
    }
    if (s === 'bud') {
      const eb = expBy(st.m), rows = expCats().map(c => ({ c, b: budFor(c.id, st.m) })).filter(x => x.b);
      return h + mon() + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="bud">+ Anggaran</button></div>' + (rows.length ? '<div class="fn-lst">' + rows.map(({ c, b }) => { const sp = eb[c.id] || 0, p = pc(sp, +b.limit); return `<button class="fn-bud" data-a="edit" data-e="bud" data-id="${b.id}"><i class="fn-ico">${cic(c)}</i><div><b>${esc(c.name)}</b><small>${rp(sp)} / ${rp(b.limit)}${b.month ? '' : ' · tiap bulan'}</small>${meter(p)}</div><em class="${p >= 100 ? 'neg' : ''}">${Math.round(p)}%</em></button>`; }).join('') + '</div>' : empty('Belum ada anggaran untuk ' + mlab(st.m) + '.'));
    }
    if (s === 'goal') {
      return h + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="goal">+ Target</button></div>' + (D.goal.length ? '<div class="fn-lst">' + D.goal.map(g => { const c = got(g), p = pc(c, +g.target), left = g.date ? Math.round((new Date(g.date) - new Date(today())) / 864e5) : null; return `<article class="fn-goal"><button data-a="edit" data-e="goal" data-id="${g.id}"><b>${esc(g.name)}</b><span class="fn-tag">${esc(g.status)}</span><small>${rp(c)} dari ${rp(g.target)} · ${Math.round(p)}%${left != null ? ' · ' + (left >= 0 ? left + ' hari lagi' : 'lewat ' + (-left) + ' hari') : ''}</small>${meter(Math.min(p, 99.9))}</button><button class="fn-btn sm" data-a="add" data-e="con" data-pk="goalId" data-pv="${g.id}">+ Setor</button></article>`; }).join('') + '</div>' : empty('Belum ada target tabungan.'));
    }
    return h + '<div class="fn-two"><button class="fn-btn" data-a="add" data-e="cat">+ Kategori</button><button class="fn-btn ghost" data-a="add" data-e="tag">+ Label</button></div>' + ['Pengeluaran', 'Pemasukan'].map(k => `<div class="fn-sec"><h3>${k}</h3></div>` + '<div class="fn-lst">' + D.cat.filter(c => c.kind === k).map(c => `<button class="fn-row ${c.archived ? 'off' : ''}" data-a="edit" data-e="cat" data-id="${c.id}"><i class="fn-ico">${cic(c)}</i><div><b>${esc(c.name)}</b>${c.archived ? '<small>Diarsipkan</small>' : ''}</div></button>`).join('') + '</div>').join('') +
      '<div class="fn-sec"><h3>Label prioritas</h3></div><p class="fn-hint">Dipakai saat mencatat pengeluaran, mis. Penting, Mendesak, Hiburan. Sesuaikan dengan caramu menyusun anggaran.</p><div class="fn-lst">' + (D.tag.length ? D.tag.map(t => `<button class="fn-row" data-a="edit" data-e="tag" data-id="${t.id}"><i class="fn-ico">${tgi(t)}</i><div><b>${esc(t.name)}</b></div></button>`).join('') : '<div class="fn-empty"><p>Belum ada label.</p></div>') + '</div>';
  }
  const VIEWS = { home, menu, riw, dom, ana: () => (X.views.ana ? X.views.ana() : empty('Modul analisis belum termuat.')) };
  const TT = { home: 'Beranda', menu: 'Katalog', ana: 'Analisis Keuangan', riw: 'Riwayat', dom: 'Dompet' };
  function paintBrand() {
    const b = D.brand || {};
    R.querySelectorAll('.fn-logo').forEach(e => { e.innerHTML = b.img ? '<img class="fn-im" src="' + b.img + '" alt="">' : 'Rp'; });
    R.querySelectorAll('[data-bn]').forEach(e => { e.textContent = b.name || 'MyOffice Finance'; });
    R.querySelectorAll('[data-bt]').forEach(e => { e.textContent = b.tag || 'Catat hemat, hidup tenang'; });
  }
  function render() {
    const top = V.scrollTop;
    V.innerHTML = VIEWS[st.tab](); V.scrollTop = top;
    const n = cartN(), tabs = [['home', 'Beranda', I.home], ['menu', 'Katalog', I.menu], ['cart'], ['ana', 'Analisis', I.ana], ['riw', 'Riwayat', I.rcp, 'sb'], ['dom', 'Dompet', I.wal]];
    NAV.innerHTML = '<div class="fn-sbb"><button class="fn-logo" data-a="brand" aria-label="Ubah logo dan nama">Rp</button><div><b data-bn></b><small data-bt></small></div></div>' +
      tabs.map(t => t[0] === 'cart' ? `<button class="fn-fab" data-a="cart" aria-label="Keranjang, ${n} item">${I.cart}<span class="fn-fl">Keranjang</span>${n ? `<i>${n}</i>` : ''}</button>` : `<button class="${t[3] || ''}" data-a="tab" data-t="${t[0]}" aria-current="${st.tab === t[0]}">${t[2]}<span>${t[1]}</span></button>`).join('');
    const tt = R.querySelector('.fn-ttl'); if (tt) tt.textContent = TT[st.tab] || '';
    paintBrand();
  }

  /* ---------- sheet ---------- */
  const sheet = h => { SH.innerHTML = '<div class="fn-card-sh" role="dialog" aria-modal="true">' + h + '</div>'; SH.hidden = false; const f = SH.querySelector('input,select,textarea'); if (f) f.focus(); };
  const closeSh = () => { SH.hidden = true; SH.innerHTML = ''; };
  const shHead = t => `<header><h2>${t}</h2><button type="button" data-a="xsh" aria-label="Tutup">${I.x}</button></header>`;
  const ask = (t, msg, ok, fn) => { ask.fn = fn; sheet(shHead(t) + `<p class="fn-p">${msg}</p><footer><button type="button" class="fn-btn ghost" data-a="xsh">Batal</button><button type="button" class="fn-btn" data-a="yes">${ok}</button></footer>`); };

  /* ---------- form entitas ---------- */
  const O = a => a.map(x => [x, x]), AT = ['Cash', 'Bank', 'E-wallet', 'Tabungan', 'Rekening lain'], PM = ['Tunai', 'Transfer bank', 'QRIS', 'Kartu debit', 'Kartu kredit', 'E-wallet', 'Lainnya'];
  const accO = v => [['', '— Pilih akun —']].concat(D.acc.filter(a => a.active || a.id === v).map(a => [a.id, a.name + ' (' + a.type + ')']));
  const catO = (kind, v) => [['', '— Pilih kategori —']].concat(D.cat.filter(c => (!kind || c.kind === kind) && (!c.archived || c.id === v)).map(c => [c.id, (kind ? '' : c.kind + ' · ') + c.name]));
  const SP = {
    acc: { t: 'Akun', def: { type: 'Cash', currency: 'IDR', opening: 0, active: true }, f: [['name', 'Nama akun', 'text', 0, 1, 1], ['type', 'Jenis', 'select', O(AT)], ['holder', 'Nama di kartu', 'text', 0, 0, 0], ['no', 'Nomor kartu / rekening (opsional)', 'text'], ['net', 'Logo jaringan', 'select', [['', 'Otomatis'], ['visa', 'Visa'], ['mc', 'Mastercard'], ['gpn', 'GPN'], ['none', 'Tanpa logo']]], ['img', 'Gambar kartu (foto ATM / dompet)', 'cimg'], ['ov', 'Teks & chip di atas gambar', 'select', [['', 'Tampilkan'], ['off', 'Sembunyikan (gambar polos)']]], ['opening', 'Saldo awal (Rp)', 'number'], ['active', 'Status', 'bool', [['true', 'Aktif'], ['false', 'Nonaktif']]]] },
    tx: { t: 'Transaksi', def: { type: 'Expense', date: today(), scope: 'Pribadi' }, f: [['date', 'Tanggal', 'date', 0, 1], ['type', 'Jenis', 'select', O(['Income', 'Expense', 'Transfer']), 1], ['amount', 'Jumlah (Rp)', 'number', 0, 1], ['accId', 'Akun (asal)', 'select', accO, 1], ['toAccId', 'Akun tujuan (Transfer)', 'select', accO], ['catId', 'Kategori', 'select', v => catO('', v)], ['tagId', 'Label prioritas', 'select', v => [['', '— Tanpa label —']].concat(D.tag.map(t => [t.id, t.name]))], ['desc', 'Deskripsi', 'text', 0, 0, 1], ['method', 'Metode', 'select', [['', '—']].concat(O(PM))], ['scope', 'Cakupan', 'select', O(['Pribadi', 'Pekerjaan'])], ['notes', 'Catatan', 'textarea', 0, 0, 1]] },
    cat: { t: 'Kategori', def: { kind: 'Pengeluaran', archived: false }, f: [['name', 'Nama kategori', 'text', 0, 1, 1], ['icon', 'Ikon (emoji)', 'text'], ['img', 'Logo / gambar kategori', 'img'], ['kind', 'Jenis', 'select', O(['Pemasukan', 'Pengeluaran'])], ['archived', 'Status', 'bool', [['false', 'Aktif'], ['true', 'Diarsipkan']]]] },
    tag: { t: 'Label prioritas', def: {}, f: [['name', 'Nama label', 'text', 0, 1, 1], ['icon', 'Emoji (opsional)', 'text']] },
    bud: { t: 'Anggaran', def: { month: st.m }, f: [['catId', 'Kategori pengeluaran', 'select', v => catO('Pengeluaran', v), 1, 1], ['limit', 'Batas (Rp)', 'number', 0, 1], ['month', 'Bulan (kosong = tiap bulan)', 'month']] },
    goal: { t: 'Target tabungan', def: { status: 'Aktif' }, f: [['name', 'Nama target', 'text', 0, 1, 1], ['target', 'Jumlah target (Rp)', 'number', 0, 1], ['date', 'Target tanggal', 'date'], ['status', 'Status', 'select', O(['Aktif', 'Tercapai', 'Dibatalkan'])]] },
    con: { t: 'Setoran', def: { date: today() }, f: [['goalId', 'Target', 'select', () => [['', '— Pilih —']].concat(D.goal.map(g => [g.id, g.name])), 1, 1], ['date', 'Tanggal', 'date', 0, 1], ['amount', 'Jumlah (Rp, negatif = tarik)', 'number', 0, 1], ['notes', 'Catatan', 'text', 0, 0, 1]] }
  };
  const fld = ([k, l, t, o, req, full], v) => {
    const at = `name="${k}"${req ? ' required' : ''}`;
    let i; if (t === 'img') return imgFld(k, l, v); if (t === 'cimg') return imgFld(k, l, v, 0, 1); if (t === 'textarea') i = `<textarea ${at} rows="2">${esc(v)}</textarea>`;
    else if (t === 'select' || t === 'bool') { const L = typeof o === 'function' ? o(v) : o; if (t === 'bool') v = String(!!v); i = `<select ${at}>${L.map(p => `<option value="${esc(p[0])}"${String(p[0]) === String(v) ? ' selected' : ''}>${esc(p[1])}</option>`).join('')}</select>`; }
    else i = `<input ${at} type="${t}" value="${esc(v)}"${t === 'number' ? ' step="any"' : ''}>`;
    return `<label class="${full ? 'full' : ''}"><span>${l}${req ? ' *' : ''}</span>${i}</label>`;
  };
  function imgFld(k, l, v, fit, card) {
    return `<div class="full fn-imf" data-img${card ? ' data-card' : ''}><span>${l}</span><div class="fn-imr"><div class="fn-imp">${v ? '<img src="' + esc(v) + '" alt="">' : '<em>Belum ada</em>'}</div><div class="fn-imb"><div class="fn-ibt"><button type="button" class="fn-btn sm" data-a="pickimg">${I.cam} Pilih gambar</button><button type="button" class="fn-btn sm ghost dng" data-a="rmimg">Hapus</button></div>${card ? '<input type="checkbox" data-fit hidden><small>Foto kartu ATM / dompet digital / buku tabungan (rasio kartu 85,6×54 mm). Kosong = desain otomatis.</small>' : `<label class="fn-chk"><input type="checkbox" data-fit${fit ? ' checked' : ''}> Muat utuh tanpa dipotong (cocok untuk logo)</label><small>JPG, PNG, WebP atau SVG. Kosong = pakai emoji.</small>`}</div></div><input type="file" accept="image/*" data-img-in hidden><input type="hidden" name="${k}" value="${esc(v)}"></div>`;
  }
  function toSquare(file, fit, cb) {
    const fr = new FileReader();
    fr.onerror = () => MO.msg('Gagal', 'File gambar tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => MO.msg('Gagal', 'Format gambar tidak didukung.');
      im.onload = () => {
        const w = im.naturalWidth || 256, h = im.naturalHeight || 256, S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        if (fit) { const k = Math.min(S / w, S / h); g.drawImage(im, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k); }
        else { const m = Math.min(w, h); g.drawImage(im, (w - m) / 2, (h - m) / 2, m, m, 0, 0, S, S); }
        const keepAlpha = fit || /png|svg|webp|gif/.test(file.type);
        cb(c.toDataURL(keepAlpha ? 'image/webp' : 'image/jpeg', .86));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function toCard(file, cb) {
    const fr = new FileReader();
    fr.onerror = () => MO.msg('Gagal', 'File gambar tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => MO.msg('Gagal', 'Format gambar tidak didukung.');
      im.onload = () => {
        const w = im.naturalWidth || 856, h = im.naturalHeight || 540, R = 856 / 540, W = 720, H = Math.round(W / R), c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        let sw = w, sh = w / R; if (sh > h) { sh = h; sw = h * R; }
        g.drawImage(im, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, W, H);
        cb(c.toDataURL('image/jpeg', .86));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function brandSheet() {
    const b = D.brand || {};
    sheet(shHead('Logo & nama aplikasi') + `<form data-f="brand"><div class="fn-flds"><label class="full"><span>Nama</span><input name="name" value="${esc(b.name || '')}" placeholder="MyOffice Finance" maxlength="40"></label><label class="full"><span>Slogan</span><input name="tag" value="${esc(b.tag || '')}" placeholder="Catat hemat, hidup tenang" maxlength="60"></label>${imgFld('img', 'Logo', b.img || '', true)}</div><footer><button type="button" class="fn-btn ghost dng" data-a="rstbrand">Reset</button><button class="fn-btn">Simpan</button></footer></form>`);
  }
  function form(e, id, pre) {
    const sp = SP[e], it = id ? by(D[e], id) : Object.assign({}, sp.def, pre || {});
    sheet(shHead((id ? 'Ubah ' : 'Tambah ') + sp.t) + `<form data-f="ent" data-e="${e}" data-id="${id || ''}"><div class="fn-flds">${sp.f.map(f => fld(f, it[f[0]] == null ? '' : it[f[0]])).join('')}</div><footer>${id ? '<button type="button" class="fn-btn ghost dng" data-a="del" data-e="' + e + '" data-id="' + id + '">Hapus</button>' : ''}<button class="fn-btn">Simpan</button></footer></form>`);
  }
  function canDel(e, id) {
    if (e === 'acc' && D.tx.some(t => t.accId === id || t.toAccId === id)) return 'Akun ini punya transaksi. Ubah statusnya jadi nonaktif.';
    if (e === 'cat' && (D.tx.some(t => t.catId === id) || D.bud.some(b => b.catId === id))) return 'Kategori ini masih dipakai. Arsipkan saja.';
  }
  function validate(e, r) {
    if (e === 'tx') {
      if (!(+r.amount > 0)) return 'Jumlah harus lebih dari 0.';
      if (r.type === 'Transfer') { if (!r.toAccId) return 'Pilih akun tujuan.'; if (r.toAccId === r.accId) return 'Akun asal dan tujuan tidak boleh sama.'; r.catId = ''; }
      else { const c = by(D.cat, r.catId); if (!c) return 'Pilih kategori.'; if (c.kind !== (r.type === 'Income' ? 'Pemasukan' : 'Pengeluaran')) return 'Kategori "' + c.name + '" tidak cocok dengan jenis transaksi.'; r.toAccId = ''; }
    }
    if (e === 'bud' && !(+r.limit > 0)) return 'Batas anggaran harus lebih dari 0.';
    if (e === 'goal' && !(+r.target > 0)) return 'Jumlah target harus lebih dari 0.';
    if (e === 'tag' && D.tag.some(t => t.id !== r.id && t.name.toLowerCase() === String(r.name).toLowerCase())) return 'Label dengan nama itu sudah ada.';
    if (e === 'cat' && D.cat.some(c => c.id !== r.id && c.kind === r.kind && c.name.toLowerCase() === String(r.name).toLowerCase())) return 'Kategori dengan nama itu sudah ada.';
    if (e === 'con' && !(+r.amount)) return 'Jumlah tidak boleh 0.';
  }
  function onEnt(f) {
    const e = f.dataset.e, id = f.dataset.id, sp = SP[e], it = id ? by(D[e], id) : null, rec = it ? Object.assign({}, it) : { id: uid() };
    sp.f.forEach(([k, , t]) => { const v = f.elements[k].value.trim(); rec[k] = t === 'bool' ? v === 'true' : t === 'number' ? (v === '' ? '' : +v) : v; });
    const err = validate(e, rec); if (err) return MO.msg('Periksa data', err);
    if (it) Object.assign(it, rec); else D[e].push(rec);
    save(); closeSh(); render();
  }

  /* ---------- keranjang & resi ---------- */
  const lineOf = k => D.cart.find(l => l.k === k);
  function inc(k, d) { const l = lineOf(k); if (!l) return; l.qty += d; if (l.qty <= 0) D.cart = D.cart.filter(x => x !== l); save(); }
  const nameHist = cid => { const o = {}; D.tx.forEach(t => { if (t.type === 'Expense' && t.catId === cid && t.desc) { const n = t.desc.replace(/ ×\d+$/, ''); o[n] = (o[n] || 0) + 1; } }); return Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, 12); };
  function pickSheet(cid) {
    const c = by(D.cat, cid); if (!c) return;
    const tags = D.tag.length ? `<div class="full fn-tgs" role="radiogroup" aria-label="Label prioritas"><span>Label prioritas</span><div><label class="fn-tgo"><input type="radio" name="tagId" value="" checked><b>Tanpa label</b></label>${D.tag.map(t => `<label class="fn-tgo" style="--h:${hue(t.name)}"><input type="radio" name="tagId" value="${t.id}"><b>${tgi(t)} ${esc(t.name)}</b></label>`).join('')}</div></div>` : '';
    sheet(shHead(`<span class="fn-ph"><i class="fn-ico">${cic(c)}</i>${esc(c.name)}</span>`) + `<form data-f="pick" data-id="${c.id}"><div class="fn-flds"><label class="full"><span>Nama item *</span><input name="name" required maxlength="80" autocomplete="off" list="fn-nh" placeholder="Isi sendiri, mis. ${c.name === 'Makanan' ? 'Nasi goreng' : c.name === 'Minuman' ? 'Es teh' : 'Nama item'}"><datalist id="fn-nh">${nameHist(c.id).map(n => `<option value="${esc(n)}">`).join('')}</datalist></label><label><span>Harga satuan (Rp) *</span><input type="number" name="price" min="1" step="any" inputmode="decimal" required placeholder="0"></label><label><span>Jumlah</span><input type="number" name="qty" min="1" step="1" inputmode="numeric" value="1"></label>${tags}<label class="full"><span>Keterangan (opsional)</span><input name="note" maxlength="120" placeholder="Mis. buat rapat, patungan, diskon"></label></div><div class="fn-tot"><span>Subtotal</span><b data-sub>${rp(0)}</b></div><footer><button type="submit" class="fn-btn ghost" data-go="more">+ Tambah lagi</button><button type="submit" class="fn-btn" data-go="cart">Lanjut ke keranjang</button></footer></form>`);
  }
  function cartSheet() {
    if (!D.cart.length) return sheet(shHead('Keranjang') + empty('Keranjang kosong. Pilih kategori di Katalog dulu.', '<button class="fn-btn" data-a="gomenu">Buka Katalog</button>'));
    const act = D.acc.filter(a => a.active);
    sheet(shHead('Keranjang pengeluaran') + `<form data-f="cart"><div class="fn-lines">${D.cart.map(l => `<div class="fn-ln"><i class="fn-ico">${cic(by(D.cat, l.catId))}</i><div><b>${esc(l.name)}</b><small>${esc(cn(l.catId))} · ${rp(l.price)}${l.tagId && tg(l.tagId) ? ' · ' + esc(tg(l.tagId).name) : ''}${l.note ? ' · ' + esc(l.note) : ''}</small></div><div class="fn-st"><button type="button" data-a="cdec" data-k="${l.k}" aria-label="Kurangi">−</button><i>${l.qty}</i><button type="button" data-a="cinc" data-k="${l.k}" aria-label="Tambah">+</button></div><strong>${rp(l.price * l.qty)}</strong></div>`).join('')}</div>
    <button type="button" class="fn-btn ghost sm" data-a="gomenu" style="margin-bottom:14px">+ Tambah item lain</button>
    <div class="fn-flds"><label class="full"><span>Dibayar dari *</span><select name="accId" required>${act.length ? act.map(a => `<option value="${a.id}">${esc(a.name)} · ${rp(bal(a))}</option>`).join('') : '<option value="">Belum ada akun aktif</option>'}</select></label><label><span>Tanggal</span><input type="date" name="date" value="${today()}" required></label><label><span>Metode</span><select name="method">${PM.map(p => `<option>${p}</option>`).join('')}</select></label><label><span>Cakupan</span><select name="scope"><option>Pribadi</option><option>Pekerjaan</option></select></label><label><span>Catatan</span><input type="text" name="note" placeholder="Opsional"></label></div>
    <div class="fn-tot"><span>Total</span><b>${rp(cartT())}</b></div><footer><button type="button" class="fn-btn ghost" data-a="clear">Kosongkan</button><button class="fn-btn"${act.length ? '' : ' disabled'}>Catat &amp; buat resi</button></footer></form>`);
  }
  function checkout(f) {
    const a = D.acc.find(x => x.id === f.elements.accId.value); if (!a) return MO.msg('Pilih akun', 'Tambahkan akun aktif di Dompet.');
    const date = f.elements.date.value || today(), n = D.rcp.filter(r => r.date === date).length + 1, rid = uid(), now = new Date();
    const r = { id: rid, no: 'RS-' + date.replace(/-/g, '') + '-' + String(n).padStart(3, '0'), date, time: pad(now.getHours()) + ':' + pad(now.getMinutes()), accId: a.id, method: f.elements.method.value, scope: f.elements.scope.value, note: f.elements.note.value.trim(), items: D.cart.map(l => ({ name: l.name, qty: l.qty, price: l.price, catId: l.catId, tagId: l.tagId || '', note: l.note || '' })), total: cartT() };
    D.cart.forEach(l => { D.tx.push({ id: uid(), type: 'Expense', date, amount: l.qty * l.price, accId: a.id, catId: l.catId, tagId: l.tagId || '', desc: l.name + (l.qty > 1 ? ' ×' + l.qty : ''), notes: l.note || '', method: r.method, scope: r.scope, rcpId: rid }); });
    D.rcp.push(r); D.cart = []; save(); render(); showRcp(r, true);
  }
  const recRows = r => {
    const o = [['No. resi', r.no], ['Tanggal', fd(r.date) + ' ' + r.time], ['Akun', an(r.accId)], ['Metode', r.method || '—'], ['-']];
    r.items.forEach(i => { const t = i.tagId && tg(i.tagId); o.push([i.name + (t ? ' [' + t.name + ']' : ''), '', 'b']); o.push(['  ' + i.qty + ' x ' + Math.round(i.price).toLocaleString('id-ID'), rp(i.price * i.qty)]); if (i.note) o.push(['  ' + i.note, '', 'i']); });
    o.push(['-']); o.push(['TOTAL', rp(r.total), 't']); if (r.note) { o.push(['-']); o.push(['Catatan: ' + r.note, '', 'i']); } return o;
  };
  function showRcp(r, fresh) {
    const bars = r.no.split('').map((c, i) => `<i style="width:${1 + (c.charCodeAt(0) + i) % 4}px"></i>`).join('');
    sheet(shHead(fresh ? 'Tercatat! Ini resimu' : 'Resi') + `<div class="fn-paper"><div class="fn-tear"></div><h4>${esc(bnm())}</h4><p class="c">Resi pengeluaran</p>${recRows(r).map(([a, b, o]) => a === '-' ? '<hr>' : `<div class="r ${o || ''}"><span>${esc(a)}</span><span>${esc(b || '')}</span></div>`).join('')}<div class="bc">${bars}</div><p class="c">Terima kasih. Tetap hemat!</p><div class="fn-tear b"></div></div><footer><button class="fn-btn ghost" data-a="print">${I.pr} Cetak / PDF</button><button class="fn-btn" data-a="png" data-id="${r.id}">${I.dl} Unduh PNG</button></footer>`);
  }
  const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  function png(r) {
    const rows = recRows(r), S = 2, W = 520, LH = 28, H = 150 + rows.length * LH + 130, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.scale(S, S); g.fillStyle = '#fffaf2'; g.fillRect(0, 0, W, H); g.fillStyle = '#d92b2b'; g.fillRect(0, 0, W, 100);
    g.fillStyle = '#fff3e6'; g.textAlign = 'center'; g.font = '800 30px "Baloo 2",Arial,sans-serif'; g.fillText(bnm().slice(0, 28), W / 2, 52); g.font = '700 13px Arial'; g.fillText('RESI PENGELUARAN', W / 2, 78);
    let y = 146;
    rows.forEach(([a, b, o]) => {
      if (a === '-') { g.strokeStyle = '#cdb9a8'; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(32, y - 9); g.lineTo(W - 32, y - 9); g.stroke(); g.setLineDash([]); }
      else { g.fillStyle = o === 'i' ? '#8a7a70' : '#2b1c1c'; g.font = (o === 'b' || o === 't' ? '700 ' : '') + (o === 't' ? '20px' : '15px') + ' "Courier New",monospace'; g.textAlign = 'left'; g.fillText(a.slice(0, 40), 32, y); g.textAlign = 'right'; g.fillText(b || '', W - 32, y); }
      y += LH;
    });
    let x = 32; g.fillStyle = '#2b1c1c'; r.no.split('').forEach((ch, i) => { const w = 1 + (ch.charCodeAt(0) + i) % 4; g.fillRect(x, y + 6, w, 40); x += w + 3; });
    g.textAlign = 'center'; g.fillStyle = '#8a7a70'; g.font = '14px Arial'; g.fillText('Terima kasih. Tetap hemat!', W / 2, y + 78);
    c.toBlob(b => dl(b, r.no + '.png'));
  }
  function csv() {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', rows = [['Tanggal', 'Jenis', 'Kategori', 'Akun', 'Deskripsi', 'Jumlah', 'Metode', 'Cakupan', 'Label', 'Keterangan', 'Resi']].concat(D.tx.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type, cn(t.catId), an(t.accId), t.desc || '', t.amount, t.method || '', t.scope || '', (tg(t.tagId) || {}).name || '', t.notes || '', (by(D.rcp, t.rcpId) || {}).no || '']));
    dl(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }), 'transaksi-myoffice.csv');
  }

  /* ---------- event ---------- */
  const A = {
    close() { R.hidden = true; document.body.style.overflow = ''; }, xsh: closeSh,
    tab(d) { st.tab = d.t; render(); V.scrollTop = 0; },
    sub(d) { st.sub[d.k] = d.v; render(); }, goriw() { st.tab = 'riw'; st.sub.riw = 'rcp'; render(); }, gomenu() { closeSh(); st.tab = 'menu'; render(); },
    godom(d) { st.tab = 'dom'; st.sub.dom = d.v; render(); V.scrollTop = 0; },
    mon(d) { st.m = addM(st.m, +d.d); render(); }, tt(d) { st.tt = d.v; render(); },
    pick(d) { pickSheet(d.id); },
    cinc(d) { inc(d.k, 1); render(); cartSheet(); }, cdec(d) { inc(d.k, -1); render(); cartSheet(); },
    cart() { cartSheet(); }, clear() { D.cart = []; save(); render(); closeSh(); },
    add(d) {
      if (d.e === 'tx' && !D.acc.some(a => a.active)) return MO.msg('Belum ada akun aktif', 'Tambahkan akun dulu di Dompet.');
      if (d.e === 'con' && !D.goal.length) return MO.msg('Belum ada target', 'Buat target tabungan dulu.');
      form(d.e, null, d.pk ? { [d.pk]: d.pv } : null);
    },
    edit(d) { form(d.e, d.id); },
    del(d) {
      const b = canDel(d.e, d.id); if (b) return MO.msg('Tidak bisa dihapus', b);
      ask('Hapus data?', 'Data yang dihapus tidak bisa dikembalikan.', 'Ya, hapus', () => { if (d.e === 'goal') D.con = D.con.filter(c => c.goalId !== d.id); D[d.e] = D[d.e].filter(x => x.id !== d.id); save(); closeSh(); render(); });
    },
    yes() { const f = ask.fn; ask.fn = null; if (f) f(); },
    rcp(d) { showRcp(by(D.rcp, d.id)); }, png(d) { png(by(D.rcp, d.id)); }, csv,
    print() { window.print(); },
    rng(d) { st.rng = +d.v; render(); }, brand() { brandSheet(); },
    rstbrand() { D.brand = {}; save(); paintBrand(); closeSh(); },
    pickimg(d, b) { const w = b.closest('[data-img]'); if (w) w.querySelector('[data-img-in]').click(); },
    rmimg(d, b) { const w = b.closest('[data-img]'); if (!w) return; w.querySelector('input[type=hidden]').value = ''; w.querySelector('.fn-imp').innerHTML = '<em>Belum ada</em>'; }
  };
  R.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && R.contains(b) && A[b.dataset.a]) A[b.dataset.a](b.dataset, b); else if (e.target === SH) closeSh(); });
  R.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.dataset.f === 'ent') onEnt(f);
    else if (f.dataset.f === 'brand') { D.brand = { name: f.elements.name.value.trim(), tag: f.elements.tag.value.trim(), img: f.elements.img.value }; save(); paintBrand(); closeSh(); }
    else if (f.dataset.f === 'cart') checkout(f);
    else if (f.dataset.f === 'pick') {
      const go = (e.submitter && e.submitter.dataset.go) || 'cart', nm = f.elements.name.value.trim(), pr = +f.elements.price.value, q = Math.max(1, Math.round(+f.elements.qty.value || 1)), c = by(D.cat, f.dataset.id);
      if (!nm) return MO.msg('Periksa data', 'Isi nama item.'); if (!(pr > 0)) return MO.msg('Periksa data', 'Harga harus lebih dari 0.');
      const tid = (f.querySelector('input[name=tagId]:checked') || {}).value || '';
      D.cart.push({ k: 'c' + uid(), name: nm, catId: c.id, price: pr, qty: q, tagId: tid, note: f.elements.note.value.trim() }); save(); render();
      if (go === 'more') pickSheet(c.id); else cartSheet();
    }
  });
  R.addEventListener('change', e => {
    const t = e.target; if (!t.matches || !t.matches('[data-img-in]') || !t.files || !t.files[0]) return;
    const w = t.closest('[data-img]'), fit = w.querySelector('[data-fit]').checked;
    (w.hasAttribute('data-card') ? (f, _, cb) => toCard(f, cb) : toSquare)(t.files[0], fit, url => { w.querySelector('input[type=hidden]').value = url; w.querySelector('.fn-imp').innerHTML = '<img src="' + url + '" alt="">'; t.value = ''; });
  });
  R.addEventListener('input', e => { const f = e.target.form; if (f && f.dataset.f === 'pick' && (e.target.name === 'price' || e.target.name === 'qty')) { const b = f.querySelector('[data-sub]'); if (b) b.textContent = rp((+f.elements.price.value || 0) * Math.max(1, Math.round(+f.elements.qty.value || 1))); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !R.hidden) { if (!SH.hidden) closeSh(); else A.close(); } });
  const X = MO.fin = { D, st, views: {}, addM, mlab, pc, mon, empty, meter, txRow, ci, cic, ic, bal, sum, expBy, budFor, got, expCats, cn, an, total: () => D.acc.filter(a => a.active).reduce((a, x) => a + bal(x), 0) };
  function open() { R.hidden = false; document.body.style.overflow = 'hidden'; render(); R.querySelector('.fn-hb button:last-child').focus(); }
  MO.routes['#finance'] = open;
})();
