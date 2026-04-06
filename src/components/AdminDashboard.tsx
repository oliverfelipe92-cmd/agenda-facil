import React, { useEffect, useState } from 'react';
import { auth, db, collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, signInWithPopup, googleProvider, signOut, GoogleAuthProvider } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { OperationType, handleFirestoreError, cn } from '../lib/utils';
import { createGoogleCalendarEvent } from '../services/calendarService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Clock, MapPin, Video, CheckCircle, 
  XCircle, LogIn, LogOut, Plus, Trash2, ExternalLink,
  Search, Filter, ChevronRight, ChevronLeft, AlertCircle, Send, Home, Copy, Check,
  CalendarDays, CalendarRange
} from 'lucide-react';
import { 
  format, parseISO, addHours, isTomorrow, startOfWeek, endOfWeek, 
  eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, 
  addDays, subDays, addMonths, subMonths, startOfDay, endOfDay,
  isSameMonth, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  cpf?: string;
  address?: string;
  city?: string;
  patientStatus?: 'new' | 'existing';
  notes: string;
  createdAt: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  dateTime: string;
  type: 'online' | 'viva' | 'yara_bezerra';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  googleEventId?: string;
  meetLink?: string;
  createdBy?: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  reason?: string;
  createdBy: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'calendar'>('calendar');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [tomorrowAppsCount, setTomorrowAppsCount] = useState(0);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    type: 'online' as 'online' | 'viva' | 'yara_bezerra',
  });
  const [blockData, setBlockData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    reason: ''
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qPatients = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'patients'));

    const qApps = query(collection(db, 'appointments'), orderBy('dateTime', 'desc'));
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      setAppointments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'appointments'));

    const qBlocked = query(collection(db, 'blocked_slots'));
    const unsubBlocked = onSnapshot(qBlocked, (snapshot) => {
      setBlockedSlots(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlockedSlot)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'blocked_slots'));

    return () => {
      unsubPatients();
      unsubApps();
      unsubBlocked();
    };
  }, [user]);

  const handlePrev = () => {
    if (calendarView === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (calendarView === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(a => isSameDay(parseISO(a.dateTime), date));
  };

  const getBrazilianHolidays = (year: number) => {
    const holidays: { date: string; name: string }[] = [
      { date: `${year}-01-01`, name: 'Confraternização Universal' },
      { date: `${year}-04-21`, name: 'Tiradentes' },
      { date: `${year}-05-01`, name: 'Dia do Trabalho' },
      { date: `${year}-09-07`, name: 'Independência do Brasil' },
      { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
      { date: `${year}-11-02`, name: 'Finados' },
      { date: `${year}-11-15`, name: 'Proclamação da República' },
      { date: `${year}-11-20`, name: 'Dia da Consciência Negra' },
      { date: `${year}-12-25`, name: 'Natal' },
    ];

    const getEaster = (y: number) => {
      const f = Math.floor,
        G = y % 19,
        C = f(y / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
      return new Date(y, month - 1, day);
    };

    const easter = getEaster(year);
    const addDaysToDate = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const carnival = addDaysToDate(easter, -47);
    const passionOfChrist = addDaysToDate(easter, -2);
    const corpusChristi = addDaysToDate(easter, 60);

    holidays.push({ date: format(carnival, 'yyyy-MM-dd'), name: 'Carnaval' });
    holidays.push({ date: format(passionOfChrist, 'yyyy-MM-dd'), name: 'Sexta-feira Santa' });
    holidays.push({ date: format(easter, 'yyyy-MM-dd'), name: 'Páscoa' });
    holidays.push({ date: format(corpusChristi, 'yyyy-MM-dd'), name: 'Corpus Christi' });

    return holidays;
  };

  const holidays = getBrazilianHolidays(currentDate.getFullYear());
  const nextYearHolidays = getBrazilianHolidays(currentDate.getFullYear() + 1);
  const allHolidays = [...holidays, ...nextYearHolidays];

  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // @ts-ignore - credential exists on result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setAccessToken(credential?.accessToken || null);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const renderCalendar = () => {
    if (calendarView === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      const days = eachDayOfInterval({ start, end });

      return (
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="bg-slate-50 p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{d}</div>
          ))}
          {days.map(day => {
            const dayApps = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const holiday = allHolidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
            const blocked = blockedSlots.find(s => s.date === format(day, 'yyyy-MM-dd') && s.isAllDay);
            
            return (
              <div key={day.toString()} className={cn("bg-white min-h-[120px] p-2 transition-colors hover:bg-slate-50 relative", !isCurrentMonth && "opacity-40", (holiday || blocked) && "bg-slate-50/50")}>
                <div className="flex justify-between items-start mb-2">
                  <div className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full", isToday(day) ? "bg-blue-600 text-white" : "text-slate-900")}>
                    {format(day, 'd')}
                  </div>
                  {holiday && (
                    <span className="text-[8px] font-bold text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded leading-none text-right max-w-[60px]">
                      {holiday.name}
                    </span>
                  )}
                </div>
                {blocked && (
                  <div className="absolute inset-0 bg-slate-200/20 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/80 px-2 py-1 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1">
                       <AlertCircle className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-500">Bloqueado</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {dayApps.map(a => (
                    <button 
                      key={a.id}
                      onClick={() => {
                        setSelectedAppointment(a);
                        setSelectedPatient(patients.find(p => p.id === a.patientId) || null);
                        setNewAppointment({
                          date: format(parseISO(a.dateTime), 'yyyy-MM-dd'),
                          time: format(parseISO(a.dateTime), 'HH:mm'),
                          type: a.type
                        });
                        setIsModalOpen(true);
                      }}
                      className={cn(
                        "w-full text-[10px] p-1.5 rounded-lg font-bold text-left truncate transition-all hover:scale-[1.02] flex items-center gap-1",
                        a.type === 'online' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : a.type === 'viva' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                      )}
                    >
                      {a.type === 'online' && <Video className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate">{format(parseISO(a.dateTime), 'HH:mm')} {a.patientName}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const weekDays = calendarView === 'week' 
      ? eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) })
      : [currentDate];

    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[80px_1fr] border-b border-slate-100">
          <div className="bg-slate-50 border-r border-slate-100"></div>
          <div className={cn("grid", calendarView === 'week' ? "grid-cols-7" : "grid-cols-1")}>
            {weekDays.map(day => {
              const holiday = allHolidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
              return (
                <div key={day.toString()} className={cn("p-4 text-center border-r border-slate-100 last:border-r-0 relative", holiday && "bg-red-50/30")}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className={cn("text-xl font-black", isToday(day) ? "text-blue-600" : "text-slate-900")}>{format(day, 'dd')}</p>
                  {holiday && (
                    <p className="text-[9px] font-bold text-red-500 uppercase mt-1 truncate px-1" title={holiday.name}>{holiday.name}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] h-[600px] overflow-y-auto">
          <div className="bg-slate-50 border-r border-slate-100">
            {hours.map(h => (
              <div key={h} className="h-20 border-b border-slate-100 flex items-start justify-center pt-2 text-[10px] font-bold text-slate-400">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className={cn("grid relative", calendarView === 'week' ? "grid-cols-7" : "grid-cols-1")}>
            {weekDays.map(day => {
              const dayBlockedSlots = blockedSlots.filter(s => s.date === format(day, 'yyyy-MM-dd'));
              const isFullDayBlocked = dayBlockedSlots.some(s => s.isAllDay);
              
              return (
                <div key={day.toString()} className="relative border-r border-slate-100 last:border-r-0">
                  {hours.map(h => {
                    const timeStr = `${h.toString().padStart(2, '0')}:00`;
                    const isSlotBlocked = dayBlockedSlots.some(s => {
                      if (s.isAllDay) return false;
                      const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
                      const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
                      const slotTime = h;
                      return slotTime >= sH && slotTime < eH;
                    });

                    return (
                      <div 
                        key={h} 
                        className={cn(
                          "h-20 border-b border-slate-50 transition-colors relative group",
                          !isFullDayBlocked && !isSlotBlocked && "hover:bg-blue-50/30 cursor-pointer"
                        )}
                        onClick={() => {
                          if (!isFullDayBlocked && !isSlotBlocked) {
                            setNewAppointment({
                              date: format(day, 'yyyy-MM-dd'),
                              time: timeStr,
                              type: 'online'
                            });
                            setSelectedAppointment(null);
                            setSelectedPatient(null);
                            setIsModalOpen(true);
                          }
                        }}
                      >
                        {!isFullDayBlocked && !isSlotBlocked && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-4 h-4 text-blue-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {isFullDayBlocked && (
                    <div className="absolute inset-0 bg-slate-100/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
                      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">Dia Bloqueado</span>
                        <button 
                          onClick={() => {
                            const slot = dayBlockedSlots.find(s => s.isAllDay);
                            if (slot) handleDeleteBlockedSlot(slot.id);
                          }}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Desbloquear
                        </button>
                      </div>
                    </div>
                  )}

                  {!isFullDayBlocked && dayBlockedSlots.map(s => {
                    if (s.isAllDay) return null;
                    const startHour = parseInt(s.startTime?.split(':')[0] || '0');
                    const startMin = parseInt(s.startTime?.split(':')[1] || '0');
                    const endHour = parseInt(s.endTime?.split(':')[0] || '0');
                    const endMin = parseInt(s.endTime?.split(':')[1] || '0');
                    
                    const top = (startHour - 7) * 80 + (startMin / 60) * 80;
                    const height = ((endHour - startHour) * 80) + ((endMin - startMin) / 60) * 80;
                    
                    return (
                      <div 
                        key={s.id}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className="absolute left-0 right-0 bg-slate-200/50 border-y border-slate-300 flex items-center justify-center z-20 group"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-500">Bloqueado</span>
                          <button 
                            onClick={() => handleDeleteBlockedSlot(s.id)}
                            className="hidden group-hover:block text-[8px] text-red-500 hover:underline"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {getAppointmentsForDay(day).map(a => {
                    const hour = parseISO(a.dateTime).getHours();
                    const minute = parseISO(a.dateTime).getMinutes();
                    const top = (hour - 7) * 80 + (minute / 60) * 80;
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedAppointment(a);
                          setSelectedPatient(patients.find(p => p.id === a.patientId) || null);
                          setNewAppointment({
                            date: format(parseISO(a.dateTime), 'yyyy-MM-dd'),
                            time: format(parseISO(a.dateTime), 'HH:mm'),
                            type: a.type
                          });
                          setIsModalOpen(true);
                        }}
                        style={{ top: `${top}px` }}
                        className={cn(
                          "absolute left-1 right-1 p-2 rounded-xl text-xs font-bold text-left shadow-sm border transition-all hover:scale-[1.02] z-10",
                          a.type === 'online' ? "bg-indigo-500 text-white border-indigo-600" : a.type === 'viva' ? "bg-emerald-500 text-white border-emerald-600" : "bg-purple-500 text-white border-purple-600"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1 opacity-80">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(parseISO(a.dateTime), 'HH:mm')}
                          </div>
                          {a.type === 'online' && <Video className="w-3 h-3" />}
                        </div>
                        <div className="truncate">{a.patientName}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleSchedule = async () => {
    if (!selectedPatient || !user) return;

    const dateTime = `${newAppointment.date}T${newAppointment.time}:00`;
    
    // Check for holidays or blocked slots
    const isHoliday = allHolidays.some(h => h.date === newAppointment.date);
    const dayBlockedSlots = blockedSlots.filter(s => s.date === newAppointment.date);
    const isFullDayBlocked = dayBlockedSlots.some(s => s.isAllDay);
    const isSlotBlocked = dayBlockedSlots.some(s => {
      if (s.isAllDay) return false;
      const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (s.endTime || '00:00').split(':').map(Number);
      const [appH, appM] = newAppointment.time.split(':').map(Number);
      return appH >= sH && appH < eH;
    });

    if (isHoliday || isFullDayBlocked || isSlotBlocked) {
      if (!window.confirm('Atenção: Este horário está marcado como feriado ou bloqueado. Deseja agendar mesmo assim?')) {
        return;
      }
    }
    
    try {
      if (selectedAppointment) {
        // Update existing
        await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
          dateTime,
          type: newAppointment.type,
        });
      } else {
        // Create new
        let googleEventId = '';
        let meetLink = '';
        
        if (accessToken) {
          const event: any = {
            summary: `Consulta: ${selectedPatient.name} (${newAppointment.type})`,
            description: `Paciente: ${selectedPatient.name}\nE-mail: ${selectedPatient.email}\nTelefone: ${selectedPatient.phone}\nNotas: ${selectedPatient.notes}`,
            start: { dateTime: `${dateTime}Z`, timeZone: 'UTC' },
            end: { dateTime: addHours(parseISO(dateTime), 1).toISOString(), timeZone: 'UTC' },
          };

          if (newAppointment.type === 'online') {
            event.conferenceData = {
              createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            };
          }

          const gEvent = await createGoogleCalendarEvent(accessToken, event);
          googleEventId = gEvent.id;
          meetLink = gEvent.hangoutLink || '';
        }

        await addDoc(collection(db, 'appointments'), {
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          patientEmail: selectedPatient.email,
          dateTime,
          type: newAppointment.type,
          status: 'scheduled',
          googleEventId,
          meetLink,
          createdBy: user.uid,
        });

        // Notify via API
        try {
          await fetch('/api/notify-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientEmail: selectedPatient.email,
              patientName: selectedPatient.name,
              dateTime: format(parseISO(dateTime), "dd/MM/yyyy 'às' HH:mm"),
              type: newAppointment.type,
              meetLink,
              managerEmail: user.email,
            }),
          });
        } catch (e) {
          console.error('Notification failed:', e);
        }
      }

      setIsModalOpen(false);
      setSelectedPatient(null);
      setSelectedAppointment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'appointments');
    }
  };

  const handleSendReminders = async () => {
    const tomorrowApps = appointments.filter(a => {
      const date = parseISO(a.dateTime);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
    });

    if (tomorrowApps.length === 0) {
      alert('Nenhuma consulta agendada para amanhã.');
      return;
    }

    setTomorrowAppsCount(tomorrowApps.length);
    setShowReminderConfirm(true);
  };

  const executeSendReminders = async () => {
    const tomorrowApps = appointments.filter(a => {
      const date = parseISO(a.dateTime);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
    });

    setShowReminderConfirm(false);
    setSendingReminders(true);
    try {
      const response = await fetch('/api/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerEmail: user?.email,
          appointments: tomorrowApps.map(a => {
            const patient = patients.find(p => p.id === a.patientId);
            return {
              email: a.patientEmail || patient?.email || '',
              name: a.patientName,
              dateTime: format(parseISO(a.dateTime), "dd/MM/yyyy 'às' HH:mm"),
              type: a.type === 'online' ? 'Online' : a.type === 'viva' ? 'VIVA' : 'YARA BEZERRA',
              meetLink: a.meetLink,
            };
          }).filter(a => a.email),
        }),
      });

      if (response.ok) {
        alert('Lembretes enviados com sucesso!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Reminder error:', error);
      alert('Erro ao enviar lembretes: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSendingReminders(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/agendar`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'patient' | 'appointment' } | null>(null);

  const handleDeleteBlockedSlot = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blocked_slots', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'blocked_slots');
    }
  };

  const handleBlockSlot = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'blocked_slots'), {
        ...blockData,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsBlockModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'blocked_slots');
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'patient') {
        // Delete patient
        await deleteDoc(doc(db, 'patients', itemToDelete.id));
        // Also delete associated appointments
        const associatedApps = appointments.filter(a => a.patientId === itemToDelete.id);
        for (const app of associatedApps) {
          await deleteDoc(doc(db, 'appointments', app.id));
        }
      } else {
        await deleteDoc(doc(db, 'appointments', itemToDelete.id));
      }
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, itemToDelete.type === 'patient' ? 'patients' : 'appointments');
    }
  };

  const handleWhatsAppReminder = (appointment: Appointment) => {
    const patient = patients.find(p => p.id === appointment.patientId);
    if (!patient) {
      alert('Paciente não encontrado para esta consulta.');
      return;
    }

    const phone = patient.phone.replace(/\D/g, '');
    const dateStr = format(parseISO(appointment.dateTime), "dd/MM/yyyy 'às' HH:mm");
    const clinicName = appointment.type === 'online' ? 'Online' : appointment.type === 'viva' ? 'Clínica VIVA' : 'Clínica YARA BEZERRA';
    
    let message = `Olá, passando para lembrar da sua consulta com o Dr. Felipe Oliveira, agendada para dia ${dateStr} (${clinicName}). Aguardamos você!`;
    
    if (appointment.type === 'online' && appointment.meetLink) {
      message += `\n\nLink da teleconsulta: ${appointment.meetLink}`;
    }

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <Calendar className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Agenda Fácil</h1>
          <p className="text-slate-600 mb-8">Acesse seu painel de gestão para gerenciar consultas e pacientes.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
          >
            <LogIn className="w-5 h-5" /> Entrar com Google
          </button>
          <p className="mt-6 text-xs text-slate-400">
            A integração com Google Agenda requer permissão de acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
          <h2 className="text-xl font-bold text-slate-900">Agenda Fácil</h2>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              activeTab === 'calendar' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <CalendarDays className="w-5 h-5" /> Agenda
          </button>
          <button 
            onClick={() => setActiveTab('patients')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              activeTab === 'patients' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Users className="w-5 h-5" /> Pacientes
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              activeTab === 'appointments' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Clock className="w-5 h-5" /> Consultas
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <button 
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Link Copiado!' : 'Link do Paciente'}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-600 hover:bg-slate-50"
            >
              <Home className="w-5 h-5" /> Voltar para Início
            </button>
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {activeTab === 'calendar' ? 'Minha Agenda' : activeTab === 'patients' ? 'Gestão de Pacientes' : 'Minhas Consultas'}
            </h1>
            <p className="text-slate-500">
              {activeTab === 'calendar' ? 'Acompanhe e gerencie seus horários.' : activeTab === 'patients' ? 'Visualize solicitações e agende novos horários.' : 'Acompanhe seu cronograma de atendimentos.'}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Link 
              to="/agendar"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-4 h-4" /> Novo Cadastro
            </Link>
            {activeTab === 'calendar' && (
              <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => setCalendarView('day')}
                  className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", calendarView === 'day' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >
                  Dia
                </button>
                <button 
                  onClick={() => setCalendarView('week')}
                  className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", calendarView === 'week' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >
                  Semana
                </button>
                <button 
                  onClick={() => setCalendarView('month')}
                  className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", calendarView === 'month' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >
                  Mês
                </button>
              </div>
            )}
            {activeTab === 'appointments' && (
              <button 
                onClick={handleSendReminders}
                disabled={sendingReminders}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                <Send className="w-4 h-4" /> {sendingReminders ? 'Enviando...' : 'Enviar Lembretes de Amanhã'}
              </button>
            )}
            {!accessToken && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-amber-900">Google Agenda Desconectado</p>
                  <button onClick={handleLogin} className="text-amber-700 underline hover:text-amber-800">Conectar para sincronizar</button>
                </div>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'calendar' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    {format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : 'dd MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                    <button onClick={handlePrev} className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={handleToday} className="px-4 py-2 text-sm font-bold hover:bg-slate-50 rounded-lg transition-colors">Hoje</button>
                    <button onClick={handleNext} className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                  <button 
                    onClick={() => setIsBlockModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                  >
                    <AlertCircle className="w-4 h-4" /> Bloquear Horário
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" /> Feriado
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" /> Bloqueado
                  </div>
                </div>
              </div>
              {renderCalendar()}
            </div>

            <div className="w-full lg:w-80 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> Pacientes do Dia
                </h3>
                <div className="space-y-4">
                  {getAppointmentsForDay(currentDate).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma consulta para este dia.</p>
                  ) : (
                    getAppointmentsForDay(currentDate).map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className={cn("w-2 h-10 rounded-full", a.type === 'online' ? "bg-indigo-500" : a.type === 'viva' ? "bg-emerald-500" : "bg-purple-500")} />
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.patientName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(parseISO(a.dateTime), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patients' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patients.length === 0 ? (
              <div className="col-span-full bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhum paciente cadastrado ainda.</p>
                <p className="text-sm text-slate-400">Envie o link do formulário para seus pacientes.</p>
              </div>
            ) : (
              patients.map(p => (
                <motion.div 
                  layout
                  key={p.id}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {p.name}
                        {p.patientStatus && (
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                            p.patientStatus === 'new' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {p.patientStatus === 'new' ? 'Primeira Vez' : 'Paciente Antigo'}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500">{p.email} • {p.phone}</p>
                      {(p.birthDate || p.cpf) && (
                        <p className="text-xs text-slate-400 mt-1">
                          {p.birthDate && `Nascimento: ${format(parseISO(p.birthDate), 'dd/MM/yyyy')} `}
                          {p.cpf && `• CPF: ${p.cpf}`}
                        </p>
                      )}
                      {(p.address || p.city) && (
                        <p className="text-xs text-slate-400">
                          {p.address && `Endereço: ${p.address} `}
                          {p.city && `• ${p.city}`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">
                      {format(parseISO(p.createdAt), "dd/MM/yy 'às' HH:mm")}
                    </span>
                  </div>
                  
                  {p.notes && (
                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-sm text-slate-600 italic">
                      "{p.notes}"
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setSelectedPatient(p);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Agendar
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ id: p.id, type: 'patient' })}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                      title="Excluir Paciente"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhuma consulta agendada.</p>
              </div>
            ) : (
              appointments.map(a => (
                <motion.div 
                  layout
                  key={a.id}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-bold",
                      a.type === 'online' ? "bg-indigo-500" : a.type === 'viva' ? "bg-emerald-500" : "bg-purple-500"
                    )}>
                      <span className="text-xs uppercase opacity-70">{format(parseISO(a.dateTime), 'MMM', { locale: ptBR })}</span>
                      <span className="text-2xl leading-none">{format(parseISO(a.dateTime), 'dd')}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{a.patientName}</h3>
                      <div className="flex flex-wrap gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock className="w-4 h-4" /> {format(parseISO(a.dateTime), 'HH:mm')}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          {a.type === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {a.type === 'online' ? 'Online' : a.type === 'viva' ? 'VIVA' : 'YARA BEZERRA'}
                        </span>
                        {a.meetLink && (
                          <a 
                            href={a.meetLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                          >
                            <ExternalLink className="w-4 h-4" /> Google Meet
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {a.googleEventId && (
                      <span className="hidden sm:flex text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Sincronizado
                      </span>
                    )}
                    <button 
                      onClick={() => handleWhatsAppReminder(a)}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                      title="Lembrete WhatsApp"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ id: a.id, type: 'appointment' })}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir Consulta"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Scheduling Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedAppointment ? 'Editar Consulta' : 'Agendar Consulta'}
                    </h2>
                    {selectedPatient ? (
                      <p className="text-slate-500">Paciente: {selectedPatient.name}</p>
                    ) : (
                      <p className="text-slate-500">Selecione um paciente para agendar.</p>
                    )}
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {!selectedPatient && !selectedAppointment && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Paciente</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                      onChange={(e) => setSelectedPatient(patients.find(p => p.id === e.target.value) || null)}
                      value={selectedPatient?.id || ''}
                    >
                      <option value="">Selecione um paciente...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                    <input 
                      type="date" 
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Horário</label>
                    <input 
                      type="time" 
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Modalidade</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => setNewAppointment({ ...newAppointment, type: 'online' })}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold",
                        newAppointment.type === 'online' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <Video className="w-5 h-5" /> Online
                    </button>
                    <button 
                      onClick={() => setNewAppointment({ ...newAppointment, type: 'viva' })}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold",
                        newAppointment.type === 'viva' ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <MapPin className="w-5 h-5" /> VIVA
                    </button>
                    <button 
                      onClick={() => setNewAppointment({ ...newAppointment, type: 'yara_bezerra' })}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold",
                        newAppointment.type === 'yara_bezerra' ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <MapPin className="w-5 h-5" /> YARA BEZERRA
                    </button>
                  </div>
                </div>

                {!accessToken && (
                  <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-900 leading-tight">
                      Você não está conectado ao Google. A consulta será salva apenas no Agenda Fácil.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSchedule}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  {selectedAppointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-600 mb-8">
                {itemToDelete.type === 'patient' 
                  ? 'Tem certeza que deseja excluir este paciente? Todas as consultas associadas também serão removidas.' 
                  : 'Tem certeza que deseja excluir este agendamento?'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-100"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Block Slot Modal */}
      <AnimatePresence>
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Bloquear Horário</h2>
                    <p className="text-slate-500">Impeça agendamentos em horários específicos.</p>
                  </div>
                  <button onClick={() => setIsBlockModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                  <input 
                    type="date" 
                    value={blockData.date}
                    onChange={(e) => setBlockData({ ...blockData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="allDay"
                    checked={blockData.isAllDay}
                    onChange={(e) => setBlockData({ ...blockData, isAllDay: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allDay" className="text-sm font-bold text-slate-700">Bloquear o dia inteiro</label>
                </div>

                {!blockData.isAllDay && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Início</label>
                      <input 
                        type="time" 
                        value={blockData.startTime}
                        onChange={(e) => setBlockData({ ...blockData, startTime: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Fim</label>
                      <input 
                        type="time" 
                        value={blockData.endTime}
                        onChange={(e) => setBlockData({ ...blockData, endTime: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Motivo (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Feriado local, compromisso pessoal..."
                    value={blockData.reason}
                    onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => setIsBlockModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBlockSlot}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Bloquear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reminder Confirmation Modal */}
      <AnimatePresence>
        {showReminderConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Enviar Lembretes</h3>
              <p className="text-slate-600 mb-8">
                Deseja enviar lembretes por e-mail para os {tomorrowAppsCount} pacientes com consultas agendadas para amanhã?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReminderConfirm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeSendReminders}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Enviar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
