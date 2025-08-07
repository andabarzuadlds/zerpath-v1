import { useEffect, useRef, useState, useMemo } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const SIZE = 14;
const SPEED = 2.2;
const FOOD_COUNT = 180;
const INITIAL_LENGTH = 10;
const BOT_COUNT = 8;

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
}

function randomFood(width: number, height: number) {
  const r = 6 + Math.random() * 14;
  return {
    x: Math.random() * (width - r * 2),
    y: Math.random() * (height - r * 2),
    r,
    color: randomColor(),
  };
}

// ✅ FUNCIÓN PARA CREAR BOTS SERPIENTES
function randomBot(width: number, height: number) {
  const length = 5 + Math.floor(Math.random() * 15); // Entre 5 y 20 segmentos
  const x = Math.random() * (width - 300) + 150;
  const y = Math.random() * (height - 300) + 150;
  const color = randomColor();

  // Crear segmentos de la serpiente bot
  const segments = Array.from({ length }, (_, i) => ({
    x: x - i * SIZE,
    y: y,
  }));

  return {
    segments,
    color,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    angle: Math.random() * Math.PI * 2,
    length,
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem("snake_records") || "{}");
  } catch {
    return {};
  }
}

function setRecords(records: Record<string, number>) {
  localStorage.setItem("snake_records", JSON.stringify(records));
}

