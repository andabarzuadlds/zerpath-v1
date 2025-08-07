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

function randomBot(width: number, height: number) {
  const length = 5 + Math.floor(Math.random() * 15);
  const x = Math.random() * (width - 300) + 150;
  const y = Math.random() * (height - 300) + 150;
  const color = randomColor();

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

  const [dimensions, setDimensions] = useState(() => ({
    width: Math.max(800, window.innerWidth),
    height: Math.max(600, window.innerHeight),
  }));

  const [username, setUsername] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [pendingGrowth, setPendingGrowth] = useState(0);

  // ✅ SISTEMA MEJORADO PARA QUEDARSE QUIETO
  const [isMouseMoving, setIsMouseMoving] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const isNearTargetRef = useRef(false); // ✅ NUEVO: Detectar si está cerca del target

  const target = useRef({
    x: Math.max(400, window.innerWidth / 2),
    y: Math.max(300, window.innerHeight / 2)
  });

  const angleRef = useRef(0);

  const snakeRadius = useMemo(() => {
    return SIZE / 2 + (snake.length * 0.3);
  }, [snake.length]);

  // Pedir nombre de usuario
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

  // ✅ MOUSE MOVEMENT MEJORADO PARA QUEDARSE QUIETO
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const now = performance.now();
      const newPosition = { x: e.clientX, y: e.clientY };
      
      // ✅ UMBRAL MÁS ALTO PARA EVITAR MICRO-MOVIMIENTOS
      const moved = Math.hypot(
        newPosition.x - lastMousePosition.x,
        newPosition.y - lastMousePosition.y
      ) > 15; // ✅ AUMENTADO A 15 PÍXELES
      
      if (moved) {
        target.current = newPosition;
        setLastMousePosition(newPosition);
        lastMoveTimeRef.current = now;
        isNearTargetRef.current = false; // ✅ RESET cuando se mueve
        
        if (!isMouseMoving) {
          setIsMouseMoving(true);
        }
      }
    };

    if (lastMousePosition.x === 0 && lastMousePosition.y === 0) {
      const initialPos = { x: target.current.x, y: target.current.y };
      setLastMousePosition(initialPos);
      lastMoveTimeRef.current = performance.now();
    }

    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [lastMousePosition, isMouseMoving]);

  // ✅ VERIFICAR SI EL MOUSE SIGUE MOVIÉNDOSE (MÁS TIEMPO)
  useEffect(() => {
    if (gameOver) return;
    
    const checkMouseMovement = setInterval(() => {
      const now = performance.now();
      // ✅ AUMENTADO A 300ms PARA MÁS ESTABILIDAD
      if (now - lastMoveTimeRef.current > 300 && isMouseMoving) {
        setIsMouseMoving(false);
      }
    }, 100); // ✅ VERIFICAR CADA 100ms

    return () => clearInterval(checkMouseMovement);
  }, [gameOver, isMouseMoving]);

  // Inicializar comida
  useEffect(() => {
    if (dimensions.width < 100 || dimensions.height < 100) return;
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);
  }, [dimensions]);

  // Inicializar bots
  useEffect(() => {
    if (dimensions.width < 100 || dimensions.height < 100) return;
    const arr = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      arr.push(randomBot(dimensions.width, dimensions.height));
    }
    setBots(arr);
  }, [dimensions]);

  // ✅ LÓGICA PRINCIPAL CON PARADA COMPLETA
  useEffect(() => {
    if (gameOver || dimensions.width < 100 || dimensions.height < 100) return;

    let animationId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      if (gameOver) return;
      if (now - lastTime > 16) {

        // Mover bots (igual que antes)
        setBots((prevBots) => {
          return prevBots.map((bot) => {
            let { segments, color, dx, dy, angle, length } = bot;

            if (Math.random() < 0.02) {
              angle += (Math.random() - 0.5) * 0.5;
            }

            const head = segments[0];
            const newHead = {
              x: head.x + Math.cos(angle) * SPEED * 0.4,
              y: head.y + Math.sin(angle) * SPEED * 0.4,
            };

            if (newHead.x < SIZE || newHead.x > dimensions.width - SIZE) {
              angle = Math.PI - angle;
            }
            if (newHead.y < SIZE || newHead.y > dimensions.height - SIZE) {
              angle = -angle;
            }

            const newSegments = [newHead, ...segments.slice(0, -1)];
            return { ...bot, segments: newSegments, angle };
          });
        });

        // ✅ MOVER LA SNAKE CON PARADA COMPLETA
        setSnake((prev) => {
          const head = prev[0];
          
          // ✅ CALCULAR DISTANCIA AL TARGET
          const distanceToTarget = Math.hypot(
            target.current.x - (head.x + SIZE / 2),
            target.current.y - (head.y + SIZE / 2)
          );
          
          // ✅ SI ESTÁ CERCA DEL TARGET (30px), MARCAR COMO "CERCA"
          if (distanceToTarget < 30) {
            isNearTargetRef.current = true;
          }
          
          // ✅ SOLO MOVERSE SI:
          // 1. El mouse se está moviendo, O
          // 2. Está lejos del target (más de 30px)
          const shouldMove = isMouseMoving || (!isNearTargetRef.current && distanceToTarget > 30);
          
          if (!shouldMove) {
            // ✅ QUEDARSE COMPLETAMENTE QUIETO
            return prev;
          }
          
          // ✅ SOLO CAMBIAR DIRECCIÓN SI EL MOUSE SE ESTÁ MOVIENDO
          if (isMouseMoving) {
            const dx = target.current.x - (head.x + SIZE / 2);
            const dy = target.current.y - (head.y + SIZE / 2);
            
            const targetAngle = Math.atan2(dy, dx);
            const diff = ((targetAngle - angleRef.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            angleRef.current += diff * 0.12;
          }

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

        // Verificar colisiones (igual que antes)
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
                setPendingGrowth(prev => prev + 3);
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
              setScore(0);
              setPendingGrowth(0);
            }

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
  }, [gameOver, dimensions, pendingGrowth, isMouseMoving]);

  // Guardar récord
  useEffect(() => {
    if (!gameOver || !username) return;
    if (score > highScore) {
      setHighScore(score);
      const records = getRecords();
      records[username] = score;
      setRecords(records);
    }
  }, [gameOver, username, score, highScore]);

  // ✅ Reinicio con reset de estados
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
    setIsMouseMoving(false);
    isNearTargetRef.current = false; // ✅ RESET
    lastMoveTimeRef.current = performance.now();

    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);

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

  // Dibujo (igual que antes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 32;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#f472b6";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

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

    bots.forEach((bot) => {
      const botRadius = SIZE / 2 + (bot.segments.length * 0.3);
      const isDangerous = botRadius > snakeRadius;

      bot.segments.forEach((seg: { x: number; y: number }, i: number) => {
        ctx.save();

        if (i === 0) {
          ctx.shadowColor = isDangerous ? "#ff0000" : bot.color;
          ctx.shadowBlur = 25;
          ctx.fillStyle = isDangerous ? "#ff4444" : bot.color;
          ctx.lineWidth = isDangerous ? 3 : 1;
          ctx.strokeStyle = isDangerous ? "#ff0000" : bot.color;
        } else {
          ctx.shadowColor = bot.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = `${bot.color}44`;
        }

        ctx.beginPath();
        ctx.arc(seg.x + SIZE / 2, seg.y + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
        ctx.fill();

        if (i === 0 && isDangerous) {
          ctx.stroke();
        }

        if (i === 0) {
          ctx.fillStyle = "#000";
          ctx.font = "bold 8px Arial";
          ctx.textAlign = "center";
          ctx.fillText(bot.segments.length.toString(), seg.x + SIZE / 2, seg.y + SIZE / 2 + 2);

          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(seg.x + SIZE / 2 - 2, seg.y + SIZE / 2 - 1, 1, 0, 2 * Math.PI);
          ctx.arc(seg.x + SIZE / 2 + 2, seg.y + SIZE / 2 - 1, 1, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.restore();
      });
    });

    snake.forEach((seg, i) => {
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = i === 0 ? 24 : 8;
      ctx.fillStyle = i === 0 ? "#fff" : "#06b6d4";
      ctx.beginPath();
      ctx.arc(seg.x + SIZE / 2, seg.y + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();

      if (i === 0) {
        ctx.fillStyle = "#000";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(snake.length.toString(), seg.x + SIZE / 2, seg.y + SIZE / 2 + 3);
      }

      ctx.restore();
    });

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

  return (
    <div className="fixed inset-0 z-0">
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