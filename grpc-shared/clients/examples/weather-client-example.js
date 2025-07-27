import { WeatherGrpcClient } from '../node/WeatherGrpcClient.js';

/**
 * Example usage of Weather gRPC Client
 */
async function demonstrateWeatherClient() {
  console.log('🌤️ Weather gRPC Client Example\n');

  const client = new WeatherGrpcClient('localhost:50051');

  try {
    // Health check
    console.log('💓 Health Check:');
    const health = await client.healthCheck();
    console.log('   Status:', health.status);
    console.log('   Message:', health.message);

    // Single weather request
    console.log('\n🌍 Single Weather Request:');
    const weather = await client.getWeather('Prague');
    if (weather.success) {
      console.log('   City:', weather.data.city);
      console.log('   Temperature:', weather.data.temperature + '°C');
      console.log('   Humidity:', weather.data.humidity + '%');
      console.log('   Description:', weather.data.description);
    } else {
      console.log('   Error:', weather.error_message);
    }

    // Batch weather request
    console.log('\n🌍 Batch Weather Request:');
    const batchWeather = await client.getWeatherBatch(['London', 'Paris', 'Berlin']);
    if (batchWeather.success) {
      batchWeather.data.forEach(data => {
        console.log(`   ${data.city}: ${data.temperature}°C, ${data.description}`);
      });
    } else {
      console.log('   Error:', batchWeather.error_message);
    }

    // Error handling example
    console.log('\n❌ Error Handling Example:');
    try {
      const invalidWeather = await client.getWeather('InvalidCity123');
      console.log('   Response:', invalidWeather);
    } catch (error) {
      console.log('   Caught error:', error.message);
    }

  } catch (error) {
    console.error('❌ Client error:', error);
  } finally {
    client.close();
    console.log('\n✅ Client connection closed');
  }
}

// Run the example
demonstrateWeatherClient().catch(console.error);
