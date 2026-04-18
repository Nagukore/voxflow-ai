from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem


OUTPUT_FILE = "VoxFlow_TechStack_Presentation.pdf"


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    subtitle_style = styles["Heading2"]
    normal = styles["BodyText"]
    normal.spaceAfter = 6

    small = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontSize=10,
        textColor=colors.grey,
    )

    story = []

    story.append(Paragraph("VoxFlow - Tech Stack Overview", title_style))
    story.append(Paragraph("Presentation-ready summary", small))
    story.append(Spacer(1, 16))

    story.append(Paragraph("1) Product Summary", subtitle_style))
    story.append(
        Paragraph(
            "VoxFlow is a voice-first AI assistant with an orchestrator backend, semantic retrieval, and real-time voice interaction.",
            normal,
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("2) Frontend", subtitle_style))
    frontend_points = [
        "Vite-based web app for fast development and builds.",
        "Vanilla JavaScript UI under src/ with conversation and voice controls.",
        "Browser Speech APIs and Vapi Web SDK integration for voice UX.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(p, normal)) for p in frontend_points],
            bulletType="bullet",
            leftPadding=16,
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("3) Backend / Orchestration", subtitle_style))
    backend_points = [
        "Node.js + Express API server (server/index.js).",
        "Pipeline: Intent Detection -> Query Classification -> Tool Routing -> Response Generation.",
        "Supports retrieval, reasoning, and action-oriented workflows.",
        "CORS and dotenv-based configuration support.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(p, normal)) for p in backend_points],
            bulletType="bullet",
            leftPadding=16,
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("4) AI + Voice + Retrieval", subtitle_style))
    ai_points = [
        "Google Gemini: generation and embedding integration.",
        "Qdrant vector database for semantic retrieval.",
        "Python FastAPI service (qdrant/main.py) for retrieval and fallback logic.",
        "Direct Qdrant path + Python backend path + in-memory fallback resilience.",
        "Vapi for production-grade voice interaction.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(p, normal)) for p in ai_points],
            bulletType="bullet",
            leftPadding=16,
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("5) Key Libraries", subtitle_style))
    libs_points = [
        "Frontend/Node: express, dotenv, @google/generative-ai, @qdrant/js-client-rest, @vapi-ai/web.",
        "Dev tooling: vite, nodemon, concurrently, kill-port.",
        "Python: fastapi, uvicorn, qdrant-client, python-dotenv, requests.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(p, normal)) for p in libs_points],
            bulletType="bullet",
            leftPadding=16,
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("6) Runtime Ports", subtitle_style))
    story.append(Paragraph("Frontend: 5173 | Backend API: 3001 | Python Retrieval API: 8001", normal))
    story.append(Spacer(1, 8))

    story.append(Paragraph("7) Architecture Snapshot", subtitle_style))
    story.append(
        Paragraph(
            "User (Voice/Text) -> Frontend (Vite) -> Node Orchestrator (Express) -> Retrieval Layer (Qdrant/Python) -> Response Generator -> Voice/Text Output",
            normal,
        )
    )

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(f"Generated {OUTPUT_FILE}")
