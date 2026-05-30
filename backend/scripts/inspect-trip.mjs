import { PrismaClient } from "@prisma/client";

const code = process.argv[2] || "CX-260525-TX3P";
const p = new PrismaClient();

const trip = await p.trip.findFirst({
  where: { code },
  include: {
    route: true,
    driver: { select: { id: true, name: true, phone: true } },
    tripBookings: {
      include: {
        booking: {
          select: {
            id: true,
            code: true,
            customerName: true,
            finalTotal: true,
            estimatedTotal: true,
            commissionAmount: true,
            paymentReceiver: true,
            paymentStatus: true,
            passengerCount: true,
          },
        },
      },
    },
  },
});

if (!trip) {
  console.log("NOT_FOUND:", code);
  process.exit(0);
}

const pays = await p.driverSettlementPayment.findMany({ where: { tripId: trip.id } });

console.log(
  JSON.stringify(
    {
      trip: {
        id: trip.id,
        code: trip.code,
        status: trip.status,
        completedAt: trip.completedAt,
        driverDebtAmount: String(trip.driverDebtAmount),
        adminOwesDriverAmount: String(trip.adminOwesDriverAmount),
        totalCustomerAmount: String(trip.totalCustomerAmount),
        adminCommission: String(trip.adminCommission),
        driverNetAmount: String(trip.driverNetAmount),
        settlementStatus: trip.settlementStatus,
        driver: trip.driver,
        route: trip.route?.name,
      },
      tripBookings: trip.tripBookings.map((tb) => ({
        seatCount: tb.seatCount,
        booking: {
          ...tb.booking,
          finalTotal: String(tb.booking.finalTotal),
          commissionAmount: String(tb.booking.commissionAmount),
        },
      })),
      settlementPayments: pays.map((x) => ({ ...x, amount: String(x.amount) })),
    },
    null,
    2
  )
);

await p.$disconnect();
