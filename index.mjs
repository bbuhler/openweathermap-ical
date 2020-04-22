import polka from 'polka';
import request from 'request-promise-native';
import iCal from 'ical-generator';

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

polka()
  .get('/', async (req, res) => {
    console.log(req.query);

    if (!req.search && !req.query.appid && !req.query.lon && !req.query.lat)
    {
      res.statusCode = 400;
      res.end('Missing required parameters.');
    }

    try {
      const lang = req.query.lang ? req.query.lang : 'en';
      const units = req.query.units ? req.query.units : 'imperial';
      const title = lang === 'de' ? 'Wetter' : 'Weather';

      const {timezone, lat, lon, daily} = await request({
        url: `https://api.openweathermap.org/data/2.5/onecall${req.search}`,
        json: true,
      });

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
          description: trimLines `
          \u{1F32A}\u{FE0F} ${day.wind_speed}${units === 'imperial' ? 'mph' : 'km/h'} (${day.wind_deg}°)
          
          \u{1F304}\u{FE0F} ${time(day.sunrise)} \u{1F307}\u{FE0F} ${time(day.sunset)}
          
          UV-Index: ${day.uvi}
          ${lang === 'de' ? 'Luftfeuchtigkeit' : 'Humidity'}: ${day.humidity}%`,
        });
      }

      // console.log(cal.toString());
      cal.serve(res);
    } catch (err) {
      console.error(err);

      if (err.statusCode && err.error)
      {
        res.statusCode = err.statusCode;
        res.end(err.error.message);
      }
    }
  })
  .listen(3001)
;
