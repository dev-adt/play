import React from 'react';
import { X, BookOpen, ShieldCheck, Flame, Award } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl w-full p-6 text-slate-100 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] max-h-[85vh] flex flex-col">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-purple-500 to-indigo-700 flex items-center justify-center shadow-md">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-wide">
                LUẬT TIẾN LÊN MIỀN BẮC
              </h2>
              <p className="text-[11px] text-amber-200/60 font-medium">Quy chuẩn luật riêng & cách tính điểm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rules Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-amber-100/90 leading-relaxed">
          {/* Section 1 */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-amber-400" /> 1. Luật Chơi & Đi Bài
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li><strong>Đồng chất - đồng màu:</strong> Đánh đôi, sảnh phải cùng màu hoặc cùng chất tùy theo bộ bài dẫn đầu.</li>
              <li><strong>Sảnh dài:</strong> Cho phép sảnh liên tiếp từ 3 lá đến 12 lá (3 đến A). <em>Lá 2 không được ghép vào sảnh.</em></li>
              <li><strong>Về 2 cuối ván:</strong> Tuyệt đối cấm đánh lá 2 (hoặc bộ có 2) ở lượt cuối cùng để hết bài. Người vi phạm sẽ bị xử thua phạt đền toàn bộ người chơi khác (13 điểm x số lá 2 x số đối thủ).</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
              <Flame size={16} className="text-red-400" /> 2. Chặt Hàng & Phạt Chặt
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li><strong>Tứ quý:</strong> Chặt được 1 lá 2 (hoặc tứ quý nhỏ hơn). Phạt <strong>8 điểm</strong> (Tứ quý 2 phạt 12 điểm).</li>
              <li><strong>3 đôi thông:</strong> Chặt được 1 lá 2 hoặc 3 đôi thông nhỏ hơn theo vòng lượt. Phạt <strong>6 điểm</strong>.</li>
              <li><strong>4 đôi thông:</strong> Chặt được 1 lá 2, đôi 2, tứ quý hoặc 3 đôi thông. Phạt <strong>8 điểm</strong>.</li>
              <li><strong>Phạt theo bộ bị chặt:</strong> 2 đen phạt 2 điểm, 2 đỏ phạt 4 điểm.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20">
            <h3 className="font-bold text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
              <Award size={16} className="text-yellow-400" /> 3. Đút 3 Bích & Ăn Trắng
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li><strong>Đút 3 Bích:</strong> Nếu đánh lá 3 Bích cuối cùng và không ai bắt được: thắng lớn, mỗi đối thủ bị phạt <strong>26 điểm</strong>. Nếu bị người sau chặn được: người đút 3 bích bị phạt <strong>26 điểm</strong> cho người chặn.</li>
              <li><strong>Ăn trắng (Instant Win):</strong> Sảnh rồng (3-A), Tứ quý 2, 5 đôi thông, 6 đôi bất kỳ, hoặc đồng màu 13 lá. Thắng ngay 13 điểm từ mỗi người chơi khác.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
