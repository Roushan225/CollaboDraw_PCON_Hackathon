import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DrawingRoom from "./pages/DrawingRoom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<DrawingRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
