/** Trang dịch vụ riêng theo spec 07/09 */
export const servicePages = [
  { path: "/xe-dam-cuoi", type: "WEDDING", title: "Thuê xe đám cưới" },
  { path: "/xe-tham-quan", type: "TOUR", title: "Thuê xe tham quan" },
  { path: "/xe-di-benh-vien", type: "HOSPITAL", title: "Xe đi bệnh viện" },
  { path: "/xe-san-bay", type: "AIRPORT", title: "Xe sân bay" },
] as const;

export const serviceSitemapPaths = servicePages.map((s) => s.path.replace(/^\//, ""));
