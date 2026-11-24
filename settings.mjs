export const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/1ho0Vvv0qW75qonW0lAdTS8cbU-vRTdEDUZXTOKbmABQ/export?format=csv&gid=0';

export const groqWorkerUrl = 'https://riverwatch-groq.hgvantrang.workers.dev';

export function sheetCsvUrl(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') {
        throw new Error('Enter a Google Sheets sharing link or CSV URL.');
    }
    const match = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)\//);
    if (!match) throw new Error('Invalid Google Sheets URL.');
    if (match[1] === 'e') {
        if (!url.pathname.endsWith('/pub')) throw new Error('Enter the published CSV link.');
        url.searchParams.set('output', 'csv');
    } else {
        const fragment = new URLSearchParams(url.hash.slice(1));
        const gid = url.searchParams.get('gid') || fragment.get('gid') || '0';
        url.pathname = `/spreadsheets/d/${match[1]}/export`;
        url.search = new URLSearchParams({ format: 'csv', gid }).toString();
    }
    url.hash = '';
    return url.href;
}
