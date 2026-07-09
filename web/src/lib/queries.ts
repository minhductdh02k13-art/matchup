import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/format";
import { LOW_TRUST_THRESHOLD } from "@/lib/trust";

export type MatchFilter = {
  sport?: string; // sport code
  radiusKm?: number; // 3 | 5 | 10
  onlyOpen?: boolean;
  sort?: "soonest" | "newest" | "nearest";
  fromLat?: number | null;
  fromLng?: number | null;
};

// Kiểu trận kèm quan hệ + khoảng cách đã tính.
export async function getMatches(filter: MatchFilter) {
  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      // Không hiện trận đã hủy / đã xong ở trang tìm kèo
      status: filter.onlyOpen ? "open" : { notIn: ["cancelled", "completed"] },
      ...(filter.sport ? { sport: { code: filter.sport } } : {}),
    },
    include: {
      host: true,
      sport: true,
      venue: true,
    },
    orderBy:
      filter.sort === "newest" ? { createdAt: "desc" } : { startsAt: "asc" },
  });

  // Tính khoảng cách (Haversine) nếu biết vị trí người dùng.
  const withDistance = matches.map((m) => {
    const distanceKm =
      filter.fromLat != null && filter.fromLng != null
        ? haversineKm(filter.fromLat, filter.fromLng, m.venue.lat, m.venue.lng)
        : null;
    return { ...m, distanceKm };
  });

  let result = withDistance;

  // Lọc theo bán kính (nếu có toạ độ).
  if (filter.radiusKm && filter.fromLat != null) {
    result = result.filter(
      (m) => m.distanceKm != null && m.distanceKm <= filter.radiusKm!
    );
  }

  // Sắp xếp theo khoảng cách gần nhất.
  if (filter.sort === "nearest") {
    result = [...result].sort(
      (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    );
  }

  // Hạ hạng: kèo của host uy tín rất thấp bị đẩy xuống cuối (giữ thứ tự trong nhóm)
  const isLow = (t: number | null) => t != null && t < LOW_TRUST_THRESHOLD;
  result = [
    ...result.filter((m) => !isLow(m.host.trustScore)),
    ...result.filter((m) => isLow(m.host.trustScore)),
  ];

  return result;
}

export async function getMatchDetail(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      host: true,
      sport: true,
      venue: true,
      images: { orderBy: { sortOrder: "asc" } },
      participants: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      checkIns: true,
      reviews: true,
    },
  });
}
