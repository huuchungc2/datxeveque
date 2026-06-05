/**
 * Seed 10 bài Kinh nghiệm (published) vào DB.
 * Chạy: cd backend && node scripts/seed-experience-posts.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { EXPERIENCE_POSTS } from "./data/experience-posts.mjs";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.postCategory.upsert({
    where: { slug: "kinh-nghiem" },
    update: { name: "Kinh nghiệm" },
    create: { name: "Kinh nghiệm", slug: "kinh-nghiem" },
  });

  let created = 0;
  let updated = 0;

  for (const p of EXPERIENCE_POSTS) {
    const data = {
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      categoryId: category.id,
      status: "PUBLISHED",
      publishedAt: new Date(p.publishedAt),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    };

    const existing = await prisma.post.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.post.update({ where: { slug: p.slug }, data });
      updated++;
    } else {
      await prisma.post.create({ data: { ...data, slug: p.slug } });
      created++;
    }
  }

  console.log(`Seed kinh nghiệm xong: ${created} mới, ${updated} cập nhật (category: ${category.slug}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
