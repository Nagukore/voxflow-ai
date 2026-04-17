import requests

queries = [
    "what is blocking the project",
    "what decisions were made",
    "any deadlines coming up"
]

for q in queries:
    print("\n🔍 Query:", q)

    response = requests.get(f"http://127.0.0.1:8000/ask?q={q}")

    print("Status Code:", response.status_code)
    print("Raw Response:", response.text)   # 👈 IMPORTANT DEBUG

    try:
        data = response.json()
        print("🧠 Answer:", data.get("answer"))
    except:
        print("❌ Not JSON response")