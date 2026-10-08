/* ============================================================
   Ecosystem Scouting, site configuration
   This is the ONLY file you need to edit to go live.
   See README.md for a step-by-step guide.
   ============================================================ */
window.SCOUTING_CONFIG = {

  /* Public URL of the site on GitHub Pages (with trailing slash). */
  siteUrl: "https://startupscouters.github.io/ecosystem-scouting/",

  /* Contact address shown to vendors (footer, exit screens, e-mail fallback).
     Replace with a team mailbox when one is available. */
  contactEmail: "l.zanotto@accenture.com",

  /* Promised response time shown to vendors (business days). */
  responseDays: 10,

  /* ---------- Submission backend ----------
     provider: "web3forms" | "formspree" | "custom" | "mailto"
     Who receives the notifications is managed in the Formspree
     dashboard (form > Workflow > Actions), not in this file. */
  provider: "formspree",
  endpoint: "https://formspree.io/f/xgaokvad",
  accessKey: "",
  submitMode: "cors",

  /* Subject line of the notification e-mail. */
  emailSubject: "New Ecosystem Scouting submission",

  /* Submissions are accepted only when the form is served from these domains. */
  allowedHosts: ["startupscouters.github.io"],

  /* ---------- Classification ----------
     Strategic areas get a bonus in the fit score and are flagged for priority review.
     Valid ids: data_platforms, integration, semantic_kg, governance,
     security, analytics, ml_platform, genai, ai_governance, vertical_ai */
  strategicAreas: ["semantic_kg", "governance", "genai", "ai_governance"],

  /* Fit score thresholds (0-100) for the suggested action. */
  thresholds: { fastTrack: 65, review: 45 },

  /* ---------- Form behaviour ---------- */
  storageKey: "scouting-form-v1",   // localStorage key for autosave
  minSecondsBeforeSubmit: 20,       // anti-spam: reject submissions faster than this
  version: "1.0.0"                  // increase it when you change the questions
};
