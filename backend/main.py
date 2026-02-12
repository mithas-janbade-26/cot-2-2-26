from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io
import json
import requests
from urllib.parse import unquote, urlparse, parse_qs
from html.parser import HTMLParser
from analyzer import analyze_spend, chat_about_item

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    supplier: str
    material: str
    description: str
    amount: float
    reasoning: str
    messages: List[ChatMessage]


class SearchRequest(BaseModel):
    query: str


@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    results = []
    # Limit to first 10 rows for demo/speed
    for index, row in df.head(10).iterrows():
        analysis = analyze_spend(
            row.get("Supplier", ""),
            row.get("Material", ""),
            row.get("Description", ""),
            row.get("Amount", 0)
        )
        results.append({
            "id": index,
            "original": row.to_dict(),
            "analysis": analysis
        })
    
    return results


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """Chat with the AI about a specific spend item's categorization."""
    try:
        response = chat_about_item(
            supplier=req.supplier,
            material=req.material,
            description=req.description,
            amount=req.amount,
            reasoning=req.reasoning,
            messages=[(m.role, m.content) for m in req.messages],
        )
        return {"reply": response}
    except Exception as e:
        return {"reply": f"Error: {str(e)}"}


class DDGLiteParser(HTMLParser):
    """Parse DuckDuckGo Lite HTML to extract search results."""

    def __init__(self):
        super().__init__()
        self.results = []
        self._current = {}
        self._in_link = False
        self._in_snippet = False
        self._text = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and "result-link" in a.get("class", ""):
            self._in_link = True
            self._current = {"href": a.get("href", ""), "title": "", "body": ""}
            self._text = ""
        if tag == "td" and "result-snippet" in a.get("class", ""):
            self._in_snippet = True
            self._text = ""

    def handle_endtag(self, tag):
        if tag == "a" and self._in_link:
            self._current["title"] = self._text.strip()
            self._in_link = False
        if tag == "td" and self._in_snippet:
            self._current["body"] = self._text.strip()
            self._in_snippet = False
            if self._current.get("title") and self._current.get("href"):
                self.results.append(self._current)
            self._current = {}

    def handle_data(self, data):
        if self._in_link or self._in_snippet:
            self._text += data


def _clean_ddg_url(raw: str) -> str:
    """Extract the actual destination URL from a DDG redirect link."""
    if "uddg=" in raw:
        parsed = parse_qs(urlparse(raw).query)
        return unquote(parsed.get("uddg", [raw])[0])
    return raw


@app.post("/search")
async def search_endpoint(req: SearchRequest):
    """Search the web for supplier/material information via DuckDuckGo Lite."""
    try:
        resp = requests.get(
            "https://lite.duckduckgo.com/lite/",
            params={"q": req.query},
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
            timeout=15,
        )
        resp.raise_for_status()

        parser = DDGLiteParser()
        parser.feed(resp.text)

        results = []
        for r in parser.results[:8]:
            results.append({
                "title": r["title"],
                "body": r["body"],
                "href": _clean_ddg_url(r["href"]),
            })

        return {"results": results}
    except Exception as e:
        return {"results": [], "error": str(e)}


@app.get("/taxonomy")
async def get_taxonomy():
    with open("taxonomy.json", "r") as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
