import express from 'express';
import conferenceData from './models/modelmain.js';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/conect_mg.js';
import expressLayouts from 'express-ejs-layouts';
import fs from 'fs'
import multer from "multer";
import path from 'path';
import ExcelJS from 'exceljs'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage });

const app = express();
const PORT = 3000;


dotenv.config();
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(expressLayouts);
app.set('layout', 'main');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- page 1 -------------------------
app.get('/DKHN', async (req, res) => {
  try {
    const data = await conferenceData.find()
    res.status(200).render("DKHN", { data });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hội nghị:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }

});

app.get('/api/DKHN', async (req, res) => {
  try {
    const data = await conferenceData.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }
});
app.post('/DKHN', async (req, res) => {
  try {
    const { tenHoiNghi, ngayToChuc, huyenToChuc, loaiHinh, diaDiem, nhomPhuTrach } = req.body
    const conference_new = new conferenceData({ tenHoiNghi: tenHoiNghi, ngayToChuc: ngayToChuc, huyenToChuc: huyenToChuc, loaiHinh: loaiHinh, diaDiem: diaDiem, nhomPhuTrach: nhomPhuTrach })
    await conference_new.save()
    res.redirect("/DKHN")
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hội nghị:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }

});
// Cập nhật hội nghị theo ID
app.post('/DKHN/update/:id', async (req, res) => {
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

app.post('/DKHN/delete/:id', async (req, res) => {
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
// ---------------- page 2 -------------------------
app.get("/PC", async (req, res) => {
  try {
    const data = await conferenceData.find({}, "ngayToChuc")
    const uniqueDates = [...new Set(data.map(item => item.ngayToChuc))];
    res.status(200).render("PC", { uniqueDates })
  } catch (error) {
    console.log(error)
    res.status(500).json("lỗi không tìm thấy dữ liệu")
  }
})

app.get("/api/PC", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await conferenceData.find({ ngayToChuc: date });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi lấy hội nghị theo ngày" });
  }
});
app.post("/PC", async (req, res) => {
  try {
    const { idHoiNghi, xe } = req.body;
    const updated = await conferenceData.findByIdAndUpdate(
      idHoiNghi,
      { $set: { PC: xe } },
      { new: true }
    );
    res.redirect("/PC");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }
});

// -------------page 3-------------------------

app.get('/BCKQ', async (req, res) => {
  const data = await conferenceData.find({}, 'ngayToChuc');
  const uniqueDates = [...new Set(data.map(item => item.ngayToChuc))];
  res.render('BCKQ', { uniqueDates });
});

// API: trả về hội nghị theo ngày
app.get('/api/BCKQ', async (req, res) => {
  const { date } = req.query;
  const list = await conferenceData.find({ ngayToChuc: date });
  res.json(list);
});

// API: trả về thông tin hội nghị theo ID
app.get('/api/BCKQ/:id', async (req, res) => {
  const info = await conferenceData.findById(req.params.id);
  res.json(info);
});

// Cập nhật hội nghị: số người, ảnh
app.post(
  '/BCKQ',
  upload.fields([
    { name: 'anhDanhSach', maxCount: 1 },
    { name: 'anhTongThe', maxCount: 1 }
  ]),
  async (req, res) => {
    const { idHoiNghi, soLuongThamDu } = req.body;
    const anh1 = req.files?.['anhDanhSach']?.[0]?.filename || null;
    const anh2 = req.files?.['anhTongThe']?.[0]?.filename || null;

    await conferenceData.findByIdAndUpdate(idHoiNghi, {
      $set: {
        SL: Number(soLuongThamDu),
        anhDanhSach: anh1,
        anhTongThe: anh2
      }
    });

    res.redirect('/BCKQ');
  }
);
// ---------------------------page 4 ---------------------------------
app.get('/KT', async (req, res) => {
  try {
    const data = await conferenceData.find({}, 'ngayToChuc').lean();

    // Lấy ngày duy nhất (dưới dạng đối tượng Date gốc)
    const uniqueDates = [
      ...new Set(data.map(item => item.ngayToChuc?.toString()))
    ];

    res.render('KT', { uniqueDates });
  } catch (err) {
    console.error('Lỗi khi tải danh sách ngày tổ chức:', err);
    res.status(500).send('Lỗi máy chủ nội bộ.');
  }
});
// [GET] API: Trả về danh sách hội nghị theo ngày tổ chức
app.get('/api/KT', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Thiếu ngày tổ chức.' });
    }

    const list = await conferenceData.find({ ngayToChuc: date }).lean();

    res.json(list);
  } catch (err) {
    console.error('Lỗi khi truy vấn hội nghị theo ngày:', err);
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});


// [GET] API: Trả về chi tiết hội nghị theo ID
app.get('/api/KT/:id', async (req, res) => {
  try {
    const info = await conferenceData.findById(req.params.id).lean();

    if (!info) {
      return res.status(404).json({ error: 'Không tìm thấy hội nghị.' });
    }

    res.json(info);
  } catch (err) {
    console.error('Lỗi khi lấy thông tin chi tiết hội nghị:', err);
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// ---------------------page 5-----------------------------
app.get('/TK', async (req, res) => {
    res.render('TK', { data: null, chartData: null });
});

app.post('/TK', async (req, res) => {
    const { fromDate, toDate } = req.body;
    const data = await conferenceData.find({
        ngayToChuc: { $gte: fromDate, $lte: toDate }
    });

    // Thống kê số lượng hội nghị theo huyện
    const byDistrict = {};
    const rawByType = {};

    // Chuẩn hóa loại hình
    const normalizeType = (type) => {
        if (!type) return '';
        return type.trim().toLowerCase();
    };

    const normalizedMap = {
        'hn nhỏ': 'HN Nhỏ',
        'hn lớn': 'HN Lớn',
        'tiệc': 'Tiệc',
        'quà': 'Quà'
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
    const typeLabels = ['HN Nhỏ', 'HN Lớn', 'Tiệc', 'Quà'];
    const typeData = typeLabels.map(label => rawByType[label] || 0);



    res.render('TK', {
        data,
        chartData: {
            byDistrict,
            fromDate,
            toDate,
            typeLabels,
            typeData
        }
    });
});
app.get('/export', async (req, res) => {
  const { from, to } = req.query;
  const data = await conferenceData.find({
    ngayToChuc: { $gte: from, $lte: to }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Thống kê hội nghị');

  // Tạo tiêu đề
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 10 },
    { header: 'Tên Hội Nghị', key: 'tenHoiNghi', width: 40 },
    { header: 'Ngày tổ chức', key: 'ngayToChuc', width: 25 },
    { header: 'Địa điểm tổ chức', key: 'DDTC', width: 30 },
    { header: 'Đơn vị', key: 'donVi', width: 25 },
    { header: 'Nhóm', key: 'nhom', width: 20 },
    { header: 'Loại hình', key: 'loaiHinh', width: 25 },
    { header: 'Số lượng', key: 'soLuong', width: 20 }
  ];

  // Ghi dữ liệu
  data.forEach((d, index) => {
    worksheet.addRow({
      stt: index + 1,
      tenHoiNghi: d.tenHoiNghi,
      ngayToChuc: d.ngayToChuc,
      DDTC: d.huyenToChuc+ ","+ d.diaDiem,
      donVi: d.PC,
      nhom: d.nhomPhuTrach,
      loaiHinh: d.loaiHinh,
      soLuong: d.SL
    });
  });

  // Xuất file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=thongke.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});
connectDB(process.env.URI).then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}/login`);
  });
});