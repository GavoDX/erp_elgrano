export function exportCsv(filename: string, headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const content = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
