import GameBoard from "./components/GameBoard";
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <GameBoard />
      <Analytics />
    </div>
  );
}

export default App;
