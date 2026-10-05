import React from 'react';
import { X, BookOpen, CheckCircle, ShieldAlert, Award, AlertTriangle } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl w-full p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="text-amber-400" size={24} />
            <h2 className="text-xl font-black text-amber-400 font-display">
              Luật Chơi Tiến Lên Miền Bắc
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 text-xs md:text-sm max-h-[70vh] overflow-y-auto pr-2">
          {/* Mục 1: Bộ bài & Rank */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">1. Bộ bài và Thứ tự</h3>
            <p className="text-slate-300 leading-relaxed">
              - 52 lá, chia mỗi người 13 lá (2-4 người chơi).<br />
              - Rank: <strong>3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; 2</strong>.<br />
              - Chất: <strong>Bích ♠ &lt; Tép ♣ &lt; Rô ♦ &lt; Cơ ♥</strong>.<br />
              - Đen: ♠♣. Đỏ: ♦♥.
            </p>
          </section>

          {/* Mục 2: Tổ hợp & Chặn */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">2. Đánh thường và Chặn</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed">
              <li><strong>Lá lẻ (3-A):</strong> Chặn bằng lá cao hơn cùng chất. Lá 2 là ngoại lệ (chặn mọi 3-A không cần cùng chất).</li>
              <li><strong>Đôi thường:</strong> Phải cùng rank và cùng màu (♠♣ hoặc ♦♥). Chặn bằng đôi rank cao hơn cùng màu.</li>
              <li><strong>Đôi 2:</strong> Bất kỳ hai chất; chặn mọi đôi thường. So hai đôi 2 bằng chất cao nhất.</li>
              <li><strong>Bộ ba:</strong> Cùng rank; chặn bằng bộ ba rank cao hơn và <em>đúng cùng tập hợp 3 chất</em> (Ví dụ: 8♠♦♥ chặn 5♠♦♥, không chặn 5♣♦♥). Bộ ba 2 chặn mọi bộ ba thường.</li>
              <li><strong>Sảnh:</strong> Ít nhất 3 lá liên tiếp cùng chất, không có 2. Chặn bằng sảnh cùng số lá, cùng chất, rank cao hơn.</li>
            </ul>
          </section>

          {/* Mục 3: Hàng và Chặt */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">3. Hàng và Khả năng Chặt</h3>
            <p className="font-semibold text-amber-400 mb-1">
              Thứ tự sức mạnh: 5 đôi thông &gt; 4 đôi thông &gt; Sảnh dài (≥5 lá) &gt; Tứ quý &gt; 3 đôi thông
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-amber-300">
                    <th className="p-1.5 border border-slate-700">Loại Hàng</th>
                    <th className="p-1.5 border border-slate-700">Chặt 1 lá 2</th>
                    <th className="p-1.5 border border-slate-700">Chặt đôi 2</th>
                    <th className="p-1.5 border border-slate-700">Chặt bộ ba 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="p-1.5 border border-slate-700 font-medium">3 đôi thông cùng màu</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-red-400">Không</td>
                    <td className="p-1.5 border border-slate-700 text-red-400">Không</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border border-slate-700 font-medium">Tứ quý</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-red-400">Không</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border border-slate-700 font-medium">Sảnh đồng chất 5 lá</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-red-400">Không</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border border-slate-700 font-medium">Sảnh đồng chất ≥6 lá</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border border-slate-700 font-medium">4 đôi thông cùng màu</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-emerald-400 font-bold">Có</td>
                    <td className="p-1.5 border border-slate-700 text-red-400">Không</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              * Chặt hàng: hàng mạnh hơn được chặt hàng yếu hơn không cần cùng màu/chất.
            </p>
          </section>

          {/* Mục 4: Đút 3 Bích */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">4. Đút 3 Bích (3♠)</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed">
              <li>Đánh một tổ hợp và trên tay chỉ còn đúng 3♠: hệ thống sẽ chuyển sang trạng thái chờ đút 3♠.</li>
              <li>Nếu tất cả đối thủ đều bỏ lượt: người đó thắng ngay, ván kết thúc, <strong>mỗi đối thủ bị trừ 26 điểm</strong>.</li>
              <li>Nếu có đối thủ chặn hợp lệ: ván kết thúc kiểu <em>Bắt đút 3 bích</em>, người giữ 3♠ bị trừ 26 điểm, người chặn được tính thắng.</li>
            </ul>
          </section>

          {/* Mục 5: Về 2 Cuối */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">5. Xử phạt Về 2 Cuối</h3>
            <p className="text-slate-300 leading-relaxed">
              Nếu đánh hết bài bằng 1 lá 2, đôi 2 hoặc bộ ba 2: người đánh bị xử thua và phạt <strong>13 × k × (n - 1)</strong> điểm (k là số 2, n là số người chơi). Tất cả đối thủ được cộng ván thắng!
            </p>
          </section>

          {/* Mục 6: Ăn Trắng */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">6. Ăn Trắng (Ngay sau chia bài)</h3>
            <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed">
              <li>Tứ quý 2</li>
              <li>Sảnh rồng 3–A đồng chất (12 lá liên tiếp cùng chất)</li>
              <li>6 đôi hợp lệ (không cần thông)</li>
              <li>5 đôi thông đồng màu</li>
              <li>13 lá cùng màu (toàn đỏ hoặc toàn đen)</li>
              <li>Tứ quý 3 ở ván đầu tiên của phòng</li>
            </ol>
            <p className="text-[11px] text-slate-400 mt-1">
              * Ăn trắng phạt mỗi người thua 13 điểm (không phạt thối/cóng).
            </p>
          </section>

          {/* Mục 7: Tính thối thay thế điểm lá */}
          <section className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5">7. Mức Thối Thay Thế Điểm Lá</h3>
            <p className="text-slate-300 leading-relaxed">
              Mức thối thay thế điểm đếm lá của chính bộ đó, <strong>không cộng chồng</strong>:<br />
              - 1 lá thường: 1 điểm<br />
              - 1 lá 2 đen (♠, ♣): 2 điểm<br />
              - 1 lá 2 đỏ (♦, ♥): 4 điểm<br />
              - 3 đôi thông: 6 điểm<br />
              - Tứ quý: 8 điểm<br />
              - 4 đôi thông: 8 điểm<br />
              - Cóng (chưa đánh lá nào): <code>congScore = rotScore + 13</code>.
            </p>
          </section>

          {/* Mục 8: Quy ước mục 12 */}
          <section className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30">
            <h3 className="font-bold text-amber-400 text-sm mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={16} /> Quy ước cấu hình mục 12 (rulesConfig)
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs leading-relaxed">
              <li><strong>Sảnh dài bị chặt:</strong> Phạt 0 điểm (chưa có quy định phạt chặt sảnh dài).</li>
              <li><strong>Sảnh dài còn trên tay:</strong> Tính 1 điểm/lá thường.</li>
              <li><strong>Cóng kết hợp thối:</strong> Mức nền thối + 13 điểm (Ví dụ: cóng 13 lá thường = 26; có 2♠ = 27; có 2♥ = 29).</li>
              <li><strong>Hòa ăn trắng:</strong> So giá trị bộ bài, sau đó đến ghế có quyền mở ván.</li>
              <li><strong>Ván sau nhiều người thắng:</strong> Người giữ lá nhỏ nhất khi chia bài mở ván.</li>
              <li><strong>Đút 3 bích:</strong> Tự động hoàn tất khi tất cả đối thủ bỏ lượt hoặc timeout.</li>
              <li><strong>Chặn thường ưu tiên hơn chặt:</strong> Không tự sinh phạt chặt sảnh nếu đã thỏa chặn sảnh thường.</li>
            </ul>
          </section>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary py-2 px-6">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
