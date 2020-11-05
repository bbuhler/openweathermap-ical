import { serve } from 'https://deno.land/std@0.76.0/http/server.ts';
import iCal from 'https://jspm.dev/ical-generator';

const server = serve({port: 3001});
const icons = {
  '01d': '☀️',
  '02d': '🌤️',
  '03d': '🌥️',
  '04d': '☁️',
  '09d': '🌧️',
  '10d': '🌦️️',
  '11d': '⛈️',
  '13d': '🌨️️',
  '50d': '🌫️️️',
};

const trimLines = (strings, ...args) =>
  strings.map((line, index) => line.replace(/\n[ ]+/g, '\n') + (args[index] || '')).join('');


for await (const req of server) {
  const url = new URL(req.url, 'http://' + req.headers.get('host'));

  if (url.pathname === '/') {
    if (!url.search && !url.searchParams.has('appid') && !url.searchParams.has('lon') && !url.searchParams.has('lat')) {
      req.respond({
        status: 400,
        body: 'Missing required parameters.',
      });
      break;
    }

    try {
      const lang = url.searchParams.get('lang') || 'en';
      const units = url.searchParams.get('units') || 'imperial';
      const title = lang === 'de' ? 'Wetter' : 'Weather';

      const response = await fetch(`https://api.openweathermap.org/data/2.5/onecall${url.search}`);
      const {timezone, lat, lon, daily} = await response.json();

      const temperature = temp => `${Math.round(temp)}°${units === 'imperial' ? 'F' : 'C'}`;
      const time = ts => new Date(ts * 1000).toLocaleTimeString(lang, {
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
      });

      const cal = iCal({
        name: title,
        description: title,
        domain: 'openweathermap.org',
        timezone,
        ttl: 60 * 60,
        prodId: {
          company: 'OpenWeatherMap',
          product: 'Weather Forecast Calendar',
          language: lang.toUpperCase(),
        },
      });

      for (const day of daily) {
        const date = new Date(day.dt * 1000);
        const {temp} = day;
        const [weather] = day.weather;

        cal.createEvent({
          allDay: true,
          start: date,
          summary: `${icons[weather.icon]} ${temperature(temp.max)} / ${temperature(temp.min)} ${weather.description}`,
          location: `${lat},${lon}`,
          geo: {lat, lon},
          description: trimLines`
          \u{1F32A}\u{FE0F} ${day.wind_speed}${units === 'imperial' ? 'mph' : 'km/h'} (${day.wind_deg}°)

          \u{1F304}\u{FE0F} ${time(day.sunrise)} \u{1F307}\u{FE0F} ${time(day.sunset)}

          UV-Index: ${day.uvi}
          ${lang === 'de' ? 'Luftfeuchtigkeit' : 'Humidity'}: ${day.humidity}%`,
        });
      }

      req.respond({
        headers: new Headers([
          ['content-type', 'text/calendar'],
        ]),
        body: cal.toString(),
      });
    } catch (err) {
      console.error(err);

      if (err.statusCode && err.error) {
        req.respond({
          status: err.statusCode,
          body: err.error.message,
        });
      }
    }
  }
}
