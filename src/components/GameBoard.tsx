import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const SIZE = 14;
const SPEED = 2.2;
const FOOD_COUNT = 180;
const INITIAL_LENGTH = 10;

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
  const [snake, setSnake] = useState(
    Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      x: 400 - i * SIZE,
      y: 300,
    }))
  );
  const [foods, setFoods] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [username, setUsername] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);
  const target = useRef({ x: 400, y: 300 });
  const growRef = useRef(0);

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
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
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
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);
  }, [dimensions]);

  // Lógica principal del juego
  useEffect(() => {
    if (gameOver) return;

    let animationId: number;
    let lastTime = performance.now();
    let angle = 0;

    const step = (now: number) => {
      if (gameOver) return;
      if (now - lastTime > 16) {
        setSnake((prev) => {
          const head = prev[0];
          const dx = target.current.x - (head.x + SIZE / 2);
          const dy = target.current.y - (head.y + SIZE / 2);
          const targetAngle = Math.atan2(dy, dx);
          const diff = ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          angle += diff * 0.12;

          const dirX = Math.cos(angle) * SPEED;
          const dirY = Math.sin(angle) * SPEED;
          const newHead = {
            x: head.x + dirX,
            y: head.y + dirY,
          };

          // Colisión con paredes
          if (
            newHead.x < 0 ||
            newHead.x > dimensions.width - SIZE ||
            newHead.y < 0 ||
            newHead.y > dimensions.height - SIZE
          ) {
            setGameOver(true);
            return prev;
          }

          // Colisión consigo mismo
          if (
            prev.length > 10 &&
            prev.slice(5).some((seg) => dist(seg, newHead) < SIZE * 0.8)
          ) {
            setGameOver(true);
            return prev;
          }

          // Comer comida
          let ate = false;
          let growBy = 0;
          setFoods((oldFoods) => {
            const newFoods = oldFoods.filter((food) => {
              if (
                dist(
                  { x: newHead.x + SIZE / 2, y: newHead.y + SIZE / 2 },
                  { x: food.x + food.r, y: food.y + food.r }
                ) <
                Math.max(food.r, SIZE / 2) * 0.85
              ) {
                ate = true;
                growBy += Math.max(2, Math.round(food.r / 2));
                return false;
              }
              return true;
            });
            if (ate) {
              setScore((s) => s + 1);
              newFoods.push(randomFood(dimensions.width, dimensions.height));
            }
            return newFoods;
          });

          if (ate) {
            growRef.current += growBy;
          }

          if (growRef.current > 0) {
            growRef.current--;
            return [newHead, ...prev];
          } else {
            return [newHead, ...prev.slice(0, -1)];
          }
        });
        lastTime = now;
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [gameOver, dimensions]);

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
  }, [gameOver, username]);

  // Reinicio manual al perder
  const handleRestart = () => {
    setSnake(
      Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
        x: dimensions.width / 2 - i * SIZE,
        y: dimensions.height / 2,
      }))
    );
    setScore(0);
    setGameOver(false);
    growRef.current = 0;
    const arr = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      arr.push(randomFood(dimensions.width, dimensions.height));
    }
    setFoods(arr);
    target.current = { x: dimensions.width / 2, y: dimensions.height / 2 };
  };

  // Dibujo
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

    // Serpiente
    snake.forEach((seg, i) => {
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = i === 0 ? 24 : 8;
      ctx.fillStyle = i === 0 ? "#fff" : "#06b6d4";
      ctx.beginPath();
      ctx.arc(seg.x + SIZE / 2, seg.y + SIZE / 2, SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();
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
  }, [snake, foods, gameOver, dimensions]);

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