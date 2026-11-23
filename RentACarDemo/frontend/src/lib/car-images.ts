/**
 * Presentation-layer vehicle imagery.
 *
 * The backend intentionally has no image column, so images are resolved from
 * the car's model (with the name as a fallback). All assets are local; replace
 * the files in public/images/cars without touching any component.
 */

const FALLBACK = '/images/cars/lambo2.jpg'

const RULES: Array<{ pattern: RegExp; src: string }> = [
  { pattern: /\b(m3|m4|m5|rs[3-7]|amg|gt|coupe|sport|supra|mustang)\b/i, src: '/images/cars/sports.png' },
  { pattern: /\b(model\s*3|model\s*y|tesla|ev|electric|ioniq|leaf)\b/i, src: '/images/cars/ev.png' },
  { pattern: /\b(suv|x[1-7]|q[3-8]|rav4|cr-v|tucson|santa\s*fe)\b/i, src: '/images/cars/suv.png' },
  { pattern: /\b(corolla|civic|a3|a4|sedan|accord|elantra|city)\b/i, src: '/images/cars/sedan.png' },
]

export function carImage(model?: string | null, name?: string | null): string {
  const haystack = `${model ?? ''} ${name ?? ''}`.trim()
  if (!haystack) {
    return FALLBACK
  }

  return RULES.find((rule) => rule.pattern.test(haystack))?.src ?? FALLBACK
}
