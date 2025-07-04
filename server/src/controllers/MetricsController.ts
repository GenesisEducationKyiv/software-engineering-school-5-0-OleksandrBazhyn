import { Request, Response } from "express";
import { cacheMetrics } from "../services/cache/CacheMetrics.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("MetricsController");

export class MetricsController {
  async getMetrics(req: Request, res: Response): Promise<Response | void> {
    try {
      const metrics = await cacheMetrics.getMetrics();
      res.set("Content-Type", "text/plain");
      return res.status(200).send(metrics);
    } catch (error) {
      logger.error("Error getting metrics:", error);
      return res.status(500).json({ error: "Failed to get metrics" });
    }
  }

  async getMetricsJson(req: Request, res: Response): Promise<Response> {
    try {
      const metricsData = await cacheMetrics.getMetricsData();
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        cache: {
          hits: metricsData.hits,
          misses: metricsData.misses,
          hitRate: metricsData.hitRate,
          totalOperations: metricsData.totalOperations,
        },
        performance: {
          averageGetTime: metricsData.avgGetTime.toFixed(2),
          averageSetTime: metricsData.avgSetTime.toFixed(2),
        },
        errors: {
          count: metricsData.errors,
          rate: metricsData.errorRate,
        },
      });
    } catch (error) {
      logger.error("Error getting JSON metrics:", error);
      return res.status(500).json({ error: "Failed to get metrics" });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<Response | void> {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cache Metrics Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { color: white; text-align: center; margin-bottom: 30px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .refresh-info { color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 20px; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
          .metric-card { 
            background: white; 
            border-radius: 12px; 
            padding: 25px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1); 
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .metric-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
          .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4CAF50, #2196F3);
          }
          .metric-title { font-size: 1.1em; font-weight: 600; color: #555; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-value { font-size: 2.5em; font-weight: 700; margin-bottom: 10px; }
          .metric-description { font-size: 0.9em; color: #777; }
          .success { color: #4CAF50; }
          .warning { color: #FF9800; }
          .error { color: #F44336; }
          .info { color: #2196F3; }
          .loading { opacity: 0.6; }
          .last-updated { text-align: center; color: rgba(255,255,255,0.7); margin-top: 20px; font-size: 0.9em; }
          .chart-container { height: 100px; margin-top: 15px; }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
          .updating { animation: pulse 1s infinite; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Cache Metrics Dashboard</h1>
          <div class="refresh-info">📊 Auto-refreshing every 5 seconds</div>
          
          <div class="metric-grid" id="metrics-grid">
            <!-- Метрики будуть завантажені через JavaScript -->
          </div>
          
          <div class="last-updated" id="last-updated"></div>
        </div>

        <script>
          let updateInterval;
          
          async function loadMetrics() {
            try {
              const grid = document.getElementById('metrics-grid');
              grid.classList.add('updating');
              
              const response = await fetch('/api/v1/metrics/json');
              const data = await response.json();
              
              const hitRate = data.cache.totalOperations > 0 
                ? ((data.cache.hits / data.cache.totalOperations) * 100).toFixed(1)
                : 0;
              
              grid.innerHTML = \`
                <div class="metric-card">
                  <div class="metric-title">💚 Cache Hits</div>
                  <div class="metric-value success">\${data.cache.hits}</div>
                  <div class="metric-description">Successful cache retrievals</div>
                </div>
                
                <div class="metric-card">
                  <div class="metric-title">⚠️ Cache Misses</div>
                  <div class="metric-value warning">\${data.cache.misses}</div>
                  <div class="metric-description">Data not found in cache</div>
                </div>
                
                <div class="metric-card">
                  <div class="metric-title">📈 Hit Rate</div>
                  <div class="metric-value info">\${hitRate}%</div>
                  <div class="metric-description">Cache efficiency ratio</div>
                </div>
                
                <div class="metric-card">
                  <div class="metric-title">⚡ Avg Response</div>
                  <div class="metric-value info">\${data.performance.averageGetTime}ms</div>
                  <div class="metric-description">Average operation time</div>
                </div>
                
                <div class="metric-card">
                  <div class="metric-title">🔄 Total Operations</div>
                  <div class="metric-value info">\${data.cache.totalOperations}</div>
                  <div class="metric-description">Total cache operations</div>
                </div>
                
                <div class="metric-card">
                  <div class="metric-title">❌ Errors</div>
                  <div class="metric-value error">\${data.errors.count}</div>
                  <div class="metric-description">Cache operation errors</div>
                </div>
              \`;
              
              document.getElementById('last-updated').textContent = 
                \`Last updated: \${new Date(data.timestamp).toLocaleTimeString()}\`;
              
              grid.classList.remove('updating');
            } catch (error) {
              console.error('Failed to load metrics:', error);
              document.getElementById('metrics-grid').innerHTML = 
                '<div style="color: #F44336; text-align: center; grid-column: 1 / -1;">❌ Failed to load metrics</div>';
            }
          }
          
          function startAutoRefresh() {
            loadMetrics(); // Завантажити одразу
            updateInterval = setInterval(loadMetrics, 5000); // Оновлювати кожні 5 секунд
          }
          
          function stopAutoRefresh() {
            if (updateInterval) {
              clearInterval(updateInterval);
            }
          }
          
          // Зупинити оновлення при зміні вкладки
          document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
              stopAutoRefresh();
            } else {
              startAutoRefresh();
            }
          });
          
          // Почати автоматичне оновлення
          startAutoRefresh();
          
          // Очистити інтервал при закритті сторінки
          window.addEventListener('beforeunload', stopAutoRefresh);
        </script>
      </body>
      </html>`;

      return res.send(html);
    } catch (error) {
      logger.error("Error getting metrics dashboard:", error);
      return res.status(500).json({ error: "Failed to get metrics dashboard" });
    }
  }
}