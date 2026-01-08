import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import V1 from "./pages/V1";


import FeedbackDashboard from "./pages/Dashboard";


function App() {
  return (
    <BrowserRouter>
      {/* <nav className="bg-blue-600 p-4 text-white flex space-x-4">
        <Link to="/v1">V1</Link>
        <Link to="/v2">V2</Link>
      </nav> */}

      <Routes>

        <Route path="/" element={<V1 />} />

        <Route path="/dashboard" element={<FeedbackDashboard />} />


 
        {/* <Route path="/activities" element={<Activities />} />
        <Route path="/lessons" element={<Lessons />} /> */}



      </Routes>
    </BrowserRouter>
  );
}

export default App;
