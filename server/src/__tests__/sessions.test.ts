import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../lib/prisma";

describe("Session API", () => {
  let token: string;
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: "testpassword123",
  };

  beforeAll(async () => {
    // Register a test user and get a JWT token
    const res = await request(app)
      .post("/auth/register")
      .send(testUser);
    token = res.body.token;
  });

  afterAll(async () => {
    // Clean up sessions and messages for the test user
    const user = await prisma.user.findUnique({
      where: { username: testUser.username },
    });
    if (user) {
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      const sessionIds = sessions.map((s) => s.id);
      await prisma.message.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  function auth(req: request.Test) {
    return req.set("Authorization", `Bearer ${token}`);
  }

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /sessions requires authentication", async () => {
    const res = await request(app).post("/sessions");
    expect(res.status).toBe(401);
  });

  it("POST /sessions creates a session", async () => {
    const res = await auth(request(app).post("/sessions"));
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("createdAt");
  });

  it("GET /sessions lists sessions", async () => {
    const res = await auth(request(app).get("/sessions"));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH /sessions/:id renames a session", async () => {
    const create = await auth(request(app).post("/sessions"));
    const id = create.body.id;

    const res = await auth(
      request(app).patch(`/sessions/${id}`).send({ title: "Test Session" })
    );
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Test Session");
  });

  it("DELETE /sessions/:id soft-deletes a session", async () => {
    const create = await auth(request(app).post("/sessions"));
    const id = create.body.id;

    const del = await auth(request(app).delete(`/sessions/${id}`));
    expect(del.status).toBe(200);

    // Should not appear in list
    const list = await auth(request(app).get("/sessions"));
    const found = list.body.find((s: { id: string }) => s.id === id);
    expect(found).toBeUndefined();
  });

  it("GET /sessions/:id/messages returns empty for new session", async () => {
    const create = await auth(request(app).post("/sessions"));
    const id = create.body.id;

    const res = await auth(request(app).get(`/sessions/${id}/messages`));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /sessions/:id/messages rejects empty content", async () => {
    const create = await auth(request(app).post("/sessions"));
    const id = create.body.id;

    const res = await auth(
      request(app).post(`/sessions/${id}/messages`).send({ content: "" })
    );
    expect(res.status).toBe(400);
  });
});
