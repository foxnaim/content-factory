import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set("json replacer", (_key: string, value: unknown) => typeof value === "bigint" ? value.toString() : value);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  app.setGlobalPrefix("api");
  await app.listen(Number(process.env.API_PORT ?? 3001), "0.0.0.0");
}

void bootstrap();
