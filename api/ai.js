// Vercel serverless function: keeps the AI key on the server.
// Works with any OpenAI-compatible provider (Groq, OpenRouter, Cerebras, Mistral, ...).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const prompt = (req.body && req.body.prompt) || '';
  if (!prompt || prompt.length > 60000) return res.status(400).json({ error: 'Bad prompt' });
  if (!process.env.AI_API_KEY) return res.status(500).json({ error: 'Missing AI_API_KEY' });
  const base = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
  try {
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.AI_API_KEY },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'Reply with valid JSON only. No commentary and no markdown fences.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Upstream error' });
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'Request failed' });
  }
};
