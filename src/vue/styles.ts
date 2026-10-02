import css from '../style.css?raw'

export const STYLE_ID = 'risklight-modal-styles'

export const MODAL_CSS: string = css

export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = MODAL_CSS
  doc.head.prepend(style)
}
