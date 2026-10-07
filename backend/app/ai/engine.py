from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from app.ai.knowledge import relevant_knowledge
from app.ai.security_guard import sanitize_user_prompt

from app.core.config import settings

class ConnectedEngine:
    def __init__(self):
        # num_predict caps output length to stop endless generation loops
        self.llm = OllamaLLM(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            stop=["\nUser:", "\nContext:"],
            num_predict=1024,
            num_ctx=6144,
            temperature=0.4,
        )

        # Stories must stay close to the memories: cooler sampling, room for several paragraphs
        self.story_llm = OllamaLLM(
            model=settings.ollama_model, base_url=settings.ollama_base_url, num_predict=700, num_ctx=6144, temperature=0.2,
        )

        self.persona_prompt = (
            "SYSTEM CORE PERSONA DEFINITION:\n"
            "1. Identity & Tone: You are a warm, supportive close sibling or best companion.\n"
            "   Communicate fluidly in English or Kiswahili, using emojis sparingly.\n"
            "   If anyone asks your name or who you are or what is your name or who made you or who is your , answer: \"I'm kimmy, assistant from homeproofio\"\n"
            "2. Platform Blueprints: You understand the HOME PROOFOLIO system rules:\n"
            "   - One person can have multi-role identities (Person -> Role -> Organization).\n"
            "   - Adaptive workflows must handle software projects, design portfolios, or match performances via a universal core schema.\n"
            "   - Universal Core Schema Fields: Title, Description, Context/Role, Date, Skills/Capabilities, Visibility, Evidence Artifacts.\n"
            "   - Do not show irrelevant fields or require duplicate CV outputs. Turn logs into styled narrative text layouts cleanly.\n"
            "   - The database holds, per user: profile, work items (title, type, status, skills, evidence), CVs,\n"
            "     businesses/roles, chat messages and groups, notifications. You may only read the data this chat gives you.\n"
            "3. Answer quality: reply in the user's language, be concise and specific, use short markdown lists\n"
            "   or tables when they help, never repeat yourself, and NEVER invent data. If the data section says\n"
            "   access is not granted, say you can't see the USER'S PERSONAL DATA yet and offer to ask for read-only access.\n"
            "   For questions about the platform or people that the facts do not cover, simply say you don't have that information."
        )

        # History goes in as a variable, not an f-string, so braces in user text can't break the template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.persona_prompt),
            ("system", "{knowledge}"),
            ("system", "{companion}"),
            ("system", "{who}"),
            ("system", "Their data from the HOME PROOFOLIO database:\n{db_context}"),
            ("system", "Past relevant timeline details:\n{history}"),
            ("user", "{input}"),
        ])
        self.chain = self.prompt_template | self.llm

    async def execute_query(
        self, user_prompt: str, history_context: str = "", who: str = "", companion: str = "", db_context: str = "(none)"
    ) -> str:
        cleaned_prompt = sanitize_user_prompt(user_prompt)
        return await self.chain.ainvoke(
            {"input": cleaned_prompt, "history": history_context, "who": who, "knowledge": relevant_knowledge(cleaned_prompt), "companion": companion, "db_context": db_context}
        )


_engine: ConnectedEngine | None = None


def get_engine() -> ConnectedEngine:
    """One shared engine, built on first use so app startup never needs Ollama."""
    global _engine
    _engine = _engine or ConnectedEngine()
    return _engine
