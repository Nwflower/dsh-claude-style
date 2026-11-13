import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'brand',
  order: 15,
  contracts: [],
  ungated: '只画读者自己提供的品牌名、标志图与所选方案的颜色；什么都没提供时页面与所选品牌一致',
  stylesheets: [{ file: 'brand.css', rank: 115 }],
  cases: ['custom-brand'],
  scenarios: ['customBrand', 'remoteSettings'],
} satisfies FeatureManifest
