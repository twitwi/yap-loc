export function safeHTMLText(txt: string) {
  return new Option(txt).innerHTML;
}
