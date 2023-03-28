import React from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Account from "./Account";
import Prices from "./Prices";
import Register from "./Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="prices" element={<Prices />} />
        <Route path="account" element={<Account />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
