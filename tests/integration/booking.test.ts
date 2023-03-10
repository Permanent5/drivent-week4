import { prisma } from "@/config";
import app, { init } from "@/app";
import { cleanDb, generateValidToken } from "../helpers";
import supertest from "supertest";
import { createEnrollmentWithAddress, createHotel, createPayment, createRoomWithHotelId, createRoomWithoutCapacity, createTicket, createTicketType, createTicketTypeCustom, createUser } from "../factories";
import httpStatus from "http-status";
import jwt from "jsonwebtoken"
import { TicketStatus } from "@prisma/client";
import { createBooking } from "../factories/booking-factory";


beforeAll(async () => {
    await init()
})

beforeEach(async () => {
    await cleanDb()
})

const server = supertest(app)


describe("POST /booking", () => {
    it("should respond with status 404 if invalid roomId", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: 0})
        expect(response.status).toBe(httpStatus.NOT_FOUND)
    })

    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/hotels");
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });


    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });


    it("should respond with status 404 when user has no enrollment ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 0});

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    })

    
    it("Should respond with status 403 when ticket is not paid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketType();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: createdRoom.id})

        expect(response.status).toBe(httpStatus.FORBIDDEN)
    })

    it("Should respond with status 403 when ticketType is remote", async () => {
        const isRemote = true
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: createdRoom.id})

        expect(response.status).toBe(httpStatus.FORBIDDEN)
    })

    it("Should respond with status 403 when ticketType not include hotel", async () => {
        const isRemote = true
        const includesHotel = false

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: createdRoom.id})

        expect(response.status).toBe(httpStatus.FORBIDDEN)
    })

    it("Should respond with status 403 when room do not have more capacity", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithoutCapacity(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: createdRoom.id})

        expect(response.status).toBe(httpStatus.FORBIDDEN)
    })

    it("should respond with status 200 and the booking data", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const response = await server.post("/booking/").set("Authorization", `Bearer ${token}`).send({roomId: createdRoom.id})
        console.log(response.body)
        expect(response.status).toBe(httpStatus.OK)
        expect(response.body).toEqual({            
            id: expect.any(Number),
            userId: expect.any(Number),
            roomId: expect.any(Number),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
        })
    })

    })

describe("GET /booking", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/hotels");
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 404 when user has no enrollment ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 0});

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    })

    it("Should respond with status 404 if user don't have a reserve", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(404)
    })

    it("Should respond with status 200 and send booking data", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const booking = await createBooking(createdRoom.id, user.id)

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            id: expect.any(Number),
            room: {
                id: createdRoom.id,
                name: createdRoom.name,
                capacity: createdRoom.capacity,
                hotelId: createdRoom.hotelId,
                createdAt: createdRoom.createdAt.toISOString(),
                updatedAt: createdRoom.updatedAt.toISOString()
            }
        })
    })
})

describe("PUT /booking/:roomId", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/hotels");
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 404 when user has no enrollment ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 0});

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    })

    it("Should respond with status 404 if user don't have a reserve", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(httpStatus.NOT_FOUND)
    })

    it("should respond with status 404 if room not exist", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const secondCreatedRoom = await createRoomWithoutCapacity(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const booking = await createBooking(createdRoom.id, user.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({roomId: 0})

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    })

    it("should respond with status 403 if room does not have vacant places", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const secondCreatedRoom = await createRoomWithoutCapacity(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const booking = await createBooking(createdRoom.id, user.id)
        console.log(booking.id, secondCreatedRoom.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({roomId : secondCreatedRoom.id})

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
    })

    it("should respond with status 200 and send the bookingId", async () => {
        const isRemote = false
        const includesHotel = true

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const createdHotel = await createHotel()
        const createdRoom = await createRoomWithHotelId(createdHotel.id)
        const secondCreatedRoom = await createRoomWithHotelId(createdHotel.id)
        const ticketType = await createTicketTypeCustom(isRemote, includesHotel);
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const booking = await createBooking(createdRoom.id, user.id)
        console.log(booking.id, secondCreatedRoom.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({roomId : secondCreatedRoom.id})

        expect(response.status).toEqual(httpStatus.OK);
        expect(response.body).toEqual({
            id: expect.any(Number)
        })
    })
})