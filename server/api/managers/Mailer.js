import db from '../../db/knex.js';
import nodemailer from 'nodemailer';
import WeatherManager from './WeatherManager.js';

class Mailer {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendConfirmationEmail(email, city, token) {
        console.log('Sending confirmation email to:', email);
        const link = `http://localhost:3000/api/confirm/${token}`;
        await this.transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Confirm your subscription',
            html: `<p>Click <a href="${link}">here</a> to confirm your subscription for ${city}</p>`,
        });
    }

    async sendWeatherEmails(frequency = 'daily') {
        const subscriptions = await db('subscriptions')
            .where({ is_active: true, frequency });

        if (!subscriptions.length) {
            console.log('No active subscriptions for', frequency);
            return;
        }

        for (const sub of subscriptions) {
            try {
                const weatherManager = new WeatherManager();
                const weatherData = await weatherManager.fetchWeatherData(sub.city);

                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM,
                    to: sub.email,
                    subject: `Weather update for ${sub.city}`,
                    html: `
                        <p>Weather in ${sub.city}:</p>
                        <ul>
                            <li>Temperature: ${weatherData.current.temp_c}°C</li>
                            <li>Humidity: ${weatherData.current.humidity}%</li>
                            <li>Description: ${weatherData.current.condition.text}</li>
                        </ul>
                        <p>
                            <a href="http://localhost:3000/api/unsubscribe/${sub.token}">
                                Unsubscribe from weather updates
                            </a>
                        </p>
                    `,
                });
                console.log(`Email sent to ${sub.email} (${sub.city})`);
            } catch (err) {
                console.error(`Failed to send email to ${sub.email}:`, err);
            }
        }
    }
}

export default new Mailer();