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

polka()
  .get('/', async (req, res) => {
    console.log(req.query);

    try {
      const lang = req.query.lang ? req.query.lang : 'en';
      const units = req.query.units ? req.query.units : 'imperial';

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
        name: lang === 'de' ? 'Wetter' : 'Weather',
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
          summary: `${icons[weather.icon]} ${weather.description} ${temperature(temp.max)} / ${temperature(temp.min)}`,
          location: `${lat},${lon}`,
          geo: {lat, lon},
          description: `
          Sonnenauf- & untergang: ${time(day.sunrise)} - ${time(day.sunset)}
          UX-Index: ${day.uvi}
          Luftfeuchtigkeit: ${day.humidity}%
          Wind: ${day.wind_speed}${units === 'imperial' ? 'mph' : 'km/h'} (${day.wind_deg}°)`,
        });
      }

      // console.log(cal.toString());
      cal.serve(res);
    } catch (err) {
      console.error(err);
    }
  })
  .listen(3001)
;
