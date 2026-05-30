import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bookingNeedsDispatch } from "./bookingSeats.js";
import { buildAvailableDriverWhere, getBusyDriverIds } from "./dispatchDrivers.js";
import { buildDispatchSuggestions, computeDispatchSeatSummary } from "./dispatchSuggestions.js";
import { buildDispatchOptionsForSuggestion } from "./dispatchOptions.js";
import { serializeBookings } from "./bookingSerialize.js";
import { enrichBookingDispatchSeats } from "./dispatchOptions.js";
import { parseScheduledAtDateRange } from "./datetime.js";
import { publicRouteWhere } from "./routes.js";
import { toNumberOrUndefined } from "./pagination.js";

export const DISPATCH_UNASSIGNED_STATUSES: BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.CONTACTED,
  BookingStatus.QUOTED,
  BookingStatus.WAITING_DEPOSIT,
  BookingStatus.DEPOSITED,
  BookingStatus.WAITING_DISPATCH,
];

const UNASSIGNED_STATUS_STRINGS = DISPATCH_UNASSIGNED_STATUSES as string[];

const MAX_BOOKINGS_FOR_SUGGESTIONS = 2000;

export type DispatchBoardQuery = Record<string, unknown>;

export function parseDispatchPage(query: DispatchBoardQuery, key: string, fallback = 1) {
  return Math.max(1, toNumberOrUndefined(query[key]) ?? fallback);
}

export function parseDispatchPageSize(query: DispatchBoardQuery, key: string, fallback: number, max: number) {
  const raw = toNumberOrUndefined(query[key]) ?? fallback;
  return Math.min(max, Math.max(5, raw));
}

