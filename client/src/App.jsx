import { useState, useRef, useEffect } from "react";

export default function App() {
  // --- REST: Subscription state ---
  const [form, setForm] = useState({ email: "", city: "", frequency: "daily" });
  const [subscribeStatus, setSubscribeStatus] = useState("");

  // --- REST: Weather fetch state ---
  const [weatherCity, setWeatherCity] = useState("");
  const [weather, setWeather] = useState(null);

  // --- REST: Unsubscribe state ---
  const [unsubscribeToken, setUnsubscribeToken] = useState("");
  const [unsubscribeStatus, setUnsubscribeStatus] = useState("");

  // --- WebSocket: Live weather state ---
  const [wsCity, setWsCity] = useState("");
  const [wsWeather, setWsWeather] = useState(null);
  const [wsStatus, setWsStatus] = useState("");
  const wsRef = useRef(null);

  // --- Email validator (simple regex) ---
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // --- Handle subscription form submission with validation ---
  async function handleSubscribe(e) {
    e.preventDefault();

    // Client-side validation
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
      const res = await fetch("/api/subscribe", {
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

  // --- Handle weather fetch form submission with validation ---
  async function handleGetWeather(e) {
    e.preventDefault();
    setWeather(null);
    if (!weatherCity.trim()) {
      setWeather({ error: "Please enter a city." });
      return;
    }
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(weatherCity)}`);
      const data = await res.json();
      setWeather(data);
    } catch {
      setWeather({ error: "Network error" });
    }
  }

  // --- Handle unsubscribe form submission with validation ---
  async function handleUnsubscribe(e) {
    e.preventDefault();
    if (!unsubscribeToken.trim()) {
      setUnsubscribeStatus("Please enter your unsubscribe token.");
      return;
    }
    setUnsubscribeStatus("Unsubscribing...");
    try {
      const res = await fetch(`/api/unsubscribe/${unsubscribeToken}`);
      const text = await res.text();
      setUnsubscribeStatus(text);
    } catch {
      setUnsubscribeStatus("Network error");
    }
  }

  // --- Handle WebSocket live weather subscription with validation ---
  function handleWsSubscribe(e) {
    e.preventDefault();
    setWsWeather(null);

    // Validate city for WebSocket subscription
    if (!wsCity.trim()) {
      setWsStatus("Please enter a city for live updates.");
      return;
    }

    setWsStatus("Connecting...");
    // Close previous socket if open
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Create new WebSocket connection
    const ws = new window.WebSocket("ws://localhost:3000"); // Change port if needed!
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ city: wsCity }));
      setWsStatus("Connected. Waiting for live updates...");
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "weather") setWsWeather(msg.data);
      } catch (e) {
        // Ignore parse errors
      }
    };
    ws.onclose = () => setWsStatus("Connection closed");
    ws.onerror = () => setWsStatus("WebSocket error");
  }

  // --- Cleanup WebSocket connection on component unmount (demoount) ---
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // --- Main UI ---
  return (
    <div style={{ maxWidth: 500, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>Weather Subscription (SPA)</h2>

      {/* Subscription form */}
      <section style={{ marginBottom: 30, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
        <h4>Subscribe to Weather Updates</h4>
        <form onSubmit={handleSubscribe}>
          <input
            required type="email" placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          />
          <input
            required type="text" placeholder="City"
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          />
          <select
            value={form.frequency}
            onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
            style={{ display: "block", marginBottom: 8, width: "100%" }}
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
          <button type="submit" style={{ width: "100%" }}>Subscribe</button>
        </form>
        <div style={{ marginTop: 10, color: subscribeStatus.includes("success") ? "green" : "red" }}>
          {subscribeStatus}
        </div>
      </section>

      {/* Weather fetch form */}
      <section style={{ marginBottom: 30, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
        <h4>Current Weather</h4>
        <form onSubmit={handleGetWeather}>
          <input
            type="text" placeholder="City"
            value={weatherCity}
            onChange={e => setWeatherCity(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <button type="submit">Show</button>
        </form>
        <div style={{ marginTop: 10 }}>
          {weather && weather.error && <span style={{ color: "red" }}>{weather.error}</span>}
          {weather && !weather.error && (
            <ul>
              <li>Temperature: {weather.temperature}°C</li>
              <li>Humidity: {weather.humidity}%</li>
              <li>Description: {weather.description}</li>
            </ul>
          )}
        </div>
      </section>

      {/* Unsubscribe form */}
      <section style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
        <h4>Unsubscribe from Updates</h4>
        <form onSubmit={handleUnsubscribe}>
          <input
            type="text" placeholder="Token"
            value={unsubscribeToken}
            onChange={e => setUnsubscribeToken(e.target.value)}
            style={{ marginRight: 10, width: "80%" }}
          />
          <button type="submit">Unsubscribe</button>
        </form>
        <div style={{ marginTop: 10 }}>{unsubscribeStatus}</div>
      </section>

      {/* Live Weather Updates (WebSocket) */}
      <section style={{ marginTop: 30, padding: 10, border: "1px solid #99f", borderRadius: 8 }}>
        <h4>Live Weather Updates (WebSocket)</h4>
        <form onSubmit={handleWsSubscribe}>
          <input
            type="text"
            placeholder="City"
            value={wsCity}
            onChange={e => setWsCity(e.target.value)}
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
