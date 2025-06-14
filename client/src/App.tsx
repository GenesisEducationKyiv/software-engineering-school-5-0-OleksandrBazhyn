import { useState, useRef, useEffect, FormEvent } from "react";
import type { WeatherData, WebSocketWeatherData, FormState } from "./types";

export default function App() {
  const [form, setForm] = useState<FormState>({
    email: "",
    city: "",
    frequency: "daily",
  });
  const [subscribeStatus, setSubscribeStatus] = useState<string>("");

  const [weatherCity, setWeatherCity] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData>(null);

  const [unsubscribeToken, setUnsubscribeToken] = useState<string>("");
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<string>("");

  const [wsCity, setWsCity] = useState<string>("");
  const [wsWeather, setWsWeather] = useState<WebSocketWeatherData>(null);
  const [wsStatus, setWsStatus] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateEmail(form.email)) {
      setSubscribeStatus("Please enter a valid email address.");
      return;
    }
    if (!form.city.trim()) {
      setSubscribeStatus("Please enter a city.");
      return;
    }
    if (!["daily", "hourly"].includes(form.frequency)) {
      setSubscribeStatus("Invalid frequency.");
      return;
    }
    setSubscribeStatus("Submitting...");
    try {
      const res = await fetch("/api/v1/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubscribeStatus(data.message || data.error);
    } catch {
      setSubscribeStatus("Network error");
    }
  }

  async function handleGetWeather(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWeather(null);
    if (!weatherCity.trim()) {
      setWeather({ error: "Please enter a city." });
      return;
    }
    try {
      const res = await fetch(
        `/api/weather?city=${encodeURIComponent(weatherCity)}`,
      );
      const data = await res.json();
      setWeather(data);
    } catch {
      setWeather({ error: "Network error" });
    }
  }

  async function handleUnsubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unsubscribeToken.trim()) {
      setUnsubscribeStatus("Please enter your unsubscribe token.");
      return;
    }
    setUnsubscribeStatus("Unsubscribing...");
    try {
      const res = await fetch(`/api/v1/unsubscribe/${unsubscribeToken}`);
      const text = await res.text();
      setUnsubscribeStatus(text);
    } catch {
      setUnsubscribeStatus("Network error");
    }
  }

  function handleWsSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWsWeather(null);
    if (!wsCity.trim()) {
      setWsStatus("Please enter a city for live updates.");
      return;
    }
    setWsStatus("Connecting...");
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new window.WebSocket("ws://localhost:3000");
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ city: wsCity }));
      setWsStatus("Connected. Waiting for live updates...");
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "weather") {
          setWsWeather(msg.data);
        }
      } catch {
        setWsStatus("Error receiving live updates");
      }
    };
    ws.onclose = () => setWsStatus("Connection closed");
    ws.onerror = () => setWsStatus("WebSocket error");
  }

  useEffect(
    () => () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    },
    [],
  );

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Weather Subscription (SPA)</h2>
      <section
        style={{
          marginBottom: 30,
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h4>Subscribe to Weather Updates</h4>
        <form onSubmit={handleSubscribe}>
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          />
          <input
            required
            type="text"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          />
          <select
            value={form.frequency}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                frequency: e.target.value as "daily" | "hourly",
              }))
            }
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
          <button type="submit" style={{ width: "100%" }}>
            Subscribe
          </button>
        </form>
        <div
          style={{
            marginTop: 10,
            color: subscribeStatus.includes("success") ? "green" : "red",
          }}
        >
          {subscribeStatus}
        </div>
      </section>
      <section
        style={{
          marginBottom: 30,
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h4>Current Weather</h4>
        <form onSubmit={handleGetWeather}>
          <input
            type="text"
            placeholder="City"
            value={weatherCity}
            onChange={(e) => setWeatherCity(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <button type="submit">Show</button>
        </form>
        <div style={{ marginTop: 10 }}>
          {weather && "error" in weather && (
            <span style={{ color: "red" }}>{weather.error}</span>
          )}
          {weather && !("error" in weather) && (
            <ul>
              <li>Temperature: {weather.temperature}°C</li>
              <li>Humidity: {weather.humidity}%</li>
              <li>Description: {weather.description}</li>
            </ul>
          )}
        </div>
      </section>
      <section
        style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
      >
        <h4>Unsubscribe from Updates</h4>
        <form onSubmit={handleUnsubscribe}>
          <input
            type="text"
            placeholder="Token"
            value={unsubscribeToken}
            onChange={(e) => setUnsubscribeToken(e.target.value)}
            style={{ marginRight: 10, width: "80%" }}
          />
          <button type="submit">Unsubscribe</button>
        </form>
        <div style={{ marginTop: 10 }}>{unsubscribeStatus}</div>
      </section>
      <section
        style={{
          marginTop: 30,
          padding: 10,
          border: "1px solid #99f",
          borderRadius: 8,
        }}
      >
        <h4>Live Weather Updates (WebSocket)</h4>
        <form onSubmit={handleWsSubscribe}>
          <input
            type="text"
            placeholder="City"
            value={wsCity}
            onChange={(e) => setWsCity(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <button type="submit">Subscribe (WS)</button>
        </form>
        <div style={{ marginTop: 10 }}>{wsStatus}</div>
        <div style={{ marginTop: 10 }}>
          {wsWeather && (
            <ul>
              <li>Temperature: {wsWeather.temperature}°C</li>
              <li>Humidity: {wsWeather.humidity}%</li>
              <li>Description: {wsWeather.description}</li>
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