const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ✅ Inicialización segura de la snake
  const [snake, setSnake] = useState(() =>
    Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      x: Math.max(400, window.innerWidth / 2) - i * SIZE,
      y: Math.max(300, window.innerHeight / 2),
    }))
  );

  const [foods, setFoods] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // ✅ Dimensiones seguras
  const [dimensions, setDimensions] = useState(() => ({
    width: Math.max(800, window.innerWidth),
    height: Math.max(600, window.innerHeight),
  }));

  const [username, setUsername] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);

  // ✅ Estado reactivo para crecimiento
  const [pendingGrowth, setPendingGrowth] = useState(0);

  // ✅ Target inicial seguro
  const target = useRef({
    x: Math.max(400, window.innerWidth / 2),
    y: Math.max(300, window.innerHeight / 2)
  });

  const angleRef = useRef(0);

  // ✅ CALCULAR RADIO REACTIVO CON USEMEMO
  const snakeRadius = useMemo(() => {
    return SIZE / 2 + (snake.length * 0.3);
  }, [snake.length]);

  // Pedir SIEMPRE el nombre de usuario al entrar con SweetAlert2
  useEffect(() => {
    async function askUsername() {
      const { value: user } = await Swal.fire({
        title: "¡Bienvenido!",
        text: "Ingresa tu nombre de usuario:",
        input: "text",
        inputPlaceholder: "Tu nombre",
        confirmButtonText: "Jugar",
        allowOutsideClick: false,
        allowEscapeKey: false,
        inputValidator: (value) => {
          if (!value) return "Por favor ingresa un nombre";
        },
        customClass: {
          popup: "bg-black/90 text-pink-300",
          confirmButton: "bg-pink-500 text-white px-6 py-2 rounded font-bold",
        },
      });
      const username = user || "Invitado";
      localStorage.setItem("snake_username", username);
      setUsername(username);

      // Cargar récord de este usuario
      const records = getRecords();
      setHighScore(records[username] || 0);
    }
    askUsername();
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

  // Mouse movement
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  // Inicializar comida
  useEffect(() => {
    if (dimensions.width < 100 || dimensions.height < 100) return;
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);
  }, [dimensions]);

  // Inicializar bots serpientes
  useEffect(() => {
    if (dimensions.width < 100 || dimensions.height < 100) return;
    const arr = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      arr.push(randomBot(dimensions.width, dimensions.height));
    }
    setBots(arr);
  }, [dimensions]);

  // ✅ LÓGICA PRINCIPAL CON ESTADO REACTIVO PARA CRECIMIENTO
  useEffect(() => {
    if (gameOver || dimensions.width < 100 || dimensions.height < 100) return;

    let animationId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      if (gameOver) return;
      if (now - lastTime > 16) {

        // ✅ MOVER BOTS SERPIENTES
        setBots((prevBots) => {
          return prevBots.map((bot) => {
            let { segments, color, dx, dy, angle, length } = bot;

            // Cambiar dirección ocasionalmente
            if (Math.random() < 0.02) {
              angle += (Math.random() - 0.5) * 0.5;
            }

            const head = segments[0];
            const newHead = {
              x: head.x + Math.cos(angle) * SPEED * 0.4,
              y: head.y + Math.sin(angle) * SPEED * 0.4,
            };

            // Rebote en bordes
            if (newHead.x < SIZE || newHead.x > dimensions.width - SIZE) {
              angle = Math.PI - angle;
            }
            if (newHead.y < SIZE || newHead.y > dimensions.height - SIZE) {
              angle = -angle;
            }

            // Mover serpiente bot
            const newSegments = [newHead, ...segments.slice(0, -1)];

            return { ...bot, segments: newSegments, angle };
          });
        });

        // ✅ MOVER LA SNAKE DEL JUGADOR
        setSnake((prev) => {
          const head = prev[0];
          const dx = target.current.x - (head.x + SIZE / 2);
          const dy = target.current.y - (head.y + SIZE / 2);

          const targetAngle = Math.atan2(dy, dx);
          const diff = ((targetAngle - angleRef.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          angleRef.current += diff * 0.12;

          const dirX = Math.cos(angleRef.current) * SPEED;
          const dirY = Math.sin(angleRef.current) * SPEED;
          const newHead = {
            x: head.x + dirX,
            y: head.y + dirY,
          };

          // Colisión con paredes
          if (
            newHead.x < SIZE ||
            newHead.x > dimensions.width - SIZE * 2 ||
            newHead.y < SIZE ||
            newHead.y > dimensions.height - SIZE * 2
          ) {
            setGameOver(true);
            setPendingGrowth(0);
            return prev;
          }

          // ✅ COLISIÓN CONSIGO MISMO
          if (
            prev.length > 10 &&
            prev.slice(8).some((seg) => dist(seg, newHead) < SIZE * 0.7)
          ) {
            setGameOver(true);
            setPendingGrowth(0);
            return prev;
          }

          // ✅ APLICAR CRECIMIENTO USANDO ESTADO REACTIVO
          if (pendingGrowth > 0) {
            setPendingGrowth(prev => prev - 1);
            return [newHead, ...prev]; // Crecer
          } else {
            return [newHead, ...prev.slice(0, -1)]; // Normal
          }
        });

        // ✅ VERIFICAR COLISIONES
        setSnake((currentSnake) => {
          if (currentSnake.length === 0) return currentSnake;
          const head = currentSnake[0];
          const currentSnakeRadius = SIZE / 2 + (currentSnake.length * 0.3);

          // Verificar colisión con comida
          setFoods((currentFoods) => {
            const newFoods = currentFoods.filter((food) => {
              const d = dist(
                { x: head.x + SIZE / 2, y: head.y + SIZE / 2 },
                { x: food.x + food.r, y: food.y + food.r }
              );
              if (d < (food.r + SIZE / 2) * 1.2) {
                setPendingGrowth(prev => prev + 3); // ✅ 3 segmentos por comida
                setScore((s) => s + 5);
                return false;
              }
              return true;
            });

            if (newFoods.length < currentFoods.length) {
              newFoods.push(randomFood(dimensions.width, dimensions.height));
            }
            return newFoods;
          });

          // ✅ VERIFICAR COLISIÓN CON BOTS
          setBots((currentBots) => {
            let shouldDie = false;

            const newBots = currentBots.filter((bot) => {
              const botRadius = SIZE / 2 + (bot.segments.length * 0.3);
              let botShouldBeRemoved = false;

              // ✅ VERIFICAR CADA SEGMENTO DEL BOT
              for (let i = 0; i < bot.segments.length; i++) {
                const botSegment = bot.segments[i];
                const distance = dist(
                  { x: head.x + SIZE / 2, y: head.y + SIZE / 2 },
                  { x: botSegment.x + SIZE / 2, y: botSegment.y + SIZE / 2 }
                );

                if (distance < SIZE * 1.2) {
                  // ✅ SI ES LA CABEZA (i === 0) - COMPARAR TAMAÑOS
                  if (i === 0) {
                    if (currentSnakeRadius > botRadius) {
                      setPendingGrowth(prev => prev + bot.segments.length);
                      setScore((s) => s + bot.segments.length);
                      botShouldBeRemoved = true;
                    } else {
                      shouldDie = true;
                    }
                  }
                  // ✅ SI ES EL CUERPO (i > 0) - SIEMPRE PUEDES COMERLO
                  else {
                    setPendingGrowth(prev => prev + bot.segments.length);
                    setScore((s) => s + bot.segments.length);
                    botShouldBeRemoved = true;
                  }
                  break;
                }
              }

              return !botShouldBeRemoved;
            });

            // ✅ GAME OVER SOLO SI shouldDie ES TRUE
            if (shouldDie) {
              setGameOver(true);
              setScore(0);
              setPendingGrowth(0);
            }

            // Añadir nuevos bots si se comieron algunos
            while (newBots.length < BOT_COUNT) {
              newBots.push(randomBot(dimensions.width, dimensions.height));
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
  }, [gameOver, dimensions, pendingGrowth]);

  // Guardar récord al perder si es mayor
  useEffect(() => {
    if (!gameOver || !username) return;
    if (score > highScore) {
      setHighScore(score);
      const records = getRecords();
      records[username] = score;
      setRecords(records);
    }
    // eslint-disable-next-line
  }, [gameOver, username, score, highScore]);

  // ✅ Reinicio manual con posiciones seguras
  const handleRestart = () => {
    setSnake(
      Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
        x: Math.max(200, dimensions.width / 2) - i * SIZE,
        y: Math.max(200, dimensions.height / 2),
      }))
    );
    setScore(0);
    setGameOver(false);
    setPendingGrowth(0);
    angleRef.current = 0;

    // Resetear comidas
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);

    // Resetear bots serpientes
    const arrBots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      arrBots.push(randomBot(dimensions.width, dimensions.height));
    }
    setBots(arrBots);

    target.current = {
      x: Math.max(200, dimensions.width / 2),
      y: Math.max(200, dimensions.height / 2)
    };
  };

  // ✅ DIBUJO LIMPIO SIN DEBUG
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo negro puro
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Neon border
    ctx.save();
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 32;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#f472b6";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Comida
    foods.forEach((food) => {
      ctx.save();
      ctx.shadowColor = food.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = food.color;
      ctx.beginPath();
      ctx.arc(food.x + food.r, food.y + food.r, food.r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });

    // ✅ DIBUJAR BOTS SERPIENTES
    bots.forEach((bot) => {
      const botRadius = SIZE / 2 + (bot.segments.length * 0.3);
      const isDangerous = botRadius > snakeRadius;

      bot.segments.forEach((seg: { x: number; y: number }, i: number) => {
        ctx.save();

        // ✅ COLORES DIFERENTES PARA CABEZA Y CUERPO
        if (i === 0) {
          // CABEZA - Color más brillante con indicador de peligro
          ctx.shadowColor = isDangerous ? "#ff0000" : bot.color;
          ctx.shadowBlur = 25;
          ctx.fillStyle = isDangerous ? "#ff4444" : bot.color;
          ctx.lineWidth = isDangerous ? 3 : 1;
          ctx.strokeStyle = isDangerous ? "#ff0000" : bot.color;
        } else {
          // CUERPO - Más transparente y menos brillante
          ctx.shadowColor = bot.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = `${bot.color}44`; // Muy transparente
        }

        ctx.beginPath();
        ctx.arc(seg.x + SIZE / 2, seg.y + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
        ctx.fill();

        if (i === 0 && isDangerous) {
          ctx.stroke(); // Borde rojo para cabezas peligrosas
        }

        // ✅ NÚMERO EN LA CABEZA
        if (i === 0) {
          ctx.fillStyle = "#000";
          ctx.font = "bold 8px Arial";
          ctx.textAlign = "center";
          ctx.fillText(bot.segments.length.toString(), seg.x + SIZE / 2, seg.y + SIZE / 2 + 2);

          // Ojos
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(seg.x + SIZE / 2 - 2, seg.y + SIZE / 2 - 1, 1, 0, 2 * Math.PI);
          ctx.arc(seg.x + SIZE / 2 + 2, seg.y + SIZE / 2 - 1, 1, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.restore();
      });
    });

    // ✅ SERPIENTE DEL JUGADOR
    snake.forEach((seg, i) => {
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = i === 0 ? 24 : 8;
      ctx.fillStyle = i === 0 ? "#fff" : "#06b6d4";
      ctx.beginPath();
      ctx.arc(seg.x + SIZE / 2, seg.y + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();

      // ✅ TU TAMAÑO EN LA CABEZA
      if (i === 0) {
        ctx.fillStyle = "#000";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(snake.length.toString(), seg.x + SIZE / 2, seg.y + SIZE / 2 + 3);
      }

      ctx.restore();
    });

    // Game Over overlay
    if (gameOver) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "bold 56px 'Orbitron', Arial, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 24;
      ctx.fillText("¡Perdiste!", canvas.width / 2, canvas.height / 2);
      ctx.font = "bold 32px Arial";
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f472b6";
      ctx.fillText("Presiona el botón para reiniciar", canvas.width / 2, canvas.height / 2 + 60);
      ctx.restore();
    }
  }, [snake, foods, bots, gameOver, dimensions, snakeRadius]);

  // ✅ INTERFAZ LIMPIA
  return (
    <div className="fixed inset-0 z-0">
      {/* Badge de score */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <span className="bg-black/80 text-pink-300 border border-pink-400 rounded-full px-6 py-2 text-xl font-bold shadow-lg select-none">
          {username && <span className="mr-4">👤 {username}</span>}
          🍬 Comidas: {score}
          <span className="ml-4">🏆 Récord: {highScore}</span>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        style={{ display: "block", width: "100vw", height: "100vh" }}
      />
      {/* Botón de reinicio */}
      {gameOver && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={handleRestart}
            className="bg-gradient-to-r from-pink-500 to-pink-400 text-white text-2xl font-bold py-4 px-10 rounded-full shadow-2xl border-4 border-cyan-400 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            🔄 Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};

export default GameBoard;