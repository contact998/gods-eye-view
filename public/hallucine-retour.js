// Hallucine: a way back to hallucinecran.* from the full-screen globe.
// Hidden in embed mode — the hallucinecran page around the frame has its own header.
(() => {
  const link = document.getElementById('hallucine-retour');
  if (!link) return;
  if (new URLSearchParams(location.search).get('embed') === '1') {
    link.remove();
    return;
  }
  try {
    const from = new URL(document.referrer);
    if (/(^|\.)hallucinecran\.(fr|com|de|es|it|pt)$/.test(from.hostname)) {
      link.href = from.origin + from.pathname;
    }
  } catch {
    // No referrer: keep the default home page.
  }
})();
