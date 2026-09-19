'use strict';

function parseCsv(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field !== '' || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const nonEmpty = rows.filter(item => item.some(value => value.trim() !== ''));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty.shift().map(value => value.trim());
  if (headers.some(value => !value)) throw new Error('CSV headers cannot be blank.');
  if (new Set(headers.map(value => value.toLowerCase())).size !== headers.length) throw new Error('CSV headers must be unique.');
  return nonEmpty.map((values, index) => {
    if (values.length > headers.length) throw new Error(`CSV row ${index + 2} contains too many columns.`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
  });
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function stringifyCsv(records) {
  if (!Array.isArray(records) || !records.length) return '';
  const headers = [...new Set(records.flatMap(record => Object.keys(record || {})))];
  return '\uFEFF' + [headers.map(csvCell).join(','), ...records.map(record => headers.map(header => csvCell(record?.[header])).join(','))].join('\r\n');
}

module.exports = { parseCsv, stringifyCsv };
