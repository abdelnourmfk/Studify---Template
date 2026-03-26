const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Basic AI proxy endpoint that forwards chat requests to OpenAI's Chat Completions API.
// Requires environment variables: OPENAI_API_KEY and optional OPENAI_MODEL (defaults to gpt-5-mini).
router.post('/proxy', verifyToken, async (req, res) => {
  const { prompt, messages, model, max_tokens, temperature } = req.body;

  if (!prompt && !messages) {
    return res.status(400).json({ error: 'Missing prompt or messages in request body' });
  }

  // Validate max_tokens
  const maxTokens = Math.min(max_tokens || 512, 4096);

  // Validate message length
  const totalLength = (messages || [{ content: prompt }]).reduce(
    (acc, msg) => acc + (msg.content || '').length,
    0
  );
  if (totalLength > 10000) {
    return res.status(400).json({ error: 'Total message length exceeds the limit of 10000 characters.' });
  }

  const modelName = model || process.env.OPENAI_MODEL || 'gpt-5-mini';

  try {
    const payload = {
      model: modelName,
      messages: messages || [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: typeof temperature === 'number' ? temperature : 0.2
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'OpenAI API error', details: text });
    }

    const data = await response.json();
    return res.json({ data });
  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'AI proxy failed', details: err.message });
  }
});

module.exports = router;
