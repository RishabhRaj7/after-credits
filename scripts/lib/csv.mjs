/**
 * Minimal, correct-enough CSV reader/writer for tracker exports.
 * - Strips UTF-8 BOM (the real export has one — without stripping,
 *   the first header becomes "\uFEFFtype" and everything breaks).
 * - Handles quoted fields, embedded commas/quotes/newlines.
 */

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(text) {
  const src = stripBom(String(text));
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* swallow */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift()?.map((h) => h.trim()) ?? [];
  return rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(r[c])).join(','));
  return lines.join('\n') + '\n';
}
