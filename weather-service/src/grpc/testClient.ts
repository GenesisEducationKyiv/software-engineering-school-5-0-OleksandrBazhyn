/* eslint-disable @typescript-eslint/no-explicit-any */
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load protobuf
const PROTO_PATH = path.join(__dirname, "../../../grpc-shared/proto/weather.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition) as any;

async function testGrpcClient() {
  const client = new weatherProto.weather.WeatherService(
    "localhost:50051",
    grpc.credentials.createInsecure(),
  );

  console.log("🚀 Testing gRPC Weather Service...\n");

  // Test 1: Health Check
  console.log("📋 Testing Health Check...");
  await new Promise((resolve, reject) => {
    client.HealthCheck({ service: "weather" }, (error: any, response: any) => {
      if (error) {
        console.error("❌ Health check failed:", error);
        reject(error);
        return;
      }
      console.log("✅ Health check response:", response);
      resolve(response);
    });
  });

  // Test 2: Get Weather for a single city
  console.log("\n🌤️ Testing GetWeather for Prague...");
  await new Promise((resolve, reject) => {
    client.GetWeather({ city: "Prague" }, (error: any, response: any) => {
      if (error) {
        console.error("❌ GetWeather failed:", error);
        reject(error);
        return;
      }
      console.log("✅ Prague weather:", response);
      resolve(response);
    });
  });

  // Test 3: Get Weather for invalid city
  console.log("\n🚫 Testing GetWeather for invalid city...");
  await new Promise((resolve, reject) => {
    client.GetWeather({ city: "InvalidCity12345" }, (error: any, response: any) => {
      if (error) {
        console.error("❌ GetWeather failed:", error);
        reject(error);
        return;
      }
      console.log("✅ Invalid city response:", response);
      resolve(response);
    });
  });

  // Test 4: Batch Weather Request
  console.log("\n🌍 Testing GetWeatherBatch for multiple cities...");
  await new Promise((resolve, reject) => {
    client.GetWeatherBatch(
      { cities: ["Prague", "London", "Paris", "InvalidCity"] },
      (error: any, response: any) => {
        if (error) {
          console.error("❌ GetWeatherBatch failed:", error);
          reject(error);
          return;
        }
        console.log("✅ Batch weather response:", response);
        console.log(`   📊 Got ${response.data.length} valid results out of 4 cities`);
        resolve(response);
      },
    );
  });

  // Close client
  client.close();
  console.log("\n🎉 All gRPC tests completed successfully!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testGrpcClient().catch(console.error);
}

export { testGrpcClient };
