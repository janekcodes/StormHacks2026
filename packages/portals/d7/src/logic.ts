export type WebMode = '1991' | '2026'

export interface WebStats {
  app: string
  url: string
  weight: string
  requests: string
  js: string
  css: string
  http: string
}

const STATS: Record<WebMode, WebStats> = {
  '1991': {
    app: 'WorldWideWeb',
    url: 'http://info.museum/hypertext/WWW.html',
    weight: '~2 KB',
    requests: '1',
    js: '0 KB',
    css: 'none',
    http: 'GET /hypertext/WWW.html\n\n<TITLE>World Wide Web</TITLE>\n<H1>World Wide Web</H1>\n...  (HTTP/0.9: no headers, no status, just HTML)'
  },
  '2026': {
    app: 'Browser 2026',
    url: 'https://open-encyclopedia.example/wiki/World_Wide_Web',
    weight: '2.56 MB',
    requests: '75',
    js: '632 KB',
    css: 'yes',
    http: 'GET /wiki/World_Wide_Web HTTP/2\nHost: open-encyclopedia.example\nAccept-Encoding: br, gzip\n...  then 74 more requests'
  }
}

export function webStats(mode: WebMode): WebStats {
  return STATS[mode]
}

export function toggleMode(mode: WebMode): WebMode {
  return mode === '1991' ? '2026' : '1991'
}
