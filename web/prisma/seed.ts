import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Toạ độ vài quận ở TP.HCM
const HCMC = {
  q1: { lat: 10.7769, lng: 106.7009 },
  q7: { lat: 10.7340, lng: 106.7215 },
  binhthanh: { lat: 10.8106, lng: 106.7091 },
  thuduc: { lat: 10.8494, lng: 106.7537 },
};

function short(n = 8) {
  return Math.random().toString(36).slice(2, 2 + n);
}

async function main() {
  console.log("🌱 Bắt đầu seed...");

  // Xóa dữ liệu cũ (thứ tự tôn trọng FK)
  await prisma.matchParticipant.deleteMany();
  await prisma.matchImage.deleteMany();
  await prisma.match.deleteMany();
  await prisma.userSport.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sport.deleteMany();

  // --- Sports ---
  const football = await prisma.sport.create({
    data: { code: "football", name: "Bóng đá", icon: "⚽", sortOrder: 1 },
  });
  const badminton = await prisma.sport.create({
    data: { code: "badminton", name: "Cầu lông", icon: "🏸", sortOrder: 2 },
  });

  // --- Users ---
  const usersData = [
    { fullName: "Nguyễn Văn An", nickname: "An Kèo", phone: "0900000001", city: "TP.HCM", district: "Quận 1", trustScore: 92, ratingAvg: 4.8, ratingCount: 34, matchesPlayed: 40, home: HCMC.q1 },
    { fullName: "Trần Thị Bình", nickname: "Bình BĐ", phone: "0900000002", city: "TP.HCM", district: "Quận 7", trustScore: 78, ratingAvg: 4.3, ratingCount: 12, matchesPlayed: 15, home: HCMC.q7 },
    { fullName: "Lê Hoàng Cường", nickname: "Cường Lông", phone: "0900000003", city: "TP.HCM", district: "Bình Thạnh", trustScore: 65, ratingAvg: 3.9, ratingCount: 8, matchesPlayed: 10, home: HCMC.binhthanh },
    { fullName: "Phạm Minh Dũng", nickname: "Dũng", phone: "0900000004", city: "TP.HCM", district: "Thủ Đức", trustScore: null, ratingAvg: 0, ratingCount: 0, matchesPlayed: 0, home: HCMC.thuduc },
    { fullName: "Võ Thị Em", nickname: "Em", phone: "0900000005", city: "TP.HCM", district: "Quận 1", trustScore: 85, ratingAvg: 4.6, ratingCount: 20, matchesPlayed: 25, home: HCMC.q1 },
    { fullName: "Đỗ Quốc Phong", nickname: "Phong", phone: "0900000006", city: "TP.HCM", district: "Quận 7", trustScore: 70, ratingAvg: 4.0, ratingCount: 9, matchesPlayed: 11, home: HCMC.q7 },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        fullName: u.fullName,
        nickname: u.nickname,
        phone: u.phone,
        city: u.city,
        district: u.district,
        trustScore: u.trustScore,
        ratingAvg: u.ratingAvg,
        ratingCount: u.ratingCount,
        matchesPlayed: u.matchesPlayed,
        homeLat: u.home.lat,
        homeLng: u.home.lng,
        gender: "male",
        birthYear: 1995,
        sports: {
          create: [
            { sportId: football.id, skillLevel: "intermediate", isFavorite: true },
            { sportId: badminton.id, skillLevel: "beginner" },
          ],
        },
      },
    });
    users.push(user);
  }

  // --- Venues ---
  const venue1 = await prisma.venue.create({
    data: { name: "Sân bóng Tao Đàn", address: "Trương Định, Quận 1, TP.HCM", ...HCMC.q1, city: "TP.HCM", district: "Quận 1", isVerified: true, createdById: users[0].id },
  });
  const venue2 = await prisma.venue.create({
    data: { name: "Nhà thi đấu Phú Thọ", address: "Lữ Gia, Quận 11, TP.HCM", lat: 10.7710, lng: 106.6560, city: "TP.HCM", district: "Quận 11", createdById: users[1].id },
  });
  const venue3 = await prisma.venue.create({
    data: { name: "Sân cầu lông Rạch Miễu", address: "Phan Xích Long, Phú Nhuận, TP.HCM", lat: 10.7980, lng: 106.6890, city: "TP.HCM", district: "Phú Nhuận", createdById: users[2].id },
  });

  // Helper tạo thời gian tương lai
  const now = new Date();
  const inDays = (d: number, hour = 18) => {
    const t = new Date(now);
    t.setDate(t.getDate() + d);
    t.setHours(hour, 0, 0, 0);
    return t;
  };

  // --- Matches ---
  const m1 = await prisma.match.create({
    data: {
      hostId: users[0].id,
      sportId: football.id,
      venueId: venue1.id,
      title: "Đá phủi tối thứ 5 - thiếu 3 người",
      description: "Trận giao hữu vui vẻ, trình độ trung bình. Cần thêm 3 anh em cho đủ đội.",
      rules: "Đi giày cỏ nhân tạo, tự mang nước.",
      startsAt: inDays(2, 19),
      endsAt: inDays(2, 21),
      registerDeadline: inDays(2, 17),
      slotsNeeded: 10,
      slotsFilled: 7,
      genderReq: "any",
      skillReq: "intermediate",
      totalCost: 800000,
      costSplitMode: "per_host_total",
      status: "open",
      shareCode: short(),
    },
  });

  const m2 = await prisma.match.create({
    data: {
      hostId: users[2].id,
      sportId: badminton.id,
      venueId: venue3.id,
      title: "Cầu lông sáng CN - cần đôi đánh cặp",
      description: "Đánh đôi, cần 2 bạn trình độ mới-trung bình.",
      startsAt: inDays(4, 7),
      endsAt: inDays(4, 9),
      slotsNeeded: 4,
      slotsFilled: 2,
      genderReq: "any",
      skillReq: "beginner",
      totalCost: 200000,
      costSplitMode: "per_host_total",
      status: "open",
      shareCode: short(),
    },
  });

  const m3 = await prisma.match.create({
    data: {
      hostId: users[4].id,
      sportId: football.id,
      venueId: venue2.id,
      title: "Futsal Quận 11 - đã đủ người (mở waitlist)",
      startsAt: inDays(1, 20),
      endsAt: inDays(1, 21),
      slotsNeeded: 8,
      slotsFilled: 8,
      genderReq: "male",
      skillReq: "any",
      totalCost: 600000,
      costSplitMode: "per_host_total",
      status: "full",
      shareCode: short(),
    },
  });

  // --- Participants ---
  // m1: host + 6 người đã duyệt, 2 người đang chờ
  await prisma.matchParticipant.createMany({
    data: [
      { matchId: m1.id, userId: users[0].id, status: "approved" }, // host cũng tham gia
      { matchId: m1.id, userId: users[1].id, status: "approved" },
      { matchId: m1.id, userId: users[2].id, status: "approved" },
      { matchId: m1.id, userId: users[4].id, status: "approved" },
      { matchId: m1.id, userId: users[5].id, status: "approved" },
      { matchId: m1.id, userId: users[3].id, status: "pending" },
    ],
  });

  // m3: đủ 8 người (giả lập) + 1 người waitlist
  await prisma.matchParticipant.createMany({
    data: [
      { matchId: m3.id, userId: users[4].id, status: "approved" },
      { matchId: m3.id, userId: users[0].id, status: "approved" },
      { matchId: m3.id, userId: users[1].id, status: "approved" },
      { matchId: m3.id, userId: users[5].id, status: "approved" },
      { matchId: m3.id, userId: users[2].id, status: "waitlisted", waitlistPosition: 1 },
      { matchId: m3.id, userId: users[3].id, status: "waitlisted", waitlistPosition: 2 },
    ],
  });

  console.log(`✅ Seed xong: ${users.length} users, 2 sports, 3 venues, 3 matches.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
