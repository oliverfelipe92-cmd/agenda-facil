export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  conferenceData?: any;
}

export async function createGoogleCalendarEvent(accessToken: string, event: CalendarEvent) {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  if (event.conferenceData) {
    url.searchParams.append('conferenceDataVersion', '1');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Calendar API Error: ${error.error.message}`);
  }

  return response.json();
}
