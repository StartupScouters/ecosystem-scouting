/* ============================================================
   Ecosystem Scouting, form engine
   Renders SCOUTING_SCHEMA, handles branching, validation,
   autosave, the review step, pre-classification and submission.
   Vanilla JS, no dependencies, works on GitHub Pages.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = window.SCOUTING_CONFIG || {};
  var SCHEMA = window.SCOUTING_SCHEMA;
  var CLASSIFIER = window.SCOUTING_CLASSIFIER;
  var app = document.getElementById('form-app');
  if (!app || !SCHEMA) return;

  var STEPS = SCHEMA.steps;
  var REVIEW = STEPS.length;           // index of the review step
  var STORAGE_KEY = CONFIG.storageKey || 'scouting-form';
  var FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail|libero|virgilio|tiscali|alice|tin|yandex|gmx|mail)\./i;

  /* ---------------- state ---------------- */
  var state = {
    answers: {}, step: 0, view: 'form', exitKey: null, refId: null,
    startedAt: Date.now(), savedAt: null, showResume: false, errors: {}, sendError: null, record: null
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || saved.version !== CONFIG.version) return;
      var hasAnswers = saved.answers && Object.keys(saved.answers).length > 0;
      if (!hasAnswers) return;
      state.answers = saved.answers;
      state.step = Math.min(saved.step || 0, REVIEW);
      state.startedAt = saved.startedAt || Date.now();
      state.savedAt = saved.savedAt || null;
      state.showResume = true;
    } catch (e) { /* storage unavailable: continue without autosave */ }
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        state.savedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: CONFIG.version, answers: state.answers, step: state.step, startedAt: state.startedAt, savedAt: state.savedAt
        }));
        var el = document.getElementById('autosave'); if (el) el.textContent = 'Saved ' + timeLabel(state.savedAt);
      } catch (e) { /* ignore */ }
    }, 300);
  }
  function clearSaved() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ } }
  function reset() {
    clearSaved();
    state = { answers: {}, step: 0, view: 'form', exitKey: null, refId: null, startedAt: Date.now(), savedAt: null, showResume: false, errors: {}, sendError: null, record: null };
    render(); scrollTop();
  }

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }
  function timeLabel(ts) { var d = new Date(ts); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
  function isVisible(q) { return !q.showIf || !!q.showIf(state.answers); }
  function visibleQuestions(step) { return step.questions.filter(isVisible); }
  function options(q) { return q.optionsFrom ? q.optionsFrom(state.answers) : (q.options || []); }
  function hasValue(v) { return Array.isArray(v) ? v.length > 0 : (v === true || (v !== undefined && v !== null && String(v).trim() !== '')); }
  function displayValue(q) {
    var v = state.answers[q.id];
    if (!hasValue(v)) return '';
    if (q.type === 'consent') return v === true ? 'Yes' : 'No';
    var opts = options(q);
    function lab(x) { var o = opts.filter(function (o) { return o.value === x; })[0]; return o ? o.label : x; }
    if (Array.isArray(v)) return v.map(lab).join('; ');
    if (q.type === 'radio' || q.type === 'select') return lab(v);
    return String(v);
  }
  function labelText(q) {
    if (q.type !== 'consent') return q.label;
    var t = strip(q.label); return t.length > 70 ? t.slice(0, 67) + '...' : t;
  }
  function scrollTop() {
    var card = document.querySelector('.fcard, .end');
    var top = card ? card.getBoundingClientRect().top + window.scrollY - 24 : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    var h = document.querySelector('.fcard__head h2, .end h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function makeRefId() {
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'ES-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rnd;
  }

  /* ---------------- rendering ---------------- */
  function render() {
    if (state.view === 'exit') { app.innerHTML = renderExit(); }
    else if (state.view === 'done') { app.innerHTML = renderDone(); }
    else { app.innerHTML = renderResume() + renderStepper() + (state.step === REVIEW ? renderReview() : renderStep(STEPS[state.step])); }
  }

  function renderResume() {
    if (!state.showResume) return '';
    return '<div class="notice" role="status"><span>You have a submission in progress' + (state.savedAt ? ' (saved ' + esc(timeLabel(state.savedAt)) + ')' : '') + '. Continue where you left off?</span>' +
      '<span class="notice__actions"><button type="button" class="pill pill-primary nav__cta" data-action="dismiss-resume">Continue</button><button type="button" class="btn-link" data-action="reset">Start over</button></span></div>';
  }

  function renderStepper() {
    var items = STEPS.map(function (s) { return s.title; }).concat(['Review']);
    var html = '<div class="stepper__count">Step ' + (state.step + 1) + ' of ' + items.length + '</div><ol class="stepper" aria-label="Progress">';
    items.forEach(function (t, i) {
      var cls = i < state.step ? 'stepper__item--done' : (i === state.step ? 'stepper__item--current' : '');
      var go = i < state.step ? ' data-go="' + i + '" aria-label="Go back to ' + esc(t) + '"' : ' tabindex="-1"';
      html += '<li class="' + cls + '"' + (i === state.step ? ' aria-current="step"' : '') + '><button type="button"' + go + '><span class="stepper__bar"></span><span class="stepper__label">' + esc(t) + '</span></button></li>';
    });
    return html + '</ol>';
  }

  function renderStep(step) {
    var qs = visibleQuestions(step);
    var html = '<form class="fcard" id="scouting-form" novalidate autocomplete="on">' +
      '<div class="fcard__head"><h2>' + esc(step.heading) + '</h2>' + (step.intro ? '<p>' + esc(step.intro) + '</p>' : '') + '</div>';
    if (state.errors._summary) html += '<div class="notice notice--error" role="alert"><p>' + esc(state.errors._summary) + '</p></div>';
    qs.forEach(function (q) { html += renderQuestion(q); });
    html += '<div class="hp" aria-hidden="true"><label>Fax<input type="text" name="company_fax" tabindex="-1" autocomplete="off"></label></div>';
    html += '<div class="actions">' +
      (state.step > 0 ? '<button type="button" class="btn-link" data-action="back">Back</button>' : '<span class="autosave" id="autosave">' + (state.savedAt ? 'Saved ' + esc(timeLabel(state.savedAt)) : 'Progress is saved on this device') + '</span>') +
      '<div class="actions__right">' + (state.step > 0 ? '<span class="autosave" id="autosave">' + (state.savedAt ? 'Saved ' + esc(timeLabel(state.savedAt)) : '') + '</span>' : '') +
      '<button type="submit" class="pill pill-primary">' + (state.step === STEPS.length - 1 ? 'Review answers' : 'Continue') + ' <span aria-hidden="true">&gt;</span></button></div></div></form>';
    return html;
  }

  function renderQuestion(q) {
    var v = state.answers[q.id];
    var err = state.errors[q.id];
    var req = q.required ? '<span class="req" aria-hidden="true">*</span>' : '';
    var id = 'q-' + q.id;
    var help = q.help ? '<p class="q__help" id="' + id + '-help">' + esc(q.help) + '</p>' : '';
    var describedBy = (q.help ? id + '-help ' : '') + id + '-err';
    var html = '<div class="q' + (err ? ' q--error' : '') + '" data-q="' + esc(q.id) + '">';
    var ac = q.autocomplete ? ' autocomplete="' + esc(q.autocomplete) + '"' : '';

    if (q.type === 'consent') {
      html += '<label class="consent"><input type="checkbox" id="' + id + '" name="' + esc(q.id) + '"' + (v === true ? ' checked' : '') + (q.required ? ' aria-required="true"' : '') + ' aria-describedby="' + id + '-err"><span>' + q.label + (q.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</span></label>';
      html += '<p class="q__error" id="' + id + '-err">' + esc(err || '') + '</p></div>';
      return html;
    }

    if (q.type === 'radio' || q.type === 'checkbox') html += '<span class="q__label" id="' + id + '-lbl">' + esc(q.label) + req + '</span>' + help;
    else html += '<label class="q__label" for="' + id + '">' + esc(q.label) + req + '</label>' + help;

    if (q.type === 'text' || q.type === 'url' || q.type === 'email') {
      var t = q.type === 'url' ? 'url' : (q.type === 'email' ? 'email' : 'text');
      html += '<input class="input" type="' + t + '" id="' + id + '" name="' + esc(q.id) + '" value="' + esc(v || '') + '"' +
        (q.placeholder ? ' placeholder="' + esc(q.placeholder) + '"' : '') + (q.maxLength ? ' maxlength="' + q.maxLength + '"' : '') +
        (q.type === 'url' ? ' inputmode="url"' : '') + ac + (q.required ? ' aria-required="true"' : '') + ' aria-describedby="' + describedBy + '">';
    } else if (q.type === 'number') {
      html += '<input class="input input--short" type="number" id="' + id + '" name="' + esc(q.id) + '" value="' + esc(v || '') + '" inputmode="numeric"' +
        (q.min != null ? ' min="' + q.min + '"' : '') + (q.max != null ? ' max="' + q.max + '"' : '') + (q.placeholder ? ' placeholder="' + esc(q.placeholder) + '"' : '') +
        (q.required ? ' aria-required="true"' : '') + ' aria-describedby="' + describedBy + '">';
    } else if (q.type === 'textarea') {
      html += '<textarea class="input" id="' + id + '" name="' + esc(q.id) + '"' + (q.maxLength ? ' maxlength="' + q.maxLength + '"' : '') + (q.placeholder ? ' placeholder="' + esc(q.placeholder) + '"' : '') +
        (q.required ? ' aria-required="true"' : '') + ' aria-describedby="' + describedBy + '">' + esc(v || '') + '</textarea>';
      if (q.maxLength) html += '<div class="q__count" data-count-for="' + id + '">' + String(v || '').length + ' / ' + q.maxLength + '</div>';
    } else if (q.type === 'select') {
      html += '<select class="input" id="' + id + '" name="' + esc(q.id) + '"' + (q.required ? ' aria-required="true"' : '') + ' aria-describedby="' + describedBy + '"><option value="">Select</option>';
      options(q).forEach(function (o) { html += '<option value="' + esc(o.value) + '"' + (v === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>'; });
      html += '</select>';
    } else if (q.type === 'radio') {
      html += '<div class="opt-cards" role="radiogroup" aria-labelledby="' + id + '-lbl" id="' + id + '">';
      options(q).forEach(function (o, i) {
        var oid = id + '-' + i;
        html += '<label class="opt-card" for="' + oid + '"><input type="radio" id="' + oid + '" name="' + esc(q.id) + '" value="' + esc(o.value) + '"' + (v === o.value ? ' checked' : '') + '>' +
          '<span class="opt-card__dot" aria-hidden="true"></span><span class="opt-card__body">' + esc(o.label) + (o.help ? '<small>' + esc(o.help) + '</small>' : '') + '</span></label>';
      });
      html += '</div>';
    } else if (q.type === 'checkbox') {
      var arrv = Array.isArray(v) ? v : [];
      html += '<div class="chips-select" role="group" aria-labelledby="' + id + '-lbl" id="' + id + '">';
      options(q).forEach(function (o, i) {
        var cid = id + '-' + i;
        html += '<label class="chip-select" for="' + cid + '" title="' + esc(o.help || '') + '"><input type="checkbox" id="' + cid + '" name="' + esc(q.id) + '" value="' + esc(o.value) + '"' + (arrv.indexOf(o.value) !== -1 ? ' checked' : '') + (o.exclusive ? ' data-exclusive="1"' : '') + '>' +
          '<span class="chip-select__check" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0613" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>' + esc(o.label) + '</label>';
      });
      html += '</div>';
    }
    html += '<p class="q__error" id="' + id + '-err">' + esc(err || '') + '</p></div>';
    return html;
  }

  function renderReview() {
    var html = '<form class="fcard" id="scouting-form" novalidate><div class="fcard__head"><h2>Review and send</h2><p>Check your answers. You can edit any section before sending.</p></div>';
    if (state.sendError) html += '<div class="notice notice--error" role="alert"><p>' + esc(state.sendError) + '</p><span class="notice__actions"><button type="button" class="btn-link" data-action="mailto">Send it by e-mail instead</button></span></div>';
    html += '<div class="summary">';
    STEPS.forEach(function (step, i) {
      var rows = step.questions.filter(function (q) { return (isVisible(q) || (q.alwaysReview && hasValue(state.answers[q.id]))) && hasValue(state.answers[q.id]); });
      html += '<div class="summary__group"><div class="summary__head"><span>' + esc(step.title) + '</span><button type="button" class="btn-link" data-go="' + i + '">Edit</button></div>';
      if (!rows.length) html += '<div class="summary__row"><dt>No answers</dt><dd></dd></div>';
      rows.forEach(function (q) { html += '<dl class="summary__row"><dt>' + esc(labelText(q)) + '</dt><dd>' + esc(displayValue(q)) + '</dd></dl>'; });
      html += '</div>';
    });
    html += '</div><div class="hp" aria-hidden="true"><label>Fax<input type="text" name="company_fax" tabindex="-1" autocomplete="off"></label></div>';
    html += '<div class="actions"><button type="button" class="btn-link" data-action="back">Back</button><div class="actions__right"><span class="autosave">Sent to the scouting team' + (CONFIG.provider === 'mailto' ? ' through your e-mail client' : '') + '</span>' +
      '<button type="submit" class="pill pill-primary" id="send-btn">Send submission <span aria-hidden="true">&gt;</span></button></div></div></form>';
    return html;
  }

  function renderExit() {
    var ex = SCHEMA.exits[state.exitKey] || { title: 'Thanks for your interest', text: '' };
    return '<div class="fcard end"><div><h2>' + esc(ex.title) + '</h2><p>' + esc(ex.text) + '</p>' + (ex.hint ? '<p>' + esc(ex.hint) + '</p>' : '') +
      '<p>Questions? Write to <a href="mailto:' + esc(CONFIG.contactEmail) + '" style="color:var(--accent);text-decoration:underline">' + esc(CONFIG.contactEmail) + '</a>.</p></div>' +
      '<div class="end__actions"><button type="button" class="pill pill-primary" data-action="reset">Start over</button><a class="pill pill-ghost" href="../">Back to Ecosystem Scouting</a></div></div>';
  }

  function renderDone() {
    var mail = CONFIG.provider === 'mailto';
    var html = '<div class="fcard end"><div><h2>' + (mail ? 'One last step: send the e-mail' : 'Submission received') + '</h2>';
    if (mail) {
      html += '<p>Your e-mail client should have opened with your submission ready to send to <strong>' + esc(CONFIG.contactEmail) + '</strong>. Press send and you are done.</p>' +
        '<p>If nothing opened, copy the summary below and e-mail it yourself, or download the full file and attach it.</p>';
    } else {
      html += '<p>Thanks. The scouting team reads every submission and will come back to you within ' + esc(CONFIG.responseDays || 10) + ' business days at the address you gave us.</p>';
    }
    html += '<span class="ref">Reference ' + esc(state.refId) + '</span></div>' +
      '<div class="end__actions">' + (mail ? '<button type="button" class="pill pill-primary" data-action="mailto">Open e-mail again</button><button type="button" class="pill pill-ghost" data-action="copy">Copy summary</button>' : '') +
      '<button type="button" class="pill pill-ghost" data-action="download">Download a copy (JSON)</button><a class="btn-link" href="../">Back to Ecosystem Scouting</a></div>' +
      '<div class="card next-steps end__steps"><div class="card__head" style="padding:0"><span>What happens next</span></div>' +
      '<div class="next-step"><span class="next-step__num">1</span><div>We review<small>The scouting team checks fit with current and upcoming programs</small></div></div>' +
      '<div class="next-step"><span class="next-step__num">2</span><div>We reach out<small>If there is a match, we set up a call to explore working together</small></div></div>' +
      '<div class="next-step"><span class="next-step__num">3</span><div>We keep your profile<small>Programs change; a vendor that is not a fit today may be next year</small></div></div></div></div>';
    return html;
  }

  /* ---------------- validation ---------------- */
  function normaliseUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }
  function validUrl(u) { try { var p = new URL(u); return /^https?:$/.test(p.protocol) && /\./.test(p.hostname); } catch (e) { return false; } }

  function validateStep(step) {
    var errors = {}; var first = null;
    visibleQuestions(step).forEach(function (q) {
      var v = state.answers[q.id];
      var msg = null;
      if (q.type === 'url' && hasValue(v)) { var nu = normaliseUrl(v); state.answers[q.id] = nu; if (!validUrl(nu)) msg = 'Enter a valid web address, like https://example.com'; }
      if (q.type === 'email' && hasValue(v)) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())) msg = 'Enter a valid e-mail address'; else state.answers[q.id] = String(v).trim(); }
      if (q.type === 'number' && hasValue(v)) {
        var n = Number(v);
        if (!Number.isInteger(n)) msg = 'Enter a whole number';
        else if (q.min != null && n < q.min) msg = 'Must be ' + q.min + ' or later';
        else if (q.max != null && n > q.max) msg = 'Must be ' + q.max + ' or earlier';
      }
      if (q.maxLength && typeof v === 'string' && v.length > q.maxLength) msg = 'Keep it under ' + q.maxLength + ' characters';
      if (!msg && q.required && !hasValue(v)) {
        msg = q.type === 'checkbox' ? 'Select at least one option' : (q.type === 'radio' || q.type === 'select' ? 'Choose an option' : (q.type === 'consent' ? 'Your agreement is needed to continue' : 'This field is required'));
      }
      if (msg) { errors[q.id] = msg; if (!first) first = q.id; }
    });
    var n = Object.keys(errors).length;
    if (n) errors._summary = n === 1 ? 'One answer needs attention before you continue.' : n + ' answers need attention before you continue.';
    state.errors = errors;
    return first;
  }

  /* ---------------- record and submission ---------------- */
  function buildRecord() {
    var answers = {}, labelled = {};
    STEPS.forEach(function (step) {
      step.questions.forEach(function (q) {
        if ((isVisible(q) || (q.alwaysReview && hasValue(state.answers[q.id]))) && hasValue(state.answers[q.id])) {
          answers[q.id] = state.answers[q.id];
          labelled[q.id] = displayValue(q);
        }
      });
    });
    var classification = CLASSIFIER ? CLASSIFIER.classify(answers) : null;
    var meta = {
      reference_id: state.refId, submitted_at: new Date().toISOString(), form_version: CONFIG.version || '', provider: CONFIG.provider || '',
      duration_seconds: Math.round((Date.now() - state.startedAt) / 1000), page: location.href.split('?')[0], language: navigator.language || ''
    };
    return { answers: answers, labelled: labelled, classification: classification, meta: meta };
  }

  function summaryText(rec) {
    var lines = ['Ecosystem Scouting submission ' + rec.meta.reference_id, 'Submitted: ' + rec.meta.submitted_at, ''];
    if (rec.classification) {
      var c = rec.classification;
      lines.push('--- Pre-classification ---', 'Scope: ' + c.scope + (c.strategic ? ' (strategic area)' : ''), 'Primary area: ' + c.primary_domain_label,
        'Fit score: ' + c.fit_score + '/100', 'Maturity: ' + c.maturity, 'Enterprise readiness: ' + c.readiness, 'Suggested action: ' + c.action,
        'Why: ' + (c.reasons.join('; ') || 'n/a'), 'Flags: ' + (c.flags.join('; ') || 'none'), '');
    }
    STEPS.forEach(function (step) {
      var rows = step.questions.filter(function (q) { return rec.labelled[q.id] !== undefined; });
      if (!rows.length) return;
      lines.push('--- ' + step.title + ' ---');
      rows.forEach(function (q) { lines.push(labelText(q) + ': ' + rec.labelled[q.id]); });
      lines.push('');
    });
    return lines.join('\n');
  }

  function flatFields(rec) {
    var f = {};
    Object.keys(rec.labelled).forEach(function (k) { f[k] = rec.labelled[k]; });
    if (rec.classification) {
      var c = rec.classification;
      f.classification_scope = c.scope; f.classification_primary_area = c.primary_domain_label; f.classification_strategic = c.strategic ? 'yes' : 'no';
      f.classification_fit_score = String(c.fit_score); f.classification_maturity = c.maturity; f.classification_readiness = c.readiness;
      f.classification_action = c.action; f.classification_reasons = c.reasons.join('; '); f.classification_flags = c.flags.join('; ');
    }
    f.reference_id = rec.meta.reference_id; f.submitted_at = rec.meta.submitted_at; f.form_version = rec.meta.form_version;
    f.summary = summaryText(rec);
    f.payload_json = JSON.stringify(rec);
    return f;
  }

  function mailtoLink(rec) {
    var subject = (CONFIG.emailSubject || 'Ecosystem Scouting submission') + ': ' + (rec.answers.company_name || '') + ' (' + rec.meta.reference_id + ')';
    var body = summaryText(rec);
    if (body.length > 1800) body = body.slice(0, 1800) + '\n\n[Summary truncated. Full submission attached or available on request.]';
    return 'mailto:' + encodeURIComponent(CONFIG.contactEmail || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function send(rec) {
    var fields = flatFields(rec);
    var provider = CONFIG.provider || 'mailto';
    var mode = CONFIG.submitMode === 'no-cors' ? 'no-cors' : 'cors';
    var body, headers = { 'Content-Type': 'application/json' };

    if (provider === 'mailto') {
      window.location.href = mailtoLink(rec);
      return Promise.resolve({ ok: true });
    }
    if (provider === 'web3forms') {
      if (!CONFIG.accessKey) return Promise.reject(new Error('The form is not configured yet (missing access key).'));
      body = Object.assign({ access_key: CONFIG.accessKey, subject: CONFIG.emailSubject + ': ' + (rec.answers.company_name || ''), from_name: 'Ecosystem Scouting form', replyto: rec.answers.contact_email || '', botcheck: '' }, fields);
      headers.Accept = 'application/json';
    } else if (provider === 'formspree') {
      body = Object.assign({ _subject: CONFIG.emailSubject + ': ' + (rec.answers.company_name || ''), _replyto: rec.answers.contact_email || '', email: rec.answers.contact_email || '' }, fields);
      headers.Accept = 'application/json';
    } else {
      body = { fields: fields, record: rec };
    }
    if (!CONFIG.endpoint) return Promise.reject(new Error('The form is not configured yet (missing endpoint).'));
    // In no-cors mode browsers only allow "simple" content types, so the JSON travels as text/plain
    // and the receiving flow parses it (Power Automate: json(triggerBody()), Apps Script: e.postData.contents).
    if (mode === 'no-cors') headers = { 'Content-Type': 'text/plain;charset=UTF-8' };

    return fetch(CONFIG.endpoint, { method: 'POST', mode: mode, headers: headers, body: JSON.stringify(body) }).then(function (res) {
      if (mode === 'no-cors') return { ok: true };            // opaque response: cannot be read, assume delivered
      if (!res.ok) throw new Error('The server answered ' + res.status + '. Please try again in a moment.');
      return res.json().catch(function () { return { ok: true }; }).then(function (j) {
        if (j && j.success === false) throw new Error(j.message || 'The form service rejected the submission.');
        return { ok: true };
      });
    });
  }

  function submit() {
    var form = document.getElementById('scouting-form');
    var hp = form && form.querySelector('[name="company_fax"]');
    state.sendError = null;
    if (CONFIG.allowedHosts && CONFIG.allowedHosts.length && CONFIG.allowedHosts.indexOf(location.hostname) === -1) {
      state.sendError = 'This copy of the form is not authorised to send submissions.'; render(); return;
    }
    if (hp && hp.value) { state.refId = makeRefId(); state.view = 'done'; render(); return; }   // bot: pretend success, send nothing
    if ((Date.now() - state.startedAt) / 1000 < (CONFIG.minSecondsBeforeSubmit || 0)) {
      state.sendError = 'That was quick. Please take a moment to review your answers, then send again.'; render(); return;
    }
    // final validation across all steps
    for (var i = 0; i < STEPS.length; i++) {
      var firstErr = validateStep(STEPS[i]);
      if (firstErr) { state.step = i; render(); scrollTop(); focusField(firstErr); return; }
    }
    state.refId = state.refId || makeRefId();
    state.record = buildRecord();
    var btn = document.getElementById('send-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="sending"><span class="spinner"></span>Sending</span>'; }
    send(state.record).then(function () {
      state.view = 'done'; clearSaved(); render(); scrollTop();
    }).catch(function (err) {
      state.sendError = (err && err.message ? err.message : 'Could not send the submission.') + ' Your answers are still saved on this device.';
      render(); scrollTop();
    });
  }

  function download() {
    var rec = state.record || buildRecord();
    var blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ecosystem-scouting-' + (rec.meta.reference_id || 'submission') + '.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copySummary(btn) {
    var rec = state.record || buildRecord();
    var text = summaryText(rec);
    var done = function () { if (btn) { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); }

  /* ---------------- navigation ---------------- */
  function focusField(qid) {
    var el = document.querySelector('[name="' + qid + '"]'); if (el) el.focus({ preventScroll: false });
  }
  function next() {
    var step = STEPS[state.step];
    var firstErr = validateStep(step);
    if (firstErr) { render(); focusField(firstErr); return; }
    if (step.after) step.after(state.answers);
    var exitKey = step.exit ? step.exit(state.answers) : null;
    if (exitKey) { state.exitKey = exitKey; state.view = 'exit'; render(); scrollTop(); return; }
    state.errors = {}; state.step += 1; save(); render(); scrollTop();
  }
  function goTo(i) { state.errors = {}; state.step = i; save(); render(); scrollTop(); }

  /* ---------------- events ---------------- */
  function readInput(el) {
    var name = el.name; if (!name || name === 'company_fax') return;
    var q = findQuestion(name); if (!q) return;
    if (q.type === 'checkbox') {
      var inputs = app.querySelectorAll('input[name="' + name + '"]');
      var vals = [];
      if (el.checked && el.dataset.exclusive) { inputs.forEach(function (i) { if (i !== el) i.checked = false; }); }
      else if (el.checked) { inputs.forEach(function (i) { if (i.dataset.exclusive) i.checked = false; }); }
      inputs.forEach(function (i) { if (i.checked) vals.push(i.value); });
      state.answers[name] = vals;
    } else if (q.type === 'consent') {
      state.answers[name] = !!el.checked;
    } else if (q.type === 'radio') {
      if (el.checked) state.answers[name] = el.value;
    } else {
      state.answers[name] = el.value;
      var counter = app.querySelector('[data-count-for="' + el.id + '"]'); if (counter) counter.textContent = el.value.length + ' / ' + q.maxLength;
    }
    if (state.errors[name]) { delete state.errors[name]; var qEl = el.closest('.q'); if (qEl) { qEl.classList.remove('q--error'); var e = qEl.querySelector('.q__error'); if (e) e.textContent = ''; } }
    save();
  }
  function findQuestion(id) {
    for (var i = 0; i < STEPS.length; i++) for (var j = 0; j < STEPS[i].questions.length; j++) if (STEPS[i].questions[j].id === id) return STEPS[i].questions[j];
    return null;
  }
  function stepIsDynamic(step) { return step.questions.some(function (q) { return q.showIf || q.optionsFrom; }); }

  app.addEventListener('input', function (e) {
    var el = e.target; if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if (el.type === 'radio' || el.type === 'checkbox') return;   // handled on change
    readInput(el);
  });
  app.addEventListener('change', function (e) {
    var el = e.target; if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
    var isChoice = el.type === 'radio' || el.type === 'checkbox' || el instanceof HTMLSelectElement;
    readInput(el);
    if (state.view === 'form' && state.step < REVIEW && isChoice && stepIsDynamic(STEPS[state.step])) {
      var focusId = document.activeElement && document.activeElement.id;
      render();
      if (focusId) { var f = document.getElementById(focusId); if (f) f.focus({ preventScroll: true }); }
    }
  });
  app.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action], [data-go]'); if (!btn) return;
    if (btn.dataset.go !== undefined) { goTo(Number(btn.dataset.go)); return; }
    switch (btn.dataset.action) {
      case 'back': goTo(Math.max(0, state.step - 1)); break;
      case 'reset': if (confirm('Clear all answers and start over?')) reset(); break;
      case 'dismiss-resume': state.showResume = false; render(); break;
      case 'download': download(); break;
      case 'copy': copySummary(btn); break;
      case 'mailto': state.refId = state.refId || makeRefId(); state.record = state.record || buildRecord(); window.location.href = mailtoLink(state.record); if (state.view !== 'done') { state.view = 'done'; state.sendError = null; render(); scrollTop(); } break;
    }
  });
  app.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.step === REVIEW) submit(); else next();
  });

  /* ---------------- boot ---------------- */
  load();
  render();
})();
