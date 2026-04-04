import { Helmet } from "react-helmet";

function SEO({ title, description }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Author */}
      <meta name="author" content="Children's Valley English School" />

      {/* Robots */}
      <meta name="robots" content="index, follow" />

      {/* Keywords (optional but ok) */}
      <meta
        name="keywords"
        content="school in Varanasi, CBSE school Varanasi, best school in Varanasi, English medium school Varanasi, Children's Valley English School"
      />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://cves.in" />
      <meta property="og:image" content="https://cves.in/logo.png" />
    </Helmet>
  );
}

export default SEO;
