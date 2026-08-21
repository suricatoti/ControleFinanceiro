import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Recurrences from "./pages/Recurrences";
import Profile from "./pages/Profile";
import { WalletProvider } from "./contexts/WalletContext";

function App() {
  return (
    <WalletProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transacoes" element={<Transactions />} />
            <Route path="cadastros" element={<Categories />} />
            <Route path="recorrencias" element={<Recurrences />} />
            <Route path="perfil" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;
