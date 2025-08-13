import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast"; // Import Toaster

import Navs from "./navs";
function App() {
  return (
    <BrowserRouter>
      <div
        className={`bg-dark-primary text-text-primary min-h-screen flex flex-col`}
      // style={{ fontFamily: "TimeBurner, sans-serif" }}
      >
        <AuthProvider>
          {/* Toaster for notifications */}
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              // Define default options
              className: "!bg-dark-tertiary !text-text-primary !shadow-lg", // Tailwind classes need !important sometimes with react-hot-toast
              duration: 5000,
              // Default style fallback (Tailwind classes preferred)
              // style: {
              //   background: '#2c2c2c', // Dark background for toast
              //   color: '#e0e0e0', // Light text
              // },
              // Default options for specific types (can override className too)
              success: {
                duration: 3000,
                className: "!bg-functional-success !text-text-on-accent",
                // iconTheme: { primary: '#fff', secondary: '#22c55e' },
              },
              error: {
                duration: 5000,
                className: "!bg-functional-danger !text-text-on-accent",
                // iconTheme: { primary: '#fff', secondary: '#ef4444' },
              },
            }}
          />
          <Navs />
        </AuthProvider>
      </div>
    </BrowserRouter>
  );
}

export default App;
