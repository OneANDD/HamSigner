import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Navigation } from "./components/Navigation";
import Landing from "./pages/Landing";
import SignIPA from "./pages/SignIPA";
import CheckCert from "./pages/CheckCert";
import CertPass from "./pages/CertPass";

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path={"/"} component={Landing} />
        <Route path={"/signipa"} component={SignIPA} />
        <Route path={"/checkcert"} component={CheckCert} />
        <Route path={"/certpass"} component={CertPass} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
