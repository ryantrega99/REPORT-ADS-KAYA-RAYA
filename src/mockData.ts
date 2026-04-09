import { Campaign, PRODUCTS } from "./types";

function mockCampaigns(userId: string, multiplier = 1): Campaign[] {
  const prods = PRODUCTS.slice(0, 8);
  const uIdx = ['khabib', 'wahib', 'dilla', 'thoha', 'ryan'].indexOf(userId);
  
  const camps: Campaign[] = [
    { id: `c1_${userId}`, name: 'Promo Ramadan 2026', platform: 'fb', spend: Math.round((820 + Math.random() * 400) * multiplier), leads: Math.round((45 + Math.random() * 30) * multiplier), ctr: (3.2 + Math.random() * 1.5).toFixed(2), product: '', tanggal: new Date().toLocaleDateString('id-ID') },
    { id: `c2_${userId}`, name: 'Retargeting Website', platform: 'fb', spend: Math.round((600 + Math.random() * 30) * multiplier), leads: Math.round((35 + Math.random() * 20) * multiplier), ctr: (2.5 + Math.random() * 1.0).toFixed(2), product: '', tanggal: new Date().toLocaleDateString('id-ID') },
    { id: `c3_${userId}`, name: 'Brand Search', platform: 'google', spend: Math.round((500 + Math.random() * 350) * multiplier), leads: Math.round((28 + Math.random() * 22) * multiplier), ctr: (3.0 + Math.random() * 1.2).toFixed(2), product: '', tanggal: new Date().toLocaleDateString('id-ID') },
    { id: `c4_${userId}`, name: 'Display Remarketing', platform: 'google', spend: Math.round((400 + Math.random() * 250) * multiplier), leads: Math.round((18 + Math.random() * 15) * multiplier), ctr: (1.1 + Math.random() * 0.8).toFixed(2), product: '', tanggal: new Date().toLocaleDateString('id-ID') },
    { id: `c5_${userId}`, name: 'Lookalike Audience', platform: 'fb', spend: Math.round((350 + Math.random() * 200) * multiplier), leads: Math.round((22 + Math.random() * 18) * multiplier), ctr: (2.8 + Math.random() * 0.9).toFixed(2), product: '', tanggal: new Date().toLocaleDateString('id-ID') },
  ];

  camps.forEach((c, i) => {
    c.product = PRODUCTS[(uIdx * 3 + i * 2) % PRODUCTS.length];
  });
  
  return camps;
}

export const INITIAL_DATA: Record<string, { campaigns: Campaign[] }> = {
  khabib: { campaigns: mockCampaigns('khabib', 0.8) },
  wahib: { campaigns: mockCampaigns('wahib', 1.1) },
  dilla: { campaigns: mockCampaigns('dilla', 0.9) },
  thoha: { campaigns: mockCampaigns('thoha', 1.0) },
  ryan: { campaigns: mockCampaigns('ryan', 0.7) },
};
