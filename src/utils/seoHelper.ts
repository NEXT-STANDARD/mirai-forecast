/**
 * 未来レーダー (MiraiRadar) - プロフェッショナルSEO ＆ カノニカル正規化マネージャー
 * Google / Bing / AI検索（ChatGPT, Perplexity）向けメタタグ・JSON-LD構造化データ動的最適化
 */

export interface SeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, any>;
}

const DEFAULT_OG_IMAGE = 'https://mirairadar.com/ogp-main.png';
const SITE_NAME = '未来レーダー (MiraiRadar)';

export function applySeoMetadata(config: SeoConfig) {
  if (typeof document === 'undefined') return;

  // 1. タイトル
  document.title = config.title;

  // 2. カノニカルタグ (<link rel="canonical">) の作成または更新
  let canonicalLink = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', config.canonicalUrl);

  // 3. メタディスクリプション
  let metaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']");
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', config.description);

  // 4. OGPタグの更新
  updateMetaProperty('og:title', config.title);
  updateMetaProperty('og:description', config.description);
  updateMetaProperty('og:url', config.canonicalUrl);
  updateMetaProperty('og:type', config.ogType || 'website');
  updateMetaProperty('og:site_name', SITE_NAME);
  updateMetaProperty('og:image', config.ogImage || DEFAULT_OG_IMAGE);

  // 5. Twitter Cardタグの更新
  updateMetaName('twitter:title', config.title);
  updateMetaName('twitter:description', config.description);
  updateMetaName('twitter:url', config.canonicalUrl);
  updateMetaName('twitter:image', config.ogImage || DEFAULT_OG_IMAGE);

  // 6. JSON-LD 構造化データの更新
  if (config.jsonLd) {
    let scriptTag = document.querySelector<HTMLScriptElement>("script[type='application/ld+json']#dynamic-seo-jsonld");
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      scriptTag.setAttribute('id', 'dynamic-seo-jsonld');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(config.jsonLd);
  }
}

function updateMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property='${property}']`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateMetaName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name='${name}']`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
