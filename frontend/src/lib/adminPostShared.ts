export type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
};

export type PostRow = PostForm & {
  id: number;
  categoryId?: number | null;
  category?: { id: number; name: string } | null;
};

export const emptyPostForm = (): PostForm => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  categoryId: "",
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
});

export function postToForm(p: PostRow): PostForm {
  return {
    title: p.title ?? "",
    slug: p.slug ?? "",
    excerpt: p.excerpt ?? "",
    content: p.content ?? "",
    categoryId: p.categoryId ? String(p.categoryId) : p.category?.id ? String(p.category.id) : "",
    status: p.status ?? "DRAFT",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}

export function imageHtml(url: string, alt: string) {
  const safeAlt = alt.replace(/"/g, "&quot;");
  return `<figure class="post-cover"><img src="${url}" alt="${safeAlt}" loading="lazy" /></figure>`;
}
