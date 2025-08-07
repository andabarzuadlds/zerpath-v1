const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ✅ FUNCIÓN PARA REDIS (sin node-fetch, usando fetch nativo)
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

// Test endpoint
app.get('/api/test-redis', async (req, res) => {
  try {
    const result = await redisRequest(['PING']);
    res.json({ 
      success: true, 
      message: 'Redis conectado correctamente',
      ping: result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error conectando a Redis',
      details: error.message 
    });
  }
});

// Obtener récord de un jugador
app.get('/api/player/:username/record', async (req, res) => {
  try {
    const { username } = req.params;
    const score = await redisRequest(['GET', `player:${username}:highscore`]);
    const finalScore = score ? parseInt(score) : 0;
    res.json({ score: finalScore });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error getting player record',
      details: error.message 
    });
  }
});

// Guardar récord de un jugador
app.post('/api/player/:username/record', async (req, res) => {
  try {
    const { username } = req.params;
    const { score } = req.body;
    
    await redisRequest(['SET', `player:${username}:highscore`, score.toString()]);
    await redisRequest(['ZADD', 'leaderboard', score.toString(), username]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error setting player record',
      details: error.message 
    });
  }
});

// Obtener leaderboard
app.get('/api/leaderboard/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
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
    
    res.json(players);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error getting leaderboard',
      details: error.message 
    });
  }
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en puerto ${PORT}`);
  });
}

// Para Vercel
module.exports = app;