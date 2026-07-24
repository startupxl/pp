import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Workshop from "./pages/Workshop";
import Dashboard from "./pages/Dashboard";
import IssueTree from "./pages/IssueTree";
import Mece from "./pages/Mece";
import Pyramid from "./pages/Pyramid";
import Scqa from "./pages/Scqa";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/workshop" element={<Home />} />
        <Route path="/workshop/:id" element={<Workshop />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
        <Route path="/issue-tree/:id" element={<IssueTree />} />
        <Route path="/mece/:id" element={<Mece />} />
        <Route path="/pyramid/:id" element={<Pyramid />} />
        <Route path="/scqa/:id" element={<Scqa />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
