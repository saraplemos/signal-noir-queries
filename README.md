# Signal Noir™ — AI Citation Testing Tool

Internal tool for Spotlight Communications × Lemonade Fizz.

---

## Deploy to Vercel (one-time setup)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial Signal Noir deploy"
```
Create a new **private** repo on GitHub and push to it.

### 2. Import to Vercel
- Go to [vercel.com](https://vercel.com) → New Project
- Import your GitHub repo
- Framework: **Next.js** (auto-detected)
- Click Deploy (it will fail — that's fine, env vars needed next)

### 3. Set Environment Variables
In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `USER_1_NAME` | `Sara` |
| `USER_1_PASSWORD` | your chosen password |
| `USER_2_NAME` | `Maria` |
| `USER_2_PASSWORD` | your chosen password |
| `USER_3_NAME` | `Clas` |
| `USER_3_PASSWORD` | your chosen password |
| `ANTHROPIC_API_KEY` | your Anthropic API key |
| `OPENAI_API_KEY` | your OpenAI API key |
| `PERPLEXITY_API_KEY` | your Perplexity API key |
| `GEMINI_API_KEY` | your Google AI Studio API key |
| `GOOGLE_SHEET_ID` | `1yk4-EQqTHWGRL0AzUhahjzF2WswSLHvwmThDHWlu9ak` |
| `GOOGLE_SHEET_TAB` | `Signal Noir Results` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `signalnoirqueriessearch@signalnoir.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Paste the full private key from the JSON file — keep all `\n` as literal `\n` |

> **GOOGLE_PRIVATE_KEY tip:** In the JSON file it looks like `"-----BEGIN PRIVATE KEY-----\nMIIE..."`.
> Paste that entire value including the `-----BEGIN` and `-----END` lines.
> Vercel stores it correctly. Do NOT convert `\n` to actual newlines.

### 4. Redeploy
After adding env vars → Vercel → Deployments → Redeploy.

### 5. Share your Google Sheet
Make sure your Sheet is shared with:
`signalnoirqueriessearch@signalnoir.iam.gserviceaccount.com` as **Editor**.
The tool will auto-create the header row on first use.

---

## Google Sheet schema (auto-created)

| Timestamp | Tester | Session ID | Property | Destination | Persona | Category | Query | Platform | Cited | Sources |

Each test result appends one row in real time as it completes.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Adding new testers

In Vercel env vars, add:
- `USER_4_NAME` = `NewPerson`
- `USER_4_PASSWORD` = `theirpassword`

Redeploy. Done.

---

## API keys needed

- **Anthropic:** [console.anthropic.com](https://console.anthropic.com)
- **OpenAI:** [platform.openai.com](https://platform.openai.com)
- **Perplexity:** [perplexity.ai/settings/api](https://perplexity.ai/settings/api)
- **Gemini:** [aistudio.google.com](https://aistudio.google.com) → Get API Key
