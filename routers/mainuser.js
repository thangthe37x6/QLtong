import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/auth.js";
import conferenceData from "../models/modelmain.js";
import personalData from "../models/modelUser.js"
import fs from 'fs'
import path from 'path';
import multer from "multer";
const routerMainUser = express.Router()


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


routerMainUser.get('/DKHN', authMiddleware, async (req, res) => {
  try {
    const username = req.user.username
    const role = req.user.role
    const data = await conferenceData.find({ username: username })
    res.status(200).render("DKHN", { data, role: role, username: req.user.username });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hội nghị:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }

});

routerMainUser.get('/api/DKHN', authMiddleware, async (req, res) => {
  try {
    const username = req.user.username
    const data = await conferenceData.find({ username: username })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }
});
routerMainUser.post('/DKHN', authMiddleware, async (req, res) => {
  try {
    const username = req.user.username
    const { buoiToChuc, ngayToChuc, huyenToChuc, loaiHinh, diaDiem } = req.body
    const N_ngay = new Date(ngayToChuc)
    const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const thu = days[N_ngay.getDay()];
    const conference_new = new conferenceData({ username: username, thu: thu, buoiToChuc: buoiToChuc, ngayToChuc: ngayToChuc, huyenToChuc: huyenToChuc, loaiHinh: loaiHinh, diaDiem: diaDiem })
    await conference_new.save()
    res.redirect("/DKHN")
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hội nghị:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách hội nghị' });
  }

});
// Cập nhật hội nghị theo ID
routerMainUser.post('/DKHN/update/:id', authMiddleware, async (req, res) => {
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

routerMainUser.post('/DKHN/delete/:id', authMiddleware, async (req, res) => {
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

// --------------------------------------------------------------------------------------------------------------------------
routerMainUser.get('/BCKQ', authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;
    const role = req.user.role;

    const data = await conferenceData.find({
      username: username,
      $or: [
        { nhomPhuTrach: { $exists: false } },
        { nhomPhuTrach: null },
        { nhomPhuTrach: '' }
      ]
    }).lean();

    res.status(200).render("BCKQ", {
      data,
      role,
      username
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu hội nghị:", error);
    res.status(500).send("Không thể lấy danh sách hội nghị");
  }
});

// Cập nhật hội nghị: số người, ảnh
routerMainUser.post(
  '/BCKQ', authMiddleware,
  upload.fields([
    { name: 'anhDanhSach', maxCount: 1 },
    { name: 'anhTongThe', maxCount: 1 }
  ]),
  async (req, res) => {
    const { idHoiNghi, soLuongThamDu, nhomPhuTrach } = req.body;
    const anh1 = req.files?.['anhDanhSach']?.[0]?.filename || null;
    const anh2 = req.files?.['anhTongThe']?.[0]?.filename || null;
    console.log(anh1, anh2)
    await conferenceData.findByIdAndUpdate(idHoiNghi, {
      $set: {
        nhomPhuTrach: nhomPhuTrach,
        SL: Number(soLuongThamDu),
        anhDanhSach: anh1,
        anhTongThe: anh2
      }
    });

    res.redirect('/BCKQ');
  }
);



// ------------------------------------------------------------------------------------------------------------------
routerMainUser.get('/DKTGHN', authMiddleware, async (req, res) => {
  try {
    const role = req.user.role;
    const data = await conferenceData.find({}, "ngayToChuc");
    const uniqueDates = [...new Set(data.map(item => item.ngayToChuc))];

    res.render('DKTGHN', { uniqueDates, role, message: null, username: req.user.username }); // render đúng view
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

routerMainUser.post("/DKTGHN", authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;
    const dtbody = req.body;

    const detailHN = await conferenceData.findById(dtbody.idHoiNghi).lean();

    if (!detailHN) {
      return res.status(404).send("Không tìm thấy hội nghị");
    }

    // ✅ Kiểm tra trùng: đã đăng ký hội nghị này chưa
    const alreadyRegistered = await personalData.findOne({
      username: username,
      'detailHN._id': dtbody.idHoiNghi,
    });

    if (alreadyRegistered) {
      return res.status(400).send("Bạn đã đăng ký hội nghị này rồi");
    }

    // ✅ Nếu chưa có thì cho phép đăng ký
    const newData = new personalData({
      username,
      detailHN: detailHN,
    });

    await newData.save();
    res.redirect("/DKTGHN");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }
});

routerMainUser.get("/api/DKTGHN", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const result = await conferenceData.find({ ngayToChuc: date });
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Lỗi lấy hội nghị:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

routerMainUser.get("/api/user-conferences", authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;

    const results = await personalData.find({ username: username }).lean();

    console.log(results)
    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Lỗi lấy hội nghị của user:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});
routerMainUser.post('/DKTGHN/delete/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id)

    const conference = await personalData.findById(id);
    if (!conference) {
      return res.status(404).json({ error: 'Không tìm thấy hội nghị để xóa' });
    }

    await personalData.findByIdAndDelete(id);
    res.status(200).json({ message: 'Đã xóa thành công' }); // ✅ dùng JSON thay vì redirect
  } catch (error) {
    console.error('❌ Lỗi khi xóa hội nghị:', error);
    res.status(500).json({ error: 'Xóa thất bại' });
  }
});


routerMainUser.get('/api/DKTGHN/:id', authMiddleware, async (req, res) => {
  try {
    const info = await conferenceData.findById(req.params.id);
    if (!info) res.status(401).json({ message: "không tìm thấy thông tin" })
    res.status(200).json(info);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }

});
// ----------------------------------------------------------------
routerMainUser.get("/KTPC", authMiddleware, async (req, res) => {
  res.render("KTPC", {
    role: req.user.role,
    username: req.user.username,
  });
});

routerMainUser.get("/api/KTPC", authMiddleware, async (req, res) => {
  const { date } = req.query;
  const result = await conferenceData.find({ ngayToChuc: date });
  res.json(result);
});


routerMainUser.get("/personal", authMiddleware, (req, res) => {
  try {

    res.status(200).render('personalAmin', { message: null, username: req.user.username, role: req.user.role })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Lỗi lấy hội nghị theo ngày" });

  }
})

routerMainUser.post("/personal/export", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await personalData.find({ 'detailHN.ngayToChuc': { $gte: startDate, $lte: endDate } });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TK tài trợ');

    worksheet.columns = [
      { header: 'họ và tên', key: 'fullname', width: 30 },
      { header: 'Tên HN', key: 'tenHN', width: 30 },
      { header: 'Nhóm phụ trách', key: 'nhomPhuTrach', width: 30 },
      { header: 'Địa điểm', key: 'diaDiem', width: 30 },
      { header: 'Ngày tổ chức', key: 'ngayToChuc', width: 20 },
    ];
    data.forEach(seminar => {
      worksheet.addRow({
        fullname: seminar.username,
        tenHN: seminar.detailHN.tenHoiNghi,
        nhomPhuTrach: seminar.detailHN.nhomPhuTrach,
        ngayToChuc: seminar.detailHN.ngayToChuc,
        diaDiem: seminar.detailHN.diaDiem
      });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=TK-nguoi-tham-gia-từ${startDate.split("-").reverse().join("-")}-den${endDate.split("-").reverse().join("-")} .xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Lỗi lấy hội nghị theo ngày" });

  }
})
export default routerMainUser;