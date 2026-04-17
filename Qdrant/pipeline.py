from qdrant_service import insert_data
from mock import data

print("🚀 Inserting data into Qdrant...")

insert_data(data)

print("✅ Done. All data inserted.")