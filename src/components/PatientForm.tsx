import React, { useState } from 'react';
import { db, collection, addDoc } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/utils';
import { motion } from 'motion/react';
import { CheckCircle2, User, Mail, Phone, MessageSquare, Send, Calendar as CalendarIcon, CreditCard, MapPin, Home } from 'lucide-react';

export default function PatientForm() {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    cpf: '',
    address: '',
    city: '',
    email: '',
    phone: '',
    patientStatus: 'new' as 'new' | 'existing',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });

      // Notify admin via API
      try {
        await fetch('/api/notify-admin-new-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientData: formData,
            adminEmail: 'oliverfelipe92@gmail.com', // Dr. Felipe's email
          }),
        });
      } catch (e) {
        console.error('Admin notification failed:', e);
      }

      setIsSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Dados Enviados!</h2>
          <p className="text-slate-600 mb-6">
            Obrigado por preencher seus dados. Entraremos em contato em breve para confirmar o horário da sua consulta.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            className="text-blue-600 font-medium hover:underline"
          >
            Enviar outro formulário
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Agenda Fácil</h1>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-left">
            <p className="text-blue-900 font-bold mb-2">Olá! Sou atendente do Dr. Felipe Oliveira.</p>
            <p className="text-blue-800 text-sm">Para fazer seu cadastro é necessário que você me envie esses dados:</p>
          </div>
        </div>

        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-lg space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <User className="w-4 h-4" /> Nome Completo
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Data de Nascimento
              </label>
              <input
                required
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> CPF
              </label>
              <input
                required
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Endereço (Rua)
              </label>
              <input
                required
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Home className="w-4 h-4" /> Cidade
              </label>
              <input
                required
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" /> E-mail
              </label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Telefone / WhatsApp
              </label>
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Você já é paciente do Dr. Felipe ou é a primeira vez?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, patientStatus: 'existing' })}
                className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                  formData.patientStatus === 'existing' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                Já sou paciente
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, patientStatus: 'new' })}
                className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                  formData.patientStatus === 'new' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                Primeira vez
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Observações (Opcional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Conte um pouco sobre o motivo da consulta..."
            />
          </div>

          <button
            disabled={isSubmitting}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100"
          >
            {isSubmitting ? 'Enviando...' : (
              <>
                <Send className="w-5 h-5" /> Enviar Cadastro
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-400">Muito obrigado!</p>
        </motion.form>
      </div>
    </div>
  );
}
