"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.upsert({
        where: { email: "demo@tradefx.local" },
        update: {},
        create: {
            googleId: "demo-google-id",
            email: "demo@tradefx.local",
            name: "Demo Trader",
        },
    });
    const existingCount = await prisma.trade.count({ where: { userId: user.id } });
    if (existingCount >= 50)
        return;
    const symbols = ["XAUUSD", "EURUSD", "GBPUSD", "US30", "BTCUSD"];
    for (let i = 0; i < 50; i += 1) {
        const symbol = symbols[i % symbols.length];
        const side = i % 2 === 0 ? client_1.TradeSide.LONG : client_1.TradeSide.SHORT;
        const entryPrice = 100 + i * 2;
        const exitPrice = entryPrice + (i % 3 === 0 ? 4 : -3);
        const lotSize = 1 + (i % 3) * 0.5;
        const fees = 1.5;
        const sign = side === client_1.TradeSide.LONG ? 1 : -1;
        const pnl = (exitPrice - entryPrice) * lotSize * sign - fees;
        const closeTime = new Date(Date.now() - (50 - i) * 86400000);
        const openTime = new Date(closeTime.getTime() - 7200000);
        await prisma.trade.create({
            data: {
                userId: user.id,
                symbol,
                side,
                entryPrice,
                exitPrice,
                lotSize,
                fees,
                pnl,
                openTime,
                closeTime,
                notes: `Seed trade #${i + 1}`,
                strategy: i % 2 === 0 ? "Breakout" : "Pullback",
            },
        });
    }
}
main()
    .finally(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
