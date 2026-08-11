export const theme = {
  colors: { background:'#F5F2EC', surface:'#EDE9E0', ink:'#1A1814', inkMid:'#7A7570', inkFaint:'#C2BDB5', done:'#2E5E18', partial:'#8A5A0A', miss:'#862222', future:'#D8D3CA', past:'#E8E4DC', primary:'#1A1814', error:'#D32F2F', white:'#FFFFFF' },
  spacing:{xs:4,sm:8,md:12,lg:16,xl:24,xxl:32},
  radius:{sm:6,md:10,lg:12,pill:999},
  typography:{body:16,caption:12,small:14,title:32,year:72},
} as const;
export type Theme = typeof theme;
