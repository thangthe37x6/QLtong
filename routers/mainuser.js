import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/auth.js";
import conferenceData from "../models/modelmain.js";
import personalData from "../models/modelUser.js"
const routerMainUser = express.Router()


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


routerMainUser.get('/api/DKTGHN/:id', async (req, res) => {
  try {
    const info = await conferenceData.findById(req.params.id);
    if (!info) res.status(401).json({ message: "không tìm thấy thông tin" })
    res.status(200).json(info);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    res.status(500).send("Lỗi khi cập nhật");
  }

});
routerMainUser.get("/KTPC", authMiddleware, async (req, res) => {
  try {
    const role = req.user.role
    const data = await conferenceData.find({}, "ngayToChuc")
    const uniqueDates = [...new Set(data.map(item => item.ngayToChuc))];
    res.status(200).render("KTPC", { uniqueDates, role: role, username: req.user.username })
  } catch (error) {
    console.log(error)
    res.status(500).json("lỗi không tìm thấy dữ liệu")
  }
})

routerMainUser.get("/api/KTPC", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const result = await conferenceData.find({ ngayToChuc: date });
    console.log(result)
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi lấy hội nghị theo ngày" });
  }
});


routerMainUser.get("/personal", authMiddleware, requireAdmin, (req, res) => {
  try {

    res.status(200).render('personalAmin', { message: null , username: req.user.username, role: req.user.role})
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Lỗi lấy hội nghị theo ngày" });

  }
})

routerMainUser.post("/personal/export",authMiddleware, requireAdmin, async (req, res) => {
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