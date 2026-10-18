const GL_FAILURE = /(?:WebGL[^\n]*(?:error|invalid|failed|lost|warning)|GL_(?:INVALID|OUT_OF_MEMORY)[A-Z0-9_]*|shader[^\n]*(?:error|failed)|context[^\n]*lost)/i;

module.exports = function attachBrowserDiagnostics(page, report, scope) {
  report.errors ??= [];
  report.glErrors ??= [];
  page.on('pageerror', error => report.errors.push(`${scope}: ${error.stack || error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (GL_FAILURE.test(text)) report.glErrors.push({ scope, type: message.type(), text });
  });
};