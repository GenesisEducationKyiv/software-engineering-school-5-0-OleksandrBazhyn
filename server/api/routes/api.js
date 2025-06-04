import express from 'express';
import WeatherManager from '../managers/WeatherManager.js';
import db from '../../db/knex.js';
import { v4 as uuidv4 } from 'uuid';
import Mailer from '../managers/Mailer.js';

const router = express.Router();

router.get('/weather', async (req, res) => {
    const city = req.query.city;
    if (!city) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    try {
        const weatherManager = new WeatherManager();
        const weatherData = await weatherManager.fetchWeatherData(city);
        if (!weatherData) {
            return res.status(404).json({ error: 'City not found' });
        }
        const data = {
            temperature: weatherData.current.temp_c,
            humidity: weatherData.current.humidity,
            description: weatherData.current.condition.text,
        };        
        return res.status(200).json(data);
    } catch (error) {
        return res.status(404).json({ error: 'City not found' });
    }
});

router.post('/subscribe', async (req, res) => {
    console.log('Request body:', req.body);
    const { email, city, frequency } = req.body;
    if (!email || !city || !frequency || !['daily', 'hourly'].includes(frequency)) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    const existing = await db('subscriptions')
        .where({ email, city, frequency })
        .first();
    if (existing) {
        return res.status(409).json({ error: 'Email already subscribed' });
    }

    const token = uuidv4();
    try {
        console.log('Inserting subscription into database:', { email, city, frequency, token });
        await db('subscriptions').insert({
            email,
            city,
            frequency,
            token,
            is_active: false
        });
        await Mailer.sendConfirmationEmail(email, city, token);

        return res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: 'Invalid input' });
    }
});

router.get('/confirm/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const updated = await db('subscriptions')
            .where({ token })
            .update({ is_active: true });
        if (updated) {
            return res.status(200).send('Subscription confirmed successfully');
        } else {
            return res.status(400).send('Invalid token');
        }
    } catch (err) {
        console.error(err);
        return res.status(404).send('Token not found');
    }
});

router.get('/unsubscribe/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const deleted = await db('subscriptions')
            .where({ token })
            .del();
        if (deleted) {
            return res.status(200).send('Unsubscribed and deleted successfully');
        } else {
            return res.status(400).send('Invalid token');
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
});


export default router;