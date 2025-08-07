const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisRequest(command) {
  try {
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Redis request failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    if (req.method === 'GET') {
      // Obtener récord del jugador
      const score = await redisRequest(['GET', `player:${username}:highscore`]);
      const finalScore = score ? parseInt(score) : 0;
      return res.status(200).json({ score: finalScore });
    }

    if (req.method === 'POST') {
      // Guardar récord del jugador
      const { score } = req.body;
      
      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Valid score is required' });
      }
      
      await redisRequest(['SET', `player:${username}:highscore`, score.toString()]);
      await redisRequest(['ZADD', 'leaderboard', score.toString(), username]);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}