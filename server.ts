import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Confirmation Email
  app.post('/api/notify-confirmation', async (req, res) => {
    const { patientEmail, patientName, dateTime, type, meetLink, managerEmail } = req.body;

    if (!resend) {
      return res.status(500).json({ error: 'Resend API Key not configured' });
    }

    try {
      // 1. Notify Patient
      await resend.emails.send({
        from: 'Agenda Fácil <onboarding@resend.dev>',
        to: patientEmail,
        subject: 'Confirmação de Agendamento - Agenda Fácil',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #1e293b; font-size: 24px;">Olá, ${patientName}!</h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Passando para confirmar sua consulta com o <strong>Dr. Felipe Oliveira</strong>.
            </p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">DETALHES DA CONSULTA</p>
              <p style="margin: 10px 0 0 0; color: #1e293b; font-size: 18px; font-weight: bold;">
                📅 ${dateTime}
              </p>
              <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;">
                📍 ${type === 'online' ? 'Online (Teleconsulta)' : type === 'viva' ? 'Clínica VIVA' : 'Clínica YARA BEZERRA'}
              </p>
              ${meetLink ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">LINK DA TELECONSULTA</p>
                  <a href="${meetLink}" style="display: inline-block; margin-top: 5px; color: #2563eb; font-weight: bold; text-decoration: none;">
                    Entrar no Google Meet →
                  </a>
                </div>
              ` : ''}
            </div>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Aguardamos você!
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Sistema Agenda Fácil
            </p>
          </div>
        `,
      });

      // 2. Notify Manager
      await resend.emails.send({
        from: 'Agenda Fácil <onboarding@resend.dev>',
        to: managerEmail,
        subject: 'Novo Agendamento Confirmado',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #1e293b; font-size: 24px;">Novo Agendamento!</h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Você agendou uma consulta para <strong>${patientName}</strong>.
            </p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">DETALHES</p>
              <p style="margin: 10px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Data/Hora:</strong> ${dateTime}</p>
              <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Modalidade:</strong> ${type}</p>
              ${meetLink ? `<p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
            </div>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Email error:', error);
      res.status(500).json({ error: 'Failed to send emails' });
    }
  });

  // API Route: Notify Admin of New Patient Registration
  app.post('/api/notify-admin-new-patient', async (req, res) => {
    const { patientData, adminEmail } = req.body;

    if (!resend) {
      return res.status(500).json({ error: 'Resend API Key not configured' });
    }

    try {
      await resend.emails.send({
        from: 'Agenda Fácil <onboarding@resend.dev>',
        to: adminEmail || 'oliverfelipe92@gmail.com', // Fallback to user's email
        subject: 'Novo Cadastro de Paciente - Agenda Fácil',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #1e293b; font-size: 24px;">Novo Paciente Cadastrado!</h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Um novo paciente preencheu o formulário de cadastro.
            </p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">DADOS DO PACIENTE</p>
              <p style="margin: 10px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Nome:</strong> ${patientData.name}</p>
              <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Email:</strong> ${patientData.email}</p>
              <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Telefone:</strong> ${patientData.phone}</p>
              <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;"><strong>Status:</strong> ${patientData.patientStatus === 'new' ? 'Primeira Vez' : 'Paciente Antigo'}</p>
            </div>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Acesse o painel administrativo para realizar o agendamento.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Sistema Agenda Fácil
            </p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Admin notification error:', error);
      res.status(500).json({ error: 'Failed to notify admin' });
    }
  });

  // API Route: Send Reminders (Batch)
  app.post('/api/send-reminders', async (req, res) => {
    const { appointments, managerEmail } = req.body; // Array of { email, phone, name, dateTime, type }

    if (!resend) {
      return res.status(500).json({ error: 'Resend API Key not configured' });
    }

    try {
      const results = await Promise.all(appointments.map(async (app: any) => {
        // 1. Send Email
        const emailResult = await resend.emails.send({
          from: 'Agenda Fácil <onboarding@resend.dev>',
          to: app.email,
          replyTo: managerEmail || undefined,
          subject: 'Lembrete de Consulta - Dr. Felipe Oliveira',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
              <h1 style="color: #1e293b; font-size: 24px;">Olá, ${app.name}!</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Passando para lembrar da sua consulta com o <strong>Dr. Felipe Oliveira</strong>, agendada para amanhã.
              </p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">DETALHES DA CONSULTA</p>
                <p style="margin: 10px 0 0 0; color: #1e293b; font-size: 18px; font-weight: bold;">
                  📅 ${app.dateTime}
                </p>
                <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 16px;">
                  📍 ${app.type}
                </p>
                ${app.meetLink ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">LINK DA TELECONSULTA</p>
                    <a href="${app.meetLink}" style="display: inline-block; margin-top: 5px; color: #2563eb; font-weight: bold; text-decoration: none;">
                      Entrar no Google Meet →
                    </a>
                  </div>
                ` : ''}
              </div>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Aguardamos você! Caso precise desmarcar ou reagendar, por favor entre em contato respondendo a este e-mail.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Este é um lembrete automático do sistema Agenda Fácil.
              </p>
            </div>
          `,
        });
        
        return emailResult;
      }));

      res.json({ success: true, count: results.length });
    } catch (error) {
      console.error('Batch email error:', error);
      res.status(500).json({ error: 'Failed to send batch emails' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
