import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/auth.js";
import conferenceData from "../models/modelmain.js";
import fs from 'fs'
import path from 'path';
import ExcelJS from 'exceljs'


const routermain = express.Router()
routermain.get("/PC", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const role = req.user.role;
    res.status(200).render("PC", {
      data: [],
      role: role,
      username: req.user.username,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("lỗi không tìm thấy dữ liệu");
  }
});

routermain.get('/api/PC', authMiddleware,requireAdmin, async (req, res) => {
  try {
    const { ngayToChuc } = req.query; // lấy từ URL query
    if (!ngayToChuc) return res.status(400).json({ error: 'Thiếu ngày tổ chức' });

    const data = await conferenceData.find({ ngayToChuc: ngayToChuc });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }
});
routermain.post('/PC/update/:id', authMiddleware,requireAdmin, async (req, res) => {
  try {
    const updatedConference = await conferenceData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedConference) {
      return res.status(404).json({ error: 'Không tìm thấy hội nghị để cập nhật' });
    }

    res.status(200).json(updatedConference);
  } catch (error) {
    console.error('Lỗi khi cập nhật hội nghị:', error);
    res.status(500).json({ error: 'Cập nhật thất bại' });
  }
});

routermain.post('/PC/delete/:id', authMiddleware,requireAdmin, async (req, res) => {
  try {
    // 1. Tìm hội nghị trước khi xóa
    const conference = await conferenceData.findById(req.params.id);
    if (!conference) {
      return res.status(404).json({ error: 'Không tìm thấy hội nghị để xóa' });
    }

    // 2. Xóa ảnh nếu tồn tại
    const deleteIfExists = (filename) => {
      if (filename) {
        const filePath = path.join('uploads', filename);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.warn(`⚠️ Không thể xóa file ${filePath}:`, err.message);
          } else {
            console.log(`🗑️ Đã xóa file: ${filePath}`);
          }
        });
      }
    };

    deleteIfExists(conference.anhDanhSach);
    deleteIfExists(conference.anhTongThe);

    // 3. Xóa hội nghị trong MongoDB
    await conferenceData.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: '✅ Xóa hội nghị thành công kèm ảnh' });
  } catch (error) {
    console.error('❌ Lỗi khi xóa hội nghị:', error);
    res.status(500).json({ error: 'Xóa thất bại' });
  }
});


// --------------------------------------------------------------------------------------------------------------

routermain.get("/KT", authMiddleware, requireAdmin, (req, res) => {
  try {
    const role = req.user.role;
    res.status(200).render("KT", {
      data: [],
      role: role,
      username: req.user.username,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("lỗi không tìm thấy dữ liệu");
  }
});
// [GET] API: Trả về danh sách hội nghị theo ngày tổ chức
routermain.get('/api/KT', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Thiếu ngày tổ chức.' });
    }

    const list = await conferenceData.find({
      ngayToChuc: date,
      $or: [
        { trangThai: { $exists: false } }, // không có trường này
        { trangThai: null },               // hoặc null
        { trangThai: '' }                  // hoặc chuỗi rỗng
      ]
    }).lean();

    res.status(200).json(list);
  } catch (err) {
    console.error('Lỗi khi truy vấn hội nghị theo ngày:', err);
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});
routermain.post("/KT/PD", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { idHoiNghi, ghiChu } = req.body;

    if (!idHoiNghi) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const result = await conferenceData.updateOne(
      { _id: idHoiNghi },
      { $set: { trangThai: "da xac nhan", ghiChu } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy hội nghị" });
    }

    res.status(200).redirect("/KT");
  } catch (error) {
    console.error("Lỗi khi phê duyệt hội nghị:", error);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// ------------------------------------------------------------------------------------------------------------------
routermain.get('/TK', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const role = req.user.role
    res.status(200).render('TK', { data: null, chartData: null, role: role, username: req.user.username });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }

});

routermain.post('/TK', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const role = req.user.role
    const { fromDate, toDate, trangThai } = req.body;


    let data;

    if (trangThai === 'yes') {
      data = await conferenceData.find({
        ngayToChuc: { $gte: fromDate, $lte: toDate },
        $or: [
          { trangThai: { $exists: false } },
          { trangThai: null },
          { trangThai: '' }
        ]
      }).lean();
    } else {
      data = await conferenceData.find({
        ngayToChuc: { $gte: fromDate, $lte: toDate }
      }).lean();
    }

    // Thống kê số lượng hội nghị theo huyện
    const byDistrict = {};
    const rawByType = {};

    // Chuẩn hóa loại hình
    const normalizeType = (type) => {
      if (!type) return '';
      return type.trim().toLowerCase();
    };

    const normalizedMap = {
      'hncl tiệc': 'HNCL tiệc',
      'hncl quà': 'HNCL quà',
      'hn nhóm chọn': 'HN nhóm chọn',
      'hn cs-01': 'HN CS-01',
      'hn cs-02': 'HN CS-02',
      'hn boss': 'HN boss',
      'hn ra mắt': 'HN ra mắt'

    };

    data.forEach(d => {
      // Tính theo huyện
      byDistrict[d.huyenToChuc] = (byDistrict[d.huyenToChuc] || 0) + 1;

      // Tính loại hình đã chuẩn hóa
      const raw = normalizeType(d.loaiHinh);
      const finalType = normalizedMap[raw];
      if (finalType) {
        rawByType[finalType] = (rawByType[finalType] || 0) + 1;
      }
    });

    // Các loại hình cố định theo thứ tự
    const typeLabels = ['HNCL tiệc', 'HNCL quà', 'HN nhóm chọn', 'HN CS-01', 'HN CS-02', 'HN boss', 'HN ra mắt'];
    const typeData = typeLabels.map(label => rawByType[label] || 0);


    console.log('typeLabels:', typeLabels);
    console.log('typeData:', typeData);
    res.status(200).render('TK', {
      role: role, username: req.user.username,
      data,
      chartData: {
        byDistrict,
        fromDate,
        toDate,
        typeLabels,
        typeData
      }
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }

});
routermain.get('/export', authMiddleware, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const data = await conferenceData.find({
    ngayToChuc: { $gte: from, $lte: to }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Thống kê hội nghị');

  // Tạo tiêu đề
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 10 },
    { header: 'Ban/Nhóm', key: 'nhomPhuTrach', width: 40 },
    { header: 'Địa điểm tổ chức', key: 'diaDiem', width: 30 },
    { header: 'Ngày tổ chức', key: 'ngayToChuc', width: 25 },
    { header: 'ADO', key: 'username', width: 25 },
    { header: 'Số lượng', key: 'SL', width: 20 },
    { header: 'loại HN', key: 'loaiHinh', width: 20 },
    { header: 'Trạng thai', key: 'trangThai', width: 20 },
    { header: 'Ghi chú', key: 'ghiChu', width: 20 }
  ];

  // Ghi dữ liệu
  data.forEach((d, index) => {
    worksheet.addRow({
      stt: index + 1,
      nhomPhuTrach: d.nhomPhuTrach,
      diaDiem: d.diaDiem,
      ngayToChuc: d.ngayToChuc,
      username: d.username,
      SL: d.SL,
      loaiHinh: d.loaiHinh,
      trangThai: d.trangThai,
      ghiChu: d.ghiChu
    });
  });

  // Xuất file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Thong-ke-tu-${from}-den-${to}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});



routermain.post('/logout', (req, res) => {
  res.clearCookie('token'); // hoặc tên cookie chứa JWT bạn dùng
  res.redirect('/login');   // hoặc bất kỳ trang nào sau khi đăng xuất
});
export default routermain