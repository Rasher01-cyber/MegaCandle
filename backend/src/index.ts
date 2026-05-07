import { createServer } from "./server";

const app = createServer();

app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, () => {
  // eslint-disable-next-line no-console
  console.log(`TradeFX backend listening on port ${process.env.PORT ?? 4000}`);
});

