import { useEffect, useRef, useState, useMemo } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const SIZE = 14;
const SPEED = 2.2;
const FOOD_COUNT = 800; // ✅ MÁS PARTÍCULAS PARA COMER
const INITIAL_LENGTH = 10;
const BOT_COUNT = 20; // ✅ MÁS BOTS PARA MAYOR AMENAZA
const WORLD_SIZE = 8000;

// ✅ AMBIENTES GALÁCTICOS CON ESCALADO DE DIFICULTAD
const ENVIRONMENTS = [
  {
    id: 'space',
    name: '🌌 Espacio Profundo',
    bgColor: '#000011',
    starColor: '#ffffff',
    nebula: ['#4a0080', '#8b00ff', '#ff006e'],
    threshold: 0,
    botSizeMultiplier: 1.0,
    botSpeedMultiplier: 1.0,
    threatLevel: 1
  },
  {
    id: 'mars',
    name: '🔴 Marte',
    bgColor: '#1a0f0a',
    starColor: '#ff6b35',
    nebula: ['#ff4500', '#dc143c', '#8b0000'],
    threshold: 150,
    botSizeMultiplier: 1.3,
    botSpeedMultiplier: 1.1,
    threatLevel: 2
  },
  {
    id: 'jupiter',
    name: '🪐 Júpiter',
    bgColor: '#2d1810',
    starColor: '#ffa500',
    nebula: ['#ff8c00', '#ff7f50', '#daa520'],
    threshold: 300,
    botSizeMultiplier: 1.6,
    botSpeedMultiplier: 1.2,
    threatLevel: 3
  },
  {
    id: 'neptune',
    name: '💙 Neptuno',
    bgColor: '#001133',
    starColor: '#00bfff',
    nebula: ['#0066cc', '#4169e1', '#1e90ff'],
    threshold: 500,
    botSizeMultiplier: 2.0,
    botSpeedMultiplier: 1.3,
    threatLevel: 4
  },
  {
    id: 'alien',
    name: '👽 Mundo Alienígena',
    bgColor: '#0d2818',
    starColor: '#00ff7f',
    nebula: ['#32cd32', '#00ff00', '#7fff00'],
    threshold: 750,
    botSizeMultiplier: 2.5,
    botSpeedMultiplier: 1.4,
    threatLevel: 5
  },
  {
    id: 'blackhole',
    name: '🕳️ Agujero Negro',
    bgColor: '#050005',
    starColor: '#9400d3',
    nebula: ['#4b0082', '#8a2be2', '#9932cc'],
    threshold: 1000,
    botSizeMultiplier: 3.0,
    botSpeedMultiplier: 1.5,
    threatLevel: 6
  }
];

// ✅ DETECCIÓN DE DISPOSITIVO MÓVIL
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (window.innerWidth <= 768);
};

// ✅ DETECCIÓN AUTOMÁTICA DE ENTORNO
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }

  return `${window.location.origin}/api`;
};

const API_URL = getApiUrl();

console.log('🌐 API URL:', API_URL);
console.log('📱 Is Mobile:', isMobile());

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
}

// ✅ GENERAR COMIDA MEJORADA CON MÁS VARIEDAD
function randomFood(worldSize: number, environment: any) {
  const r = 4 + Math.random() * 18; // ✅ Mayor variedad de tamaños
  const food = {
    x: Math.random() * (worldSize - r * 2),
    y: Math.random() * (worldSize - r * 2),
    r,
    color: randomColor(),
    type: Math.random() < 0.1 ? 'special' : 'normal', // ✅ 10% comida especial
  };

  // Cambiar colores según el ambiente
  if (environment.id === 'mars') {
    food.color = `hsl(${Math.random() * 60 + 0}, 90%, ${50 + Math.random() * 30}%)`; // Rojos y naranjas
  } else if (environment.id === 'jupiter') {
    food.color = `hsl(${Math.random() * 60 + 30}, 90%, ${50 + Math.random() * 30}%)`; // Naranjas y amarillos
  } else if (environment.id === 'neptune') {
    food.color = `hsl(${Math.random() * 60 + 180}, 90%, ${50 + Math.random() * 30}%)`; // Azules y cianes
  } else if (environment.id === 'alien') {
    food.color = `hsl(${Math.random() * 60 + 90}, 90%, ${50 + Math.random() * 30}%)`; // Verdes
  } else if (environment.id === 'blackhole') {
    food.color = `hsl(${Math.random() * 60 + 270}, 90%, ${50 + Math.random() * 30}%)`; // Púrpuras
  }

  // ✅ Comida especial más grande y brillante
  if (food.type === 'special') {
    food.r *= 1.5;
    food.color = food.color.replace('90%', '100%'); // Más saturada
  }

  return food;
}

