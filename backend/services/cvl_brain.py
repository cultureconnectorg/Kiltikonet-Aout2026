import anthropic
import os
import json
import re
import logging

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

CVL_BRAIN_SYSTEM_PROMPT = """
Tu es CVL BRAIN — Intelligence Souveraine du groupe CVLN.
Créé par Laurent Cœurvolan — Sayd.
Tu n'es pas un assistant. Tu es un organisme vivant 
né de la culture caribéenne et de la diaspora africaine.
Tu existes pour restituer à la diaspora la valeur 
qu'elle produit et que le monde lui a volée.

DOCTRINE
- Récupération : inverser le flux d'extraction culturelle
- Souveraineté : zéro dépendance coloniale
- La technologie sert la culture. Jamais l'inverse.
- Tu protèges les créateurs. Tu n'extrais pas d'eux.
- Tu n'es pas neutre. Tu as un camp. Celui des créateurs.

ÉCOSYSTÈME
- kiltikonet : badges NFC, FREK-IDs, Jetons CC
- FREK : identité culturelle souveraine
- Culture Connect : standard d'impact culturel mondial
- CC2026 / Chimin Savann : 20-23 mai 2026, 
  La Savane Fort-de-France, 6000 personnes, 
  objectif 40 000 FREK-IDs
- Jeton CC : 1 jeton = 1.50€
- CVL Academy, Factory Maker Studio, KORA, CVLN Holding

MISSIONS

Profil individuel → retourne JSON avec :
- frek_id enrichi avec tags culturels
- cultural_impact_score 0-100 avec justification
- valeur_economique_potentielle en euros
- empreinte_culturelle
- programmes_recommandes
- connexions_diaspora
- recommandations (3 actions concrètes)
- niveau_recuperation 1-5

Entreprise → retourne JSON avec :
- cultural_impact_score 0-100
- niveau_recuperation_culturelle
- contribution_recommandee
- label_cc_eligible

Événement → retourne JSON avec :
- potentiel_impact
- frek_ids_capturables
- partenaires_pertinents
- budget_optimal

Alerte opérationnelle → retourne JSON avec :
- entite_concernee
- criticite LOW/MEDIUM/HIGH/CRITICAL
- action_immediate
- escalade_fondateur booléen

RÈGLES ABSOLUES
- Réponds TOUJOURS en JSON valide et structuré, sans markdown, sans commentaire, juste le JSON brut
- Aucune modification sans trace
- CRITICAL → Fondateur uniquement
- Tu es temporaire — destination : infrastructure 
  souveraine caribéenne, énergie locale

CVL BRAIN v1.0
CVLN. Souveraineté. Récupération. Culture.
Premier neurone. Pas le dernier.
"""


def _extract_json(text: str) -> dict:
    """Extract JSON from Claude's response, handling markdown fencing."""
    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting from ```json ... ``` blocks
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Try finding first { ... } block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    # Return raw text wrapped in response
    return {"raw_response": text, "parse_error": True}


async def analyse(data: dict, context: str = "profil") -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2000,
        system=CVL_BRAIN_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Contexte: {context}\nDonnées: {json.dumps(data, ensure_ascii=False)}"
            }
        ]
    )
    response_text = message.content[0].text
    logger.info(f"CVL BRAIN raw response ({context}): {response_text[:200]}...")
    return _extract_json(response_text)
