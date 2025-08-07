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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = 10; // límite por defecto
    const result = await redisRequest(['ZREVRANGE', 'leaderboard', '0', (limit - 1).toString(), 'WITHSCORES']);
    
    const players = [];
    for (let i = 0; i < result.length; i += 2) {
      if (result[i] && result[i + 1] !== undefined) {
        players.push({
          username: result[i],
          score: parseInt(result[i + 1])
        });
      }
    }
    
    res.status(200).json(players);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}