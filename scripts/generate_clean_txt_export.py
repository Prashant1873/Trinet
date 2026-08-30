"""
TRINET™ Clean Text Export Generator (Complete & Untruncated)
Extracts full, untruncated conversation history from transcript_full.jsonl.
Preserves all 24 points from initial prompt and full responses.
Demarcates Prompts and Responses with bold headers and horizontal divider lines.
Excludes tool/run commands, summary headers, emojis, and routine commit/push prompts.
Redacts sensitive API keys and tokens.
"""

import json
import os
import re

def sanitize_text(text):
    if not isinstance(text, str):
        return ""
    # Redact Apify tokens
    text = re.sub(r'apify_api_[A-Za-z0-9]+', '[REDACTED_APIFY_TOKEN]', text)
    # Redact generic Bearer/API keys
    text = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED_GOOGLE_API_KEY]', text)
    text = re.sub(r'(?:api[_-]?key|token|secret)[\s:=]+["\']?([a-zA-Z0-9_\-]{16,})["\']?', 'api_key: "[REDACTED]"', text, flags=re.IGNORECASE)
    return text

def is_commit_push_only(prompt):
    p = prompt.strip().lower()
    commit_phrases = [
        "commit and push",
        "commit and push.",
        "commit and push please",
        "commit & push",
        "push to git",
        "git push",
        "prepare export of this chat",
        "no need for summary headings or emojis. make a txt file of prompt and response, with clear demarcation using horizontal lines and bold text. remove all commit and push prompts and run commands.",
        "in first prompt after point 1 directly point 24 is coming"
    ]
    if p in commit_phrases:
        return True
    return False

def generate_clean_txt():
    transcript_path = r"C:\Users\u1233270\.gemini\antigravity-ide\brain\aa5bac27-4a4d-46c7-b841-c0ed71282564\.system_generated\logs\transcript_full.jsonl"
    output_path = r"c:\Users\u1233270\Downloads\MSME_FINDER\chat_export.txt"
    
    entries = []
    if os.path.exists(transcript_path):
        with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if line.strip():
                    try:
                        data = json.loads(line)
                        entries.append(data)
                    except Exception:
                        pass

    conversations = []
    current_prompt = None
    current_response_parts = []

    for item in entries:
        step_type = item.get("type", "")
        content = item.get("content", "")
        
        if step_type == "USER_INPUT" and content:
            clean_content = content
            if "<USER_REQUEST>" in clean_content:
                clean_content = clean_content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
            
            # Skip system checkpoints, errors, and system-injected messages
            if "{{ CHECKPOINT" in clean_content or clean_content.startswith("Error: request failed"):
                continue
            if "The USER performed the following action:" in clean_content and "<USER_REQUEST>" not in content:
                continue
                
            clean_content = sanitize_text(clean_content)
            
            # If there was a previous prompt + response, save it
            if current_prompt and current_response_parts:
                resp_text = "\n\n".join(current_response_parts).strip()
                if resp_text and not is_commit_push_only(current_prompt):
                    conversations.append((current_prompt, resp_text))
            
            current_prompt = clean_content
            current_response_parts = []
            
        elif step_type == "PLANNER_RESPONSE":
            if content and not content.startswith("```json"):
                # Clean out any emoji characters and sensitive tokens from response
                clean_resp = sanitize_text(content)
                emoji_pattern = re.compile("[\U00010000-\U0010ffff]", flags=re.UNICODE)
                clean_resp = emoji_pattern.sub("", clean_resp)
                symbols = ["🤖", "👤", "🔧", "✨", "🚀", "🧪", "•", "👉", "📍", "🗺️", "⚡", "🔍", "📊", "⚙️", "✅", "❌", "💡"]
                for s in symbols:
                    clean_resp = clean_resp.replace(s, "")
                
                clean_resp = clean_resp.strip()
                if clean_resp:
                    current_response_parts.append(clean_resp)

    # Save the last pair
    if current_prompt and current_response_parts:
        resp_text = "\n\n".join(current_response_parts).strip()
        if resp_text and not is_commit_push_only(current_prompt):
            conversations.append((current_prompt, resp_text))

    with open(output_path, 'w', encoding='utf-8') as out:
        for idx, (prompt, response) in enumerate(conversations):
            out.write(f"**Prompt:**\n{prompt}\n\n")
            out.write(f"**Response:**\n{response}\n\n")
            out.write("--------------------------------------------------------------------------------\n\n")

    print(f"Full untruncated clean text export generated successfully: {output_path} ({len(conversations)} conversation turns)")

if __name__ == '__main__':
    generate_clean_txt()
