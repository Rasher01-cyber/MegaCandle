import { createServer } from "./server";

/** MT5 tickets are BIGINT in DB; serialize as numbers in JSON (within JS safe integer range). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function toJSON() {
  return Number(this);
};

const app = createServer();

app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, () => {
  // eslint-disable-next-line no-console
  console.log(`MegaCandle backend listening on port ${process.env.PORT ?? 4000}`);
});

