/**
 * Quy ước triển khai theo mục 12 trong plan.md.
 * Tập trung các mặc định đề xuất, tách rõ khỏi luật đã chốt,
 * hiển thị trên màn hình luật để chủ dự án dễ điều chỉnh.
 */
export interface RulesConfig {
  /**
   * 1. Sảnh dài bị chặt: chủ dự án chưa đưa mức phạt riêng.
   * Mặc định = 0 (không phát sinh phạt chặt sảnh).
   */
  longStraightCutPenalty: number;

  /**
   * 1. Sảnh dài còn trên tay: null = tính từng lá 1 điểm (đếm lá thường).
   */
  longStraightRotPenalty: number | null;

  /**
   * 2. Công thức tính Cóng kết hợp Thối:
   * rotScore = điểm tay theo phân nhóm thối không trùng.
   * congScore = rotScore + congBaseExtra (mặc định 13 điểm nền thêm vào rotScore).
   */
  congBaseExtra: number;

  /**
   * 3. Phá hòa ăn trắng: so giá trị bộ ưu tiên rồi đến ghế có lượt mở ván trước.
   */
  instantWinTieBreaker: 'combo_value_then_opener';

  /**
   * 4. Ván sau nhiều người thắng (hoặc người thắng rời):
   * Chọn người còn ghế có lá nhỏ nhất để mở.
   */
  nextGameOpenerOnMultipleWinners: 'lowest_card_dealt';

  /**
   * 5. Đút 3♠: "không ai có" được đánh giá qua việc mọi đối thủ bỏ lượt (chủ động hoặc timeout).
   */
  dut3BichPassResolution: 'all_opponents_pass';

  /**
   * 6. Chặt và chặn thường chồng nhau:
   * Chặn thường ưu tiên nếu đáp ứng luật cùng màu/chất/độ dài để không tự sinh khoản phạt chặt.
   */
  preferNormalBlockOverChop: boolean;

  /**
   * 7. Về 2 cuối: tất cả đối thủ +1 ván thắng trong cả Basic và Góp quỹ.
   */
  finishWithTwosOpponentWins: boolean;

  /**
   * Thời gian mỗi lượt (giây) do server quản lý.
   */
  turnTimeoutSeconds: number;
}

export const defaultRulesConfig: RulesConfig = {
  longStraightCutPenalty: 0,
  longStraightRotPenalty: null,
  congBaseExtra: 13,
  instantWinTieBreaker: 'combo_value_then_opener',
  nextGameOpenerOnMultipleWinners: 'lowest_card_dealt',
  dut3BichPassResolution: 'all_opponents_pass',
  preferNormalBlockOverChop: true,
  finishWithTwosOpponentWins: true,
  turnTimeoutSeconds: 15,
};
