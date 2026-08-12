/* QR Code Generator — Version 2.0 */

// ---------------------------------------------------------------- state

const PREVIEW_SIZE = 300;
const HISTORY_KEY = 'qrgen-history';
const THEME_KEY = 'qrgen-theme';
const VERSION_KEY = 'qrgen-version';

const state = {
    tab: 'link',
    fields: {
        link: { url: '' },
        text: { text: '' },
        wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false },
        vcard: { first: '', last: '', phone: '', email: '', org: '', title: '', url: '' },
        email: { to: '', sub: '', body: '' },
        sms: { num: '', msg: '' },
        phone: { num: '' },
    },
    style: {
        fg: '#6d28d9',
        fg2: '#0e7490',
        bg: '#ffffff',
        gradient: true,
        transparent: false,
        dots: 'rounded',
        corners: 'extra-rounded',
        ec: 'M',
        logo: null,      // data URL
        logoSize: 0.3,
    },
    exportSize: 1024,
};

const PRESETS = [
    { name: 'Aurora', dot: 'linear-gradient(135deg,#6d28d9,#0e7490)', style: { fg: '#6d28d9', fg2: '#0e7490', bg: '#ffffff', gradient: true, dots: 'rounded', corners: 'extra-rounded' } },
    { name: 'Ink', dot: '#111111', style: { fg: '#111111', fg2: '#444444', bg: '#ffffff', gradient: false, dots: 'square', corners: 'square' } },
    { name: 'Crimson', dot: '#d32f2f', style: { fg: '#d32f2f', fg2: '#7c1313', bg: '#ffffff', gradient: false, dots: 'rounded', corners: 'extra-rounded' } },
    { name: 'Ocean', dot: 'linear-gradient(135deg,#1e3a8a,#0e7490)', style: { fg: '#1e3a8a', fg2: '#0e7490', bg: '#ffffff', gradient: true, dots: 'dots', corners: 'extra-rounded' } },
    { name: 'Sunset', dot: 'linear-gradient(135deg,#b91c1c,#b45309)', style: { fg: '#b91c1c', fg2: '#b45309', bg: '#fffbeb', gradient: true, dots: 'classy-rounded', corners: 'extra-rounded' } },
    { name: 'Forest', dot: 'linear-gradient(135deg,#14532d,#4d7c0f)', style: { fg: '#14532d', fg2: '#4d7c0f', bg: '#f7fee7', gradient: true, dots: 'rounded', corners: 'dot' } },
    { name: 'Bubblegum', dot: 'linear-gradient(135deg,#be185d,#7c3aed)', style: { fg: '#be185d', fg2: '#7c3aed', bg: '#fdf2f8', gradient: true, dots: 'dots', corners: 'dot' } },
    { name: 'Classy', dot: '#1c1917', style: { fg: '#1c1917', fg2: '#57534e', bg: '#fafaf9', gradient: false, dots: 'classy', corners: 'square' } },
];

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- payload builders

function esc(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }

function buildData() {
    const f = state.fields;
    switch (state.tab) {
        case 'link': {
            let url = f.link.url.trim();
            if (!url) return null;
            if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
            return url;
        }
        case 'text':
            return f.text.text.trim() || null;
        case 'wifi': {
            const w = f.wifi;
            if (!w.ssid.trim()) return null;
            let s = `WIFI:T:${w.enc};S:${esc(w.ssid)};`;
            if (w.enc !== 'nopass' && w.pass) s += `P:${esc(w.pass)};`;
            if (w.hidden) s += 'H:true;';
            return s + ';';
        }
        case 'vcard': {
            const v = f.vcard;
            const name = (v.first + v.last).trim();
            if (!name && !v.phone.trim() && !v.email.trim()) return null;
            const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
            lines.push(`N:${v.last.trim()};${v.first.trim()};;;`);
            lines.push(`FN:${[v.first.trim(), v.last.trim()].filter(Boolean).join(' ')}`);
            if (v.org.trim()) lines.push(`ORG:${v.org.trim()}`);
            if (v.title.trim()) lines.push(`TITLE:${v.title.trim()}`);
            if (v.phone.trim()) lines.push(`TEL;TYPE=CELL:${v.phone.trim()}`);
            if (v.email.trim()) lines.push(`EMAIL:${v.email.trim()}`);
            if (v.url.trim()) lines.push(`URL:${v.url.trim()}`);
            lines.push('END:VCARD');
            return lines.join('\n');
        }
        case 'email': {
            const e = f.email;
            if (!e.to.trim()) return null;
            const params = [];
            if (e.sub) params.push('subject=' + encodeURIComponent(e.sub));
            if (e.body) params.push('body=' + encodeURIComponent(e.body));
            return `mailto:${e.to.trim()}` + (params.length ? '?' + params.join('&') : '');
        }
        case 'sms': {
            if (!f.sms.num.trim()) return null;
            return `SMSTO:${f.sms.num.trim()}:${f.sms.msg}`;
        }
        case 'phone':
            return f.phone.num.trim() ? `tel:${f.phone.num.trim()}` : null;
    }
    return null;
}

