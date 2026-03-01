import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../lib/prisma";

describe("Session API", () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany();
    await prisma.session.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.session.deleteMany();
    await prisma.$disconnect();
  });

  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/sessions creates a session", async () => {
    const res = await request(app).post("/api/sessions");
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("createdAt");
  });

  it("GET /api/sessions lists sessions", async () => {
    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH /api/sessions/:id renames a session", async () => {
    const create = await request(app).post("/api/sessions");
    const id = create.body.id;

    const res = await request(app)
      .patch(`/api/sessions/${id}`)
      .send({ title: "Test Session" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Test Session");
  });

  it("DELETE /api/sessions/:id soft-deletes a session", async () => {
    const create = await request(app).post("/api/sessions");
    const id = create.body.id;

    const del = await request(app).delete(`/api/sessions/${id}`);
    expect(del.status).toBe(200);

    // Should not appear in list
    const list = await request(app).get("/api/sessions");
    const found = list.body.find((s: { id: string }) => s.id === id);
    expect(found).toBeUndefined();
  });

  it("GET /api/sessions/:id/messages returns empty for new session", async () => {
    const create = await request(app).post("/api/sessions");
    const id = create.body.id;

    const res = await request(app).get(`/api/sessions/${id}/messages`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/sessions/:id/messages rejects empty content", async () => {
    const create = await request(app).post("/api/sessions");
    const id = create.body.id;

    const res = await request(app)
      .post(`/api/sessions/${id}/messages`)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });
});
