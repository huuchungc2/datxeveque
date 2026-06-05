export type RouteSeoFaq = { question: string; answer: string };

export type RouteSeoLink = { href: string; label: string };

export type RouteSeoEntry = {
  slug: string;
  routeName: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  originAreas: string[];
  destinationAreas: string[];
  vehicleTypes: string[];
  bookingSteps: string[];
  keywords: string[];
  faqs: RouteSeoFaq[];
  relatedLinks: RouteSeoLink[];
};

const SG_ORIGIN_AREAS = [
  "Bình Tân",
  "Tân Bình",
  "Gò Vấp",
  "Thủ Đức",
  "Quận 12",
  "Hóc Môn",
  "Bình Chánh",
  "Quận 1",
  "Quận 3",
  "Quận 7",
  "Quận 10",
];

const DEFAULT_BOOKING_STEPS = [
  "Chọn tuyến và loại xe (ghép / 4 chỗ / 7 chỗ).",
  "Nhập điểm đón tại TP.HCM và điểm trả tại địa phương.",
  "Gửi yêu cầu — nhân viên gọi xác nhận giá và giờ đón.",
];

const DEFAULT_VEHICLE_TYPES = ["Xe ghép tiết kiệm", "Xe 4 chỗ riêng", "Xe 7 chỗ gia đình"];

const DEFAULT_RELATED_LINKS: RouteSeoLink[] = [
  { href: "/dat-xe", label: "Đặt xe về quê" },
  { href: "/kinh-nghiem", label: "Kinh nghiệm đặt xe" },
  { href: "/bao-xe", label: "Bao xe 4–7 chỗ" },
  { href: "/xe-ghep-ve-que", label: "Xe ghép về quê" },
  { href: "/xe-4-cho-ve-que", label: "Xe 4 chỗ về quê" },
  { href: "/xe-7-cho-ve-que", label: "Xe 7 chỗ về quê" },
];

/** Chỉ render internal link khi route thật sự tồn tại trong app. */
export const EXISTING_PUBLIC_PATHS = new Set([
  "/",
  "/dat-xe",
  "/bao-xe",
  "/gui-hang",
  "/di-cho-que",
  "/kinh-nghiem",
  "/lien-he",
  "/tra-cuu-don",
  "/thue-xe-hop-dong",
  "/xe-dam-cuoi",
  "/xe-tham-quan",
  "/xe-di-benh-vien",
  "/xe-san-bay",
]);

