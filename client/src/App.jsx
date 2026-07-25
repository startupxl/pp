import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Workshop from "./pages/Workshop";
import Dashboard from "./pages/Dashboard";
import IssueTree from "./pages/IssueTree";
import Mece from "./pages/Mece";
import Pyramid from "./pages/Pyramid";
import Scqa from "./pages/Scqa";
import LogicTree from "./pages/LogicTree";
import SystemsThinking from "./pages/SystemsThinking";
import FirstPrinciples from "./pages/FirstPrinciples";
import Hypothesis from "./pages/Hypothesis";
import GeMcKinsey from "./pages/GeMcKinsey";
import ThreeHorizons from "./pages/ThreeHorizons";
import Porter from "./pages/Porter";
import StrategicCascade from "./pages/StrategicCascade";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workshop"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workshop/:id"
          element={
            <ProtectedRoute>
              <Workshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:id"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issue-tree/:id"
          element={
            <ProtectedRoute>
              <IssueTree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mece/:id"
          element={
            <ProtectedRoute>
              <Mece />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pyramid/:id"
          element={
            <ProtectedRoute>
              <Pyramid />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scqa/:id"
          element={
            <ProtectedRoute>
              <Scqa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logic-tree/:id"
          element={
            <ProtectedRoute>
              <LogicTree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/systems-thinking/:id"
          element={
            <ProtectedRoute>
              <SystemsThinking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/first-principles/:id"
          element={
            <ProtectedRoute>
              <FirstPrinciples />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hypothesis/:id"
          element={
            <ProtectedRoute>
              <Hypothesis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ge-mckinsey/:id"
          element={
            <ProtectedRoute>
              <GeMcKinsey />
            </ProtectedRoute>
          }
        />
        <Route
          path="/three-horizons/:id"
          element={
            <ProtectedRoute>
              <ThreeHorizons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/porter/:id"
          element={
            <ProtectedRoute>
              <Porter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategic-cascade/:id"
          element={
            <ProtectedRoute>
              <StrategicCascade />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
