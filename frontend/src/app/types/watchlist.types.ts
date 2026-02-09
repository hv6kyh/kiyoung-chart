/** Supabase user_stocks 테이블 행 타입 */
export interface UserStockRow {
  id: string;
  user_id: string;
  code: string;
  name: string;
  short_name: string;
  market: 'KRX' | 'US';
  color: string;
  sector: string;
  created_at: string;
}

/** 종목 추가 시 필요한 페이로드 (id, user_id, created_at은 서버에서 생성) */
export interface UserStockInsert {
  code: string;
  name: string;
  short_name: string;
  market: 'KRX' | 'US';
  color?: string;
  sector?: string;
}
