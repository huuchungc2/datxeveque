import { Helmet } from "react-helmet-async";
import { toAbsoluteUrl, toCanonicalUrl } from "../lib/siteUrl";

type Props = {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
};

function safeJsonLd(value: object | object[]) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function SEOHead({
  title,
  description,
  canonicalPath,
  ogImage,
  noIndex,
  jsonLd,
}: Props) {
  const canonicalUrl = toCanonicalUrl(canonicalPath);
  const ogUrl = canonicalUrl;
  const resolvedOgImage = toAbsoluteUrl(ogImage) || toAbsoluteUrl("/brand/logo-dat-xe-ve-que-header.webp");
  const jsonLdText = jsonLd ? safeJsonLd(jsonLd) : "";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      {resolvedOgImage && <meta property="og:image" content={resolvedOgImage} />}

      <meta name="twitter:card" content="summary_large_image" />

      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {jsonLdText && <script type="application/ld+json">{jsonLdText}</script>}
    </Helmet>
  );
}