export const routeSeoEntries: RouteSeoEntry[] = [
  {
    slug: "xe-sai-gon-di-duc-linh",
    routeName: "Sài Gòn → Đức Linh",
    title: "Xe Sài Gòn Đi Đức Linh, Võ Xu, Mê Pu, Đa Kai | Đặt Xe Về Quê",
    description:
      "Đặt xe Sài Gòn đi Đức Linh, Võ Xu, Mê Pu, Đa Kai, Trà Tân, Đông Hà. Hỗ trợ xe 4 chỗ, 7 chỗ, xe ghép, đưa đón tận nơi.",
    h1: "Xe Sài Gòn đi Đức Linh - Xe 4 chỗ, 7 chỗ, xe ghép tận nơi",
    intro:
      "Dịch vụ đặt xe Sài Gòn đi Đức Linh phục vụ khách về quê, công tác và gửi người thân. Hệ thống hỗ trợ xe ghép Sài Gòn về Đức Linh, xe 4 chỗ và xe 7 chỗ đưa đón tận nơi tại TP.HCM và các xã thuộc huyện Đức Linh. Bạn có thể đặt xe Sài Gòn đi Võ Xu, Mê Pu, Đa Kai hoặc các điểm lân cận — nhân viên xác nhận giá và giờ đón trước khi xếp chuyến.",
    originAreas: SG_ORIGIN_AREAS,
    destinationAreas: [
      "Võ Xu",
      "Mê Pu",
      "Đông Hà",
      "Trà Tân",
      "Đức Tài",
      "Đức Hạnh",
      "Đức Chính",
      "Nam Chính",
      "Vũ Hòa",
      "Sùng Nhơn",
      "Đa Kai",
    ],
    vehicleTypes: DEFAULT_VEHICLE_TYPES,
    bookingSteps: DEFAULT_BOOKING_STEPS,
    keywords: [
      "xe Sài Gòn đi Võ Xu",
      "xe Sài Gòn đi Mê Pu",
      "xe Sài Gòn đi Đa Kai",
      "xe ghép Sài Gòn về Đức Linh",
      "xe 7 chỗ Sài Gòn đi Đức Linh",
      "xe đưa đón tận nơi Đức Linh",
    ],
    faqs: [
      {
        question: "Xe Sài Gòn đi Đức Linh có đón tận nơi không?",
        answer:
          "Có. Hệ thống hỗ trợ đón tại TP.HCM và trả khách tận xã/thôn thuộc huyện Đức Linh theo địa chỉ bạn cung cấp khi đặt xe.",
      },
      {
        question: "Có xe 4 chỗ, 7 chỗ không?",
        answer:
          "Có. Tùy thời điểm và số khách, bạn có thể chọn xe ghép, xe 4 chỗ hoặc xe 7 chỗ riêng. Nhân viên sẽ tư vấn loại xe phù hợp khi xác nhận đơn.",
      },
      {
        question: "Có xe ghép không?",
        answer:
          "Có xe ghép theo tuyến Sài Gòn — Đức Linh, phù hợp khách đi một mình hoặc 1–2 người muốn tiết kiệm chi phí.",
      },
      {
        question: "Đặt xe qua Zalo được không?",
        answer:
          "Được. Bạn có thể đặt online trên website hoặc nhắn Zalo hotline để được tư vấn nhanh và xác nhận giờ đón.",
      },
      {
        question: "Giá xe phụ thuộc vào gì?",
        answer:
          "Giá phụ thuộc loại xe (ghép/4 chỗ/7 chỗ), số khách, điểm đón trả và thời gian đi. Giá tạm tính trên web; nhân viên xác nhận lại trước khi xếp chuyến.",
      },
    ],
    relatedLinks: DEFAULT_RELATED_LINKS,
  },
  {
    slug: "xe-sai-gon-di-tanh-linh",
    routeName: "Sài Gòn → Tánh Linh",
    title: "Xe Sài Gòn Đi Tánh Linh, Lạc Tánh, Bắc Ruộng | Đặt Xe Về Quê",
    description:
      "Đặt xe Sài Gòn đi Tánh Linh, Lạc Tánh, Bắc Ruộng, Đồng Kho, Gia Huynh. Hỗ trợ xe ghép, xe 4 chỗ, 7 chỗ, đưa đón tận nơi.",
    h1: "Xe Sài Gòn đi Tánh Linh - Xe 4 chỗ, 7 chỗ, xe ghép tận nơi",
    intro:
      "Tuyến xe Sài Gòn đi Tánh Linh phục vụ khách về quê và di chuyển đường dài an toàn. Hỗ trợ xe ghép, xe 4 chỗ và xe 7 chỗ đón tại TP.HCM, trả tận nơi tại thị trấn Tánh Linh và các xã lân cận. Đặt xe online hoặc liên hệ hotline/Zalo để được báo giá và xác nhận giờ đón.",
    originAreas: SG_ORIGIN_AREAS,
    destinationAreas: [
      "Thị trấn Tánh Linh",
      "Lạc Tánh",
      "Bắc Ruộng",
      "Đồng Kho",
      "Gia Huynh",
      "Hàm Liêm",
      "Hàm Thắng",
      "Hàm Thuận",
      "Phước Hội",
      "Phước Tân",
      "Nghĩa Bình",
      "Thanh An",
    ],
    vehicleTypes: DEFAULT_VEHICLE_TYPES,
    bookingSteps: DEFAULT_BOOKING_STEPS,
    keywords: [
      "xe Sài Gòn đi Tánh Linh",
      "xe ghép Sài Gòn về Tánh Linh",
      "xe 7 chỗ Sài Gòn đi Tánh Linh",
      "xe Sài Gòn đi Lạc Tánh",
      "xe Sài Gòn đi Bắc Ruộng",
      "xe đưa đón tận nơi Tánh Linh",
    ],
    faqs: [
      {
        question: "Xe Sài Gòn đi Tánh Linh có đón tận nơi không?",
        answer:
          "Có. Đón khách tại TP.HCM và trả tận địa chỉ tại huyện Tánh Linh (thị trấn, xã) theo thông tin bạn cung cấp khi đặt.",
      },
      {
        question: "Có xe 4 chỗ, 7 chỗ không?",
        answer:
          "Có. Hệ thống hỗ trợ xe riêng 4–7 chỗ và xe ghép tùy số lượng khách và thời gian bạn cần đi.",
      },
      {
        question: "Có xe ghép không?",
        answer:
          "Có xe ghép theo tuyến Sài Gòn — Tánh Linh, phù hợp khách đi một mình hoặc ít người.",
      },
      {
        question: "Đặt xe qua Zalo được không?",
        answer:
          "Được. Bạn đặt trên website hoặc nhắn Zalo qua số hotline trên trang để được hỗ trợ nhanh.",
      },
      {
        question: "Giá xe phụ thuộc vào gì?",
        answer:
          "Giá phụ thuộc loại xe, số khách, cự ly đón/trả và khung giờ. Giá trên web là tạm tính; nhân viên xác nhận trước khi điều xe.",
      },
    ],
    relatedLinks: DEFAULT_RELATED_LINKS,
  },
];

export function getRouteSeoBySlug(slug?: string | null): RouteSeoEntry | undefined {
  const key = String(slug || "").trim().replace(/^\/+/, "");
  return routeSeoEntries.find((r) => r.slug === key);
}

export function buildRouteFaqJsonLd(faqs: RouteSeoFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function filterExistingLinks(links: RouteSeoLink[]): RouteSeoLink[] {
  return links.filter((l) => EXISTING_PUBLIC_PATHS.has(l.href));
}