// ---------------------------------------------------------------- qr rendering

function qrOptions(size, forExport) {
    const s = state.style;
    const data = buildData();
    const colorOpts = s.gradient
        ? { gradient: { type: 'linear', rotation: Math.PI / 4, colorStops: [{ offset: 0, color: s.fg }, { offset: 1, color: s.fg2 }] } }
        : { color: s.fg };

    const opts = {
        width: size,
        height: size,
        margin: forExport ? Math.round(size * 0.04) : 10,
        data: data || 'https://example.com',
        qrOptions: { errorCorrectionLevel: s.logo ? 'H' : s.ec },
        dotsOptions: { type: s.dots, ...colorOpts },
        cornersSquareOptions: { type: s.corners, color: s.fg },
        cornersDotOptions: { color: s.gradient ? s.fg2 : s.fg },
        backgroundOptions: { color: s.transparent ? 'rgba(0,0,0,0)' : s.bg },
    };
    // skip the logo on tiny renders (history thumbnails) — margins go negative
    if (s.logo && size >= 100) {
        opts.image = s.logo;
        opts.imageOptions = { margin: Math.max(2, Math.round(size * 0.015)), imageSize: s.logoSize, hideBackgroundDots: true, crossOrigin: 'anonymous' };
    }
    return opts;
}

let qr = null;
let debounceTimer = null;

function updateQR(immediate = false) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const data = buildData();
        const stage = $('qr-stage');
        stage.classList.toggle('checker', state.style.transparent);
        stage.style.backgroundColor = state.style.transparent ? '' : state.style.bg;
        $('qr-empty').style.display = data ? 'none' : 'grid';
        if (!data) { updateScanBadge(null); return; }
        try {
            if (!qr) {
                qr = new QRCodeStyling(qrOptions(PREVIEW_SIZE));
                qr.append($('qr-preview'));
            } else {
                qr.update(qrOptions(PREVIEW_SIZE));
            }
            const p = $('qr-preview');
            p.classList.remove('pop');
            void p.offsetWidth;
            p.classList.add('pop');
            updateScanBadge(data);
        } catch (err) {
            console.error('QR render error:', err);
            updateScanBadge('error');
        }
    }, immediate ? 0 : 130);
}

// ---------------------------------------------------------------- scannability

function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function updateScanBadge(data) {
    const badge = $('scan-badge');
    if (!data) { badge.hidden = true; return; }
    badge.hidden = false;
    if (data === 'error') {
        badge.className = 'scan-badge bad';
        badge.textContent = '✗ Too much data — shorten the content or lower error correction';
        return;
    }
    const s = state.style;
    const bg = s.transparent ? '#ffffff' : s.bg;
    const bgLum = luminance(bg);
    // worst-case: the lightest color used in the code pattern
    const fgLums = s.gradient ? [luminance(s.fg), luminance(s.fg2)] : [luminance(s.fg)];
    const worstFg = Math.max(...fgLums);
    const ratio = (Math.max(worstFg, bgLum) + 0.05) / (Math.min(worstFg, bgLum) + 0.05);
    const inverted = Math.min(...fgLums) > bgLum;

    if (inverted) {
        badge.className = 'scan-badge warn';
        badge.textContent = '⚠ Light code on dark background — some scanners struggle with inverted colors';
    } else if (ratio >= 3.3) {
        badge.className = 'scan-badge ok';
        badge.textContent = '✓ Great contrast — scans easily';
    } else if (ratio >= 2) {
        badge.className = 'scan-badge warn';
        badge.textContent = '⚠ Low contrast — may be hard to scan';
    } else {
        badge.className = 'scan-badge bad';
        badge.textContent = '✗ Very low contrast — likely won\'t scan';
    }
}

