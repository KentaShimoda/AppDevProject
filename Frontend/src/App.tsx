import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Student_Visitor_Pages/Landing";
import Login from "./pages/Student_Visitor_Pages/Login";
import Signup from "./pages/Student_Visitor_Pages/Signup";
import Dashboard from "./pages/Student_Visitor_Pages/Dashboard";
import Profile from "./pages/Student_Visitor_Pages/Profile";
import Myarchive from "./pages/Student_Visitor_Pages/Myarchive";
import Preview from "./pages/Student_Visitor_Pages/Preview";
import Coordinator from "./pages/Student_Visitor_Pages/Coordinator";
import Upload from "./pages/Student_Visitor_Pages/Upload";
import VerifyEmail from "./pages/Student_Visitor_Pages/VerifyEmail";
import ForgotPassword from "./pages/Student_Visitor_Pages/ForgotPassword";
import ResetPassword from "./pages/Student_Visitor_Pages/ResetPassword";
import UserManagement from "./pages/Admin_Pages/UserManagement";

const App: React.FC = () => {
  return (
    <div>
      {/* Navigation
      <nav style={{ marginBottom: "1rem" }}>
        <Link to="/">Landing</Link> | <Link to="/Login">Login</Link> |{" "}
        <Link to="/Signup">Signup</Link> | <Link to="/Dashboard">Dashboard</Link> | 
        <Link to="/Profile">Profile</Link> | <Link to="/Myarchive">My Archive</Link> |  
        <Link to="/Preview">Preview</Link> | <Link to="/Coordinator">Coordinator</Link> | 
        <Link to="/Upload">Upload</Link> | <Link to="/UserManagement">User Management</Link>
      </nav> */}

      {/* Route Definitions */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Myarchive" element={<Myarchive />} />
        <Route path="/preview/:id" element={<Preview />} />
        <Route path="/Coordinator" element={<Coordinator />} />
        <Route path="/Upload" element={<Upload />} />
        <Route path="/VerifyEmail" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />  
        <Route path="/UserManagement" element={<UserManagement />} />
      </Routes>
    </div>
  );
};

export default App;
