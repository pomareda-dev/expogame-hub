import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Home } from "./views/Home";
import { ConnectFour } from "./games/ConnectFour";
import { FlappyBird } from "./games/FlappyBird";
import { MemoryGame } from "./games/MemoryGame";
import { CatcherGame } from "./games/CatcherGame";
import { GameRoute } from "./types";

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="w-full h-full animate-slide-up">
      <Routes>
        <Route path={GameRoute.HOME} element={<Home />} />
        <Route path={GameRoute.CONNECT_FOUR} element={<ConnectFour />} />
        <Route path={GameRoute.FLAPPY_BIRD} element={<FlappyBird />} />
        <Route path={GameRoute.MEMORY} element={<MemoryGame />} />
        <Route path={GameRoute.CATCHER} element={<CatcherGame />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
};

export default App;
