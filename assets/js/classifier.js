/* ============================================================
   Ecosystem Scouting, pre-classification
   Turns the answers into a structured triage record that travels
   with the submission, so the scouting team receives every vendor
   already scored and labelled. Rules are deliberately simple and
   fully visible here; tune the weights to taste.
   ============================================================ */
(function () {
  var CONFIG = window.SCOUTING_CONFIG || {};
  var CORE = ['data_platforms', 'integration', 'semantic_kg', 'governance', 'security', 'analytics', 'ml_platform', 'genai', 'ai_governance'];
  var ADJACENT = ['vertical_ai', 'other_data_ai'];

  function arr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function anyOf(list, values) { return values.some(function (x) { return list.indexOf(x) !== -1; }); }
  function countOf(list, values) { return values.filter(function (x) { return list.indexOf(x) !== -1; }).length; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function classify(a) {
    var reasons = [];
    var strategic = CONFIG.strategicAreas || [];
    var labels = (window.SCOUTING_SCHEMA && window.SCOUTING_SCHEMA.meta.domainLabels) || {};

    /* ---- Scope ---- */
    var scope = 'out';
    var primary = a.primary_domain || arr(a.domains).filter(function (d) { return d !== 'none'; })[0] || null;
    if (a.offer_type === 'product' || a.offer_type === 'opensource') {
      if (CORE.indexOf(primary) !== -1) scope = 'core';
      else if (ADJACENT.indexOf(primary) !== -1) scope = 'adjacent';
    }
    var isStrategic = strategic.indexOf(primary) !== -1;

    /* ---- Fit score (0-100) ---- */
    var s = 0;

    // Domain fit
    if (scope === 'core') { s += 30; reasons.push('Core area: ' + (labels[primary] || primary)); }
    else if (scope === 'adjacent') { s += 12; reasons.push('Adjacent area: ' + (labels[primary] || primary)); }
    if (isStrategic) { s += 10; reasons.push('Strategic area for the practice'); }
    var secondary = countOf(arr(a.domains), CORE) - (CORE.indexOf(primary) !== -1 ? 1 : 0);
    if (secondary > 0) { s += Math.min(4, secondary * 2); }

    // Deployment flexibility
    var dep = arr(a.deployment);
    if (anyOf(dep, ['byoc', 'onprem', 'hybrid', 'airgapped'])) { s += 8; reasons.push('Deploys in customer environments'); }
    else if (dep.length) { s += 3; }

    // Openness and integration
    var apis = arr(a.apis).filter(function (x) { return x !== 'none'; });
    if (apis.length >= 3) { s += 6; reasons.push('Rich API / SDK surface'); }
    else if (apis.length >= 1) { s += 3; }
    if (a.oss_core === 'yes' || a.oss_core === 'partly') { s += 2; }

    // Enterprise readiness
    var certs = arr(a.certifications);
    var feats = arr(a.enterprise_features);
    var readinessPts = 0;
    if (anyOf(certs, ['soc2', 'iso27001'])) { readinessPts += 8; reasons.push('SOC 2 / ISO 27001 in place'); }
    else if (certs.indexOf('in_progress') !== -1) { readinessPts += 3; }
    readinessPts += Math.min(6, countOf(feats, ['sso', 'rbac', 'audit']) * 2);
    if (feats.indexOf('eu_residency') !== -1) { readinessPts += 2; reasons.push('EU data residency'); }
    if (feats.indexOf('sla') !== -1) { readinessPts += 1; }
    s += readinessPts;

    // Traction
    var tractionMap = { '0': 0, '1-5': 4, '6-20': 8, '21-100': 12, '100+': 14 };
    var traction = tractionMap[a.customers] || 0;
    if (a.enterprise_share === 'most') traction += 4; else if (a.enterprise_share === 'some') traction += 2;
    s += traction;
    if (traction >= 12) reasons.push('Proven with paying customers');

    // Partnership readiness
    var partnerPts = 0;
    if (a.trial === 'sandbox' || a.trial === 'guided') partnerPts += 3;
    if (a.poc_willing === 'yes_free' || a.poc_willing === 'yes_paid') { partnerPts += 4; reasons.push('Open to a proof of concept'); }
    if (arr(a.partner_program).filter(function (x) { return x !== 'none'; }).length) partnerPts += 3;
    if (a.partners === 'yes_si') { partnerPts += 3; reasons.push('Already works with system integrators'); }
    s += partnerPts;

    // Geography
    if (a.europe_presence === 'italy') { s += 4; reasons.push('Team in Italy'); }
    else if (a.europe_presence === 'europe') { s += 2; reasons.push('Team in Europe'); }

    var fit = clamp(Math.round(s), 0, 100);

    /* ---- Maturity ---- */
    var m = 0;
    var stagePts = { bootstrapped: 1, pre_seed: 0, seed: 1, series_a: 2, series_b: 3, series_c_plus: 4, corporate: 4, grant: 0 };
    m += stagePts[a.funding_stage] || 0;
    m += { '0': 0, '1-5': 1, '6-20': 2, '21-100': 3, '100+': 4 }[a.customers] || 0;
    m += { '1-10': 0, '11-50': 1, '51-200': 2, '201-1000': 3, '1000+': 4 }[a.company_size] || 0;
    var maturity = m <= 2 ? 'Early' : (m <= 5 ? 'Emerging' : (m <= 8 ? 'Growth' : 'Established'));

    /* ---- Enterprise readiness level ---- */
    var readiness = readinessPts >= 12 ? 'High' : (readinessPts >= 6 ? 'Medium' : 'Low');

    /* ---- Recommended action ---- */
    var t = CONFIG.thresholds || { fastTrack: 65, review: 45 };
    var action, actionCode;
    if (scope === 'out') { action = 'Decline: outside scope'; actionCode = 'decline'; }
    else if (fit >= t.fastTrack) { action = 'Fast-track: schedule an intro call'; actionCode = 'fast_track'; }
    else if (fit >= t.review) { action = 'Review in the next scouting sync'; actionCode = 'review'; }
    else { action = 'Park and revisit in six months'; actionCode = 'park'; }
    if (isStrategic && actionCode === 'review') { action = 'Review with priority (strategic area)'; actionCode = 'review_priority'; }

    var flags = [];
    if (a.customers === '0') flags.push('no customers yet');
    if (certs.indexOf('none') !== -1 || !certs.length) flags.push('no certifications');
    if (apis.length === 0) flags.push('no public API');
    if (a.poc_willing === 'not_now') flags.push('not open to POC');
    if (a.europe_presence === 'none') flags.push('no European presence');
    if (dep.length === 1 && dep[0] === 'saas') flags.push('SaaS only');

    return {
      scope: scope,
      primary_domain: primary,
      primary_domain_label: labels[primary] || primary || '',
      strategic: isStrategic,
      fit_score: fit,
      maturity: maturity,
      readiness: readiness,
      action: action,
      action_code: actionCode,
      reasons: reasons,
      flags: flags,
      rules_version: '1.0'
    };
  }

  window.SCOUTING_CLASSIFIER = { classify: classify, CORE: CORE, ADJACENT: ADJACENT };
})();