export function paginateSlice<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;
  return {
    items: items.slice(skip, skip + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function buildDispatchWheres(query: DispatchBoardQuery) {
  const whereBooking: Record<string, unknown> = {
    status: { in: DISPATCH_UNASSIGNED_STATUSES },
  };
  const whereTrip: Record<string, unknown> = {
    status: { in: [TripStatus.COLLECTING, TripStatus.READY] },
    availableSeats: { gt: 0 },
  };
  const whereDriverExtra: Record<string, unknown> = {};

  if (query.routeId) {
    const routeId = Number(query.routeId);
    whereBooking.routeId = routeId;
    whereTrip.routeId = routeId;
  }
  if (query.matchRouteId) {
    const routeId = Number(query.matchRouteId);
    if (routeId) {
      whereTrip.routeId = routeId;
    }
  }
  const matchRun = String(query.matchRunDirection || "");
  if (matchRun === "SG_TO_PROVINCE" || matchRun === "PROVINCE_TO_SG") {
    whereDriverExtra.runDirection = matchRun;
  }
  if (query.type) whereBooking.type = query.type;

  const keyword = String(query.q || query.keyword || "").trim();
  if (keyword) {
    whereBooking.OR = [
      { customerName: { contains: keyword } },
      { customerPhone: { contains: keyword } },
      { code: { contains: keyword } },
    ];
  }

  const dispatchDateRange = parseScheduledAtDateRange(query.from, query.to);
  if (dispatchDateRange) {
    whereBooking.scheduledAt = dispatchDateRange;
    whereTrip.departureAt = dispatchDateRange;
  }

  if (query.direction) {
    whereBooking.direction = { contains: String(query.direction) };
    whereDriverExtra.direction = { contains: String(query.direction) };
  }

  if (query.seatsNeeded) {
    const seats = Number(query.seatsNeeded);
    if (Number.isFinite(seats)) {
      whereDriverExtra.vehicles = { some: { seats: { gte: seats } } };
    }
  }

  return { whereBooking, whereTrip, whereDriverExtra };
}

async function fetchUnassignedBookings(whereBooking: Record<string, unknown>) {
  const candidates = await prisma.booking.findMany({
    where: whereBooking,
    include: { route: true, tripBookings: true },
    orderBy: [{ createdAt: "desc" }, { scheduledAt: "desc" }],
    take: MAX_BOOKINGS_FOR_SUGGESTIONS,
  });
  return candidates.filter((b) => bookingNeedsDispatch(b, UNASSIGNED_STATUS_STRINGS));
}

export async function loadDispatchBoard(query: DispatchBoardQuery) {
  const { whereBooking, whereTrip, whereDriverExtra } = buildDispatchWheres(query);
  const busyDriverIds = await getBusyDriverIds();
  const whereDriver = buildAvailableDriverWhere(busyDriverIds, whereDriverExtra);

  const bookingsPage = parseDispatchPage(query, "bookingsPage");
  const bookingsPageSize = parseDispatchPageSize(query, "bookingsPageSize", 12, 50);
  const tripsPage = parseDispatchPage(query, "tripsPage");
  const tripsPageSize = parseDispatchPageSize(query, "tripsPageSize", 10, 50);
  const driversPage = parseDispatchPage(query, "driversPage");
  const driversPageSize = parseDispatchPageSize(query, "driversPageSize", 8, 50);
  const suggestionsPage = parseDispatchPage(query, "suggestionsPage");
  const suggestionsPageSize = parseDispatchPageSize(query, "suggestionsPageSize", 8, 30);

  const tripInclude = {
    route: true,
    driver: true,
    vehicle: true,
    tripBookings: { include: { booking: { include: { route: true } } } },
  } as const;

  const [
    allUnassigned,
    tripsTotal,
    collectingTripsPage,
    tripsForSuggestions,
    driversTotal,
    availableDriversPage,
    driversForSuggestions,
    routes,
  ] = await Promise.all([
    fetchUnassignedBookings(whereBooking),
    prisma.trip.count({ where: whereTrip }),
    prisma.trip.findMany({
      where: whereTrip,
      include: tripInclude,
      orderBy: [{ departureAt: "desc" }, { createdAt: "desc" }],
      skip: (tripsPage - 1) * tripsPageSize,
      take: tripsPageSize,
    }),
    prisma.trip.findMany({
      where: whereTrip,
      include: tripInclude,
      orderBy: [{ departureAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.driver.count({ where: whereDriver }),
    prisma.driver.findMany({
      where: whereDriver,
      include: { vehicles: true, route: true },
      orderBy: { id: "asc" },
      skip: (driversPage - 1) * driversPageSize,
      take: driversPageSize,
    }),
    prisma.driver.findMany({
      where: whereDriver,
      include: { vehicles: true, route: true },
      orderBy: { id: "asc" },
      take: 200,
    }),
    prisma.route.findMany({ where: publicRouteWhere(), orderBy: { id: "asc" } }),
  ]);

  const bookingsPaged = paginateSlice(allUnassigned, bookingsPage, bookingsPageSize);
  const unassignedBookings = serializeBookings(bookingsPaged.items).map((b) => enrichBookingDispatchSeats(b));

  const allSuggestions = buildDispatchSuggestions(allUnassigned, tripsForSuggestions, driversForSuggestions);
  const suggestionsWithOptions = allSuggestions.map((s) => ({
    ...s,
    dispatchOptions: buildDispatchOptionsForSuggestion({
      suggestion: s,
      unassignedBookings: allUnassigned,
      collectingTrips: tripsForSuggestions,
      availableDrivers: driversForSuggestions,
    }),
  }));
  const suggestionsPaged = paginateSlice(suggestionsWithOptions, suggestionsPage, suggestionsPageSize);

  const seatSummary = computeDispatchSeatSummary(allUnassigned);

  return {
    unassignedBookings,
    bookingsMeta: {
      page: bookingsPaged.page,
      pageSize: bookingsPaged.pageSize,
      total: bookingsPaged.total,
      totalPages: bookingsPaged.totalPages,
    },
    collectingTrips: collectingTripsPage,
    tripsMeta: {
      page: tripsPage,
      pageSize: tripsPageSize,
      total: tripsTotal,
      totalPages: Math.max(1, Math.ceil(tripsTotal / tripsPageSize)),
    },
    availableDrivers: availableDriversPage,
    driversMeta: {
      page: driversPage,
      pageSize: driversPageSize,
      total: driversTotal,
      totalPages: Math.max(1, Math.ceil(driversTotal / driversPageSize)),
    },
    routes,
    suggestions: suggestionsPaged.items,
    suggestionsMeta: {
      page: suggestionsPaged.page,
      pageSize: suggestionsPaged.pageSize,
      total: suggestionsPaged.total,
      totalPages: suggestionsPaged.totalPages,
    },
    seatSummary,
    assignDriverCandidates: driversForSuggestions.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      location: d.location,
      direction: d.direction,
      routeId: d.routeId,
      runDirection: d.runDirection,
      route: d.route,
      seatsFree: d.seatsFree,
      vehicles: d.vehicles,
    })),
  };
}