// ---------------------------------------------------------------- export

function exportName(ext) {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    return `qr-${state.tab}-${stamp}`;
}

async function downloadQR(ext, btn) {
    if (!buildData()) { toast('Add some content first ✍️'); return; }
    try {
        const opts = qrOptions(state.exportSize, true);
        if (ext === 'svg') opts.type = 'svg';
        const temp = new QRCodeStyling(opts);
        await temp.download({ name: exportName(ext), extension: ext });
        saveToHistory();
        confetti(btn);
        toast(`Saved as ${ext.toUpperCase()} 🎉`);
    } catch (err) {
        console.error('Download error:', err);
        toast('Download failed — try again');
    }
}

async function copyQR(btn) {
    if (!buildData()) { toast('Add some content first ✍️'); return; }
    try {
        const temp = new QRCodeStyling(qrOptions(state.exportSize, true));
        const blob = await temp.getRawData('png');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        saveToHistory();
        confetti(btn);
        toast('Copied to clipboard 📋');
    } catch (err) {
        console.error('Copy error:', err);
        toast('Copy not supported here — use Download instead');
    }
}

// ---------------------------------------------------------------- history

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
}

function saveToHistory() {
    const items = loadHistory();
    const snapshot = {
        tab: state.tab,
        fields: JSON.parse(JSON.stringify(state.fields)),
        style: JSON.parse(JSON.stringify(state.style)),
        ts: Date.now(),
    };
    // avoid consecutive duplicates
    if (items[0] && JSON.stringify(items[0].fields) === JSON.stringify(snapshot.fields)
        && JSON.stringify(items[0].style) === JSON.stringify(snapshot.style)
        && items[0].tab === snapshot.tab) return;
    items.unshift(snapshot);
    while (items.length > 8) items.pop();
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
    catch {
        // logo data URLs can overflow localStorage — retry without logos
        try {
            const slim = items.map(i => ({ ...i, style: { ...i.style, logo: null } }));
            localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
        } catch { /* give up quietly */ }
    }
    renderHistory();
}

function renderHistory() {
    const items = loadHistory();
    const wrap = $('history');
    wrap.querySelectorAll('.history-item').forEach(el => el.remove());
    $('history-empty').style.display = items.length ? 'none' : 'block';
    $('history-clear').hidden = !items.length;

    items.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.title = 'Click to restore this code';
        wrap.appendChild(div);
        try {
            const saved = { tab: state.tab, fields: state.fields, style: state.style };
            Object.assign(state, { tab: item.tab, fields: item.fields, style: item.style });
            const mini = new QRCodeStyling(qrOptions(64));
            mini.append(div);
            Object.assign(state, saved);
        } catch { /* skip broken thumbnails */ }
        div.addEventListener('click', () => restoreSnapshot(item));
    });
}

function restoreSnapshot(item) {
    state.tab = item.tab;
    state.fields = JSON.parse(JSON.stringify(item.fields));
    state.style = JSON.parse(JSON.stringify(item.style));
    syncUIFromState();
    updateQR(true);
    toast('Restored from history ↩');
}

// ---------------------------------------------------------------- fun

function confetti(originEl) {
    const rect = originEl ? originEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'];
    for (let i = 0; i < 26; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.background = colors[i % colors.length];
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        document.body.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 130;
        p.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 90}px) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 },
        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).onfinish = () => p.remove();
    }
}

let toastTimer = null;
function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- UI wiring

function bindField(id, tab, key, opts = {}) {
    const el = $(id);
    const evt = opts.event || 'input';
    el.addEventListener(evt, () => {
        state.fields[tab][key] = opts.checkbox ? el.checked : el.value;
        if (opts.after) opts.after(el);
        updateQR();
    });
}

