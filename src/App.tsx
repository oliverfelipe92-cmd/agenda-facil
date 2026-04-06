import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PatientForm from './components/PatientForm';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { Calendar, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <span className="text-xl font-bold text-slate-900">Agenda Fácil</span>
          </div>
          <Link 
            to="/admin" 
            className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Área do Profissional
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
              Gestão de consultas <span className="text-blue-600">descomplicada.</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Organize seus atendimentos particulares, receba dados de pacientes e sincronize tudo com seu Google Agenda automaticamente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/agendar" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                Link para Pacientes <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/admin" 
                className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                Acessar Painel
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-10">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900">Google Sync</p>
                <p className="text-sm text-slate-500">Sincronização em tempo real.</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900">Gestão Leve</p>
                <p className="text-sm text-slate-500">Foco no que importa.</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900">Seguro</p>
                <p className="text-sm text-slate-500">Dados protegidos.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-blue-600/5 blur-3xl rounded-full"></div>
            <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <img 
                src="https://picsum.photos/seed/medical/800/600" 
                alt="Dashboard Preview" 
                className="rounded-[2rem] w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          &copy; 2026 Agenda Fácil. Desenvolvido para profissionais independentes.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agendar" element={<PatientForm />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
