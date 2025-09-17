import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar';
import Home from './Pages/Home';
import About from './Pages/About';
import Contact from './Pages/Contact';
import Services from './Pages/Services';
import Footer from './Components/Footer';
import PageLoader from './Components/PageLoader';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<PageLoader><Home /></PageLoader>} />
        <Route path="/about" element={<PageLoader><About /></PageLoader>} />
        <Route path="/contact" element={<PageLoader><Contact /></PageLoader>} />
        <Route path="/services" element={<PageLoader><Services /></PageLoader>} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;