function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    updateQR(true);
}

function renderPresets() {
    const wrap = $('presets');
    PRESETS.forEach((preset, i) => {
        const b = document.createElement('button');
        b.className = 'preset' + (i === 0 ? ' active' : '');
        b.innerHTML = `<span class="preset-dot" style="background:${preset.dot}"></span>${preset.name}`;
        b.addEventListener('click', () => {
            Object.assign(state.style, preset.style);
            state.style.transparent = false;
            document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
            b.classList.add('active');
            syncUIFromState();
            updateQR(true);
        });
        wrap.appendChild(b);
    });
}

function clearPresetHighlight() {
    document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
}

function syncUIFromState() {
    const s = state.style;
    const f = state.fields;
    // style controls
    $('s-fg').value = s.fg;
    $('s-fg2').value = s.fg2;
    $('s-bg').value = s.bg;
    $('s-gradient').checked = s.gradient;
    $('s-transparent').checked = s.transparent;
    $('s-dots').value = s.dots;
    $('s-corners').value = s.corners;
    $('s-ec').value = s.ec;
    $('fg2-field').classList.toggle('disabled', !s.gradient);
    $('logo-size-field').hidden = !s.logo;
    $('logo-remove').hidden = !s.logo;
    $('s-logo-size').value = Math.round(s.logoSize * 100);
    $('logo-size-val').textContent = Math.round(s.logoSize * 100) + '%';
    document.querySelector('.file-btn').classList.toggle('has-logo', !!s.logo);
    document.querySelector('.file-btn').textContent = s.logo ? 'Change image' : 'Upload image';
    // content fields
    $('f-link-url').value = f.link.url;
    $('f-text').value = f.text.text;
    $('text-count').textContent = f.text.text.length;
    $('f-wifi-ssid').value = f.wifi.ssid;
    $('f-wifi-pass').value = f.wifi.pass;
    $('f-wifi-enc').value = f.wifi.enc;
    $('f-wifi-hidden').checked = f.wifi.hidden;
    $('f-vc-first').value = f.vcard.first;
    $('f-vc-last').value = f.vcard.last;
    $('f-vc-phone').value = f.vcard.phone;
    $('f-vc-email').value = f.vcard.email;
    $('f-vc-org').value = f.vcard.org;
    $('f-vc-title').value = f.vcard.title;
    $('f-vc-url').value = f.vcard.url;
    $('f-em-to').value = f.email.to;
    $('f-em-sub').value = f.email.sub;
    $('f-em-body').value = f.email.body;
    $('f-sms-num').value = f.sms.num;
    $('f-sms-msg').value = f.sms.msg;
    $('f-ph-num').value = f.phone.num;
    switchTab(state.tab);
}

