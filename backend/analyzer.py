import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# We define a global variable to cache the client for performance
_cached_client = None

def get_client():
    global _cached_client
    if _cached_client is not None:
        return _cached_client
        
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing from environment or .env file")

    # This structure is better because it handles late-binding of env variables 
    # and allows for better error messages if the environment is not set up correctly.
    _cached_client = OpenAI(
        api_key=api_key,
        base_url=base_url,
    )
    return _cached_client

with open("taxonomy.json", "r") as f:
    TAXONOMY = json.load(f)

SYSTEM_PROMPT = f"""
You are an expert procurement and spend analysis assistant. 
Your task is to categorize invoice data into the provided taxonomy.

Taxonomy structure:
{json.dumps(TAXONOMY, indent=2)}

Guidelines:
- The taxonomy is structured into high-level pillars (Direct/Indirect), functional blocks (Goods/Services), and specific granular buckets.
- You MUST assign the spend to the most appropriate "bucket" (Level 3 or Level 4 depending on the path).
- Do NOT provide examples; provide the specific category names from the taxonomy.
- Provide a primary categorization and an alternative if there is ambiguity.

For each input record, you must provide:
1. Primary Categorization: Level 1, Level 2, Level 3, and Level 4 (if applicable).
2. Alternative Categorization: A plausible second choice with a brief reason.
3. Chain of Thought (Reasoning): 
   - Crisp, impactful, and professional. 
   - State exactly why the primary choice was made based on supplier, material, and description.
4. Confidence Level: High, Medium, or Low.

Output in JSON format:
{{
  "primary": {{
    "level1": "...",
    "level2": "...",
    "level3": "...",
    "level4": "..."
  }},
  "alternative": {{
    "level3": "...",
    "level4": "...",
    "reason": "..."
  }},
  "reasoning": "...",
  "confidence": "..."
}}
"""

def analyze_spend(supplier, material, description, amount):
    try:
        client = get_client()
        user_input = f"Supplier: {supplier}, Material: {material}, Description: {description}, Amount: {amount}"
        
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
        print(f"Error in spend analysis: {str(e)}")
        # Return a "fallback" object so the UI doesn't crash
        return {
            "primary": {
                "level1": "Error",
                "level2": "API Failure",
                "level3": "Check Configurations",
                "level4": ""
            },
            "alternative": None,
            "reasoning": f"Critical Error: {str(e)}. Ensure your .env has the correct API_KEY and BASE_URL.",
            "confidence": "None"
        }
