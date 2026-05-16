import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Dynamic route that captures the tab name from the URL */}
        <Route path="/:tab" element={<Dashboard />} />
        
        {/* Default route redirect to /chambers */}
        <Route path="/" element={<Navigate to="/chambers" replace />} />
        
        {/* Catch-all for unknown URLs */}
        <Route path="*" element={<Navigate to="/chambers" replace />} />
      </Routes>
    </Router>
  );
}

export default App;