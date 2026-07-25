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
import CoreCompetency from "./pages/CoreCompetency";
import LeanCanvas from "./pages/LeanCanvas";
import Vrio from "./pages/Vrio";
import Okr from "./pages/Okr";
import ProductRoadmap from "./pages/ProductRoadmap";
import ProjectCharter from "./pages/ProjectCharter";
import Raci from "./pages/Raci";
import Retrospective from "./pages/Retrospective";
import SprintPlanning from "./pages/SprintPlanning";
import CriticalPath from "./pages/CriticalPath";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import BurnRate from "./pages/BurnRate";
import CapacityPlanning from "./pages/CapacityPlanning";
import SkillMatrix from "./pages/SkillMatrix";
import UnitEconomics from "./pages/UnitEconomics";
import ThreeSixtyFeedback from "./pages/ThreeSixtyFeedback";
import CompetitiveBenchmarking from "./pages/CompetitiveBenchmarking";
import MarketSizing from "./pages/MarketSizing";
import PerformanceReview from "./pages/PerformanceReview";
import CommunicationAudit from "./pages/CommunicationAudit";
import PrepFramework from "./pages/PrepFramework";
import StarFramework from "./pages/StarFramework";
import BlufWorkshop from "./pages/BlufWorkshop";
import SirWorkshop from "./pages/SirWorkshop";
import TellShowTell from "./pages/TellShowTell";
import InitiativeWorkshop from "./pages/InitiativeWorkshop";
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
        <Route
          path="/core-competency/:id"
          element={
            <ProtectedRoute>
              <CoreCompetency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lean-canvas/:id"
          element={
            <ProtectedRoute>
              <LeanCanvas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vrio/:id"
          element={
            <ProtectedRoute>
              <Vrio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/okr/:id"
          element={
            <ProtectedRoute>
              <Okr />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-roadmap/:id"
          element={
            <ProtectedRoute>
              <ProductRoadmap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project-charter/:id"
          element={
            <ProtectedRoute>
              <ProjectCharter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/raci/:id"
          element={
            <ProtectedRoute>
              <Raci />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retrospective/:id"
          element={
            <ProtectedRoute>
              <Retrospective />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sprint-planning/:id"
          element={
            <ProtectedRoute>
              <SprintPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/critical-path/:id"
          element={
            <ProtectedRoute>
              <CriticalPath />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project-workspace/:id"
          element={
            <ProtectedRoute>
              <ProjectWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/burn-rate/:id"
          element={
            <ProtectedRoute>
              <BurnRate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/capacity-planning/:id"
          element={
            <ProtectedRoute>
              <CapacityPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/skill-matrix/:id"
          element={
            <ProtectedRoute>
              <SkillMatrix />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unit-economics/:id"
          element={
            <ProtectedRoute>
              <UnitEconomics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/360-feedback/:id"
          element={
            <ProtectedRoute>
              <ThreeSixtyFeedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitive-benchmarking/:id"
          element={
            <ProtectedRoute>
              <CompetitiveBenchmarking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/market-sizing/:id"
          element={
            <ProtectedRoute>
              <MarketSizing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance-review/:id"
          element={
            <ProtectedRoute>
              <PerformanceReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communication-audit/:id"
          element={
            <ProtectedRoute>
              <CommunicationAudit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prep-framework/:id"
          element={
            <ProtectedRoute>
              <PrepFramework />
            </ProtectedRoute>
          }
        />
        <Route
          path="/star-framework/:id"
          element={
            <ProtectedRoute>
              <StarFramework />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bluf-workshop/:id"
          element={
            <ProtectedRoute>
              <BlufWorkshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decision-sir/:id"
          element={
            <ProtectedRoute>
              <SirWorkshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tell-show-tell/:id"
          element={
            <ProtectedRoute>
              <TellShowTell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/initiative-workshop/:id"
          element={
            <ProtectedRoute>
              <InitiativeWorkshop />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
