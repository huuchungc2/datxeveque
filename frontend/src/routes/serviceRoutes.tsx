/** Dịch vụ hợp đồng / đặc biệt (spec 07) */
export const specialtyServicePages = [
  { path: "/xe-dam-cuoi", type: "WEDDING", title: "Thuê xe đám cưới", menuLabel: "Xe đám cưới" },
  { path: "/xe-tham-quan", type: "TOUR", title: "Thuê xe tham quan", menuLabel: "Xe tham quan" },
  { path: "/xe-di-benh-vien", type: "HOSPITAL", title: "Xe đi bệnh viện", menuLabel: "Xe đi bệnh viện" },
  { path: "/xe-san-bay", type: "AIRPORT", title: "Xe sân bay", menuLabel: "Xe sân bay" },
] as const;

/** @deprecated dùng specialtyServicePages */
export const servicePages = specialtyServicePages;

export const serviceSitemapPaths = [
  ...specialtyServicePages.map((s) => s.path.replace(/^\//, "")),
];
