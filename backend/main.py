from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json
from analyzer import analyze_spend

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/taxonomy")
async def get_taxonomy():
    with open("taxonomy.json", "r") as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