function init() {
    // ---- version toggle
    const setVersion = (v) => {
        document.body.dataset.version = v;
        $('v1-view').hidden = v !== '1';
        $('v2-view').hidden = v !== '2';
        $('btn-v1').classList.toggle('active', v === '1');
        $('btn-v2').classList.toggle('active', v === '2');
        $('btn-v1').setAttribute('aria-pressed', v === '1');
        $('btn-v2').setAttribute('aria-pressed', v === '2');
        const frame = $('v1-frame');
        if (v === '1' && !frame.src) frame.src = frame.dataset.src;
        try { localStorage.setItem(VERSION_KEY, v); } catch {}
    };
    $('btn-v1').addEventListener('click', () => setVersion('1'));
    $('btn-v2').addEventListener('click', () => setVersion('2'));
    let savedVersion = '2';
    try { savedVersion = localStorage.getItem(VERSION_KEY) || '2'; } catch {}
    setVersion(savedVersion);

    // ---- theme toggle
    const applyTheme = (t) => {
        document.documentElement.dataset.theme = t;
        $('theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
        try { localStorage.setItem(THEME_KEY, t); } catch {}
    };
    $('theme-toggle').addEventListener('click', () =>
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    let savedTheme = 'dark';
    try { savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch {}
    applyTheme(savedTheme);

    // ---- tabs
    document.querySelectorAll('.tab').forEach(t =>
        t.addEventListener('click', () => switchTab(t.dataset.tab)));

    // ---- content fields
    bindField('f-link-url', 'link', 'url', {
        after: (el) => { $('link-hint').hidden = !el.value.trim() || /^[a-z][a-z0-9+.-]*:/i.test(el.value.trim()); },
    });
    bindField('f-text', 'text', 'text', {
        after: (el) => { $('text-count').textContent = el.value.length; },
    });
    bindField('f-wifi-ssid', 'wifi', 'ssid');
    bindField('f-wifi-pass', 'wifi', 'pass');
    bindField('f-wifi-enc', 'wifi', 'enc', { event: 'change' });
    bindField('f-wifi-hidden', 'wifi', 'hidden', { event: 'change', checkbox: true });
    $('wifi-eye').addEventListener('click', () => {
        const el = $('f-wifi-pass');
        el.type = el.type === 'password' ? 'text' : 'password';
    });
    bindField('f-vc-first', 'vcard', 'first');
    bindField('f-vc-last', 'vcard', 'last');
    bindField('f-vc-phone', 'vcard', 'phone');
    bindField('f-vc-email', 'vcard', 'email');
    bindField('f-vc-org', 'vcard', 'org');
    bindField('f-vc-title', 'vcard', 'title');
    bindField('f-vc-url', 'vcard', 'url');
    bindField('f-em-to', 'email', 'to');
    bindField('f-em-sub', 'email', 'sub');
    bindField('f-em-body', 'email', 'body');
    bindField('f-sms-num', 'sms', 'num');
    bindField('f-sms-msg', 'sms', 'msg');
    bindField('f-ph-num', 'phone', 'num');

    // ---- style controls
    const bindStyle = (id, key, opts = {}) => {
        $(id).addEventListener(opts.event || 'input', (e) => {
            state.style[key] = opts.checkbox ? e.target.checked : e.target.value;
            clearPresetHighlight();
            if (opts.after) opts.after();
            updateQR();
        });
    };
    bindStyle('s-fg', 'fg');
    bindStyle('s-fg2', 'fg2');
    bindStyle('s-bg', 'bg');
    bindStyle('s-gradient', 'gradient', {
        event: 'change', checkbox: true,
        after: () => $('fg2-field').classList.toggle('disabled', !state.style.gradient),
    });
    bindStyle('s-transparent', 'transparent', { event: 'change', checkbox: true });
    bindStyle('s-dots', 'dots', { event: 'change' });
    bindStyle('s-corners', 'corners', { event: 'change' });
    bindStyle('s-ec', 'ec', { event: 'change' });

    // ---- logo
    $('s-logo').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast('Image too large — keep it under 2 MB'); return; }
        const reader = new FileReader();
        reader.onload = () => {
            state.style.logo = reader.result;
            clearPresetHighlight();
            syncUIFromState();
            updateQR(true);
            toast('Logo added — error correction set to Max');
        };
        reader.readAsDataURL(file);
    });
    $('logo-remove').addEventListener('click', () => {
        state.style.logo = null;
        $('s-logo').value = '';
        syncUIFromState();
        updateQR(true);
    });
    $('s-logo-size').addEventListener('input', (e) => {
        state.style.logoSize = e.target.value / 100;
        $('logo-size-val').textContent = e.target.value + '%';
        updateQR();
    });

    // ---- export
    document.querySelectorAll('#size-chips .chip').forEach(c =>
        c.addEventListener('click', () => {
            state.exportSize = parseInt(c.dataset.size, 10);
            document.querySelectorAll('#size-chips .chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
        }));
    $('dl-png').addEventListener('click', (e) => downloadQR('png', e.currentTarget));
    $('dl-svg').addEventListener('click', (e) => downloadQR('svg', e.currentTarget));
    $('dl-jpeg').addEventListener('click', (e) => downloadQR('jpeg', e.currentTarget));
    $('copy-btn').addEventListener('click', (e) => copyQR(e.currentTarget));

    // ---- history
    $('history-clear').addEventListener('click', () => {
        try { localStorage.removeItem(HISTORY_KEY); } catch {}
        renderHistory();
    });

    renderPresets();
    renderHistory();
    updateQR(true);
}

init();
