# 🌿 Harvest AI

An AI-powered mobile grocery assistant — chat, photo-to-list, price comparison, and Instacart deep-links. Runs as a PWA installable on your iPhone home screen.

## Features
- 💬 **AI Chat** — Ask about meals, substitutions, what to buy
- 📷 **Snap & List** — Take a photo of your fridge, get a grocery list
- 🛒 **Grocery List** — Offline-persisted, with Instacart deep-links per item
- 💰 **Price Compare** — Estimated prices across Kroger, Walmart, Whole Foods, Target

## Deploy to GitHub Pages (auto-deploys on every push)

### 1. Create a GitHub repo named `harvest-ai`

### 2. Push this code
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/harvest-ai.git
git push -u origin main
```

### 3. Enable GitHub Pages
- Go to your repo → **Settings** → **Pages**
- Under **Source**, select **GitHub Actions**
- Save — the workflow will auto-deploy on every push to `main`

### 4. Your app URL
```
https://YOUR_USERNAME.github.io/harvest-ai/
```

### 5. Install as PWA on iPhone
- Open the URL in **Safari**
- Tap **Share** → **Add to Home Screen**
- Done! Harvest AI is now an app on your phone.

## API Key
On first launch, the app will prompt you to enter your Anthropic API key.
Get one free at [console.anthropic.com](https://console.anthropic.com).
Your key is stored only in your browser's local storage — never on any server.

## Local development
```bash
npm install
npm run dev
```
