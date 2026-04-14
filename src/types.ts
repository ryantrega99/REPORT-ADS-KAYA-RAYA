export interface Creative {
  id: string;
  name: string;
  status: string;
  preview_url?: string;
  thumbnail_url?: string;
  ad_id?: string;
  ad_name?: string;
  advertiser_name?: string;
  link_konten?: string;
  produk?: string;
  keterangan?: string;
  format_konten?: string;
  creator?: string;
  editor?: string;
  impressions?: number;
  leads?: number;
  spend?: number;
  cpr?: number;
  performance_status?: 'Winning' | 'Good' | 'Worst';
  avg_play_time?: number;
  thruplays?: number;
}

export interface Platform {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: 'active' | 'inactive';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  role: 'admin' | 'user';
  color: string;
  initials: string;
  pass?: string;
  whatsapp?: string;
  status?: 'Aktif' | 'Nonaktif';
  createdAt?: string;
  lastLogin?: string;
  assignedProducts?: string[];
  assignedFBAccounts?: string[];
  assignedGAdsAccounts?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'fb' | 'google';
  product: string;
  spend: number;
  leads: number;
  ctr: string;
  cpr?: number;
  tanggal: string;
  date_range?: string;
  fb_campaign_id?: string;
  gads_campaign_id?: string;
  impressions?: number;
  clicks?: number;
  user_id?: string;
  user_name?: string;
}

export const PRODUCTS = [
  'LKBI Reguler', 'LKBI Academic', 'LKBI Holiday', 'Kelas Online', 'Kelas Online Kids',
  'Kelas Online Ngabuburit', '4 Buku Super', 'Pesantren MrBob', 'A+ Academia',
  'MrBob Juniors', 'Kelas Online Speaking', 'Kelas Online Speaking Kids',
  'Paket 3 Bulan', 'Paket 2 Bulan', 'Paket Ramadhan', 'LKBI Rombongan'
];
