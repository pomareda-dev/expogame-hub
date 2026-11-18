import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Home } from "./views/Home";
import { ConnectFour } from "./games/ConnectFour";
import { MemoryGame } from "./games/MemoryGame";
import { CatcherGame } from "./games/CatcherGame";
import { CircuitoExpress } from "./games/CircuitoExpress";
import { LineaEnMarcha } from "./games/LineaEnMarcha";
import { GameRoute } from "./types";

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="w-full h-full animate-slide-up">
      <Routes>
        <Route path={GameRoute.HOME} element={<Home />} />
        <Route path={GameRoute.CONNECT_FOUR} element={<ConnectFour />} />
        <Route path={GameRoute.MEMORY} element={<MemoryGame />} />
        <Route path={GameRoute.CATCHER} element={<CatcherGame />} />
        <Route
          path={GameRoute.CIRCUITO_EXPRESS}
          element={<CircuitoExpress />}
        />
        <Route
          path={GameRoute.LINEA_EN_MARCHA}
          element={<LineaEnMarcha />}
        />
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
