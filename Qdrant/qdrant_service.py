from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, Document
import os
from dotenv import load_dotenv

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    cloud_inference=True
)

# 🔹 INSERT DATA (INGESTION)
def insert_data(data):
    points = []

    for i, item in enumerate(data):
        points.append(
            PointStruct(
                id=i,
                payload=item,
                vector={
                    "text_vector": Document(
                        text=item["text"],
                        model="sentence-transformers/all-minilm-l6-v2"
                    )
                }
            )
        )

    client.upsert(
        collection_name="voxflow",
        points=points
    )


# 🔹 RETRIEVE DATA
def retrieve_context(query: str):
    results = client.query_points(
        collection_name="voxflow",
        query=Document(
            text=query,
            model="sentence-transformers/all-minilm-l6-v2"
        ),
        using="text_vector",
        limit=3
    )

    return [p.payload for p in results.points]