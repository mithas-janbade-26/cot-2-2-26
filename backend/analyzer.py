import json
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)

with open("taxonomy.json", "r") as f:
    TAXONOMY = json.load(f)

SYSTEM_PROMPT = f"""
You are an expert procurement and spend analysis assistant. 
Your task is to categorize invoice data into the provided taxonomy.

Taxonomy structure:
{json.dumps(TAXONOMY, indent=2)}

For each input record, you must provide:
1. High-level category (Level 1)
2. Mid-level category (Level 2)
3. Specific category (Level 3 or Value)
4. Chain of Thought (Reasoning): Explain why you chose this category. 
   - CRITICAL: If the case is ambiguous or if there's a reason you might be wrong, state it clearly. 
   - Highlight conflicting keywords (e.g., if the supplier suggests one thing but the description suggests another).
5. Confidence Level: High, Medium, or Low.

Output in JSON format:
{{
  "level1": "...",
  "level2": "...",
  "level3": "...",
  "reasoning": "...",
  "confidence": "..."
}}
"""

def analyze_spend(supplier, material, description, amount):
    user_input = f"Supplier: {supplier}, Material: {material}, Description: {description}, Amount: {amount}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")
        # Return a "fallback" object so the UI doesn't crash
        return {
            "level1": "Error",
            "level2": "API Failure",
            "level3": "Check Logs",
            "reasoning": f"Critical Error: {str(e)}. This often happens with API Gateways if the Base URL or API Key is incorrect, or if the Gateway requires specific headers.",
            "confidence": "None"
        }
