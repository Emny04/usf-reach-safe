import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import SafePlaces from "./pages/SafePlaces";
import StartJourney from "./pages/StartJourney";
import ActiveJourney from "./pages/ActiveJourney";
import History from "./pages/History";
import Settings from "./pages/Settings";
import TrackJourney from "./pages/TrackJourney";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/track/:id" element={<TrackJourney />} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/contacts" element={<Layout><Contacts /></Layout>} />
            <Route path="/safe-places" element={<Layout><SafePlaces /></Layout>} />
            <Route path="/start-journey" element={<Layout><StartJourney /></Layout>} />
            <Route path="/journey/:id" element={<Layout><ActiveJourney /></Layout>} />
            <Route path="/history" element={<Layout><History /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
