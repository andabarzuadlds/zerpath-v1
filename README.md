# 🚀 Snake Galaxy Enhanced

¡Bienvenido a Snake Galaxy Enhanced! Una reimaginación moderna y multijugador del clásico juego de la serpiente, ambientado en un universo vasto y peligroso. Navega por diferentes ambientes galácticos, compite contra otros jugadores en tiempo real y enfréntate a bots cada vez más inteligentes y agresivos.

## ✨ Hecho Con

Este proyecto fue construido utilizando un stack de tecnologías modernas para crear una experiencia web rápida, reactiva y en tiempo real.

*   **Frontend:**
    *   [**React**](https://react.dev/): Biblioteca principal para construir la interfaz de usuario.
    *   [**Vite**](https://vitejs.dev/): Herramienta de desarrollo y empaquetado de frontend rápida.
    *   [**TypeScript**](https://www.typescriptlang.org/): Para añadir tipado estático y mejorar la robustez del código.
    *   [**Tailwind CSS**](https://tailwindcss.com/): Framework de CSS "utility-first" para un diseño rápido y responsivo.
    *   **HTML5 Canvas:** Para el renderizado de alta performance de toda la lógica del juego.

*   **Backend & API:**
    *   [**Node.js**](https://nodejs.org/): Entorno de ejecución para el servidor.
    *   [**Express.js**](https://expressjs.com/): Framework minimalista para crear la API REST.

*   **Servicios y Despliegue:**
    *   [**Ably**](https://ably.com/): Plataforma para la comunicación en tiempo real (presencia y sincronización de estado del juego).
    *   [**Upstash**](https://upstash.com/): Base de datos Redis serverless para la persistencia de la tabla de clasificación (leaderboard).
    *   [**Vercel**](https://vercel.com/): Plataforma para el despliegue del frontend y el backend como funciones serverless.

## 🛠️ ¿Cómo se hizo?

El proyecto está estructurado como un monorepo con un frontend de React y una API de Node en la carpeta `/api`.

*   **Lógica del Juego (Frontend):**
    *   El componente principal `src/components/GameBoard.tsx` maneja casi toda la lógica del juego.
    *   El estado del juego (posición de la serpiente, comida, bots, puntuación) se gestiona con los hooks de React (`useState`, `useRef`, `useMemo`).
    *   El renderizado se realiza en un elemento `<canvas>`, actualizándose en cada frame mediante `requestAnimationFrame` para un movimiento fluido.

*   **Multijugador en Tiempo Real:**
    *   **Autenticación:** El cliente solicita un token a nuestra API (`/api/ably-auth`), que a su vez lo genera de forma segura usando la clave privada de Ably.
    *   **Presencia:** Se utiliza `channel.presence` de Ably para mostrar una lista en tiempo real de los jugadores conectados al canal del juego.
    *   **Sincronización de Estado:** Cada cliente publica la posición de su serpiente en el canal `game-room` a una frecuencia controlada (10 veces por segundo). Los demás clientes se suscriben a estos mensajes para recibir las posiciones de los oponentes.
    *   **Interpolación:** Para evitar que las serpientes de otros jugadores se muevan a saltos, se implementa una **interpolación del lado del cliente**. En lugar de teletransportar al jugador a su nueva posición, se anima suavemente desde su última posición conocida hasta la nueva, creando una ilusión de movimiento perfectamente fluido.

*   **Persistencia de Datos:**
    *   Las puntuaciones más altas se guardan en una base de datos **Redis** alojada en Upstash.
    *   La API expone endpoints para obtener y establecer la puntuación de un jugador, así como para obtener la tabla de clasificación global.
    *   
## 📚 Documentación

Para más información sobre las tecnologías clave utilizadas en este proyecto, consulta su documentación del proyecto:

*   https://deepwiki.com/andabarzuadlds/zerpath-v1/7-project-configuration

## Versioning

Este proyecto utiliza **Git** para el control de versiones. Cada cambio significativo se registra en un commit.
