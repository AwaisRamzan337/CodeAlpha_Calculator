'use strict';

const resultEl  = document.getElementById('result');
const exprEl    = document.getElementById('expression');
const displayEl = document.querySelector('.display');
const clearBtn  = document.getElementById('clear');

const s = { current: '0', expression: '', justEvaled: false, hasError: false };

/* ── FORMAT: add thousand separators ── */
function fmt(v) {
  if (['Error','Infinity','-Infinity'].includes(v)) return v;
  const neg = v.startsWith('-');
  const abs = neg ? v.slice(1) : v;
  const [int, dec] = abs.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const result = neg ? '-' + grouped : grouped;
  return dec !== undefined ? `${result}.${dec}` : result;
}

/* ── SIZE CLASS based on raw digit count (not formatted) ── */
function sizeClass(raw) {
  const len = raw.replace(/[-,.]/g,'').length;
  if (len > 15) return 'xsmall';
  if (len > 11) return 'small';
  if (len > 7)  return 'medium';
  return 'big';
}

/* ── RENDER ── */
function render() {
  const display = fmt(s.current);
  resultEl.textContent = display;

  /* Only set class — don't add 'pop' here, that's done separately */
  const sz = sizeClass(s.current);
  resultEl.className = `number ${sz}`;

  /* Expression: show non-empty or a blank placeholder to hold height */
  exprEl.textContent = s.expression || '\u00a0';

  /* AC vs C */
  clearBtn.textContent = (s.current !== '0' || s.expression) ? 'C' : 'AC';

  /* Active op highlight */
  const activeOp = s.expression.match(/[+\-*/]$/)?.[0] ?? null;
  document.querySelectorAll('.btn.op').forEach(b => {
    b.classList.toggle('lit', activeOp === b.dataset.val);
  });
}

/* ── ANIMATIONS ── */
function popNum() {
  const sz = sizeClass(s.current);
  resultEl.classList.remove('pop');
  void resultEl.offsetWidth;
  resultEl.className = `number ${sz} pop`;
  resultEl.addEventListener('animationend', () => {
    resultEl.classList.remove('pop');
  }, { once: true });
}

function shakeDisp() {
  displayEl.classList.remove('shake');
  void displayEl.offsetWidth;
  displayEl.classList.add('shake');
  displayEl.addEventListener('animationend', () => displayEl.classList.remove('shake'), { once: true });
}

function flashBtn(el) {
  if (!el) return;
  el.classList.add('flash');
  el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true });
}

/* ── INPUT ── */
function input(val) {
  if (s.hasError) clear();
  if (s.justEvaled) { s.current = ''; s.expression = ''; s.justEvaled = false; }
  if (val === '.' && s.current.includes('.')) return;
  if (s.current === '0' && val !== '.') {
    s.current = val;
  } else {
    if (s.current.replace(/[-,.]/g,'').length >= 15) return;
    s.current += val;
  }
  render();
}

/* ── OPERATOR ── */
function op(o) {
  if (s.hasError) return;
  s.justEvaled = false;
  /* Chain: silently evaluate if there's a pending full expression */
  if (s.expression && !/[+\-*/]$/.test(s.expression)) calc(true);
  if (/[+\-*/]$/.test(s.expression)) {
    s.expression = s.expression.slice(0, -1) + o;
  } else {
    s.expression += (s.current || '0') + o;
    s.current = '0';
  }
  render();
}

/* ── CALCULATE ── */
function calc(chain = false) {
  if (!s.expression || s.hasError) return;
  try {
    const full = s.expression + s.current;
    if (!chain) exprEl.textContent = full + ' =';
    // eslint-disable-next-line no-new-func
    let r = Function('"use strict"; return (' + full + ')')();
    if (!isFinite(r)) throw new Error('Infinity');
    r = parseFloat(parseFloat(r.toPrecision(12)));
    s.current    = String(r);
    s.expression = chain ? s.current : '';
    if (!chain) { s.justEvaled = true; popNum(); }
    render();
  } catch {
    s.hasError = true;
    resultEl.textContent = 'Error';
    resultEl.className   = 'number error';
    shakeDisp();
    setTimeout(clear, 1500);
  }
}

/* ── CLEAR ── */
function clear() {
  s.current = '0'; s.expression = '';
  s.justEvaled = false; s.hasError = false;
  render();
}

/* ── BACKSPACE ── */
function back() {
  if (s.hasError || s.justEvaled) { clear(); return; }
  s.current = s.current.length > 1 ? s.current.slice(0, -1) : '0';
  render();
}

/* ── SIGN TOGGLE ── */
function sign() {
  if (s.hasError || s.current === '0') return;
  s.current = s.current.startsWith('-') ? s.current.slice(1) : '-' + s.current;
  render();
}

/* ── PERCENT ── */
function pct() {
  if (s.hasError) return;
  const v = parseFloat(s.current);
  if (isNaN(v)) return;
  s.current = String(parseFloat((v / 100).toPrecision(12)));
  render(); popNum();
}

/* ── RIPPLE ── */
function ripple(btn, e) {
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--rx', ((e.clientX - r.left) / r.width  * 100) + '%');
  btn.style.setProperty('--ry', ((e.clientY - r.top)  / r.height * 100) + '%');
}

/* ── BIND BUTTONS ── */
document.querySelectorAll('.btn.num').forEach(b =>
  b.addEventListener('click', e => { ripple(b, e); input(b.dataset.val); }));

document.querySelectorAll('.btn.op').forEach(b =>
  b.addEventListener('click', e => { ripple(b, e); op(b.dataset.val); }));

document.querySelectorAll('.btn.util').forEach(b =>
  b.addEventListener('click', e => {
    ripple(b, e);
    if (b.dataset.val === 'sign') sign();
    else if (b.dataset.val === '%') pct();
  }));

document.getElementById('equals').addEventListener('click', e => { ripple(document.getElementById('equals'), e); calc(); });
clearBtn.addEventListener('click', e => { ripple(clearBtn, e); clear(); });

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key >= '0' && e.key <= '9') {
    input(e.key); flashBtn(document.querySelector(`[data-val="${e.key}"]`));
  } else if (e.key === '.') {
    input('.'); flashBtn(document.querySelector('[data-val="."]'));
  } else if (['+', '-', '*', '/'].includes(e.key)) {
    e.preventDefault(); op(e.key); flashBtn(document.querySelector(`[data-val="${e.key}"]`));
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault(); calc(); flashBtn(document.getElementById('equals'));
  } else if (e.key === 'Backspace') {
    back();
  } else if (e.key === 'Escape') {
    clear(); flashBtn(clearBtn);
  } else if (e.key === '%') {
    pct();
  }
});

render();