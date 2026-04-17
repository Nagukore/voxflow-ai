from fastapi import FastAPI
from qdrant_service import retrieve_context
import requests

app = FastAPI()


# 🔹 LLM CALL (FIXED + STABLE)
def call_ollama(prompt):
    try:
        response = requests.post(
            "http://127.0.0.1:11434/api/chat",
            json={
                "model": "llama3",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False   # 🔥 IMPORTANT FIX
            }
        )

        data = response.json()

        return data.get("message", {}).get("content", None)

    except Exception as e:
        print("❌ Ollama HTTP failed:", e)
        return None


# 🔹 Categorize results
def categorize(results):
    blockers, decisions, deadlines = [], [], []

    for r in results:
        if r.get("type") == "blocker":
            blockers.append(r.get("text", ""))
        elif r.get("type") == "decision":
            decisions.append(r.get("text", ""))
        elif r.get("type") == "deadline":
            deadlines.append(r.get("text", ""))

    return blockers, decisions, deadlines


# 🔥 MAIN ENDPOINT
@app.get("/ask")
def ask_system(q: str):

    print("\n🔥 NEW REQUEST:", q)

    # 🔹 STEP 1: Intent understanding (optional but powerful)
    try:
        print("👉 Running intent model...")

        intent_prompt = f"""
        Convert the user query into a clean search query.

        Query: {q}

        Output only the refined query.
        """

        intent_response = call_ollama(intent_prompt)

        if intent_response:
            refined_query = intent_response.strip()
        else:
            refined_query = q

        print("✅ Refined Query:", refined_query)

    except Exception as e:
        print("❌ Intent failed:", e)
        refined_query = q


    # 🔹 STEP 2: Retrieve from Qdrant
    try:
        print("👉 Querying Qdrant...")

        results = retrieve_context(refined_query)

        print("✅ Retrieved:", results)

        if not results:
            return {
                "answer": "No relevant information found.",
                "context": []
            }

    except Exception as e:
        print("❌ Qdrant failed:", e)
        return {"error": f"Qdrant error: {str(e)}"}


    # 🔹 STEP 3: Build context
    context = "\n".join([r.get("text", "") for r in results])


    # 🔹 STEP 4: Final LLM reasoning
    try:
        print("👉 Running final LLM...")

        final_prompt = f"""
        Context:
        {context}

        Question:
        {q}

        Give a clear, concise answer.
        """

        answer = call_ollama(final_prompt)

        if not answer:
            answer = "Retrieved relevant information, but LLM response failed."

        print("✅ Answer generated")

    except Exception as e:
        print("❌ Final LLM failed:", e)
        answer = "LLM failed, but data retrieved."


    # 🔹 STEP 5: Categorize insights
    blockers, decisions, deadlines = categorize(results)


    return {
        "refined_query": refined_query,
        "answer": answer,
        "insights": {
            "blockers": blockers,
            "decisions": decisions,
            "deadlines": deadlines
        },
        "context": results
    }