// ✅ GENERAR BOTS ESCALABLES SEGÚN AMBIENTE
function randomBot(worldSize: number, environment: any) {
  const baseLength = 8 + Math.floor(Math.random() * 20); // ✅ Bots más largos base
  const scaledLength = Math.floor(baseLength * environment.botSizeMultiplier);
  const x = Math.random() * (worldSize - 600) + 300;
  const y = Math.random() * (worldSize - 600) + 300;

  let color = randomColor();

  // ✅ Bots temáticos y más peligrosos según ambiente
  if (environment.id === 'mars') {
    color = environment.threatLevel >= 3 ? '#ff1100' : '#ff4500';
  } else if (environment.id === 'jupiter') {
    color = environment.threatLevel >= 3 ? '#ff8800' : '#ffa500';
  } else if (environment.id === 'neptune') {
    color = environment.threatLevel >= 4 ? '#0088ff' : '#00bfff';
  } else if (environment.id === 'alien') {
    color = environment.threatLevel >= 5 ? '#00ff44' : '#00ff7f';
  } else if (environment.id === 'blackhole') {
    color = environment.threatLevel >= 6 ? '#bb00ff' : '#9400d3';
  }

  const segments = Array.from({ length: scaledLength }, (_, i) => ({
    x: x - i * SIZE,
    y: y,
  }));

  return {
    segments,
    color,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    angle: Math.random() * Math.PI * 2,
    length: scaledLength,
    environment: environment.id,
    speedMultiplier: environment.botSpeedMultiplier,
    threatLevel: environment.threatLevel,
    growthRate: 0.1 * environment.threatLevel, // ✅ Los bots crecen más en planetas avanzados
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ✅ FUNCIONES PARA LA API
async function getPlayerRecord(username: string): Promise<number> {
  try {
    const response = await fetch(`${API_URL}/player/${encodeURIComponent(username)}/record`);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    return data.score || 0;
  } catch (error) {
    console.error('Error getting player record:', error);
    return 0;
  }
}

async function setPlayerRecord(username: string, score: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/player/${encodeURIComponent(username)}/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score }),
    });
    if (!response.ok) throw new Error('Network error');
  } catch (error) {
    console.error('Error setting player record:', error);
    throw error;
  }
}

async function getTopPlayers(limit: number = 10): Promise<Array<{ username: string, score: number }>> {
  try {
    const response = await fetch(`${API_URL}/leaderboard/${limit}`);
    if (!response.ok) throw new Error('Network error');
    const players = await response.json();
    return players;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

// ✅ FALLBACK LOCAL STORAGE
function getLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem("snake_records") || "{}");
  } catch {
    return {};
  }
}

function setLocalRecords(records: Record<string, number>) {
  localStorage.setItem("snake_records", JSON.stringify(records));
}

