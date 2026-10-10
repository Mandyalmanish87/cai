import os
import json
import re
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_TAGS_URL = os.getenv("OLLAMA_TAGS_URL", "http://127.0.0.1:11434/api/tags")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")


def ask_model(system_prompt, user_prompt, max_tokens=500):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "options": {"temperature": 0.2, "num_predict": max_tokens},
            },
            timeout=180,
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"], None
    except requests.RequestException as exc:
        app.logger.warning("Ollama request failed: %s", exc)
        return None, "Gemma is unavailable. Make sure Ollama is running and the model is installed."
    except (KeyError, ValueError, TypeError):
        return None, "Gemma returned an unexpected response. Please try again."


@app.get("/api/health")
def health():
    installed = False
    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=2)
        response.raise_for_status()
        models = response.json().get("models", [])
        installed = any(
            item.get("name", "") == OLLAMA_MODEL
            or item.get("name", "").startswith(OLLAMA_MODEL + ":")
            for item in models
        )
    except (requests.RequestException, ValueError, TypeError):
        installed = False
    return jsonify({"ok": True, "aiConfigured": installed, "model": OLLAMA_MODEL})

@app.post("/api/mentor")
def mentor():
    body = request.get_json(silent=True) or {}
    question = str(body.get("question", "")).strip()
    if not question:
        return jsonify({"error": "Please enter a question."}), 400
    if len(question) > 3000:
        return jsonify({"error": "Please keep the question under 3000 characters."}), 400

    system = (
        "You are CampusAI, a friendly and practical college fresher mentor. "
        "Give concise, actionable advice in simple language. Do not invent official NIT Hamirpur rules, "
        "deadlines, room numbers, or contact details. If asked for official information not provided, "
        "say to verify with the official college website or administration. Use short bullets when helpful."
    )
    answer, error = ask_model(system, question, 450)
    if error:
        return jsonify({"error": error}), 503
    return jsonify({"answer": answer})

@app.post("/api/extract-assignment")
def extract_assignment():
    body = request.get_json(silent=True) or {}
    notice = str(body.get("notice", "")).strip()
    if not notice:
        return jsonify({"error": "Paste an assignment notice first."}), 400
    if len(notice) > 5000:
        return jsonify({"error": "Please keep the notice under 5000 characters."}), 400

    system = """You extract student assignment tasks from notices.
Return ONLY valid JSON, no markdown, with exactly these keys:
{"title":"short task title","subject":"subject or Unknown","dueDate":"YYYY-MM-DD or empty string if uncertain","details":"one-sentence summary"}
Do not guess missing dates. Use the year only if it is stated or unambiguous in the notice. If date is ambiguous, use empty string.
The current demo date is 2026-10-10."""
    content, error = ask_model(system, notice, 250)
    if error:
        return jsonify({"error": error}), 503

    # Be tolerant of code fences, but validate output before sending to UI.
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
    try:
        result = json.loads(cleaned)
        result = {
            "title": str(result.get("title", "Assignment task"))[:160],
            "subject": str(result.get("subject", "Unknown"))[:100],
            "dueDate": str(result.get("dueDate", ""))[:10],
            "details": str(result.get("details", ""))[:500],
        }
        if result["dueDate"] and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", result["dueDate"]):
            result["dueDate"] = ""
        return jsonify({"task": result, "verify": "Please verify the extracted details and date before saving."})
    except (json.JSONDecodeError, AttributeError):
        return jsonify({"error": "AI response wasn't valid JSON. Try again or enter the task manually."}), 502

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
