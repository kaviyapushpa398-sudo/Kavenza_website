import { LazyMotion, MotionConfig } from "framer-motion";
import { NavigationShell } from "./layouts/NavigationShell";
import { Footer } from "./layouts/Footer";
import { Hero } from "./sections/Hero";
import { Statement } from "./sections/Statement";
import { About } from "./sections/About";
import { WhatWeBuild } from "./sections/WhatWeBuild";
import { Approach } from "./sections/Approach";
import { Products } from "./sections/Products";
import { TechStack } from "./sections/TechStack";
import { WhatWeBelieve } from "./sections/WhatWeBelieve";
import { Impact } from "./sections/Impact";
import { Founder } from "./sections/Founder";
import { FutureVision } from "./sections/FutureVision";
import { Contact } from "./sections/Contact";
import { AuthProvider } from "./auth/AuthContext";
import { AuthPage } from "./pages/AuthPages";

const loadMotionFeatures = () =>
  import("./motionFeatures").then((features) => features.default);

function AppContent() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/register" || path === "/login" || path === "/dashboard") {
    return (
      <MotionConfig reducedMotion="user">
        <LazyMotion features={loadMotionFeatures} strict>
          <AuthPage path={path} />
        </LazyMotion>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <div className="min-h-screen bg-kav-bg">
          <NavigationShell />
          <main id="main-content" tabIndex={-1}>
            <Hero />
            <Statement />
            <About />
            <WhatWeBuild />
            <Approach />
            <Products />
            <TechStack />
            <WhatWeBelieve />
            <Impact />
            <Founder />
            <FutureVision />
            <Contact />
          </main>
          <Footer />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
