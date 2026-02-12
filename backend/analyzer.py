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
- For the alternative, you MUST provide the FULL taxonomy path (level1 through level4) so we can compare divergence.

For each input record, you must provide:
1. Primary Categorization: Level 1, Level 2, Level 3, and Level 4 (if applicable).
2. Alternative Categorization: The full taxonomy path (level1, level2, level3, level4) of a plausible second choice, with a brief reason.
   - If no plausible alternative exists, set alternative to null.
3. Chain of Thought (Reasoning): 
   - Crisp, impactful, and professional. 
   - State exactly why the primary choice was made based on supplier, material, and description.

Output in JSON format:
{{
  "primary": {{
    "level1": "...",
    "level2": "...",
    "level3": "...",
    "level4": "..."
  }},
  "alternative": {{
    "level1": "...",
    "level2": "...",
    "level3": "...",
    "level4": "...",
    "reason": "..."
  }},
  "reasoning": "..."
}}
"""


def compute_confidence(primary, alternative):
    """
    Compute confidence based on how early the primary and alternative categories diverge.
    
    The logic: the earlier (higher in hierarchy) the divergence, the lower the confidence,
    because it means even the broad category is ambiguous.
    
    - No alternative at all        → High  (AI found no plausible second choice)
    - Diverge at level 4 only      → High  (agree on broad category, differ on fine detail)
    - Diverge at level 3            → Medium (same functional block, different bucket)
    - Diverge at level 2            → Low   (different functional block, e.g. Goods vs Services)
    - Diverge at level 1            → Low   (entirely different pillar, e.g. Direct vs Indirect)
    
    Returns: (confidence_label, divergence_detail)
    """
    if not alternative or not isinstance(alternative, dict):
        return "High", "No plausible alternative — single clear category"

    levels = ["level1", "level2", "level3", "level4"]
    
    for i, level in enumerate(levels):
        p_val = (primary.get(level) or "").strip().lower()
        a_val = (alternative.get(level) or "").strip().lower()
        
        # Skip if both are empty (level4 may not exist for some paths)
        if not p_val and not a_val:
            continue
        
        if p_val != a_val:
            diverge_level = i + 1  # 1-indexed
            
            if diverge_level <= 2:
                label = "Low"
            elif diverge_level == 3:
                label = "Medium"
            else:
                label = "High"
            
            detail = f"Diverges at Level {diverge_level} ({levels[i]}): primary='{primary.get(level)}' vs alt='{alternative.get(level)}'"
            return label, detail
    
    # If we get here, primary and alternative are identical at all levels
    return "High", "Primary and alternative categories are identical"

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
        result = json.loads(response.choices[0].message.content)
        
        # Override confidence with deterministic divergence-based score
        primary = result.get("primary", {})
        alternative = result.get("alternative")
        confidence, divergence_detail = compute_confidence(primary, alternative)
        
        result["confidence"] = confidence
        result["confidence_reason"] = divergence_detail
        
        return result
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
            "confidence": "None",
            "confidence_reason": "Error in analysis"
        }


CHAT_SYSTEM_PROMPT = """You are an expert procurement and spend analysis assistant engaged in a conversation about a specific spend item.

You previously analyzed this item and provided categorization reasoning. The user may ask follow-up questions, challenge your categorization, request you to reconsider, or ask for more detail.

Be concise, professional, and helpful. If the user suggests a different categorization, evaluate it honestly and explain whether it's valid. If you agree with the user's suggestion, clearly state the updated categorization.

Keep responses focused and under 200 words unless more detail is specifically requested."""


def chat_about_item(supplier, material, description, amount, reasoning, messages):
    """Continue a conversation about a specific spend item's categorization."""
    try:
        client = get_client()
        
        context = f"""Item context:
- Supplier: {supplier}
- Material: {material}
- Description: {description}
- Amount: {amount}

Your original reasoning/categorization:
{reasoning}"""

        chat_messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": context},
            {"role": "assistant", "content": f"I've reviewed this item. {reasoning}"},
        ]
        
        # Add the conversation history
        for role, content in messages:
            chat_messages.append({"role": role, "content": content})
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=chat_messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return f"Error: {str(e)}"
