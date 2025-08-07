const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ✅ VERIFICAR CONFIGURACIÓN AL INICIO
if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('❌ Error: Variables de entorno de Redis no configuradas');
  console.error('REDIS_URL:', REDIS_URL ? 'Configurado' : 'NO CONFIGURADO');
  console.error('REDIS_TOKEN:', REDIS_TOKEN ? 'Configurado' : 'NO CONFIGURADO');
  process.exit(1);
}

// Función para hacer requests a Redis
async function redisRequest(command) {
  try {
    console.log(`🔗 Ejecutando comando Redis:`, command);
    
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Redis HTTP Error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Redis response:`, data);
    return data.result;
  } catch (error) {
    console.error('❌ Redis request failed:', error);
    throw error;
  }
}

// Test endpoint
app.get('/api/test-redis', async (req, res) => {
  try {
    console.log('🧪 Probando conexión a Redis...');
    const result = await redisRequest(['PING']);
    res.json({ 
      success: true, 
      message: 'Redis conectado correctamente',
      ping: result 
    });
  } catch (error) {
    console.error('❌ Test Redis falló:', error);
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
    console.log(`📊 Obteniendo récord para: ${username}`);
    
    const score = await redisRequest(['GET', `player:${username}:highscore`]);
    const finalScore = score ? parseInt(score) : 0;
    
    console.log(`✅ Récord obtenido: ${finalScore}`);
    res.json({ score: finalScore });
  } catch (error) {
    console.error(`❌ Error obteniendo récord para ${req.params.username}:`, error);
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
    
    console.log(`💾 Guardando récord: ${username} = ${score}`);
    
    await redisRequest(['SET', `player:${username}:highscore`, score.toString()]);
    await redisRequest(['ZADD', 'leaderboard', score.toString(), username]);
    
    console.log(`✅ Récord guardado exitosamente`);
    res.json({ success: true });
  } catch (error) {
    console.error(`❌ Error guardando récord para ${req.params.username}:`, error);
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
    console.log(`🏆 Obteniendo leaderboard (límite: ${limit})`);
    
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
    
    console.log(`✅ Leaderboard obtenido: ${players.length} jugadores`);
    res.json(players);
  } catch (error) {
    console.error('❌ Error obteniendo leaderboard:', error);
    res.status(500).json({ 
      error: 'Error getting leaderboard',
      details: error.message 
    });
  }
});

// ✅ VERIFICAR CONEXIÓN A REDIS AL INICIAR
async function testRedisConnection() {
  try {
    console.log('🔄 Verificando conexión a Redis...');
    const result = await redisRequest(['PING']);
    console.log('✅ Redis conectado exitosamente:', result);
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a Redis:', error.message);
    return false;
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Servidor Express corriendo en puerto ${PORT}`);
  console.log(`📊 Redis URL: ${REDIS_URL}`);
  console.log(`🔑 Redis Token: ${REDIS_TOKEN ? 'Configurado' : 'No configurado'}`);
  
  // Verificar conexión a Redis
  const isRedisConnected = await testRedisConnection();
  if (!isRedisConnected) {
    console.error('⚠️  ADVERTENCIA: El servidor está funcionando pero Redis no está disponible');
  }
  
  console.log('🌐 Endpoints disponibles:');
  console.log('   GET  /api/test-redis');
  console.log('   GET  /api/player/:username/record');
  console.log('   POST /api/player/:username/record');
  console.log('   GET  /api/leaderboard/:limit?');
});