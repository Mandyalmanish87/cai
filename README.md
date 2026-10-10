# CampusAI — Gemma 4 Local Hackathon MVP

A beginner-friendly student dashboard with:
- Task/deadline management (browser localStorage)
- Campus community posts (browser localStorage)
- AI Fresher Mentor
- Assignment notice extraction into structured JSON

## Stack
- Frontend: React + Vite
- Backend: Flask + Python
- AI: local Gemma 4 E4B through Ollama (no API token needed)
- Tasks and posts persist in the browser for this demo.

## Requirements
- Windows 10/11
- Python 3.10+
- Node.js 18+ and npm
- Ollama installed and `gemma4:e4b` downloaded (`ollama list` to check)

## 1. Run the AI model
Open PowerShell and run `ollama list`. Confirm `gemma4:e4b` appears. Ollama normally runs in the background. To test it, run:

```powershell
ollama run gemma4:e4b
```

Ask a question, then type `/bye`.

## 2. Run the backend
Open a VS Code terminal in the `backend` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python app.py
```

If PowerShell blocks activation, use `py -m pip install -r requirements.txt` and `py app.py` from the same folder instead. Backend: http://127.0.0.1:5000.

## 3. Run the frontend
Open a second VS Code terminal in the `frontend` folder:

```powershell
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## AI configuration
`backend/.env` defaults to:

```env
OLLAMA_URL=http://127.0.0.1:11434/api/chat
OLLAMA_TAGS_URL=http://127.0.0.1:11434/api/tags
OLLAMA_MODEL=gemma4:e4b
```

If `ollama list` displays a different exact model tag, change `OLLAMA_MODEL` in `.env`. No Hugging Face token is required.

## Demo flow
1. Ask the AI Mentor for a first-year study plan.
2. In Assignment AI, paste: `Engineering Chemistry assignment: Prepare a 2-page note on IR spectroscopy. Submit by 18 October 2026.`
3. Verify the extracted task and date before saving.
4. Add a Lost & Found or borrow/lend community post.

## Important demo notes
- This MVP does not connect to an official college ERP.
- Tasks and community posts are stored in the current browser only.
- AI-extracted dates and details must be checked by a student.
- Do not enter private student information.
