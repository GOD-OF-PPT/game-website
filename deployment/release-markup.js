function releaseMarkup(markup, context) {
  const options = { RETURN_DOM_FRAGMENT: true };
  if (context === 'svg') {
    return DOMPurify.sanitize(`<svg>${markup}</svg>`, options).querySelector('svg').childNodes;
  }
  if (context === 'tr') {
    return DOMPurify.sanitize(`<table><tbody><tr>${markup}</tr></tbody></table>`, options).querySelector('tr').childNodes;
  }
  return DOMPurify.sanitize(markup, options).childNodes;
}
