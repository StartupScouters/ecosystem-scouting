/* ============================================================
   Ecosystem Scouting, site configuration
   This is the ONLY file you need to edit to go live.
   See README.md for a step-by-step guide.
   ============================================================ */
window.SCOUTING_CONFIG = {

  /* Public URL of the site once published on GitHub Pages.
     Format: https://<org-or-user>.github.io/<repo>/  (trailing slash) */
  siteUrl: "https://YOUR-ORG.github.io/ecosystem-scouting/",

  /* Mailbox of the scouting team. Used in the footer, in the exit screens,
     and as the destination of the e-mail fallback when no backend is set. */
  contactEmail: "ecosystem.scouting@example.com",

  /* Promised response time shown to vendors (business days). */
  responseDays: 10,

  /* ---------- Submission backend ----------
     The site is static (GitHub Pages has no server), so submissions are
     sent to a form backend. Pick ONE provider and fill endpoint/accessKey.

     provider:  "web3forms" | "formspree" | "custom" | "mailto"
       web3forms : free, no account needed. Get a key at https://web3forms.com
                   -> endpoint stays "https://api.web3forms.com/submit",
                      put the key in accessKey.
       formspree : free tier, account needed. https://formspree.io
                   -> endpoint = "https://formspree.io/f/XXXXXXXX"
       custom    : any HTTP endpoint that accepts a JSON POST
                   (Power Automate "When an HTTP request is received",
                    Google Apps Script web app, your own API).
                   Set submitMode to "no-cors" if the endpoint does not
                   return CORS headers (Power Automate, Apps Script).
       mailto    : no backend. The vendor's e-mail client opens with the
                   summary pre-filled. Works everywhere, but depends on the
                   vendor actually sending the e-mail. Fine for a pilot. */
  provider: "mailto",
  endpoint: "https://api.web3forms.com/submit",
  accessKey: "",
  submitMode: "cors",

  /* Subject line of the notification e-mail (providers that support it). */
  emailSubject: "New Ecosystem Scouting submission",

  /* Allowed origin check: when set, submissions are blocked if the page
     is served from another domain (protects against copies of the form).
     Leave empty to allow any origin (useful while testing locally). */
  allowedHosts: [],

  /* ---------- Classification ----------
     Product areas the practice considers strategic right now. They get a
     bonus in the fit score and are flagged for fast-track review.
     Valid ids: data_platforms, integration, semantic_kg, governance,
     security, analytics, ml_platform, genai, ai_governance, vertical_ai */
  strategicAreas: ["semantic_kg", "governance", "genai", "ai_governance"],

  /* Fit score thresholds (0-100) for the recommended action. */
  thresholds: { fastTrack: 65, review: 45 },

  /* ---------- Form behaviour ---------- */
  storageKey: "scouting-form-v1",   // localStorage key for autosave
  minSecondsBeforeSubmit: 20,       // anti-spam: reject submissions faster than this
  version: "1.0.0"
};
