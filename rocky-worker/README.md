# Rocky chat proxy (Cloudflare Worker)

Rocky's chat box on the home page can talk through Groq. The website is
static, so the Groq API key cannot live in the site's code: anyone could copy
it. This tiny Worker keeps the key as an encrypted Cloudflare secret, adds
Rocky's persona prompt (`src/prompt.js`), and forwards chats to Groq.

If the Worker is not set up, or a request fails, Rocky falls back to his
built-in phrase matching.

## Deploy (one time, ~5 minutes)

You need a free Cloudflare account and a Groq API key (console.groq.com → API Keys).

```bash
cd rocky-worker
npx wrangler login                     # opens the browser to sign in to Cloudflare
npx wrangler secret put GROQ_API_KEY   # paste the Groq key when it asks
npx wrangler deploy                    # prints the Worker URL
```

`wrangler deploy` prints a URL like `https://rocky-chat.<your-subdomain>.workers.dev`.
Put it, plus `/chat`, in `_config.yml`:

```yaml
rocky_ai_url: "https://rocky-chat.<your-subdomain>.workers.dev/chat"
```

Commit and push; GitHub Pages rebuilds and Rocky is online.

## Settings

- `ALLOWED_ORIGINS` in `wrangler.toml`: the only sites allowed to use the
  Worker. Add an origin here if the site moves to a custom domain.
- `GROQ_MODEL` (optional var): defaults to `openai/gpt-oss-120b`. The faster,
  cheaper `openai/gpt-oss-20b` also works.
- Set a **spend limit** in the Groq console (Settings → Billing → Spend
  Limits). The Worker limits each visitor to 15 messages a minute, but a
  spend limit is the real safety net.

## Changing Rocky

- `src/prompt.js` → `SITE_CONTEXT`: what Rocky knows about the site and its owner.
- `src/prompt.js` → `SYSTEM_PROMPT`: his voice, lore, signature lines and gestures.

Redeploy after edits with `npx wrangler deploy`.
