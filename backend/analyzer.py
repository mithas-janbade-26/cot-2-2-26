import json
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
4. Chain of Thought (Reasoning): Explain why you chose this category, especially if there are ambiguities. 

Focus on the Chain of Thought. If a supplier name or material is ambiguous (e.g., 'Apple' could be electronics or fruit), use the description and context to decide.

Output in JSON format:
{{
  "level1": "...",
  "level2": "...",
  "level3": "...",
  "reasoning": "..."
}}
"""

def analyze_spend(supplier, material, description, amount):
    user_input = f"Supplier: {supplier}, Material: {material}, Description: {description}, Amount: {amount}"
    
    response = client.chat.completions.create(
        model="gpt-4o", # Using gpt-4o for better CoT
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
