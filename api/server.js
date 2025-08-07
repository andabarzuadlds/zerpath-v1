const path = require('path');

// CORRECCIÓN: Buscar el archivo .env un nivel ARRIBA (en la raíz del proyecto)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// --- PASO DE DEPURACIÓN DEFINITIVO ---
console.log('--- VERIFICANDO VARIABLES DE ENTORNO ---');
console.log('REDIS_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ CARGADO' : '❌ NO CARGADO');
console.log('REDIS_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ CARGADO' : '❌ NO CARGADO');
console.log('ABLY_API_KEY:', process.env.ABLY_API_KEY ? '✅ CARGADO' : '❌ NO CARGADO');
console.log('------------------------------------');
// --- FIN DEL PASO DE DEPURACIÓN ---

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const Ably = require('ably');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ABLY_API_KEY = process.env.ABLY_API_KEY;

// Si ABLY_API_KEY no se carga, el servidor no debe continuar.
if (!ABLY_API_KEY) {
  console.error('❌ CRÍTICO: La variable de entorno ABLY_API_KEY no está definida. El servidor no puede iniciar.');
  process.exit(1); // Detiene el servidor si la clave no existe.
}

const ably = new Ably.Rest({ key: ABLY_API_KEY });

// --- RUTA DE AUTENTICACIÓN CON ASYNC/AWAIT ---
// Reescribimos la ruta para usar async/await, que es más robusto y moderno.
app.get('/api/ably-auth', async (req, res) => {
  console.log('🔑 Solicitando token de Ably (versión async)...');
  const tokenParams = { clientId: `client-${Math.random().toString(36).substr(2, 9)}` };

  try {
    // Usamos la versión de la función que devuelve una Promesa.
    // Pasamos las opciones de autenticación directamente aquí también.
    const tokenRequest = await ably.auth.createTokenRequest(tokenParams, { key: ABLY_API_KEY });
    
    console.log('✅ Token de Ably generado exitosamente (async).');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(tokenRequest));

  } catch (err) {
    // Si hay un error, lo capturamos aquí.
    console.error('❌ Error solicitando token de Ably (async):', err);
    res.status(500).send('Error solicitando token de Ably: ' + JSON.stringify(err));
  }
});
// --- FIN DE LA LÓGICA DE ABLY ---

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

// --- CAMBIOS PARA VERCEL ---

// 1. QUITA TODO ESTE BLOQUE
/*
app.listen(PORT, async () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log('   GET  /api/test-redis');
  console.log('   GET  /api/ably-auth');
  console.log('   GET  /api/player/:username/record');
  console.log('   POST /api/player/:username/record');
  console.log('   GET  /api/leaderboard/:limit?');
});
*/

// 2. AÑADE ESTA LÍNEA AL FINAL DEL ARCHIVO
module.exports = app;