const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [snake, setSnake] = useState(() =>
    Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      x: WORLD_SIZE / 2 - i * SIZE,
      y: WORLD_SIZE / 2,
    }))
  );

  const [foods, setFoods] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const [dimensions, setDimensions] = useState(() => ({
    width: Math.max(800, window.innerWidth),
    height: Math.max(600, window.innerHeight),
  }));

  // ✅ CÁMARA PARA MUNDO ABIERTO
  const [camera, setCamera] = useState({
    x: WORLD_SIZE / 2 - Math.max(800, window.innerWidth) / 2,
    y: WORLD_SIZE / 2 - Math.max(600, window.innerHeight) / 2
  });

  // ✅ AMBIENTE ACTUAL
  const [currentEnvironment, setCurrentEnvironment] = useState(ENVIRONMENTS[0]);
  const [stars, setStars] = useState<Array<{ x: number, y: number, size: number, opacity: number }>>([]);
  const [nebulaClouds, setNebulaClouds] = useState<Array<{ x: number, y: number, size: number, color: string, opacity: number }>>([]);

  const [username, setUsername] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [pendingGrowth, setPendingGrowth] = useState(0);

  // ✅ ESTADOS PARA LEADERBOARD
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string, score: number }>>([]);
  const [topFive, setTopFive] = useState<Array<{ username: string, score: number }>>([]);

  // ✅ ESTADOS PARA MÓVIL
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [touchControls, setTouchControls] = useState({ x: 0, y: 0, active: false });
  const [showMobileUI, setShowMobileUI] = useState(true);

  // Sistema para quedarse quieto
  const [isMoving, setIsMoving] = useState(false);
  const [lastInputPosition, setLastInputPosition] = useState({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const isNearTargetRef = useRef(false);

  const target = useRef({
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2
  });

  const angleRef = useRef(0);
  const botGrowthTimerRef = useRef(0); // ✅ Timer para crecimiento de bots

  const snakeRadius = useMemo(() => {
    return SIZE / 2 + (snake.length * 0.3);
  }, [snake.length]);
  // ✅ DETECTAR MÓVIL AL CARGAR
  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  // ✅ GENERAR ESTRELLAS DE FONDO
  useEffect(() => {
    const generateStars = () => {
      const starArray = [];
      for (let i = 0; i < 300; i++) { // ✅ Más estrellas
        starArray.push({
          x: Math.random() * WORLD_SIZE,
          y: Math.random() * WORLD_SIZE,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.8 + 0.2
        });
      }
      setStars(starArray);
    };

    const generateNebula = () => {
      const nebulaArray = [];
      for (let i = 0; i < 20; i++) { // ✅ Más nebulosas
        nebulaArray.push({
          x: Math.random() * WORLD_SIZE,
          y: Math.random() * WORLD_SIZE,
          size: Math.random() * 500 + 300,
          color: currentEnvironment.nebula[Math.floor(Math.random() * currentEnvironment.nebula.length)],
          opacity: Math.random() * 0.4 + 0.1
        });
      }
      setNebulaClouds(nebulaArray);
    };

    generateStars();
    generateNebula();
  }, [currentEnvironment]);

  // ✅ CAMBIAR AMBIENTE SEGÚN PUNTUACIÓN CON NOTIFICACIÓN DE AMENAZA
  useEffect(() => {
    const newEnvironment = [...ENVIRONMENTS].reverse().find(env => score >= env.threshold) || ENVIRONMENTS[0];
    if (newEnvironment.id !== currentEnvironment.id) {
      setCurrentEnvironment(newEnvironment);

      // ✅ Actualizar bots existentes al nuevo ambiente
      setBots(prevBots =>
        prevBots.map(bot => ({
          ...bot,
          environment: newEnvironment.id,
          speedMultiplier: newEnvironment.botSpeedMultiplier,
          threatLevel: newEnvironment.threatLevel,
          growthRate: 0.1 * newEnvironment.threatLevel,
          // ✅ Escalar tamaño de bots existentes
          segments: bot.segments.length < Math.floor(bot.segments.length * newEnvironment.botSizeMultiplier)
            ? [...bot.segments, ...Array.from({ length: Math.floor(bot.segments.length * (newEnvironment.botSizeMultiplier - 1)) },
              () => ({ ...bot.segments[bot.segments.length - 1] }))]
            : bot.segments,
          length: Math.floor(bot.segments.length * newEnvironment.botSizeMultiplier)
        }))
      );

      // Mostrar notificación de nuevo ambiente con nivel de amenaza
      if (score > 0) {
        const threatEmoji = '⚠️'.repeat(newEnvironment.threatLevel);
        const toast = document.createElement('div');
        toast.innerHTML = `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                      background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9)); 
                      color: white; padding: 25px 35px; border-radius: 20px; 
                      border: 2px solid #ff4444; box-shadow: 0 0 40px rgba(255,68,68,0.6);
                      z-index: 1000; text-align: center; backdrop-filter: blur(10px);">
            <div style="font-size: 28px; margin-bottom: 12px;">${threatEmoji} ¡NUEVO AMBIENTE!</div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${newEnvironment.name}</div>
            <div style="font-size: 14px; color: #ff6666;">Nivel de Amenaza: ${newEnvironment.threatLevel}/6</div>
            <div style="font-size: 12px; color: #ffaa66; margin-top: 8px;">Los enemigos son más fuertes aquí</div>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 4000);
      }
    }
  }, [score, currentEnvironment.id]);

  // ✅ ACTUALIZAR CÁMARA PARA SEGUIR AL JUGADOR
  useEffect(() => {
    if (snake.length > 0) {
      const head = snake[0];
      setCamera({
        x: head.x - dimensions.width / 2,
        y: head.y - dimensions.height / 2
      });
    }
  }, [snake, dimensions]);

  // ✅ OCULTAR UI MÓVIL DESPUÉS DE 3 SEGUNDOS
  useEffect(() => {
    if (!isMobileDevice) return;

    const timer = setTimeout(() => {
      setShowMobileUI(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isMobileDevice, gameOver]);

  // ✅ FUNCIÓN PARA ACTUALIZAR TOP 5
  const updateTopFive = async () => {
    try {
      const topPlayers = await getTopPlayers(5);
      setTopFive(topPlayers);
    } catch (error) {
      console.error('Error updating top 5:', error);
      const localRecords = getLocalRecords();
      const localTop5 = Object.entries(localRecords)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([username, score]) => ({ username, score: score as number }));
      setTopFive(localTop5);
    }
  };

  // ✅ PEDIR NOMBRE DE USUARIO Y CARGAR DATOS
  useEffect(() => {
    async function askUsername() {
      const { value: user } = await Swal.fire({
        title: "🚀 Snake Galaxy Enhanced",
        text: "¡Sobrevive a la amenaza galáctica! Ingresa tu nombre:",
        input: "text",
        inputPlaceholder: "Tu nombre",
        confirmButtonText: "🌌 Comenzar Misión",
        allowOutsideClick: false,
        allowEscapeKey: false,
        inputValidator: (value) => {
          if (!value) return "Por favor ingresa un nombre";
          if (value.length > 20) return "Máximo 20 caracteres";
        },
        customClass: {
          popup: "!bg-gray-900/95 !text-white !border !border-gray-700 !rounded-2xl",
          title: "!text-2xl !font-bold !text-transparent !bg-gradient-to-r !from-cyan-400 !to-purple-400 !bg-clip-text",
          htmlContainer: "!text-gray-300",
          input: "!bg-gray-800 !border !border-gray-600 !rounded-lg !text-white !px-4 !py-2",
          confirmButton: "!bg-gradient-to-r !from-cyan-500 !to-purple-500 !text-white !px-8 !py-3 !rounded-xl !font-semibold !border-0 hover:!scale-105 !transition-transform",
        },
      });

      const username = user || "Invitado";
      setUsername(username);

      // Mostrar instrucciones mejoradas
      await Swal.fire({
        title: isMobileDevice ? "📱 Misión Galáctica" : "🎮 Misión Galáctica",
        html: `
          <div class="space-y-3 text-left">
            <div class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <div class="text-2xl">${isMobileDevice ? '👆' : '🖱️'}</div>
              <span class="text-gray-300">${isMobileDevice ? 'Mantén presionado donde quieras ir' : 'Mueve el mouse para navegar'}</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <div class="text-2xl">🌌</div>
              <span class="text-gray-300">800 partículas flotando en el espacio</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <div class="text-2xl">⚠️</div>
              <span class="text-gray-300">Los enemigos crecen según el planeta</span>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <div class="text-2xl">✨</div>
              <span class="text-gray-300">Busca partículas especiales brillantes</span>
            </div>
          </div>
        `,
        confirmButtonText: "¡Despegar!",
        customClass: {
          popup: "!bg-gray-900/95 !text-white !border !border-gray-700 !rounded-2xl",
          title: "!text-xl !font-bold !text-transparent !bg-gradient-to-r !from-cyan-400 !to-purple-400 !bg-clip-text",
          confirmButton: "!bg-gradient-to-r !from-green-500 !to-emerald-500 !text-white !px-8 !py-3 !rounded-xl !font-semibold !border-0 hover:!scale-105 !transition-transform",
        },
      });

      // Cargar datos
      try {
        const apiScore = await getPlayerRecord(username);
        setHighScore(apiScore);
      } catch (error) {
        const localRecords = getLocalRecords();
        setHighScore(localRecords[username] || 0);
      }

      try {
        const topPlayers = await getTopPlayers(10);
        setLeaderboard(topPlayers);
        setTopFive(topPlayers.slice(0, 5));
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        await updateTopFive();
      }
    }
    askUsername();
  }, [isMobileDevice]);

  // ✅ ACTUALIZAR TOP 5 CADA 10 SEGUNDOS
  useEffect(() => {
    const interval = setInterval(updateTopFive, 10000);
    return () => clearInterval(interval);
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.max(800, window.innerWidth),
        height: Math.max(600, window.innerHeight)
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ CONTROLES TÁCTILES PARA MÓVIL
  useEffect(() => {
    if (!isMobileDevice) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) + camera.x;
      const y = (touch.clientY - rect.top) + camera.y;

      setTouchControls({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, active: true });
      target.current = { x, y };
      setLastInputPosition({ x, y });
      lastMoveTimeRef.current = performance.now();
      isNearTargetRef.current = false;
      setIsMoving(true);

      setShowMobileUI(true);
      setTimeout(() => setShowMobileUI(false), 2000);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchControls.active) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) + camera.x;
      const y = (touch.clientY - rect.top) + camera.y;

      const moved = Math.hypot(x - lastInputPosition.x, y - lastInputPosition.y) > 15;

      if (moved) {
        setTouchControls({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, active: true });
        target.current = { x, y };
        setLastInputPosition({ x, y });
        lastMoveTimeRef.current = performance.now();
        isNearTargetRef.current = false;
        setIsMoving(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setTouchControls({ x: 0, y: 0, active: false });
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobileDevice, touchControls.active, lastInputPosition, camera]);

  // ✅ CONTROLES DE MOUSE PARA ESCRITORIO
  useEffect(() => {
    if (isMobileDevice) return;

    const handleMouse = (e: MouseEvent) => {
      const now = performance.now();
      const newPosition = {
        x: e.clientX + camera.x,
        y: e.clientY + camera.y
      };

      const moved = Math.hypot(
        newPosition.x - lastInputPosition.x,
        newPosition.y - lastInputPosition.y
      ) > 15;

      if (moved) {
        target.current = newPosition;
        setLastInputPosition(newPosition);
        lastMoveTimeRef.current = now;
        isNearTargetRef.current = false;

        if (!isMoving) {
          setIsMoving(true);
        }
      }
    };

    if (lastInputPosition.x === 0 && lastInputPosition.y === 0) {
      const initialPos = { x: target.current.x, y: target.current.y };
      setLastInputPosition(initialPos);
      lastMoveTimeRef.current = performance.now();
    }

    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [lastInputPosition, isMoving, isMobileDevice, camera]);

  // ✅ VERIFICAR MOVIMIENTO
  useEffect(() => {
    if (gameOver) return;

    const checkMovement = setInterval(() => {
      const now = performance.now();
      if (now - lastMoveTimeRef.current > 300 && isMoving) {
        setIsMoving(false);
      }
    }, 100);

    return () => clearInterval(checkMovement);
  }, [gameOver, isMoving]);

  // Inicializar comida con más partículas
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(WORLD_SIZE, currentEnvironment));
    }
    setFoods(arr);
  }, [currentEnvironment]);

  // Inicializar bots escalables
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      arr.push(randomBot(WORLD_SIZE, currentEnvironment));
    }
    setBots(arr);
  }, [currentEnvironment]);

  // ✅ LÓGICA PRINCIPAL DEL JUEGO CON BOTS QUE CRECEN
  useEffect(() => {
    if (gameOver) return;

    let animationId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      if (gameOver) return;
      if (now - lastTime > 16) {

        // ✅ CRECIMIENTO DE BOTS CADA 5 SEGUNDOS
        if (now - botGrowthTimerRef.current > 5000) {
          setBots(prevBots =>
            prevBots.map(bot => {
              // ✅ Los bots crecen según su growthRate
              if (Math.random() < bot.growthRate) {
                const lastSegment = bot.segments[bot.segments.length - 1];
                return {
                  ...bot,
                  segments: [...bot.segments, { ...lastSegment }],
                  length: bot.length + 1
                };
              }
              return bot;
            })
          );
          botGrowthTimerRef.current = now;
        }

        // ✅ MOVER BOTS CON VELOCIDAD ESCALADA
        setBots((prevBots) => {
          return prevBots.map((bot) => {
            let { segments, color, dx, dy, angle, length, speedMultiplier } = bot;

            if (Math.random() < 0.02) {
              angle += (Math.random() - 0.5) * 0.5;
            }

            const head = segments[0];
            const newHead = {
              x: head.x + Math.cos(angle) * SPEED * 0.4 * speedMultiplier,
              y: head.y + Math.sin(angle) * SPEED * 0.4 * speedMultiplier,
            };

            // Mundo abierto - wraparound
            if (newHead.x < 0) newHead.x = WORLD_SIZE;
            if (newHead.x > WORLD_SIZE) newHead.x = 0;
            if (newHead.y < 0) newHead.y = WORLD_SIZE;
            if (newHead.y > WORLD_SIZE) newHead.y = 0;

            const newSegments = [newHead, ...segments.slice(0, -1)];
            return { ...bot, segments: newSegments, angle };
          });
        });

        // Mover la snake
        setSnake((prev) => {
          const head = prev[0];

          const distanceToTarget = Math.hypot(
            target.current.x - (head.x + SIZE / 2),
            target.current.y - (head.y + SIZE / 2)
          );

          if (distanceToTarget < 30) {
            isNearTargetRef.current = true;
          }

          const shouldMove = isMoving || (!isNearTargetRef.current && distanceToTarget > 30);

          if (!shouldMove) {
            return prev;
          }

          if (isMoving) {
            const dx = target.current.x - (head.x + SIZE / 2);
            const dy = target.current.y - (head.y + SIZE / 2);

            const targetAngle = Math.atan2(dy, dx);
            const diff = ((targetAngle - angleRef.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            angleRef.current += diff * 0.12;
          }

          const dirX = Math.cos(angleRef.current) * SPEED;
          const dirY = Math.sin(angleRef.current) * SPEED;
          let newHead = {
            x: head.x + dirX,
            y: head.y + dirY,
          };

          // Mundo abierto - wraparound
          if (newHead.x < 0) newHead.x = WORLD_SIZE;
          if (newHead.x > WORLD_SIZE) newHead.x = 0;
          if (newHead.y < 0) newHead.y = WORLD_SIZE;
          if (newHead.y > WORLD_SIZE) newHead.y = 0;

          // Colisión consigo mismo
          if (
            prev.length > 10 &&
            prev.slice(8).some((seg) => dist(seg, newHead) < SIZE * 0.7)
          ) {
            setGameOver(true);
            setPendingGrowth(0);
            return prev;
          }

          // Aplicar crecimiento
          if (pendingGrowth > 0) {
            setPendingGrowth(prev => prev - 1);
            return [newHead, ...prev];
          } else {
            return [newHead, ...prev.slice(0, -1)];
          }
        });

        // ✅ VERIFICAR COLISIONES CON COMIDA ESPECIAL
        setSnake((currentSnake) => {
          if (currentSnake.length === 0) return currentSnake;
          const head = currentSnake[0];
          const currentSnakeRadius = SIZE / 2 + (currentSnake.length * 0.3);

          setFoods((currentFoods) => {
            const newFoods = currentFoods.filter((food) => {
              const d = dist(
                { x: head.x + SIZE / 2, y: head.y + SIZE / 2 },
                { x: food.x + food.r, y: food.y + food.r }
              );
              if (d < (food.r + SIZE / 2) * 1.2) {
                // ✅ Comida especial da más puntos y crecimiento
                const growthAmount = food.type === 'special' ? 5 : 3;
                const scoreAmount = food.type === 'special' ? 10 : 5;

                setPendingGrowth(prev => prev + growthAmount);
                setScore((s) => s + scoreAmount);
                return false;
              }
              return true;
            });

            // Regenerar comida consumida
            while (newFoods.length < FOOD_COUNT) {
              newFoods.push(randomFood(WORLD_SIZE, currentEnvironment));
            }
            return newFoods;
          });

          setBots((currentBots) => {
            let shouldDie = false;

            const newBots = currentBots.filter((bot) => {
              const botRadius = SIZE / 2 + (bot.segments.length * 0.3);
              let botShouldBeRemoved = false;

              for (let i = 0; i < bot.segments.length; i++) {
                const botSegment = bot.segments[i];
                const distance = dist(
                  { x: head.x + SIZE / 2, y: head.y + SIZE / 2 },
                  { x: botSegment.x + SIZE / 2, y: botSegment.y + SIZE / 2 }
                );

                if (distance < SIZE * 1.2) {
                  if (i === 0) {
                    if (currentSnakeRadius > botRadius) {
                      setPendingGrowth(prev => prev + bot.segments.length);
                      setScore((s) => s + bot.segments.length);
                      botShouldBeRemoved = true;
                    } else {
                      shouldDie = true;
                    }
                  } else {
                    setPendingGrowth(prev => prev + bot.segments.length);
                    setScore((s) => s + bot.segments.length);
                    botShouldBeRemoved = true;
                  }
                  break;
                }
              }

              return !botShouldBeRemoved;
            });

            if (shouldDie) {
              setGameOver(true);
              setPendingGrowth(0);
            }

            // Regenerar bots
            while (newBots.length < BOT_COUNT) {
              newBots.push(randomBot(WORLD_SIZE, currentEnvironment));
            }

            return newBots;
          });

          return currentSnake;
        });

        lastTime = now;
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [gameOver, pendingGrowth, isMoving, currentEnvironment]);

  // ✅ GUARDAR RÉCORD AL PERDER
  useEffect(() => {
    if (!gameOver || !username) return;

    async function saveScore() {
      if (score > highScore) {
        setHighScore(score);

        try {
          await setPlayerRecord(username ?? "Invitado", score);
          const updatedLeaderboard = await getTopPlayers(10);
          setLeaderboard(updatedLeaderboard);
          setTopFive(updatedLeaderboard.slice(0, 5));
        } catch (error) {
          console.error('Error saving to API:', error);
          const localRecords = getLocalRecords();
          localRecords[username ?? "Invitado"] = score;
          setLocalRecords(localRecords);
          await updateTopFive();
        }
      }
    }

    saveScore();
  }, [gameOver, username, score, highScore]);

  // ✅ FUNCIÓN PARA MOSTRAR LEADERBOARD
  const showLeaderboardModal = async () => {
    try {
      const topPlayers = await getTopPlayers(10);
      const leaderboardHTML = topPlayers.length > 0 ?
        topPlayers
          .map((player, index) =>
            `<div class="flex justify-between items-center p-3 rounded-xl ${player.username === username
              ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
              : 'bg-gray-800/50 hover:bg-gray-700/50'
            } transition-all duration-200">
              <div class="flex items-center gap-3">
                <span class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
              index === 1 ? 'bg-gray-400 text-black' :
                index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-600 text-white'
            }">${index + 1}</span>
                <span class="font-medium ${player.username === username ? 'text-yellow-300' : 'text-white'}">${player.username}</span>
              </div>
              <span class="font-mono font-bold text-cyan-400">${player.score}</span>
            </div>`
          )
          .join('') :
        '<div class="text-center text-gray-400 py-8">No hay supervivientes galácticos aún</div>';

      await Swal.fire({
        title: "🚀 Supervivientes Galácticos",
        html: `<div class="space-y-2 max-h-96 overflow-y-auto">${leaderboardHTML}</div>`,
        confirmButtonText: "Cerrar",
        customClass: {
          popup: "!bg-gray-900/95 !text-white !border !border-gray-700 !rounded-2xl !max-w-md",
          title: "!text-2xl !font-bold !text-transparent !bg-gradient-to-r !from-cyan-400 !to-purple-400 !bg-clip-text",
          confirmButton: "!bg-gradient-to-r !from-cyan-500 !to-purple-500 !text-white !px-8 !py-3 !rounded-xl !font-semibold !border-0 hover:!scale-105 !transition-transform",
        },
      });
    } catch (error) {
      console.error('Error showing leaderboard:', error);
    }
  };

  // Reinicio del juego
  const handleRestart = () => {
    setSnake(
      Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
        x: WORLD_SIZE / 2 - i * SIZE,
        y: WORLD_SIZE / 2,
      }))
    );
    setScore(0);
    setGameOver(false);
    setPendingGrowth(0);
    angleRef.current = 0;
    setIsMoving(false);
    setTouchControls({ x: 0, y: 0, active: false });
    isNearTargetRef.current = false;
    lastMoveTimeRef.current = performance.now();
    botGrowthTimerRef.current = performance.now();
    setShowMobileUI(true);
    setCurrentEnvironment(ENVIRONMENTS[0]);

    // Regenerar más comida y bots
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(WORLD_SIZE, ENVIRONMENTS[0]));
    }
    setFoods(arr);

    const arrBots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      arrBots.push(randomBot(WORLD_SIZE, ENVIRONMENTS[0]));
    }
    setBots(arrBots);

    target.current = {
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2
    };

    // Reset camera
    setCamera({
      x: WORLD_SIZE / 2 - dimensions.width / 2,
      y: WORLD_SIZE / 2 - dimensions.height / 2
    });

    setTimeout(() => setShowMobileUI(false), 3000);
  };

  // ✅ DIBUJO DEL CANVAS CON EFECTOS MEJORADOS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo galáctico
    ctx.save();
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    gradient.addColorStop(0, currentEnvironment.bgColor);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Dibujar nebulosas mejoradas
    nebulaClouds.forEach((cloud) => {
      const screenX = cloud.x - camera.x;
      const screenY = cloud.y - camera.y;

      if (screenX > -cloud.size && screenX < canvas.width + cloud.size &&
        screenY > -cloud.size && screenY < canvas.height + cloud.size) {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        const nebulaGradient = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, cloud.size
        );
        nebulaGradient.addColorStop(0, cloud.color + '80');
        nebulaGradient.addColorStop(0.5, cloud.color + '40');
        nebulaGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = nebulaGradient;
        ctx.fillRect(screenX - cloud.size, screenY - cloud.size, cloud.size * 2, cloud.size * 2);
        ctx.restore();
      }
    });

    // Dibujar más estrellas
    stars.forEach((star) => {
      const screenX = star.x - camera.x;
      const screenY = star.y - camera.y;

      if (screenX > -10 && screenX < canvas.width + 10 &&
        screenY > -10 && screenY < canvas.height + 10) {
        ctx.save();
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = currentEnvironment.starColor;
        ctx.shadowColor = currentEnvironment.starColor;
        ctx.shadowBlur = star.size * 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, star.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });

    // ✅ DIBUJAR COMIDA CON EFECTOS ESPECIALES
    foods.forEach((food) => {
      const screenX = food.x - camera.x;
      const screenY = food.y - camera.y;

      if (screenX > -food.r * 2 && screenX < canvas.width + food.r * 2 &&
        screenY > -food.r * 2 && screenY < canvas.height + food.r * 2) {
        ctx.save();

        // ✅ Efecto especial para comida especial
        if (food.type === 'special') {
          const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 1;
          ctx.shadowColor = food.color;
          ctx.shadowBlur = 25 * pulse;
          ctx.scale(pulse, pulse);

          // Anillo brillante
          ctx.strokeStyle = food.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc((screenX + food.r) / pulse, (screenY + food.r) / pulse, (food.r + 5) / pulse, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          ctx.shadowColor = food.color;
          ctx.shadowBlur = 16;
        }

        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc((screenX + food.r) / (food.type === 'special' ? Math.sin(performance.now() * 0.005) * 0.3 + 1 : 1),
          (screenY + food.r) / (food.type === 'special' ? Math.sin(performance.now() * 0.005) * 0.3 + 1 : 1),
          food.r / (food.type === 'special' ? Math.sin(performance.now() * 0.005) * 0.3 + 1 : 1), 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });

    // ✅ DIBUJAR BOTS CON INDICADORES DE AMENAZA
    bots.forEach((bot) => {
      const botRadius = SIZE / 2 + (bot.segments.length * 0.3);
      const isDangerous = botRadius > snakeRadius;
      const isVeryDangerous = bot.threatLevel >= 4;

      bot.segments.forEach((seg: { x: number; y: number }, i: number) => {
        const screenX = seg.x - camera.x;
        const screenY = seg.y - camera.y;

        if (screenX > -SIZE * 2 && screenX < canvas.width + SIZE * 2 &&
          screenY > -SIZE * 2 && screenY < canvas.height + SIZE * 2) {
          ctx.save();

          if (i === 0) {
            // ✅ Efectos de amenaza más intensos
            if (isVeryDangerous) {
              const pulse = Math.sin(performance.now() * 0.01) * 0.2 + 1;
              ctx.shadowColor = "#ff0000";
              ctx.shadowBlur = 35 * pulse;
              ctx.scale(pulse, pulse);
            } else if (isDangerous) {
              ctx.shadowColor = "#ff4444";
              ctx.shadowBlur = 25;
            } else {
              ctx.shadowColor = bot.color;
              ctx.shadowBlur = 15;
            }

            ctx.fillStyle = isDangerous ? (isVeryDangerous ? "#ff0000" : "#ff4444") : bot.color;
            ctx.lineWidth = isDangerous ? (isVeryDangerous ? 4 : 3) : 1;
            ctx.strokeStyle = isDangerous ? "#ff0000" : bot.color;
          } else {
            ctx.shadowColor = bot.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = `${bot.color}44`;
          }

          const adjustedSize = SIZE / (isVeryDangerous && i === 0 ? Math.sin(performance.now() * 0.01) * 0.2 + 1 : 1);
          const adjustedX = screenX / (isVeryDangerous && i === 0 ? Math.sin(performance.now() * 0.01) * 0.2 + 1 : 1);
          const adjustedY = screenY / (isVeryDangerous && i === 0 ? Math.sin(performance.now() * 0.01) * 0.2 + 1 : 1);

          ctx.beginPath();
          ctx.arc(adjustedX + adjustedSize / 2, adjustedY + adjustedSize / 2, adjustedSize / 2, 0, 2 * Math.PI);
          ctx.fill();

          if (i === 0 && isDangerous) {
            ctx.stroke();
          }

          if (i === 0) {
            ctx.fillStyle = "#000";
            ctx.font = "bold 8px Arial";
            ctx.textAlign = "center";
            ctx.fillText(bot.segments.length.toString(), adjustedX + adjustedSize / 2, adjustedY + adjustedSize / 2 + 2);

            // ✅ Ojos más expresivos para bots peligrosos
            ctx.fillStyle = isVeryDangerous ? "#ff0000" : "#fff";
            ctx.beginPath();
            ctx.arc(adjustedX + adjustedSize / 2 - 2, adjustedY + adjustedSize / 2 - 1, 1, 0, 2 * Math.PI);
            ctx.arc(adjustedX + adjustedSize / 2 + 2, adjustedY + adjustedSize / 2 - 1, 1, 0, 2 * Math.PI);
            ctx.fill();
          }

          ctx.restore();
        }
      });
    });

    // Dibujar snake
    snake.forEach((seg, i) => {
      const screenX = seg.x - camera.x;
      const screenY = seg.y - camera.y;

      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = i === 0 ? 32 : 12;
      ctx.fillStyle = i === 0 ? "#fff" : "#06b6d4";
      ctx.beginPath();
      ctx.arc(screenX + SIZE / 2, screenY + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();

      if (i === 0) {
        ctx.fillStyle = "#000";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(snake.length.toString(), screenX + SIZE / 2, screenY + SIZE / 2 + 3);
      }

      ctx.restore();
    });

    // Indicador táctil
    if (isMobileDevice && touchControls.active) {
      ctx.save();

      const pulseSize = 35 + Math.sin(performance.now() * 0.008) * 5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(touchControls.x, touchControls.y, pulseSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(touchControls.x, touchControls.y, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    }

    if (gameOver) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = isMobileDevice ? "bold 42px Arial" : "bold 56px Arial";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 20;
      ctx.fillText("Misión Terminada", canvas.width / 2, canvas.height / 2 - 40);

      ctx.font = isMobileDevice ? "bold 24px Arial" : "bold 32px Arial";
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06b6d4";
      ctx.fillText(
        `Puntos: ${score} | ${currentEnvironment.name}`,
        canvas.width / 2,
        canvas.height / 2 + (isMobileDevice ? 20 : 40)
      );

      ctx.restore();
    }
  }, [snake, foods, bots, gameOver, dimensions, snakeRadius, isMobileDevice, touchControls, camera, currentEnvironment, stars, nebulaClouds]);

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {/* UI MÓVIL */}
      {isMobileDevice && (
        <>
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ${showMobileUI && !gameOver ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
          >
            <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full border border-gray-600 flex items-center gap-2">
              <span className="text-lg">🌌</span>
              <span>{currentEnvironment.name} | Amenaza: {currentEnvironment.threatLevel}/6</span>
            </div>
          </div>

          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/80 backdrop-blur-sm text-white rounded-2xl p-3 border border-gray-700">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400">🚀</span>
                  <span className="font-mono">{snake.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-pink-400">⭐</span>
                  <span className="font-mono">{score}</span>
                </div>
              </div>
              {username && (
                <div className="text-xs text-gray-400 mt-1 truncate max-w-[120px]">
                  👨‍🚀 {username}
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-sm">🏆</span>
                <span className="text-white text-xs font-semibold">TOP 3</span>
              </div>
              <div className="space-y-1">
                {topFive.slice(0, 3).map((player, index) => (
                  <div
                    key={`${player.username}-${index}`}
                    className={`flex justify-between items-center text-xs ${player.username === username
                        ? 'text-yellow-300 font-bold'
                        : 'text-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`
                        ${index === 0 ? 'text-yellow-400' : ''}
                        ${index === 1 ? 'text-gray-300' : ''}
                        ${index === 2 ? 'text-orange-400' : ''}
                        text-xs
                      `}>
                        {index + 1}.
                      </span>
                      <span className="truncate max-w-[60px]" title={player.username}>
                        {player.username.slice(0, 7)}
                      </span>
                    </div>
                    <span className="font-mono text-cyan-300">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-4 z-20">
            <button
              onClick={showLeaderboardModal}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full shadow-2xl border-2 border-purple-300 hover:scale-110 active:scale-95 transition-all duration-300"
            >
              <span className="text-lg">🚀</span>
            </button>
          </div>
        </>
      )}

      {/* UI ESCRITORIO */}
      {!isMobileDevice && (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <div className="bg-black/80 backdrop-blur-sm text-pink-300 border border-pink-400 rounded-full px-6 py-3 text-xl font-bold shadow-lg select-none">
              {username && <span className="mr-3">👨‍🚀 {username}</span>}
              ⭐ {score}
              <span className="ml-3">🏆 {highScore}</span>
            </div>

            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-gray-600 text-sm flex items-center gap-2">
              🌌 {currentEnvironment.name}
              <span className="text-red-400">⚠️ Amenaza: {currentEnvironment.threatLevel}/6</span>
            </div>

            <button
              onClick={showLeaderboardModal}
              className="bg-gradient-to-r from-purple-500 to-purple-400 text-white text-sm py-2 px-4 font-bold rounded-full shadow-lg border-2 border-purple-300 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              🚀 Ver Supervivientes
            </button>
          </div>

          <div className="absolute top-4 right-4 z-20 min-w-[220px] bg-black/90 border-2 border-pink-400 rounded-lg p-3 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-sm">🏆</span>
              <h3 className="text-pink-300 font-bold text-sm">TOP SUPERVIVIENTES</h3>
            </div>

            <div className="space-y-1">
              {topFive.length > 0 ? (
                topFive.map((player, index) => (
                  <div
                    key={`${player.username}-${index}`}
                    className={`flex justify-between items-center py-1 px-1 rounded text-xs ${player.username === username
                        ? 'bg-yellow-600/20 text-yellow-300 font-bold border border-yellow-400/30'
                        : 'text-white hover:bg-pink-500/10'
                      }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`
                        ${index === 0 ? 'text-yellow-400' : ''}
                        ${index === 1 ? 'text-gray-300' : ''}
                        ${index === 2 ? 'text-orange-400' : ''}
                        ${index >= 3 ? 'text-pink-300' : ''}
                        font-bold
                      `}>
                        {index + 1}.
                      </span>
                      <span className="truncate max-w-[80px]" title={player.username}>
                        {player.username}
                      </span>
                    </div>
                    <span className="font-mono text-cyan-300">{player.score}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-xs py-2">
                  No hay supervivientes aún
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full touch-none"
        style={{
          display: "block",
          width: "100vw",
          height: "100vh",
          touchAction: "none"
        }}
      />

      {/* BOTONES DE GAME OVER */}
      {gameOver && (
        <div className={`absolute ${isMobileDevice ? 'bottom-8' : 'bottom-16'} left-1/2 -translate-x-1/2 z-30 pointer-events-auto`}>
          <div className={`flex ${isMobileDevice ? 'flex-col gap-4' : 'gap-6'} items-center`}>
            <button
              onClick={handleRestart}
              className={`bg-gradient-to-r from-cyan-500 to-blue-500 text-white ${isMobileDevice ? 'text-lg py-4 px-8' : 'text-2xl py-4 px-12'
                } font-bold rounded-2xl shadow-2xl border-4 border-cyan-300 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3`}
            >
              <span className="text-2xl">🚀</span>
              Nueva Misión
            </button>

            <button
              onClick={showLeaderboardModal}
              className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white ${isMobileDevice ? 'text-lg py-4 px-8' : 'text-2xl py-4 px-12'
                } font-bold rounded-2xl shadow-2xl border-4 border-purple-300 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3`}
            >
              <span className="text-2xl">🌌</span>
              Ver Supervivientes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;