import pandas as pd
import os

data = [
    {"Invoice ID": "INV-001", "Supplier": "Steel Corp", "Material": "Steel Beams", "Amount": 5000, "Description": "Raw material for building A"},
    {"Invoice ID": "INV-002", "Supplier": "Apple Inc.", "Material": "MacBook Pro", "Amount": 2500, "Description": "Laptop for new developer"},
    {"Invoice ID": "INV-003", "Supplier": "Local Farmer", "Material": "Apples", "Amount": 50, "Description": "Fruit for the pantry"},
    {"Invoice ID": "INV-004", "Supplier": "AWS", "Material": "Cloud Hosting", "Amount": 1200, "Description": "Monthly subscription for production server"},
    {"Invoice ID": "INV-005", "Supplier": "Amazon", "Material": "Paper Clips", "Amount": 15, "Description": "Office stationery"},
    {"Invoice ID": "INV-006", "Supplier": "CleanIt", "Material": "Janitorial", "Amount": 300, "Description": "Weekly office cleaning service"},
    {"Invoice ID": "INV-007", "Supplier": "Global Tech", "Material": "Sensors", "Amount": 800, "Description": "Components for the new prototype"},
    {"Invoice ID": "INV-008", "Supplier": "IRS", "Material": "Corporate Tax", "Amount": 10000, "Description": "Annual tax payment"},
]

df = pd.DataFrame(data)
os.makedirs("samples", exist_ok=True)
df.to_excel("samples/sample_invoices.xlsx", index=False)
print("Sample file created at samples/sample_invoices.xlsx")
