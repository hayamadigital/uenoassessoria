import { readFile, writeFile } from 'node:fs/promises'
const source = new URL('../packages/utils/src/privacy-policy.json', import.meta.url)
const policy = JSON.parse(await readFile(source, 'utf8'))
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const sections = policy.sections.map(({title, body}) => `<section><h2>${escape(title)}</h2><p>${escape(body)}</p></section>`).join('')
await writeFile(new URL('../apps/web/public/privacidade.html', import.meta.url), `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Política de privacidade | ${escape(policy.organization)}</title><style>body{font-family:system-ui,sans-serif;color:#17233b;background:#f7f8fb;line-height:1.65;margin:0}main{max-width:760px;margin:0 auto;padding:48px 24px}h1{font-size:2rem;line-height:1.2}h2{font-size:1.2rem}section{margin-top:32px}a{color:#1836ab}</style></head><body><main><h1>Política de privacidade</h1><p>${escape(policy.organization)} · Atualizada em ${escape(policy.updatedAt)}</p>${sections}<p><a href="/">Voltar ao app web</a></p></main></body></html>
`)
