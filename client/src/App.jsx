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
import CashFlowProjection from "./pages/CashFlowProjection";
import EmpathyMap from "./pages/EmpathyMap";
import JtbdWorkshop from "./pages/JtbdWorkshop";
import PlForecasting from "./pages/PlForecasting";
import CustomerJourney from "./pages/CustomerJourney";
import UserPersona from "./pages/UserPersona";
import EquityManagement from "./pages/EquityManagement";
import GtmStrategy from "./pages/GtmStrategy";
import RiskAssessment from "./pages/RiskAssessment";
import IceScoring from "./pages/IceScoring";
import MoscowPrioritization from "./pages/MoscowPrioritization";
import StakeholderMapping from "./pages/StakeholderMapping";
import BalancedScorecard from "./pages/BalancedScorecard";
import ContentCalendar from "./pages/ContentCalendar";
import Mckinsey7s from "./pages/Mckinsey7s";
import SocialMediaStrategy from "./pages/SocialMediaStrategy";
import CustomerHealthScorecard from "./pages/CustomerHealthScorecard";
import OnboardingRoadmap from "./pages/OnboardingRoadmap";
import HiringScorecard from "./pages/HiringScorecard";
import LeadManagement from "./pages/LeadManagement";
import PricingPackaging from "./pages/PricingPackaging";
import RecruitmentFunnel from "./pages/RecruitmentFunnel";
import SalesPipeline from "./pages/SalesPipeline";
import TeamCapacityHeatmap from "./pages/TeamCapacityHeatmap";
import ComplianceHub from "./pages/ComplianceHub";
import ProductAnalytics from "./pages/ProductAnalytics";
import InnovationSandbox from "./pages/InnovationSandbox";
import InvestorRelations from "./pages/InvestorRelations";
import CynefinFramework from "./pages/CynefinFramework";
import FiveWhys from "./pages/FiveWhys";
import EisenhowerMatrix from "./pages/EisenhowerMatrix";
import PorterFiveForces from "./pages/PorterFiveForces";
import HeroJourney from "./pages/HeroJourney";
import Billing from "./pages/Billing";
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
          path="/billing"
          element={
            <ProtectedRoute>
              <Billing />
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
        <Route
          path="/cash-flow-projection/:id"
          element={
            <ProtectedRoute>
              <CashFlowProjection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empathy-map/:id"
          element={
            <ProtectedRoute>
              <EmpathyMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jtbd-workshop/:id"
          element={
            <ProtectedRoute>
              <JtbdWorkshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pl-forecasting/:id"
          element={
            <ProtectedRoute>
              <PlForecasting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-journey/:id"
          element={
            <ProtectedRoute>
              <CustomerJourney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-persona/:id"
          element={
            <ProtectedRoute>
              <UserPersona />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equity-management/:id"
          element={
            <ProtectedRoute>
              <EquityManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gtm-strategy/:id"
          element={
            <ProtectedRoute>
              <GtmStrategy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/risk-assessment/:id"
          element={
            <ProtectedRoute>
              <RiskAssessment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ice-scoring/:id"
          element={
            <ProtectedRoute>
              <IceScoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moscow-prioritization/:id"
          element={
            <ProtectedRoute>
              <MoscowPrioritization />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stakeholder-mapping/:id"
          element={
            <ProtectedRoute>
              <StakeholderMapping />
            </ProtectedRoute>
          }
        />
        <Route
          path="/balanced-scorecard/:id"
          element={
            <ProtectedRoute>
              <BalancedScorecard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/content-calendar/:id"
          element={
            <ProtectedRoute>
              <ContentCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mckinsey-7s/:id"
          element={
            <ProtectedRoute>
              <Mckinsey7s />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social-media-strategy/:id"
          element={
            <ProtectedRoute>
              <SocialMediaStrategy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-health-scorecard/:id"
          element={
            <ProtectedRoute>
              <CustomerHealthScorecard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding-roadmap/:id"
          element={
            <ProtectedRoute>
              <OnboardingRoadmap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hiring-scorecard/:id"
          element={
            <ProtectedRoute>
              <HiringScorecard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lead-management/:id"
          element={
            <ProtectedRoute>
              <LeadManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing-packaging/:id"
          element={
            <ProtectedRoute>
              <PricingPackaging />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruitment-funnel/:id"
          element={
            <ProtectedRoute>
              <RecruitmentFunnel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-pipeline/:id"
          element={
            <ProtectedRoute>
              <SalesPipeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-capacity-heatmap/:id"
          element={
            <ProtectedRoute>
              <TeamCapacityHeatmap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance-hub/:id"
          element={
            <ProtectedRoute>
              <ComplianceHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-analytics/:id"
          element={
            <ProtectedRoute>
              <ProductAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/innovation-sandbox/:id"
          element={
            <ProtectedRoute>
              <InnovationSandbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investor-relations/:id"
          element={
            <ProtectedRoute>
              <InvestorRelations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cynefin-framework/:id"
          element={
            <ProtectedRoute>
              <CynefinFramework />
            </ProtectedRoute>
          }
        />
        <Route
          path="/five-whys/:id"
          element={
            <ProtectedRoute>
              <FiveWhys />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eisenhower-matrix/:id"
          element={
            <ProtectedRoute>
              <EisenhowerMatrix />
            </ProtectedRoute>
          }
        />
        <Route
          path="/porter-five-forces/:id"
          element={
            <ProtectedRoute>
              <PorterFiveForces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hero-journey/:id"
          element={
            <ProtectedRoute>
              <HeroJourney />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
