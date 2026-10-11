import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function siteMetadataPlugin(siteUrl: string | undefined): Plugin {
  let command: 'build' | 'serve' = 'serve'
  let outputDir = ''

  return {
    name: 'kavenza-site-metadata',
    configResolved(config) {
      command = config.command
      outputDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!siteUrl) return html

        return {
          html,
          tags: [
            { tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' },
            {
              tag: 'meta',
              attrs: { property: 'og:image', content: `${siteUrl}/og-image.png` },
              injectTo: 'head',
            },
            {
              tag: 'meta',
              attrs: { property: 'og:image:alt', content: 'KAVENZA — AI, Software & Digital Products' },
              injectTo: 'head',
            },
            {
              tag: 'meta',
              attrs: { name: 'twitter:image', content: `${siteUrl}/og-image.png` },
              injectTo: 'head',
            },
          ],
        }
      },
    },
    closeBundle() {
      if (command !== 'build') return

      mkdirSync(outputDir, { recursive: true })
      const sitemapPath = resolve(outputDir, 'sitemap.xml')
      const robotsLines = ['User-agent: *', 'Allow: /']

      if (siteUrl) {
        robotsLines.push(`Sitemap: ${siteUrl}/sitemap.xml`)
        writeFileSync(
          sitemapPath,
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            `  <url><loc>${siteUrl}/</loc></url>`,
            '</urlset>',
            '',
          ].join('\n'),
        )
      } else {
        rmSync(sitemapPath, { force: true })
        console.warn('SITE_URL is unset or a placeholder; canonical URL, absolute social image URLs, and sitemap are omitted.')
      }

      writeFileSync(resolve(outputDir, 'robots.txt'), `${robotsLines.join('\n')}\n`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawSiteUrl = (process.env.SITE_URL || env.SITE_URL || '').trim()
  const isPlaceholder = rawSiteUrl.toUpperCase().includes('YOUR-KAVENZA-DOMAIN.COM')
  let siteUrl: string | undefined

  if (rawSiteUrl && !isPlaceholder) {
    const parsedSiteUrl = new URL(rawSiteUrl)
    if (
      parsedSiteUrl.protocol !== 'https:' ||
      parsedSiteUrl.pathname !== '/' ||
      parsedSiteUrl.search ||
      parsedSiteUrl.hash ||
      parsedSiteUrl.username ||
      parsedSiteUrl.password
    ) {
      throw new Error('SITE_URL must be an absolute HTTPS site origin, such as https://your-domain.com')
    }
    siteUrl = parsedSiteUrl.origin
  }

  if (isPlaceholder) {
    console.warn('SITE_URL is still the .env.example placeholder; production URL metadata and sitemap will be omitted.')
  }

  return {
    plugins: [react(), tailwindcss(), siteMetadataPlugin(siteUrl)],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
  }
})
